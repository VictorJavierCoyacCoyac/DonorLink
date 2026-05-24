"""Chat and contact request API endpoints"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.api.dependencies import get_db, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole, Donor, Requester, ContactRequest, Message
from app.schemas import (
    CurrentUser, ContactRequestCreate, ContactRequestResponse,
    MessageResponse, MessageListResponse, ChatMessageCreate,
)
from app.services.audit_service import AuditService
from app.utils.request_helper import get_client_ip
from datetime import datetime

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


def _get_requester_profile(db: Session, user_id: int) -> Requester:
    profile = db.query(Requester).filter(Requester.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Requester profile not found")
    return profile


def _get_donor_profile(db: Session, user_id: int) -> Donor:
    profile = db.query(Donor).filter(Donor.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Donor profile not found")
    return profile


# ── Requester endpoints ──────────────────────────────────────────────────────

@router.post("/contact-requests", response_model=ContactRequestResponse, status_code=201)
@limiter.limit("10/minute")
def create_contact_request(
    data: ContactRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    """Requester sends a contact request to a donor"""
    profile = _get_requester_profile(db, current_user.id)

    donor = db.query(Donor).filter(Donor.id == data.donor_id).first()
    if not donor or donor.approval_status != "approved":
        raise HTTPException(status_code=404, detail="Donor not found")

    # Prevent duplicate pending requests
    existing = db.query(ContactRequest).filter(
        ContactRequest.requester_id == profile.id,
        ContactRequest.donor_id == data.donor_id,
        ContactRequest.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya tienes una solicitud de contacto pendiente con este donante")

    cr = ContactRequest(
        requester_id=profile.id,
        donor_id=data.donor_id,
        status="pending",
        message=data.message,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(cr)
    db.commit()
    db.refresh(cr)

    AuditService.log_action(
        db=db, user_id=current_user.id, action="contact_request_sent",
        entity_type="contact_request", entity_id=cr.id,
        description=f"Requester {profile.id} sent contact request to donor {data.donor_id}",
        ip_address=get_client_ip(request),
    )
    return cr


@router.get("/contact-requests/sent", response_model=List[ContactRequestResponse])
@limiter.limit("30/minute")
def list_sent_contact_requests(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.REQUESTER)),
):
    """Requester lists their sent contact requests"""
    profile = _get_requester_profile(db, current_user.id)
    return db.query(ContactRequest).filter(
        ContactRequest.requester_id == profile.id
    ).order_by(ContactRequest.created_at.desc()).all()


# ── Donor endpoints ──────────────────────────────────────────────────────────

@router.get("/contact-requests/received", response_model=List[ContactRequestResponse])
@limiter.limit("30/minute")
def list_received_contact_requests(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    """Donor lists contact requests they received"""
    profile = _get_donor_profile(db, current_user.id)
    return db.query(ContactRequest).filter(
        ContactRequest.donor_id == profile.id
    ).order_by(ContactRequest.created_at.desc()).all()


@router.patch("/contact-requests/{cr_id}/accept", response_model=ContactRequestResponse)
@limiter.limit("20/minute")
def accept_contact_request(
    cr_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    profile = _get_donor_profile(db, current_user.id)
    cr = db.query(ContactRequest).filter(
        ContactRequest.id == cr_id,
        ContactRequest.donor_id == profile.id,
    ).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if cr.status != "pending":
        raise HTTPException(status_code=400, detail="La solicitud ya fue procesada")

    cr.status = "accepted"
    cr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cr)

    AuditService.log_action(
        db=db, user_id=current_user.id, action="contact_request_accepted",
        entity_type="contact_request", entity_id=cr_id,
        description=f"Donor {profile.id} accepted contact request {cr_id}",
        ip_address=get_client_ip(request),
    )

    # Notify requester
    requester = db.query(Requester).filter(Requester.id == cr.requester_id).first()
    if requester and requester.user_id:
        from app.services.notification_service import NotificationService
        NotificationService.notify_user(
            db=db, user_id=requester.user_id, notification_type="request",
            title="¡Tu solicitud de chat fue aceptada!",
            content=f"El donante {profile.name} aceptó tu solicitud de contacto. Ya puedes iniciar el chat.",
        )

    return cr


@router.patch("/contact-requests/{cr_id}/reject", response_model=ContactRequestResponse)
@limiter.limit("20/minute")
def reject_contact_request(
    cr_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.DONOR)),
):
    profile = _get_donor_profile(db, current_user.id)
    cr = db.query(ContactRequest).filter(
        ContactRequest.id == cr_id,
        ContactRequest.donor_id == profile.id,
    ).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if cr.status != "pending":
        raise HTTPException(status_code=400, detail="La solicitud ya fue procesada")

    cr.status = "rejected"
    cr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cr)

    # Notify requester
    requester = db.query(Requester).filter(Requester.id == cr.requester_id).first()
    if requester and requester.user_id:
        from app.services.notification_service import NotificationService
        NotificationService.notify_user(
            db=db, user_id=requester.user_id, notification_type="alert",
            title="Tu solicitud de chat no fue aceptada",
            content=f"El donante rechazó tu solicitud de contacto. Puedes buscar otros donantes compatibles.",
        )

    return cr


# ── Chat messages ────────────────────────────────────────────────────────────

@router.get("/{cr_id}/messages", response_model=List[MessageResponse])
@limiter.limit("30/minute")
def get_chat_messages(
    cr_id: int,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.DONOR, UserRole.REQUESTER])),
):
    """Get messages for an accepted contact request"""
    cr = db.query(ContactRequest).filter(ContactRequest.id == cr_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Canal de chat no encontrado")

    # Verify the caller is a participant
    if current_user.role == UserRole.DONOR:
        profile = _get_donor_profile(db, current_user.id)
        if cr.donor_id != profile.id:
            raise HTTPException(status_code=403, detail="No autorizado")
    else:
        profile = _get_requester_profile(db, current_user.id)
        if cr.requester_id != profile.id:
            raise HTTPException(status_code=403, detail="No autorizado")

    if cr.status != "accepted":
        raise HTTPException(status_code=400, detail="El canal de chat aún no está activo")

    messages = db.query(Message).filter(
        Message.contact_request_id == cr_id
    ).order_by(Message.created_at.asc()).offset(skip).limit(limit).all()

    # Mark received messages as read
    for msg in messages:
        if not msg.is_read:
            if current_user.role == UserRole.DONOR and msg.sender_type == "requester":
                msg.is_read = True
            elif current_user.role == UserRole.REQUESTER and msg.sender_type == "donor":
                msg.is_read = True
    db.commit()

    return messages


@router.post("/{cr_id}/messages", response_model=MessageResponse, status_code=201)
@limiter.limit("30/minute")
def send_chat_message(
    cr_id: int,
    data: ChatMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role([UserRole.DONOR, UserRole.REQUESTER])),
):
    """Send a message in an accepted chat channel"""
    cr = db.query(ContactRequest).filter(ContactRequest.id == cr_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Canal de chat no encontrado")
    if cr.status != "accepted":
        raise HTTPException(status_code=400, detail="El canal de chat aún no está activo")

    if current_user.role == UserRole.DONOR:
        sender_profile = _get_donor_profile(db, current_user.id)
        if cr.donor_id != sender_profile.id:
            raise HTTPException(status_code=403, detail="No autorizado")
        sender_type = "donor"
        receiver_type = "requester"
        sender_id = sender_profile.id
        receiver_id = cr.requester_id
    else:
        sender_profile = _get_requester_profile(db, current_user.id)
        if cr.requester_id != sender_profile.id:
            raise HTTPException(status_code=403, detail="No autorizado")
        sender_type = "requester"
        receiver_type = "donor"
        sender_id = sender_profile.id
        receiver_id = cr.donor_id

    msg = Message(
        contact_request_id=cr_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        sender_type=sender_type,
        receiver_type=receiver_type,
        content=data.content,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
