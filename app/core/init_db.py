"""Data initialization script for development and testing"""
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Donor, BloodType, User, UserRole, Requester, SystemConfig, DonorQuestionnaire
from app.core.security import SecurityService
from app.services.user_service import UserService


def init_admin_user(db: Session):
    """Initialize admin user for development"""
    # Check if admin user already exists
    admin_user = db.query(User).filter(User.username == "admin").first()
    if admin_user:
        return
    
    # Create admin user
    admin = User(
        username="admin",
        email="admin@donorlink.com",
        hashed_password=SecurityService.hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print("✓ Initialized admin user (username: admin, password: admin123)")


def init_sample_data(db: Session):
    """Initialize sample donor data for testing"""
    if os.getenv("DATABASE_URL", "").startswith("postgresql"):
        return  # skip sample data in production

    # Check if data already exists
    if db.query(Donor).count() > 0:
        return
    
    sample_donors = [
        Donor(
            name="Juan García",
            email="juan.garcia@example.com",
            phone="+1234567890",
            address="Calle Principal 123, Ciudad",
            blood_type=BloodType.O_POSITIVE,
            age=28,
            weight=75.5,
            last_donation_date=datetime.utcnow() - timedelta(days=100),
        ),
        Donor(
            name="María López",
            email="maria.lopez@example.com",
            phone="+0987654321",
            address="Avenida Central 456, Ciudad",
            blood_type=BloodType.A_NEGATIVE,
            age=35,
            weight=62.0,
            last_donation_date=datetime.utcnow() - timedelta(days=200),
        ),
        Donor(
            name="Carlos Rodríguez",
            email="carlos.rodriguez@example.com",
            phone="+1122334455",
            address="Plaza Mayor 789, Ciudad",
            blood_type=BloodType.B_POSITIVE,
            age=42,
            weight=82.0,
            last_donation_date=datetime.utcnow() - timedelta(days=60),
        ),
        Donor(
            name="Ana Martínez",
            email="ana.martinez@example.com",
            phone="+5566778899",
            address="Calle Secundaria 101, Ciudad",
            blood_type=BloodType.AB_POSITIVE,
            age=31,
            weight=58.0,
            last_donation_date=None,
        ),
        Donor(
            name="Miguel Sánchez",
            email="miguel.sanchez@example.com",
            phone="+4433221100",
            address="Boulevard Norte 202, Ciudad",
            blood_type=BloodType.O_NEGATIVE,
            age=25,
            weight=68.5,
            last_donation_date=datetime.utcnow() - timedelta(days=30),
        ),
    ]
    
    db.add_all(sample_donors)
    db.commit()
    print(f"✓ Initialized {len(sample_donors)} sample donors")
    
    # Initialize sample requesters
    if db.query(Requester).count() == 0:
        sample_requesters = [
            Requester(
                name="Hospital Central",
                email="hospital@central.com",
                phone="+1112223333",
                address="Hospital Central, Ciudad",
                blood_type_needed=BloodType.O_NEGATIVE,
                urgency="urgent",
            ),
            Requester(
                name="Clínica San José",
                email="clinica@sanjose.com",
                phone="+4445556666",
                address="Clínica San José, Ciudad",
                blood_type_needed=BloodType.A_POSITIVE,
                urgency="normal",
            ),
        ]
        
        db.add_all(sample_requesters)
        db.commit()
        print(f"✓ Initialized {len(sample_requesters)} sample requesters")
    
    # Initialize system configuration defaults
    if db.query(SystemConfig).count() == 0:
        sample_configs = [
            SystemConfig(
                key="maintenance_mode",
                value="false",
                description="Enable or disable maintenance mode",
                modified_by=None,
            ),
            SystemConfig(
                key="email_notifications",
                value="true",
                description="Enable or disable email notifications",
                modified_by=None,
            ),
            SystemConfig(
                key="max_search_results",
                value="100",
                description="Maximum number of search results returned by default",
                modified_by=None,
            ),
        ]
        db.add_all(sample_configs)
        db.commit()
        print(f"✓ Initialized {len(sample_configs)} default system configurations")


def init_questionnaire(db: Session):
    """Initialize default health questionnaire questions for donor registration"""
    
    # Check if questions already exist
    if db.query(DonorQuestionnaire).count() > 0:
        return
    
    questions = [
        DonorQuestionnaire(
            question_text="¿Tienes antecedentes de anemia o problemas de hemoglobina?",
            question_type="yes_no",
            is_active=True,
            sort_order=1,
        ),
        DonorQuestionnaire(
            question_text="¿Has estado diagnosticado con alguna enfermedad de transmisión sexual en los últimos 12 meses?",
            question_type="yes_no",
            is_active=True,
            sort_order=2,
        ),
        DonorQuestionnaire(
            question_text="¿Has viajado a zonas con malaria, dengue o Zika en los últimos 6 meses?",
            question_type="yes_no",
            is_active=True,
            sort_order=3,
        ),
        DonorQuestionnaire(
            question_text="¿Padeces de hipertensión arterial o presión arterial alta?",
            question_type="yes_no",
            is_active=True,
            sort_order=4,
        ),
        DonorQuestionnaire(
            question_text="¿Has recibido alguna vacuna en los últimos 7 días?",
            question_type="yes_no",
            is_active=True,
            sort_order=5,
        ),
        DonorQuestionnaire(
            question_text="¿Tienes alergias conocidas a medicamentos o proteínas de sangre?",
            question_type="yes_no",
            is_active=True,
            sort_order=6,
        ),
        DonorQuestionnaire(
            question_text="¿Has donado sangre anteriormente? Si es así, ¿cuándo fue la última donación?",
            question_type="text",
            is_active=True,
            sort_order=7,
        ),
        DonorQuestionnaire(
            question_text="¿Actualmente estás tomando algún medicamento? Si es así, ¿cuál?",
            question_type="text",
            is_active=True,
            sort_order=8,
        ),
        DonorQuestionnaire(
            question_text="¿Tienes antecedentes de cáncer o quimioterapia?",
            question_type="yes_no",
            is_active=True,
            sort_order=9,
        ),
        DonorQuestionnaire(
            question_text="¿Has tenido contacto cercano con personas diagnosticadas con COVID-19 en los últimos 14 días?",
            question_type="yes_no",
            is_active=True,
            sort_order=10,
        ),
    ]
    
    db.add_all(questions)
    db.commit()
    print(f"✓ Initialized {len(questions)} donor questionnaire questions")
