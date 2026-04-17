"""API endpoints for messaging"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role
from app.core.rate_limiting import limiter
from app.models import UserRole, Donor, Requester
from app.schemas import CurrentUser, MessageCreate, MessageResponse, MessageListResponse
from app.services.message_service import MessageService
from app.services.audit_service import AuditService
from app.utils.request_helper import get_client_ip

router = APIRouter()


@router.post("/messages", response_model=MessageResponse)
@limiter.limit("20/minute")
def send_message(
    message: MessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF, UserRole.DONOR])),
):
    """Send a message"""
    # Validate sender
    if message.sender_type == "donor":
        # Check if current user is the donor
        if current_user.role != UserRole.DONOR and current_user.role != UserRole.ADMIN and current_user.role != UserRole.STAFF:
            raise HTTPException(status_code=403, detail="Not authorized to send as donor")
    elif message.sender_type == "requester":
        # For requesters, we might need a different auth, but for now assume staff can send
        if current_user.role not in [UserRole.ADMIN, UserRole.STAFF]:
            raise HTTPException(status_code=403, detail="Not authorized to send as requester")
    
    db_message = MessageService.send_message(db, message)
    
    # Log action
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="send_message",
        entity_type="message",
        entity_id=db_message.id,
        description=f"Sent message from {message.sender_type} {message.sender_id} to {message.receiver_type} {message.receiver_id}",
        ip_address=get_client_ip(request),
    )
    
    return db_message


@router.get("/messages", response_model=MessageListResponse)
@limiter.limit("30/minute")
def get_my_messages(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF, UserRole.DONOR, UserRole.REQUESTER])),
):
    """Get messages for current authenticated user"""
    # Determine user type and ID based on role and linked profile
    user_type = None
    donor_user_id = None
    requester_user_id = None
    
    if current_user.role == UserRole.DONOR:
        donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
        if donor:
            donor_user_id = donor.id
            user_type = "donor"
    elif current_user.role == UserRole.REQUESTER:
        requester = db.query(Requester).filter(Requester.user_id == current_user.id).first()
        if requester:
            requester_user_id = requester.id
            user_type = "requester"
    
    if not user_type:
        # For admin/staff, allow querying messages but require specifying which type
        raise HTTPException(status_code=400, detail="Unable to determine user type. Admin/staff should use /messages/conversation endpoint")
    
    # Get messages
    if user_type == "donor":
        messages = MessageService.get_messages_for_user(db, donor_user_id, user_type, skip, limit)
    else:
        messages = MessageService.get_messages_for_user(db, requester_user_id, user_type, skip, limit)
    
    # Log action
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="messages_listed",
        entity_type="message",
        entity_id=0,
        description=f"User listed their messages",
        ip_address=get_client_ip(request),
    )
    
    return MessageListResponse(messages=messages)


@router.get("/messages/conversation", response_model=MessageListResponse)
@limiter.limit("30/minute")
def get_conversation(
    request: Request,
    user1_id: int,
    user1_type: str,
    user2_id: int,
    user2_type: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF])),
):
    """Get conversation between two users (admin/staff only)"""
    messages = MessageService.get_conversation(db, user1_id, user1_type, user2_id, user2_type, skip, limit)
    
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="conversation_viewed",
        entity_type="message",
        entity_id=0,
        description=f"Viewed conversation between {user1_type} {user1_id} and {user2_type} {user2_id}",
        ip_address=get_client_ip(request),
    )
    
    return MessageListResponse(messages=messages)


@router.patch("/messages/{message_id}/read")
@limiter.limit("30/minute")
def mark_message_read(
    request: Request,
    message_id: int,
    user_type: str = Query(..., description="User type: 'donor' or 'requester'"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.ADMIN, UserRole.STAFF, UserRole.DONOR, UserRole.REQUESTER])),
):
    """Mark message as read"""
    # Get user's donor or requester ID
    user_id = None
    if user_type == "donor":
        donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
        if donor:
            user_id = donor.id
    elif user_type == "requester":
        requester = db.query(Requester).filter(Requester.user_id == current_user.id).first()
        if requester:
            user_id = requester.id
    
    if not user_id:
        raise HTTPException(status_code=400, detail="Unable to find your profile")
    
    success = MessageService.mark_as_read(db, message_id, user_id, user_type)
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized or message not found")
    
    return {"message": "Message marked as read"}