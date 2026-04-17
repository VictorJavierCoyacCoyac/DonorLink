"""Service for message operations"""
from typing import List
from sqlalchemy.orm import Session
from app.models import Message
from app.schemas import MessageCreate


class MessageService:
    """Service for internal messaging"""
    
    @staticmethod
    def send_message(db: Session, message: MessageCreate) -> Message:
        """Send a message"""
        db_message = Message(**message.model_dump())
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        return db_message
    
    @staticmethod
    def get_messages_for_user(
        db: Session,
        user_id: int,
        user_type: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Message]:
        """Get messages for a user (donor or requester)"""
        if user_type == "donor":
            return db.query(Message).filter(
                ((Message.sender_id == user_id) & (Message.sender_type == "donor")) |
                ((Message.receiver_id == user_id) & (Message.receiver_type == "donor"))
            ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
        elif user_type == "requester":
            return db.query(Message).filter(
                ((Message.sender_id == user_id) & (Message.sender_type == "requester")) |
                ((Message.receiver_id == user_id) & (Message.receiver_type == "requester"))
            ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
        return []
    
    @staticmethod
    def get_conversation(
        db: Session,
        user1_id: int,
        user1_type: str,
        user2_id: int,
        user2_type: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Message]:
        """Get conversation between two users"""
        return db.query(Message).filter(
            ((Message.sender_id == user1_id) & (Message.sender_type == user1_type) &
             (Message.receiver_id == user2_id) & (Message.receiver_type == user2_type)) |
            ((Message.sender_id == user2_id) & (Message.sender_type == user2_type) &
             (Message.receiver_id == user1_id) & (Message.receiver_type == user1_type))
        ).order_by(Message.created_at.asc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def mark_as_read(db: Session, message_id: int, user_id: int, user_type: str) -> bool:
        """Mark message as read if user is the receiver"""
        message = db.query(Message).filter(Message.id == message_id).first()
        if message and message.receiver_id == user_id and message.receiver_type == user_type:
            message.is_read = True
            db.commit()
            return True
        return False