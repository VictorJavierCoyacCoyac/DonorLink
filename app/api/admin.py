"""Admin endpoints for user management, system configuration, and monitoring"""
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.api.dependencies import get_db, require_role
from app.core.rate_limiting import limiter
from app.models import User, SystemConfig, UserRole
from app.schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    SystemConfigCreate,
    SystemConfigUpdate,
    SystemConfigResponse,
    SystemConfigListResponse,
    MetricsResponse,
    CurrentUser,
    DonorResponse,
)
from app.services.user_service import UserService
from app.services.donor_service import DonorService
from app.services.config_service import ConfigService
from app.services.admin_service import AdminService
from app.services.audit_service import AuditService
from app.utils.request_helper import get_client_ip

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# USER MANAGEMENT
# ---------------------------------------------------------------------------


@router.get("/users", response_model=UserListResponse)
@limiter.limit("30/minute")
def list_users(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """List all users (ADMIN only)"""
    users = UserService.get_all_users(db, skip=skip, limit=limit)
    total = db.query(User).count()
    return UserListResponse(users=users, total=total, skip=skip, limit=limit)


@router.post("/users", response_model=UserResponse, status_code=201)
@limiter.limit("10/minute")
def create_user(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Create a new user (ADMIN only)"""
    try:
        db_user = UserService.create_user(
            db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            role=user_data.role,
        )
        AuditService.log_action(
            db=db,
            user_id=current_user.id,
            action="create",
            entity_type="user",
            entity_id=db_user.id,
            new_values=user_data.model_dump(exclude={"password"}),
            description=f"Created user {db_user.username}",
            ip_address=get_client_ip(request),
        )
        return db_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}", response_model=UserResponse)
@limiter.limit("30/minute")
def get_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Get a user by ID (ADMIN only)"""
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
@limiter.limit("10/minute")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Update user information (ADMIN only)"""
    db_user = UserService.update_user(db, user_id, user_data)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="user",
        entity_id=user_id,
        new_values=user_data.model_dump(exclude_unset=True, exclude={"password"}),
        description=f"Updated user {db_user.username}",
        ip_address=get_client_ip(request),
    )
    return db_user


@router.post("/users/{user_id}/deactivate", response_model=UserResponse)
@limiter.limit("10/minute")
def deactivate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Deactivate a user account (ADMIN only)"""
    user = UserService.deactivate_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="deactivate",
        entity_type="user",
        entity_id=user_id,
        description=f"Deactivated user {user.username}",
        ip_address=get_client_ip(request),
    )
    return user


@router.post("/users/{user_id}/activate", response_model=UserResponse)
@limiter.limit("10/minute")
def activate_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Activate a user account (ADMIN only)"""
    user = UserService.activate_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="activate",
        entity_type="user",
        entity_id=user_id,
        description=f"Activated user {user.username}",
        ip_address=get_client_ip(request),
    )
    return user


@router.delete("/users/{user_id}")
@limiter.limit("5/minute")
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Delete user account permanently (ADMIN only)"""
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not UserService.delete_user(db, user_id):
        raise HTTPException(status_code=400, detail="Unable to delete user")
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="user",
        entity_id=user_id,
        description=f"Deleted user {user.username}",
        ip_address=get_client_ip(request),
    )
    return {"message": "User deleted successfully"}


# ---------------------------------------------------------------------------
# DONOR MANAGEMENT (Self-registered donors)
# ---------------------------------------------------------------------------


@router.get("/donors/export")
@limiter.limit("10/minute")
def export_donors_csv(
    request: Request,
    status: str = Query("approved", description="Filter by approval status"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Export approved donors as CSV"""
    from app.models import Donor
    donors = db.query(Donor).filter(Donor.approval_status == status).order_by(Donor.name).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Nombre", "Email", "Teléfono", "Dirección", "Tipo de Sangre", "Edad", "Peso (kg)", "Última Donación", "Estado", "Fecha Registro"])
    for d in donors:
        bt = str(d.blood_type).replace("BloodType.", "").replace("_POSITIVE", "+").replace("_NEGATIVE", "-").replace("_", "")
        writer.writerow([
            d.id, d.name, d.email, d.phone or "", d.address or "",
            bt, d.age, d.weight,
            d.last_donation_date.strftime("%Y-%m-%d") if d.last_donation_date else "",
            d.approval_status,
            d.created_at.strftime("%Y-%m-%d"),
        ])

    output.seek(0)
    filename = f"donantes_{status}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/donors/pending", response_model=List[DonorResponse])
@limiter.limit("30/minute")
def list_pending_donors(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """List all pending donor registrations (ADMIN only)"""
    from app.models import Donor
    donors = db.query(Donor).filter(Donor.approval_status == "pending").offset(skip).limit(limit).all()
    return donors


@router.patch("/donors/{donor_id}/approve", response_model=DonorResponse)
@limiter.limit("10/minute")
def approve_donor(
    donor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Approve a pending donor registration (ADMIN only)"""
    try:
        donor = DonorService.approve_donor(db, donor_id, admin_user_id=current_user.id, ip_address=get_client_ip(request))
        if not donor:
            raise HTTPException(status_code=404, detail="Donor not found")
        if donor.user_id:
            from app.services.notification_service import NotificationService
            NotificationService.notify_user(
                db=db, user_id=donor.user_id, notification_type="system",
                title="¡Tu solicitud fue aprobada!",
                content=f"Hola {donor.name}, tu registro como donante ha sido aprobado. Ya puedes recibir solicitudes de donación.",
            )
        return donor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/donors/{donor_id}/reject", response_model=DonorResponse)
@limiter.limit("10/minute")
def reject_donor(
    donor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Reject a pending donor registration (ADMIN only)"""
    try:
        donor = DonorService.reject_donor(db, donor_id, admin_user_id=current_user.id, ip_address=get_client_ip(request))
        if not donor:
            raise HTTPException(status_code=404, detail="Donor not found")
        if donor.user_id:
            from app.services.notification_service import NotificationService
            NotificationService.notify_user(
                db=db, user_id=donor.user_id, notification_type="alert",
                title="Tu solicitud no fue aprobada",
                content=f"Hola {donor.name}, lamentablemente tu registro como donante no pudo ser aprobado en este momento. Puedes contactar al administrador para más información.",
            )
        return donor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/donors/{donor_id}")
@limiter.limit("5/minute")
def delete_donor(
    donor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Delete a donor profile and associated user account (ADMIN only)"""
    from app.models import Donor
    
    donor = DonorService.get_donor(db, donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    # Delete associated user if linked
    if donor.user_id:
        user = UserService.get_user_by_id(db, donor.user_id)
        if user:
            UserService.delete_user(db, donor.user_id)
    
    # Delete donor
    if not DonorService.delete_donor(db, donor_id, user_id=current_user.id, ip_address=get_client_ip(request)):
        raise HTTPException(status_code=400, detail="Unable to delete donor")
    
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="donor",
        entity_id=donor_id,
        description=f"Deleted donor {donor.name}",
        ip_address=get_client_ip(request),
    )
    return {"message": "Donor deleted successfully"}


# ---------------------------------------------------------------------------
# SYSTEM CONFIGURATION
# ---------------------------------------------------------------------------


@router.get("/config", response_model=SystemConfigListResponse)
@limiter.limit("30/minute")
def list_system_config(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    configs = ConfigService.get_all_configs(db, skip=skip, limit=limit)
    total = db.query(SystemConfig).count()
    return SystemConfigListResponse(configs=configs, total=total, skip=skip, limit=limit)


@router.post("/config", response_model=SystemConfigResponse, status_code=201)
@limiter.limit("10/minute")
def create_system_config(
    config_data: SystemConfigCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    db_config = ConfigService.create_config(db, config_data, modified_by=current_user.id)
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="create",
        entity_type="system_config",
        entity_id=db_config.id,
        new_values=config_data.model_dump(),
        description=f"Created system configuration {db_config.key}",
        ip_address=get_client_ip(request),
    )
    return db_config


@router.get("/config/{config_id}", response_model=SystemConfigResponse)
@limiter.limit("30/minute")
def get_system_config(
    config_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    config = ConfigService.get_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return config


@router.patch("/config/{config_id}", response_model=SystemConfigResponse)
@limiter.limit("10/minute")
def update_system_config(
    config_id: int,
    config_data: SystemConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    config = ConfigService.update_config(db, config_id, config_data, modified_by=current_user.id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="system_config",
        entity_id=config_id,
        new_values=config_data.model_dump(exclude_unset=True),
        description=f"Updated system configuration {config.key}",
        ip_address=get_client_ip(request),
    )
    return config


@router.delete("/config/{config_id}")
@limiter.limit("5/minute")
def delete_system_config(
    config_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    config = ConfigService.get_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    if not ConfigService.delete_config(db, config_id):
        raise HTTPException(status_code=400, detail="Unable to delete configuration")
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="system_config",
        entity_id=config_id,
        description=f"Deleted system configuration {config.key}",
        ip_address=get_client_ip(request),
    )
    return {"message": "Configuration deleted successfully"}


# ---------------------------------------------------------------------------
# MONITORING AND HEALTH
# ---------------------------------------------------------------------------


@router.get("/metrics", response_model=MetricsResponse)
@limiter.limit("30/minute")
def get_system_metrics(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Get key system metrics and health summary (ADMIN only)"""
    return AdminService.get_system_metrics(db)


@router.get("/health")
@limiter.limit("30/minute")
def get_system_health(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    """Return a quick health check for the API and database"""
    # Minimal health check by querying counts
    metrics = AdminService.get_system_metrics(db)
    return {
        "status": "ok",
        "database": "connected",
        "metrics": metrics,
    }
