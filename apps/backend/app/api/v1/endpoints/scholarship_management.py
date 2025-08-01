"""
Scholarship Management API endpoints for Issue #10
Comprehensive scholarship management system with priority processing
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, and_, or_

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.models.scholarship import ScholarshipType
from app.services.scholarship_notification_service import ScholarshipNotificationService
from app.services.eligibility_verification_service import EligibilityVerificationService
from app.services.bulk_approval_service import BulkApprovalService
from app.schemas.application import ApplicationRead, ApplicationUpdate, ApplicationStatusUpdate

router = APIRouter()

@router.get("/applications/priority", response_model=List[ApplicationRead])
async def get_priority_applications(
    scholarship_type_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get applications with priority ordering (renewals first)
    Applications are sorted by:
    1. Renewal priority (renewal applications get +100 priority points)
    2. Early submission bonus
    3. Application date
    """
    query = db.query(Application)
    
    # Filter by scholarship type if specified
    if scholarship_type_id:
        query = query.filter(Application.scholarship_type_id == scholarship_type_id)
    
    # Filter by status if specified
    if status:
        query = query.filter(Application.status == status)
    
    # Priority ordering: renewals first, then by submission time
    query = query.order_by(
        desc(Application.is_renewal),  # Renewals first
        asc(Application.created_at)    # Earlier submissions first
    )
    
    return query.offset(skip).limit(limit).all()

@router.get("/applications/overdue", response_model=List[ApplicationRead])
async def get_overdue_applications(
    days_overdue: int = Query(7, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get applications that are overdue for review"""
    cutoff_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    cutoff_date = cutoff_date.replace(day=cutoff_date.day - days_overdue)
    
    query = db.query(Application).filter(
        and_(
            Application.status.in_([
                ApplicationStatus.SUBMITTED.value,
                ApplicationStatus.UNDER_REVIEW.value,
                ApplicationStatus.PENDING_RECOMMENDATION.value
            ]),
            Application.created_at < cutoff_date
        )
    ).order_by(desc(Application.created_at))
    
    return query.all()

@router.get("/applications/renewal-eligible", response_model=List[ApplicationRead]) 
async def get_renewal_eligible_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get applications eligible for renewal processing"""
    query = db.query(Application).filter(
        and_(
            Application.is_renewal == True,
            Application.status.in_([
                ApplicationStatus.SUBMITTED.value,
                ApplicationStatus.UNDER_REVIEW.value
            ])
        )
    ).order_by(desc(Application.created_at))
    
    return query.all()

@router.post("/applications/bulk-approve")
async def bulk_approve_applications(
    application_ids: List[int],
    reviewer_notes: Optional[str] = None,
    send_notifications: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk approve applications with comprehensive audit trail"""
    bulk_service = BulkApprovalService(db)
    notification_service = ScholarshipNotificationService(db)
    
    try:
        results = await bulk_service.bulk_approve_applications(
            application_ids=application_ids,
            reviewer_id=current_user.id,
            reviewer_notes=reviewer_notes
        )
        
        # Send notifications if requested
        if send_notifications:
            for app_id in results.get("approved", []):
                application = db.query(Application).filter(Application.id == app_id).first()
                if application:
                    await notification_service.send_status_update_notification(
                        application=application,
                        new_status=ApplicationStatus.APPROVED,
                        reviewer_notes=reviewer_notes
                    )
        
        return {
            "message": f"Bulk approval completed",
            "results": results,
            "notifications_sent": send_notifications
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bulk approval failed: {str(e)}"
        )

@router.post("/applications/bulk-reject")
async def bulk_reject_applications(
    application_ids: List[int],
    rejection_reason: str,
    send_notifications: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk reject applications with reasons"""
    bulk_service = BulkApprovalService(db)
    notification_service = ScholarshipNotificationService(db)
    
    try:
        results = await bulk_service.bulk_reject_applications(
            application_ids=application_ids,
            reviewer_id=current_user.id,
            rejection_reason=rejection_reason
        )
        
        # Send notifications if requested
        if send_notifications:
            for app_id in results.get("rejected", []):
                application = db.query(Application).filter(Application.id == app_id).first()
                if application:
                    await notification_service.send_status_update_notification(
                        application=application,
                        new_status=ApplicationStatus.REJECTED,
                        reviewer_notes=rejection_reason
                    )
        
        return {
            "message": f"Bulk rejection completed",
            "results": results,
            "notifications_sent": send_notifications
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bulk rejection failed: {str(e)}"
        )

@router.post("/applications/auto-process")
async def auto_process_applications(
    scholarship_type_id: int,
    approval_criteria: Optional[Dict[str, Any]] = None,
    dry_run: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-process applications based on configurable criteria"""
    bulk_service = BulkApprovalService(db)
    verification_service = EligibilityVerificationService(db)
    
    # Get applications for the scholarship type
    applications = db.query(Application).filter(
        and_(
            Application.scholarship_type_id == scholarship_type_id,
            Application.status == ApplicationStatus.SUBMITTED.value
        )
    ).all()
    
    if not applications:
        return {"message": "No applications found for processing"}
    
    # Verify eligibility for all applications
    results = {"processed": 0, "approved": 0, "rejected": 0, "details": []}
    
    for application in applications:
        try:
            verification_result = await verification_service.verify_application_eligibility(
                application_id=application.id
            )
            
            if verification_result.get("eligible", False):
                if not dry_run:
                    # Auto-approve eligible applications
                    application.status = ApplicationStatus.APPROVED.value
                    application.reviewed_at = datetime.now(timezone.utc)
                    application.reviewed_by = current_user.id
                    db.commit()
                    
                results["approved"] += 1
                results["details"].append({
                    "application_id": application.id,
                    "action": "approved",
                    "reason": "Met all eligibility criteria"
                })
            else:
                results["details"].append({
                    "application_id": application.id,
                    "action": "pending",
                    "reason": verification_result.get("failure_reasons", ["Manual review required"])
                })
            
            results["processed"] += 1
            
        except Exception as e:
            results["details"].append({
                "application_id": application.id,
                "action": "error",
                "reason": str(e)
            })
    
    return {
        "message": f"Auto-processing completed ({'dry run' if dry_run else 'actual run'})",
        "results": results
    }

@router.get("/applications/statistics")
async def get_application_statistics(
    scholarship_type_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive application statistics"""
    
    query = db.query(Application)
    
    # Filter by scholarship type
    if scholarship_type_id:
        query = query.filter(Application.scholarship_type_id == scholarship_type_id)
    
    # Filter by date range
    if start_date:
        query = query.filter(Application.created_at >= start_date)
    if end_date:
        query = query.filter(Application.created_at <= end_date)
    
    applications = query.all()
    
    # Calculate statistics
    total_applications = len(applications)
    
    status_counts = {}
    for status in ApplicationStatus:
        status_counts[status.value] = sum(1 for app in applications if app.status == status.value)
    
    renewal_stats = {
        "renewal_applications": sum(1 for app in applications if app.is_renewal),
        "new_applications": sum(1 for app in applications if not app.is_renewal)
    }
    
    # Processing time statistics
    completed_apps = [app for app in applications if app.reviewed_at and app.created_at]
    if completed_apps:
        processing_times = [(app.reviewed_at - app.created_at).days for app in completed_apps]
        avg_processing_time = sum(processing_times) / len(processing_times)
    else:
        avg_processing_time = 0
    
    return {
        "total_applications": total_applications,
        "status_distribution": status_counts,
        "renewal_statistics": renewal_stats,
        "average_processing_time_days": round(avg_processing_time, 2),
        "completion_rate": round((status_counts.get("approved", 0) + status_counts.get("rejected", 0)) / max(total_applications, 1) * 100, 2)
    }

@router.post("/applications/{application_id}/priority-boost")
async def boost_application_priority(
    application_id: int,
    priority_boost: int = Query(10, ge=1, le=100),
    reason: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually boost application priority for urgent cases"""
    
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Add priority boost (could be stored in application metadata or separate table)
    if not hasattr(application, 'priority_boost'):
        application.priority_boost = 0
    
    application.priority_boost += priority_boost
    application.priority_boost_reason = reason
    application.priority_boosted_by = current_user.id
    application.priority_boosted_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {
        "message": f"Priority boosted by {priority_boost} points",
        "application_id": application_id,
        "new_priority_boost": application.priority_boost,
        "reason": reason
    }

@router.get("/workflow/status")
async def get_workflow_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall workflow status and health metrics"""
    
    # Get counts for each status
    status_counts = {}
    for status in ApplicationStatus:
        count = db.query(Application).filter(Application.status == status.value).count()
        status_counts[status.value] = count
    
    # Get overdue applications count
    cutoff_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    cutoff_date = cutoff_date.replace(day=cutoff_date.day - 7)  # 7 days overdue
    
    overdue_count = db.query(Application).filter(
        and_(
            Application.status.in_([
                ApplicationStatus.SUBMITTED.value,
                ApplicationStatus.UNDER_REVIEW.value,
                ApplicationStatus.PENDING_RECOMMENDATION.value
            ]),
            Application.created_at < cutoff_date
        )
    ).count()
    
    # Get renewal applications requiring attention
    renewal_pending = db.query(Application).filter(
        and_(
            Application.is_renewal == True,
            Application.status.in_([
                ApplicationStatus.SUBMITTED.value,
                ApplicationStatus.UNDER_REVIEW.value
            ])
        )
    ).count()
    
    return {
        "workflow_health": {
            "total_active_applications": sum(status_counts.values()),
            "applications_by_status": status_counts,
            "overdue_applications": overdue_count,
            "renewal_applications_pending": renewal_pending,
            "health_score": calculate_workflow_health_score(status_counts, overdue_count)
        },
        "recommendations": generate_workflow_recommendations(status_counts, overdue_count, renewal_pending)
    }

def calculate_workflow_health_score(status_counts: Dict[str, int], overdue_count: int) -> int:
    """Calculate a health score (0-100) for the workflow"""
    total_applications = sum(status_counts.values())
    if total_applications == 0:
        return 100
    
    # Penalties for overdue applications and backlog
    overdue_penalty = min(overdue_count * 5, 50)  # Max 50 point penalty
    backlog_penalty = min(status_counts.get("submitted", 0) * 2, 30)  # Max 30 point penalty
    
    health_score = max(100 - overdue_penalty - backlog_penalty, 0)
    return health_score

def generate_workflow_recommendations(status_counts: Dict[str, int], overdue_count: int, renewal_pending: int) -> List[str]:
    """Generate actionable recommendations based on workflow state"""
    recommendations = []
    
    if overdue_count > 10:
        recommendations.append(f"High priority: {overdue_count} applications are overdue for review")
    
    if status_counts.get("submitted", 0) > 50:
        recommendations.append(f"Consider bulk processing: {status_counts['submitted']} applications awaiting initial review")
    
    if renewal_pending > 20:
        recommendations.append(f"Priority processing needed: {renewal_pending} renewal applications pending")
    
    if status_counts.get("under_review", 0) > status_counts.get("submitted", 0) * 2:
        recommendations.append("Review bottleneck detected: Many applications stuck in review phase")
    
    if not recommendations:
        recommendations.append("Workflow is operating efficiently")
    
    return recommendations