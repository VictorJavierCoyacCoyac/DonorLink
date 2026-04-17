"""API endpoints for donor questionnaire management"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.api.dependencies import get_db, require_role
from app.core.rate_limiting import limiter
from app.models import UserRole
from app.schemas import (
    DonorQuestionnaireCreate,
    DonorQuestionnaireResponse,
    CurrentUser,
)
from app.services.donor_questionnaire_service import DonorQuestionnaireService
from app.services.audit_service import AuditService
from app.utils.request_helper import get_client_ip

router = APIRouter(prefix="/api/v1/admin/questionnaire", tags=["questionnaire"])
public_router = APIRouter(prefix="/api/v1/donor-questionnaire", tags=["donor_questionnaire"])


@router.get("", response_model=list[DonorQuestionnaireResponse])
@limiter.limit("30/minute")
def list_questionnaire(
    request: Request,
    active_only: bool = Query(False, description="Return only active questions"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    questions = DonorQuestionnaireService.list_questions(db, active_only=active_only)
    return questions


@router.post("", response_model=DonorQuestionnaireResponse, status_code=201)
@limiter.limit("10/minute")
def create_question(
    question_data: DonorQuestionnaireCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    question = DonorQuestionnaireService.create_question(db, question_data)
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="questionnaire_created",
        entity_type="donor_questionnaire",
        entity_id=question.id,
        new_values=question_data.model_dump(),
        description=f"Created questionnaire item {question.id}",
        ip_address=get_client_ip(request),
    )
    return question


@router.put("/{question_id}", response_model=DonorQuestionnaireResponse)
@limiter.limit("10/minute")
def update_question(
    question_id: int,
    question_data: DonorQuestionnaireCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    question = DonorQuestionnaireService.update_question(db, question_id, question_data)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="questionnaire_updated",
        entity_type="donor_questionnaire",
        entity_id=question_id,
        new_values=question_data.model_dump(),
        description=f"Updated questionnaire item {question_id}",
        ip_address=get_client_ip(request),
    )
    return question


@router.delete("/{question_id}")
@limiter.limit("10/minute")
def delete_question(
    question_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN)),
):
    success = DonorQuestionnaireService.delete_question(db, question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    AuditService.log_action(
        db=db,
        user_id=current_user.id,
        action="questionnaire_deactivated",
        entity_type="donor_questionnaire",
        entity_id=question_id,
        description=f"Deactivated questionnaire item {question_id}",
        ip_address=get_client_ip(request),
    )
    return {"message": "Question deactivated successfully"}


@public_router.get("", response_model=list[DonorQuestionnaireResponse])
@limiter.limit("30/minute")
def get_public_questionnaire(
    request: Request,
    active_only: bool = Query(True, description="Return only active questions"),
    db: Session = Depends(get_db),
):
    """Public endpoint to fetch donor questionnaire items for applicants."""
    questions = DonorQuestionnaireService.list_questions(db, active_only=active_only)
    return questions
