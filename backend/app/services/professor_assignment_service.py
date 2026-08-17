"""
Advisor → application professor assignment.

An application is routed to its advisor by matching the student's
`UserProfile.advisor_nycu_id` against a `User` row with role=professor.
That match happens at submission time, but the professor's account only
exists once they have logged in through Portal SSO at least once — a
student who submits before their advisor's first login would otherwise
keep `professor_id = NULL` forever, invisible to the professor's review
queue with no error anywhere.

This module owns both halves of the match so the two entry points stay in
sync: the forward lookup used at submission, and the backfill run when a
professor account first appears.
"""

import logging
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.enums import ApplicationStatus
from app.models.user import User, UserRole
from app.models.user_profile import UserProfile

logger = logging.getLogger(__name__)

# Applications still awaiting the professor's recommendation. Anything
# further along has already been routed past them, so a late-arriving
# professor account must not reopen it.
PENDING_REVIEW_STATUSES = (
    ApplicationStatus.submitted,
    ApplicationStatus.under_review,
)


async def find_professor_by_nycu_id(db: AsyncSession, advisor_nycu_id: Optional[str]) -> Optional[User]:
    """The professor account for an advisor NYCU ID, or None if that person
    has never logged in (no `users` row) or is not a professor."""
    if not advisor_nycu_id:
        return None

    stmt = select(User).where(
        User.nycu_id == advisor_nycu_id,
        User.role == UserRole.professor,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def assign_professor_from_profile(
    db: AsyncSession,
    application: Application,
    profile: Optional[UserProfile],
) -> Optional[User]:
    """Set `application.professor_id` from the student's advisor profile.

    Never overwrites an existing assignment. Does not commit — the caller
    owns the transaction. Returns the professor, or None when there is
    nothing to assign (already assigned, no advisor recorded, or the
    advisor has no account yet).
    """
    if application.professor_id:
        return None

    if not profile or not profile.advisor_nycu_id:
        return None

    professor = await find_professor_by_nycu_id(db, profile.advisor_nycu_id)
    if not professor:
        # Not an error for the student — the submission is still valid —
        # but it leaves the application unrouted until the advisor logs in,
        # so it must be visible in the logs rather than failing silently.
        logger.warning(
            f"No professor account for advisor nycu_id {profile.advisor_nycu_id} "
            f"(application {application.app_id}); leaving unassigned until they first log in"
        )
        return None

    application.professor_id = professor.id
    logger.info(f"Auto-assigned professor {professor.id} ({professor.name}) to application {application.app_id}")
    return professor


async def backfill_professor_assignments(
    db: AsyncSession,
    professor: User,
    *,
    commit: bool = True,
) -> List[Application]:
    """Claim already-submitted applications that name this professor as advisor.

    Covers the window between a student submitting and their advisor's
    first Portal SSO login, which is when the professor's `users` row is
    created. Returns the applications newly assigned.
    """
    if professor.role != UserRole.professor or not professor.nycu_id:
        return []

    stmt = (
        select(Application)
        .join(UserProfile, UserProfile.user_id == Application.user_id)
        .where(
            Application.professor_id.is_(None),
            Application.status.in_(PENDING_REVIEW_STATUSES),
            UserProfile.advisor_nycu_id == professor.nycu_id,
        )
    )
    result = await db.execute(stmt)
    applications = list(result.scalars().all())

    if not applications:
        return []

    for application in applications:
        application.professor_id = professor.id

    if commit:
        await db.commit()

    logger.info(
        f"Backfilled professor {professor.id} ({professor.nycu_id}) onto "
        f"{len(applications)} application(s): {[a.app_id for a in applications]}"
    )
    return applications
