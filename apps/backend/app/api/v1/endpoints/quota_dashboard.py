"""
Quota Dashboard API endpoints for Issue #10
Real-time quota management and monitoring system
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.models.scholarship import ScholarshipType
from app.models.student import Student

router = APIRouter()

@router.get("/quota/status")
async def get_quota_status(
    scholarship_type_id: Optional[int] = Query(None),
    college_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get real-time quota status with usage tracking"""
    
    query = db.query(ScholarshipType)
    
    if scholarship_type_id:
        query = query.filter(ScholarshipType.id == scholarship_type_id)
    
    scholarship_types = query.all()
    
    quota_status = []
    
    for scholarship in scholarship_types:
        # Get application counts by status
        app_query = db.query(Application).filter(Application.scholarship_type_id == scholarship.id)
        
        if college_id:
            # Filter by college if specified (assuming student has college_id)
            app_query = app_query.join(Student).filter(Student.college_id == college_id)
        
        total_applications = app_query.count()
        approved_applications = app_query.filter(Application.status == ApplicationStatus.APPROVED.value).count()
        pending_applications = app_query.filter(
            Application.status.in_([
                ApplicationStatus.SUBMITTED.value,
                ApplicationStatus.UNDER_REVIEW.value,
                ApplicationStatus.PENDING_RECOMMENDATION.value
            ])
        ).count()
        
        # Calculate quota utilization (assuming quota is stored in scholarship config)
        max_quota = getattr(scholarship, 'max_applications_per_semester', 100)  # Default quota
        utilization_rate = (approved_applications / max_quota) * 100 if max_quota > 0 else 0
        
        quota_status.append({
            "scholarship_type_id": scholarship.id,
            "scholarship_name": scholarship.name,
            "quota": {
                "max_quota": max_quota,
                "used_quota": approved_applications,
                "available_quota": max(max_quota - approved_applications, 0),
                "utilization_rate": round(utilization_rate, 2)
            },
            "applications": {
                "total": total_applications,
                "approved": approved_applications,
                "pending": pending_applications,
                "rejected": app_query.filter(Application.status == ApplicationStatus.REJECTED.value).count()
            },
            "status": determine_quota_status(utilization_rate, pending_applications, max_quota),
            "last_updated": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "quota_status": quota_status,
        "summary": {
            "total_scholarships": len(quota_status),
            "average_utilization": round(sum(q["quota"]["utilization_rate"] for q in quota_status) / max(len(quota_status), 1), 2),
            "critical_quotas": len([q for q in quota_status if q["status"] == "critical"]),
            "warning_quotas": len([q for q in quota_status if q["status"] == "warning"])
        }
    }

@router.get("/quota/trends")
async def get_quota_trends(
    scholarship_type_id: int,
    days_back: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quota usage trends over time"""
    
    scholarship = db.query(ScholarshipType).filter(ScholarshipType.id == scholarship_type_id).first()
    if not scholarship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship type not found"
        )
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days_back)
    
    # Get daily application counts
    daily_stats = db.query(
        func.date(Application.created_at).label('date'),
        func.count(Application.id).label('total_applications'),
        func.sum(func.case([(Application.status == ApplicationStatus.APPROVED.value, 1)], else_=0)).label('approved'),
        func.sum(func.case([(Application.status == ApplicationStatus.REJECTED.value, 1)], else_=0)).label('rejected')
    ).filter(
        and_(
            Application.scholarship_type_id == scholarship_type_id,
            Application.created_at >= start_date
        )
    ).group_by(func.date(Application.created_at)).order_by(func.date(Application.created_at)).all()
    
    # Calculate cumulative usage
    cumulative_approved = 0
    trend_data = []
    
    for stat in daily_stats:
        cumulative_approved += stat.approved or 0
        trend_data.append({
            "date": stat.date.isoformat(),
            "daily_applications": stat.total_applications,
            "daily_approved": stat.approved or 0,
            "daily_rejected": stat.rejected or 0,
            "cumulative_approved": cumulative_approved,
            "quota_utilization": (cumulative_approved / getattr(scholarship, 'max_applications_per_semester', 100)) * 100
        })
    
    return {
        "scholarship_type_id": scholarship_type_id,
        "scholarship_name": scholarship.name,
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": datetime.now(timezone.utc).isoformat(),
            "days": days_back
        },
        "trends": trend_data,
        "projections": calculate_quota_projections(trend_data, scholarship)
    }

@router.get("/quota/alerts")
async def get_quota_alerts(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quota-related alerts and warnings"""
    
    alerts = []
    scholarship_types = db.query(ScholarshipType).all()
    
    for scholarship in scholarship_types:
        approved_count = db.query(Application).filter(
            and_(
                Application.scholarship_type_id == scholarship.id,
                Application.status == ApplicationStatus.APPROVED.value
            )
        ).count()
        
        pending_count = db.query(Application).filter(
            and_(
                Application.scholarship_type_id == scholarship.id,
                Application.status.in_([
                    ApplicationStatus.SUBMITTED.value,
                    ApplicationStatus.UNDER_REVIEW.value,
                    ApplicationStatus.PENDING_RECOMMENDATION.value
                ])
            )
        ).count()
        
        max_quota = getattr(scholarship, 'max_applications_per_semester', 100)
        utilization_rate = (approved_count / max_quota) * 100 if max_quota > 0 else 0
        
        # Generate alerts based on thresholds
        if utilization_rate >= 95:
            alerts.append({
                "id": f"quota_critical_{scholarship.id}",
                "type": "critical",
                "scholarship_type_id": scholarship.id,
                "scholarship_name": scholarship.name,
                "message": f"Quota critically low: {max_quota - approved_count} applications remaining",
                "utilization_rate": utilization_rate,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "requires_action": True
            })
        elif utilization_rate >= 80:
            alerts.append({
                "id": f"quota_warning_{scholarship.id}",
                "type": "warning",
                "scholarship_type_id": scholarship.id,
                "scholarship_name": scholarship.name,
                "message": f"Quota usage high: {utilization_rate:.1f}% used ({approved_count}/{max_quota})",
                "utilization_rate": utilization_rate,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "requires_action": False
            })
        
        # Alert for high pending applications
        if pending_count > max_quota * 0.3:  # More than 30% of quota pending
            alerts.append({
                "id": f"pending_high_{scholarship.id}",
                "type": "info",
                "scholarship_type_id": scholarship.id,
                "scholarship_name": scholarship.name,
                "message": f"High number of pending applications: {pending_count} awaiting review",
                "pending_count": pending_count,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "requires_action": True
            })
    
    return {
        "alerts": alerts,
        "summary": {
            "total_alerts": len(alerts),
            "critical_alerts": len([a for a in alerts if a["type"] == "critical"]),
            "warning_alerts": len([a for a in alerts if a["type"] == "warning"]),
            "info_alerts": len([a for a in alerts if a["type"] == "info"])
        }
    }

@router.get("/quota/colleges")
async def get_college_quota_breakdown(
    scholarship_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quota breakdown by college/department"""
    
    # This assumes there's a college/department structure in the student model
    college_stats = db.query(
        Student.college_id,
        func.count(Application.id).label('total_applications'),
        func.sum(func.case([(Application.status == ApplicationStatus.APPROVED.value, 1)], else_=0)).label('approved'),
        func.sum(func.case([(Application.status == ApplicationStatus.PENDING_RECOMMENDATION.value, 1)], else_=0)).label('pending')
    ).join(Application).filter(
        Application.scholarship_type_id == scholarship_type_id
    ).group_by(Student.college_id).all()
    
    college_breakdown = []
    for stat in college_stats:
        college_breakdown.append({
            "college_id": stat.college_id,
            "college_name": f"College {stat.college_id}",  # Would lookup actual name
            "applications": {
                "total": stat.total_applications,
                "approved": stat.approved or 0,
                "pending": stat.pending or 0
            },
            "approval_rate": round((stat.approved or 0) / max(stat.total_applications, 1) * 100, 2)
        })
    
    return {
        "scholarship_type_id": scholarship_type_id,
        "college_breakdown": college_breakdown,
        "summary": {
            "total_colleges": len(college_breakdown),
            "average_approval_rate": round(sum(c["approval_rate"] for c in college_breakdown) / max(len(college_breakdown), 1), 2)
        }
    }

@router.post("/quota/export")
async def export_quota_data(
    format: str = Query("json", regex="^(json|csv)$"),
    scholarship_type_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export quota data in specified format"""
    
    query = db.query(Application)
    
    if scholarship_type_id:
        query = query.filter(Application.scholarship_type_id == scholarship_type_id)
    
    if start_date:
        query = query.filter(Application.created_at >= start_date)
    
    if end_date:
        query = query.filter(Application.created_at <= end_date)
    
    applications = query.all()
    
    # Prepare export data
    export_data = []
    for app in applications:
        export_data.append({
            "application_id": app.id,
            "scholarship_type_id": app.scholarship_type_id,
            "student_id": app.student_id,
            "status": app.status,
            "is_renewal": app.is_renewal,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "reviewed_at": app.reviewed_at.isoformat() if app.reviewed_at else None,
            "amount_requested": float(app.amount_requested) if app.amount_requested else None
        })
    
    if format == "csv":
        # Would implement CSV conversion here
        return {"message": "CSV export functionality to be implemented"}
    
    return {
        "format": format,
        "export_date": datetime.now(timezone.utc).isoformat(),
        "record_count": len(export_data),
        "filters": {
            "scholarship_type_id": scholarship_type_id,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None
        },
        "data": export_data
    }

@router.get("/quota/forecasting")
async def get_quota_forecasting(
    scholarship_type_id: int,
    forecast_days: int = Query(30, ge=1, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Provide quota usage forecasting based on historical data"""
    
    scholarship = db.query(ScholarshipType).filter(ScholarshipType.id == scholarship_type_id).first()
    if not scholarship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scholarship type not found"
        )
    
    # Get historical data for trend analysis
    lookback_days = min(forecast_days * 3, 180)  # Use 3x forecast period for analysis
    start_date = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    
    historical_apps = db.query(Application).filter(
        and_(
            Application.scholarship_type_id == scholarship_type_id,
            Application.created_at >= start_date
        )
    ).count()
    
    # Simple linear projection based on historical average
    daily_average = historical_apps / lookback_days
    projected_applications = daily_average * forecast_days
    
    current_approved = db.query(Application).filter(
        and_(
            Application.scholarship_type_id == scholarship_type_id,
            Application.status == ApplicationStatus.APPROVED.value
        )
    ).count()
    
    max_quota = getattr(scholarship, 'max_applications_per_semester', 100)
    projected_quota_usage = current_approved + (projected_applications * 0.7)  # Assume 70% approval rate
    
    return {
        "scholarship_type_id": scholarship_type_id,
        "scholarship_name": scholarship.name,
        "forecast_period_days": forecast_days,
        "current_status": {
            "approved_applications": current_approved,
            "available_quota": max(max_quota - current_approved, 0),
            "utilization_rate": (current_approved / max_quota) * 100 if max_quota > 0 else 0
        },
        "projections": {
            "daily_application_rate": round(daily_average, 2),
            "projected_new_applications": round(projected_applications),
            "projected_approvals": round(projected_applications * 0.7),
            "projected_quota_usage": round(projected_quota_usage),
            "projected_utilization_rate": round((projected_quota_usage / max_quota) * 100, 2) if max_quota > 0 else 0
        },
        "recommendations": generate_forecast_recommendations(projected_quota_usage, max_quota, forecast_days)
    }

def determine_quota_status(utilization_rate: float, pending_count: int, max_quota: int) -> str:
    """Determine quota status based on utilization and pending applications"""
    if utilization_rate >= 95:
        return "critical"
    elif utilization_rate >= 80 or (pending_count > max_quota * 0.3):
        return "warning"
    elif utilization_rate >= 50:
        return "normal"
    else:
        return "healthy"

def calculate_quota_projections(trend_data: List[Dict], scholarship: ScholarshipType) -> Dict[str, Any]:
    """Calculate quota projections based on trend data"""
    if not trend_data:
        return {"message": "Insufficient data for projections"}
    
    # Simple linear regression on recent approvals
    recent_approvals = [d["daily_approved"] for d in trend_data[-7:]]  # Last 7 days
    if recent_approvals:
        avg_daily_approvals = sum(recent_approvals) / len(recent_approvals)
        days_to_quota_exhaustion = (getattr(scholarship, 'max_applications_per_semester', 100) - trend_data[-1]["cumulative_approved"]) / max(avg_daily_approvals, 0.1)
    else:
        days_to_quota_exhaustion = float('inf')
    
    return {
        "average_daily_approvals": round(avg_daily_approvals, 2) if recent_approvals else 0,
        "estimated_days_to_quota_exhaustion": round(days_to_quota_exhaustion) if days_to_quota_exhaustion != float('inf') else None,
        "projected_exhaustion_date": (datetime.now(timezone.utc) + timedelta(days=days_to_quota_exhaustion)).isoformat() if days_to_quota_exhaustion != float('inf') else None
    }

def generate_forecast_recommendations(projected_usage: float, max_quota: int, forecast_days: int) -> List[str]:
    """Generate actionable recommendations based on forecast"""
    recommendations = []
    
    projected_rate = (projected_usage / max_quota) * 100 if max_quota > 0 else 0
    
    if projected_rate >= 100:
        recommendations.append(f"Critical: Quota expected to be exceeded in {forecast_days} days")
        recommendations.append("Consider increasing quota limits or implementing stricter approval criteria")
    elif projected_rate >= 90:
        recommendations.append(f"Warning: Quota utilization expected to reach {projected_rate:.1f}% in {forecast_days} days")
        recommendations.append("Monitor closely and prepare contingency plans")
    elif projected_rate >= 70:
        recommendations.append(f"Normal: Steady quota usage projected ({projected_rate:.1f}% in {forecast_days} days)")
    else:
        recommendations.append(f"Healthy: Low quota utilization projected ({projected_rate:.1f}% in {forecast_days} days)")
        recommendations.append("Consider promotional activities to increase awareness")
    
    return recommendations