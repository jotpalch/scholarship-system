"""
Tests for `professor_assignment_service` — the advisor → application match.

Regression context: a student submitted before their advisor had ever
logged in through Portal SSO. The advisor's `users` row only exists after
that first login, so the submission-time lookup found nothing, silently
left `professor_id = NULL`, and the application never appeared in the
professor's review queue.

Contract pinned:
- assign_professor_from_profile: assigns on match, no-ops (without raising)
  when the advisor has no account yet, never overwrites an assignment.
- backfill_professor_assignments: claims pending applications naming this
  professor as advisor, and only those — other advisors, already-assigned,
  and non-pending applications are left alone.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, ApplicationStatus
from app.models.user import User, UserRole, UserType
from app.models.user_profile import UserProfile
from app.services.professor_assignment_service import (
    assign_professor_from_profile,
    backfill_professor_assignments,
    find_professor_by_nycu_id,
)

ADVISOR_ID = "A00005"


async def _seed_user(db: AsyncSession, *, nycu_id: str, role: UserRole) -> User:
    user = User(
        nycu_id=nycu_id,
        name=f"user-{nycu_id}",
        email=f"{nycu_id}@u.edu",
        user_type=UserType.student if role == UserRole.student else UserType.employee,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _seed_profile(db: AsyncSession, *, student: User, advisor_nycu_id: str | None) -> UserProfile:
    profile = UserProfile(
        user_id=student.id,
        advisor_name="Advisor",
        advisor_email="advisor@u.edu",
        advisor_nycu_id=advisor_nycu_id,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def _seed_app(
    db: AsyncSession,
    *,
    student: User,
    suffix: str,
    status: ApplicationStatus = ApplicationStatus.submitted,
    professor_id: int | None = None,
) -> Application:
    app = Application(
        app_id=f"APP-PROF-{suffix}",
        user_id=student.id,
        scholarship_type_id=1,
        academic_year=114,
        sub_type_selection_mode="single",
        status=status.value,
        professor_id=professor_id,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


# ─── assign_professor_from_profile ───────────────────────────────────


@pytest.mark.asyncio
async def test_assigns_when_professor_account_exists(db: AsyncSession):
    student = await _seed_user(db, nycu_id="S001", role=UserRole.student)
    professor = await _seed_user(db, nycu_id=ADVISOR_ID, role=UserRole.professor)
    profile = await _seed_profile(db, student=student, advisor_nycu_id=ADVISOR_ID)
    app = await _seed_app(db, student=student, suffix="1")

    result = await assign_professor_from_profile(db, app, profile)

    assert result is not None and result.id == professor.id
    assert app.professor_id == professor.id


@pytest.mark.asyncio
async def test_no_assignment_when_advisor_has_never_logged_in(db: AsyncSession):
    """The regression: no `users` row for the advisor yet. Submission must
    still succeed, leaving the application unassigned for the backfill."""
    student = await _seed_user(db, nycu_id="S002", role=UserRole.student)
    profile = await _seed_profile(db, student=student, advisor_nycu_id=ADVISOR_ID)
    app = await _seed_app(db, student=student, suffix="2")

    result = await assign_professor_from_profile(db, app, profile)

    assert result is None
    assert app.professor_id is None


@pytest.mark.asyncio
async def test_does_not_overwrite_existing_assignment(db: AsyncSession):
    student = await _seed_user(db, nycu_id="S003", role=UserRole.student)
    await _seed_user(db, nycu_id=ADVISOR_ID, role=UserRole.professor)
    other = await _seed_user(db, nycu_id="A99999", role=UserRole.professor)
    profile = await _seed_profile(db, student=student, advisor_nycu_id=ADVISOR_ID)
    app = await _seed_app(db, student=student, suffix="3", professor_id=other.id)

    result = await assign_professor_from_profile(db, app, profile)

    assert result is None
    assert app.professor_id == other.id


@pytest.mark.asyncio
async def test_no_assignment_without_advisor_id(db: AsyncSession):
    student = await _seed_user(db, nycu_id="S004", role=UserRole.student)
    profile = await _seed_profile(db, student=student, advisor_nycu_id=None)
    app = await _seed_app(db, student=student, suffix="4")

    assert await assign_professor_from_profile(db, app, profile) is None
    assert await assign_professor_from_profile(db, app, None) is None
    assert app.professor_id is None


@pytest.mark.asyncio
async def test_lookup_ignores_non_professor_accounts(db: AsyncSession):
    """A staff/student account sharing the ID must not be routed reviews."""
    await _seed_user(db, nycu_id=ADVISOR_ID, role=UserRole.student)

    assert await find_professor_by_nycu_id(db, ADVISOR_ID) is None
    assert await find_professor_by_nycu_id(db, None) is None


# ─── backfill_professor_assignments ──────────────────────────────────


@pytest.mark.asyncio
async def test_backfill_claims_pending_applications(db: AsyncSession):
    student = await _seed_user(db, nycu_id="S005", role=UserRole.student)
    await _seed_profile(db, student=student, advisor_nycu_id=ADVISOR_ID)
    submitted = await _seed_app(db, student=student, suffix="5a")
    under_review = await _seed_app(db, student=student, suffix="5b", status=ApplicationStatus.under_review)

    professor = await _seed_user(db, nycu_id=ADVISOR_ID, role=UserRole.professor)
    claimed = await backfill_professor_assignments(db, professor)

    assert {a.app_id for a in claimed} == {submitted.app_id, under_review.app_id}
    for app in (submitted, under_review):
        await db.refresh(app)
        assert app.professor_id == professor.id


@pytest.mark.asyncio
async def test_backfill_skips_other_advisors_assigned_and_finished(db: AsyncSession):
    student = await _seed_user(db, nycu_id="S006", role=UserRole.student)
    await _seed_profile(db, student=student, advisor_nycu_id=ADVISOR_ID)
    other_student = await _seed_user(db, nycu_id="S007", role=UserRole.student)
    await _seed_profile(db, student=other_student, advisor_nycu_id="A00006")

    other_professor = await _seed_user(db, nycu_id="A00006", role=UserRole.professor)
    already = await _seed_app(db, student=student, suffix="6a", professor_id=other_professor.id)
    approved = await _seed_app(db, student=student, suffix="6b", status=ApplicationStatus.approved)
    draft = await _seed_app(db, student=student, suffix="6c", status=ApplicationStatus.draft)
    other_advisor_app = await _seed_app(db, student=other_student, suffix="6d")

    professor = await _seed_user(db, nycu_id=ADVISOR_ID, role=UserRole.professor)
    claimed = await backfill_professor_assignments(db, professor)

    assert claimed == []
    for app in (approved, draft, other_advisor_app):
        await db.refresh(app)
        assert app.professor_id is None
    await db.refresh(already)
    assert already.professor_id == other_professor.id


@pytest.mark.asyncio
async def test_backfill_is_noop_for_non_professor(db: AsyncSession):
    student = await _seed_user(db, nycu_id="S008", role=UserRole.student)
    await _seed_profile(db, student=student, advisor_nycu_id="S008")
    app = await _seed_app(db, student=student, suffix="8")

    assert await backfill_professor_assignments(db, student) == []
    await db.refresh(app)
    assert app.professor_id is None


@pytest.mark.asyncio
async def test_backfill_persists_across_sessions(db: AsyncSession):
    """The assignment must be committed — the professor's queue reads it in
    a later request."""
    student = await _seed_user(db, nycu_id="S009", role=UserRole.student)
    await _seed_profile(db, student=student, advisor_nycu_id=ADVISOR_ID)
    app = await _seed_app(db, student=student, suffix="9")
    app_pk = app.id
    professor = await _seed_user(db, nycu_id=ADVISOR_ID, role=UserRole.professor)
    professor_pk = professor.id

    await backfill_professor_assignments(db, professor)

    db.expire_all()
    stored = (await db.execute(select(Application.professor_id).where(Application.id == app_pk))).scalar_one()
    assert stored == professor_pk
