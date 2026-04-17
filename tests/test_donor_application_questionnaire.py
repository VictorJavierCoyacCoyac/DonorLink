import pytest

from app.models import AuditLog


class TestDonorApplicationQuestionnaire:
    """Tests for donor application and public questionnaire flows."""

    def test_public_questionnaire_returns_active_questions(self, client, admin_token):
        # Create an active questionnaire item as admin
        create_response = client.post(
            "/api/v1/admin/questionnaire",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "question_text": "¿Has donado sangre antes?",
                "question_type": "yes_no",
                "is_active": True,
                "sort_order": 1,
            },
        )
        assert create_response.status_code == 201
        created_question = create_response.json()
        assert created_question["question_text"] == "¿Has donado sangre antes?"
        assert created_question["is_active"] is True

        # Access the public questionnaire endpoint
        response = client.get("/api/v1/donor-questionnaire")
        assert response.status_code == 200
        questions = response.json()
        assert isinstance(questions, list)
        assert any(q["id"] == created_question["id"] for q in questions)

    def test_submit_donor_application_creates_audit_log(self, client, db):
        response = client.post(
            "/api/v1/donor-applications",
            json={
                "full_name": "Ana Pérez",
                "email": "ana.perez@example.com",
                "phone": "+34123456789",
                "address": "Calle Falsa 123",
                "blood_type": "A+",
                "age": 30,
                "weight": 68.5,
                "questionnaire_answers": {
                    "q1": "Sí",
                    "q2": "No",
                },
            },
        )
        assert response.status_code == 201
        application = response.json()
        assert application["status"] == "pending"

        audit_entry = db.query(AuditLog).filter(
            AuditLog.action == "donor_application_submitted",
            AuditLog.entity_type == "donor_application",
            AuditLog.entity_id == application["id"],
        ).first()
        assert audit_entry is not None
        assert "Donor application submitted for" in audit_entry.description
        assert audit_entry.new_values is not None
