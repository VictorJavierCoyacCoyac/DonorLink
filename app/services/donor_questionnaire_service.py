"""Service for donor questionnaire management"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import DonorQuestionnaire
from app.schemas import DonorQuestionnaireCreate


class DonorQuestionnaireService:
    """Service layer for donor questionnaire operations"""

    @staticmethod
    def create_question(db: Session, question_data: DonorQuestionnaireCreate) -> DonorQuestionnaire:
        question = DonorQuestionnaire(
            question_text=question_data.question_text,
            question_type=question_data.question_type,
            is_active=question_data.is_active if question_data.is_active is not None else True,
            sort_order=question_data.sort_order or 1,
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        return question

    @staticmethod
    def get_question(db: Session, question_id: int) -> Optional[DonorQuestionnaire]:
        return db.query(DonorQuestionnaire).filter(DonorQuestionnaire.id == question_id).first()

    @staticmethod
    def list_questions(db: Session, active_only: bool = False) -> List[DonorQuestionnaire]:
        query = db.query(DonorQuestionnaire)
        if active_only:
            query = query.filter(DonorQuestionnaire.is_active == True)
        return query.order_by(DonorQuestionnaire.sort_order.asc(), DonorQuestionnaire.created_at.desc()).all()

    @staticmethod
    def update_question(db: Session, question_id: int, question_data: DonorQuestionnaireCreate) -> Optional[DonorQuestionnaire]:
        question = DonorQuestionnaireService.get_question(db, question_id)
        if not question:
            return None
        question.question_text = question_data.question_text
        question.question_type = question_data.question_type
        question.is_active = question_data.is_active if question_data.is_active is not None else question.is_active
        question.sort_order = question_data.sort_order or question.sort_order
        db.commit()
        db.refresh(question)
        return question

    @staticmethod
    def delete_question(db: Session, question_id: int) -> bool:
        question = DonorQuestionnaireService.get_question(db, question_id)
        if not question:
            return False
        question.is_active = False
        db.commit()
        return True
