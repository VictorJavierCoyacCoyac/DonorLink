"""API endpoints for requester management"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role
from app.core.rate_limiting import limiter
from app.models import User, UserRole
from app.schemas import CurrentUser
from app.schemas import (
    RequesterCreate,
    RequesterUpdate,
    RequesterResponse,
    RequesterRegister,
    MessageCreate,
    MessageResponse,
    MessageListResponse
)
from app.services.requester_service import RequesterService
from app.services.message_service import MessageService
from app.services.audit_service import AuditService
from app.utils.request_helper import get_client_ip

router = APIRouter()


@router.post("/requesters", response_model=RequesterResponse)
@limiter.limit("10/minute")
def create_requester(
    requester: RequesterCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Create a new requester (requires ADMIN or STAFF role)"""
    try:
        db_requester = RequesterService.create_requester(db, requester)
        
        # Audit log
        AuditService.log_action(
            db=db,
            user_id=current_user.id,
            action="create",
            entity_type="requester",
            entity_id=db_requester.id,
            new_values=requester.model_dump(),
            description=f"Created requester {db_requester.name}",
            ip_address=get_client_ip(request),
        )
        
        return db_requester
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/requesters", response_model=List[RequesterResponse])
@limiter.limit("30/minute")
def get_requesters(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """List all requesters with pagination (requires ADMIN or STAFF role)"""
    return RequesterService.get_all_requesters(db, skip=skip, limit=limit)


@router.get("/requesters/{requester_id}", response_model=RequesterResponse)
@limiter.limit("30/minute")
def get_requester(
    requester_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Get requester by ID (requires ADMIN or STAFF role)"""
    db_requester = RequesterService.get_requester(db, requester_id)
    if not db_requester:
        raise HTTPException(status_code=404, detail="Requester not found")
    return db_requester


@router.patch("/requesters/{requester_id}", response_model=RequesterResponse)
@limiter.limit("10/minute")
def update_requester(
    requester_id: int,
    requester: RequesterUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Update a requester (requires ADMIN or STAFF role)"""
    db_requester = RequesterService.update_requester(db, requester_id, requester)
    if not db_requester:
        raise HTTPException(status_code=404, detail="Requester not found")
    
    # Audit log
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="update",
        entity_type="requester",
        entity_id=requester_id,
        new_values=requester.model_dump(exclude_unset=True),
        description=f"Updated requester {db_requester.name}",
        ip_address=get_client_ip(request),
    )
    
    return db_requester


@router.delete("/requesters/{requester_id}")
@limiter.limit("5/minute")
def delete_requester(
    requester_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN])),
):
    """Delete a requester (requires ADMIN role)"""
    db_requester = RequesterService.get_requester(db, requester_id)
    if not db_requester:
        raise HTTPException(status_code=404, detail="Requester not found")
    
    success = RequesterService.delete_requester(db, requester_id)
    if not success:
        raise HTTPException(status_code=404, detail="Requester not found")
    
    # Audit log
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="requester",
        entity_id=requester_id,
        description=f"Deleted requester {db_requester.name}",
        ip_address=get_client_ip(request),
    )
    
    return {"message": "Requester deleted successfully"}


@router.post("/requesters/{requester_id}/messages", response_model=MessageResponse)
@limiter.limit("20/minute")
def send_message_to_requester(
    requester_id: int,
    message: MessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Send message to requester (requires ADMIN or STAFF role)"""
    # Validate that current user is a donor (assuming staff/admin can act as donors)
    # For simplicity, allow staff to send as donor
    message.sender_type = "donor"  # Assuming sender is donor
    message.receiver_type = "requester"
    message.receiver_id = requester_id
    
    db_message = MessageService.send_message(db, message)
    
    # Audit log
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="send_message",
        entity_type="message",
        entity_id=db_message.id,
        description=f"Sent message to requester {requester_id}",
        ip_address=get_client_ip(request),
    )
    
    return db_message


@router.get("/requesters/{requester_id}/messages", response_model=MessageListResponse)
@limiter.limit("30/minute")
def get_requester_messages(
    requester_id: int,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Get messages for requester (requires ADMIN or STAFF role)"""
    messages = MessageService.get_messages_for_user(db, requester_id, "requester", skip, limit)
    return MessageListResponse(messages=messages)


@router.post("/requesters/register", response_model=RequesterResponse, status_code=201)
@limiter.limit("3/minute")
def register_requester(
    requester_data: RequesterRegister,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Register a new requester with account creation.
    
    - **username**: Unique username (3-100 characters)
    - **password**: Minimum 8 characters
    - **email**: Valid email address
    - **name**: Full name
    - **blood_type_needed**: Blood type needed (O-, O+, A-, A+, B-, B+, AB-, AB+)
    - **urgency**: Urgency level (normal, urgent, etc.)
    """
    try:
        ip_address = get_client_ip(request)
        requester, user_id = RequesterService.register_requester_with_user(db, requester_data, ip_address=ip_address)
        
        # Log successful registration
        AuditService.log_action(
            db=db,
            user_id=user_id,
            action="requester_registration_submitted",
            entity_type="requester",
            entity_id=requester.id,
            description=f"Requester registration submitted for {requester.email}",
            ip_address=ip_address,
        )
        
        return requester
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))