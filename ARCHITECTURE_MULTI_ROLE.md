# Arquitectura Multi-Rol - DonorLink

## 1. ROLES DEL SISTEMA

### ADMIN (Administrador)
- Gestión de usuarios (crear, editar, eliminar, activar/desactivar)
- Gestión de configuración del sistema
- Revisión y aprobación de solicitudes de donadores
- Acceso completo a auditoría
- Gestión de cuestionarios y preguntas

### DONOR (Donador)
- Versión INICIAL: Cuestionario anónimo + Datos personales
  - Estado: `pending_approval` → Espera que admin apruebe
  - Luego: Se crea automáticamente la cuenta
  - Acciones posteriores: Ver su perfil, historial de donaciones

### REQUESTER (Buscador de Donadores)
- Ver lista de donadores aprobados
- Filtrar por tipo de sangre, disponibilidad
- Ver detalles completos del donador
- Ver historial de donaciones del donador
- Crear solicitudes de donación específicas
- Ver estado de sus solicitudes

---

## 2. NUEVOS MODELOS A AGREGAR

### DonorApplication (Solicitud de Registro Anónima)
```python
class DonorApplication(Base):
    id: int (PK)
    email: str (unique)
    full_name: str
    phone: str
    age: int
    weight: float (kg)
    blood_type: BloodType enum
    address: str
    
    # Respuestas del cuestionario
    questionnaire_answers: JSON (stored as string)
    
    # States: pending, approved, rejected
    status: str (default: "pending")
    
    # Admin quien aprueba/rechaza
    reviewed_by: int (FK -> users.id, nullable)
    review_notes: str (nullable)
    
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime (nullable)
```

### DonationRequest
```python
class DonationRequest(Base):
    id: int (PK)
    requester_id: int (FK -> users.id)
    donor_id: int (FK -> donors.id)
    request_status: str (pending, approved, rejected, completed)
    reason: str
    urgency_level: str (normal, urgent)
    created_at: datetime
    updated_at: datetime
```

### DonorQuestionnaire (Template de preguntas)
```python
class DonorQuestionnaire(Base):
    id: int (PK)
    question_text: str
    question_type: str (yes_no, text, number, select)
    is_active: bool
    order: int
    created_at: datetime
```

---

## 3. FLUJOS DE TRABAJO

### Flujo: Registrar como Donador
1. Usuario anónimo va a `/register/donor`
2. Completa cuestionario + datos personales
3. Se crea `DonorApplication` con estado `pending`
4. **Auditoría**: "donor_application_submitted"
5. Admin revisa en dashboard
6. Si aprobado:
   - Se crea automáticamente `User` (role: DONOR)
   - Se crea `Donor` 
   - `DonorApplication` pasa a `approved`
   - **Auditoría**: "donor_application_approved" (por admin)
   - Email a solicitante con credenciales
7. Si rechazado:
   - `DonorApplication` pasa a `rejected`
   - **Auditoría**: "donor_application_rejected"

### Flujo: Requester busca Donadores
1. Usuario login como REQUESTER
2. Dashboard con filtros de búsqueda
3. Ve lista de donadores aprobados
4. Puede crear `DonationRequest` a un donador específico
5. **Auditoría**: Todas las búsquedas, filtros, solicitudes creadas

---

## 4. ENDPOINTS A CREAR

### Registro Anónimo de Donador
```
POST /api/v1/donors/apply-anonymous
  -> Crea DonorApplication + registra el envío

GET /api/v1/donors/questionnaire
  -> Obtiene preguntas activas

GET /api/v1/donors/applications/{app_id}
  -> Consulta estado de solicitud (con token anónimo si tiene)
```

### Gestión de Solicitudes de Donador (ADMIN)
```
GET /api/v1/admin/donor-applications
  -> Lista apps pendientes

PATCH /api/v1/admin/donor-applications/{id}/approve
  -> Aprueba y crea usuario

PATCH /api/v1/admin/donor-applications/{id}/reject
  -> Rechaza con notas
```

### API para REQUESTER
```
GET /api/v1/requester/donors
  -> Lista donadores aprobados (con filtros)

GET /api/v1/requester/donors/{id}
  -> Detalles del donador + historial

POST /api/v1/requester/requests
  -> Crear solicitud de donación

GET /api/v1/requester/requests
  -> Ver sus solicitudes
```

### Gestión de Cuestionario (ADMIN)
```
GET /api/v1/admin/questionnaire
  -> Ver todas las preguntas

POST /api/v1/admin/questionnaire
  -> Crear nueva pregunta

PUT /api/v1/admin/questionnaire/{id}
  -> Editar pregunta

DELETE /api/v1/admin/questionnaire/{id}
  -> Desactivar pregunta
```

---

## 5. AUDITORÍA POR ROL

### DONOR
- `donor_app_submitted` - Envío de solicitud anónima
- `donor_profile_viewed` - Vio su perfil
- `donor_password_changed` - Cambió contraseña

### REQUESTER
- `donor_search` - Búsqueda realizada (qué filtros usó)
- `donor_viewed` - Vio detalles de un donador
- `donation_request_created` - Creó solicitud
- `donation_request_viewed` - Vio estado de solicitud

### ADMIN
- `donor_app_reviewed` - Aprobó/Rechazó solicitud
- `questionnaire_modified` - Modificó preguntas
- `user_created/modified/deleted`

---

## 6. ESTRUCTURA DE CARPETAS (nuevos archivos)

```
app/
├── api/
│   ├── donor_applications.py  (endpoints anónimos + requesters)
│   ├── questionnaire.py       (endpoints ADMIN para preguntas)
│   └── requester.py           (endpoints específicos REQUESTER)
├── models/__init__.py         (agregar modelos nuevos)
├── schemas/__init__.py        (agregar schemas)
├── services/
│   ├── donor_application_service.py
│   ├── questionnaire_service.py
│   └── requester_service.py
```

---

## 7. PRIORIDADES DE IMPLEMENTACIÓN

1. ✅ Actualizar modelos (DonorApplication, DonationRequest, DonorQuestionnaire)
2. ✅ Crear servicios para cada flujo
3. ✅ Endpoints de registro anónimo de donador
4. ✅ Endpoints admin para revisar aplicaciones
5. ✅ Endpoints requester para buscar donadores
6. ✅ Auditoría detallada en cada acción
7. ✅ Frontend UI para cada rol
8. ✅ Diseño CSS

---

## ¿ESTÁ DE ACUERDO CON ESTA ARQUITECTURA?

Si es así, empiezo inmediatamente con:
1. Agregar los modelos nuevos
2. Crear los servicios
3. Implementar endpoints
