"""Service for system configuration management"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import SystemConfig
from app.schemas import SystemConfigCreate, SystemConfigUpdate


class ConfigService:
    """Service layer for system configuration"""

    @staticmethod
    def create_config(db: Session, config: SystemConfigCreate, modified_by: int | None = None) -> SystemConfig:
        db_config = SystemConfig(
            key=config.key,
            value=config.value,
            description=config.description,
            modified_by=modified_by,
        )
        db.add(db_config)
        db.commit()
        db.refresh(db_config)
        return db_config

    @staticmethod
    def get_config(db: Session, config_id: int) -> Optional[SystemConfig]:
        return db.query(SystemConfig).filter(SystemConfig.id == config_id).first()

    @staticmethod
    def get_all_configs(db: Session, skip: int = 0, limit: int = 100) -> List[SystemConfig]:
        return db.query(SystemConfig).offset(skip).limit(limit).all()

    @staticmethod
    def update_config(db: Session, config_id: int, updates: SystemConfigUpdate, modified_by: int | None = None) -> Optional[SystemConfig]:
        db_config = db.query(SystemConfig).filter(SystemConfig.id == config_id).first()
        if not db_config:
            return None

        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_config, field, value)
        if modified_by is not None:
            db_config.modified_by = modified_by

        db.commit()
        db.refresh(db_config)
        return db_config

    @staticmethod
    def delete_config(db: Session, config_id: int) -> bool:
        db_config = db.query(SystemConfig).filter(SystemConfig.id == config_id).first()
        if not db_config:
            return False

        db.delete(db_config)
        db.commit()
        return True
