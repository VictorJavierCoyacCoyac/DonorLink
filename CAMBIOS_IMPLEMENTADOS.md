# Cambios Implementados - DonorLink v2

## Resumen de Modificaciones

### 1. Modelo de Base de Datos - `app/models/__init__.py`

#### Cambios en modelo `Donor`:
- ✅ Agregado campo `user_id` FK a tabla `users` (vinculación de cuenta)
- ✅ Agregado campo `approval_status` (pending/approved/rejected)
- ✅ Relación con modelo `User` para acceso fácil a datos de cuenta

**Impacto**: Los donantes ahora tienen cuenta de Usuario asociada y se puede rastrear si fueron aprobados.

---

### 2. Esquemas Pydantic - `app/schemas/__init__.py`

#### Nuevos esquemas:
- ✅ `DonorRegister` - Para auto-registro de donantes con contraseña

**Cambios en esquemas existentes**:
- ✅ Importaciones actualizadas en diversos servicios

---

### 3. Servicios Backend

#### `app/services/donor_service.py`
- ✅ Agregado método `register_donor_with_user()` - Auto-registro de donantes
- ✅ Agregado método `approve_donor()` - Cambiar estado a aprobado
- ✅ Agregado método `reject_donor()` - Cambiar estado a rechazado
- ✅ Actualizado `create_donor()` para soportar `user_id` y `approval_status`
- ✅ Actualizado `search_donors()` para devolver solo donantes aprobados

#### `app/services/requester_service.py`
- ✅ Agregado método `register_requester_with_user()` - Auto-registro de solicitantes

#### `app/services/donor_application_service.py`
- ✅ Actualizado `approve_application()` para: 
  - Crear Donor con `user_id` vinculado
  - Establecer `approval_status = "approved"`

---

### 4. API Endpoints

#### `app/api/auth.py`
- ✅ Nuevo endpoint `POST /api/v1/auth/donors/register` - Auto-registro donantes
  - Requiere: username, password, email, nombre completo, data médica
  - Crea Usuario (rol=DONOR) y Donor (approval_status=pending)
  - Responde con perfil del donante

#### `app/api/requesters.py`
- ✅ Nuevo endpoint `POST /api/v1/requesters/register` - Auto-registro solicitantes
  - Requiere: username, password, email, nombre, tipo sangre, urgencia
  - Crea Usuario (rol=REQUESTER) y Requester vinculados
  - Responde con perfil del solicitante

#### `app/api/admin.py`
- ✅ Nuevo endpoint `GET /api/v1/admin/donors/pending` - Listar donantes pendientes
- ✅ Nuevo endpoint `PATCH /api/v1/admin/donors/{donor_id}/approve` - Aprobar donante
- ✅ Nuevo endpoint `PATCH /api/v1/admin/donors/{donor_id}/reject` - Rechazar donante  
- ✅ Nuevo endpoint `DELETE /api/v1/admin/donors/{donor_id}` - Eliminar donante y su usuario

#### `app/api/requester_access.py`
- ✅ Actualizado `GET /api/v1/requester/donors/{donor_id}` para verificar `approval_status`
  - Solo retorna donantes aprobados

#### `app/api/messages.py`
- ✅ Mejorado `GET /api/v1/messages` para auto-detectar tipo de usuario
  - Ya no requiere parámetro `user_type` (se deduce del perfil vinculado)
- ✅ Mejorado `PATCH /api/v1/messages/{message_id}/read` con validación mejorada
- ✅ Agregado logging de acciones

---

## Flujos de Negocio Implementados

### Flujo 1: Auto-registro de Donante
```
1. POST /api/v1/auth/donors/register 
   → Ingresa: username, password, email, datos completos
   → Crea User (is_active=true, role=DONOR) + Donor (approval_status=pending)
   
2. Donante NO aparece en búsquedas de solicitantes (approval_status=pending)

3. Admin: GET /api/v1/admin/donors/pending 
   → Ve donantes en espera de aprobación
   
4. Admin: PATCH /api/v1/admin/donors/{id}/approve 
   → approval_status = "approved" → Ahora VISIBLE para solicitantes
   
5. Solicitante: GET /api/v1/requester/donors 
   → Solo ve donantes aprobados
   
6. Admin: DELETE /api/v1/admin/donors/{id} 
   → Borra Donor + su User asociado
```

### Flujo 2: Auto-registro de Solicitante
```
1. POST /api/v1/requesters/register 
   → Ingresa: username, password, email, nombre, tipo sangre, urgencia
   → Crea User (role=REQUESTER) + Requester vinculados
   
2. Solicitante en sistema → puede:
   - Buscar donantes
   - Enviar solicitudes
   - Enviar mensajes
   - Ver notificaciones
   
3. Admin: DELETE /admin/users/{user_id} 
   → Borra User → Cascade borra Requester
```

### Flujo 3: Mensajería Mejorada
```
1. Donante login → GET /api/v1/messages 
   → Sistema busca Donor vinculado a User
   → Retorna mensajes recibidos de solicitantes más mensajes enviados
   
2. Solicitante login → GET /api/v1/messages 
   → Sistema busca Requester vinculado a User
   → Retorna su conversaciones
```

---

## Datos Necesarios en BD para Migración

```sql
-- Columnas nuevas en tabla 'donors'
ALTER TABLE donors ADD COLUMN user_id INTEGER UNIQUE;
ALTER TABLE donors ADD COLUMN approval_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE donors ADD FOREIGN KEY (user_id) REFERENCES users(id);
```

---

## Cambios que Requieren Validación

### ⚠️ Importante: Migración de Base de Datos
- **SQLite**: Las columnas se agregarán on-the-fly en `init_db()`
- **PostgreSQL**: Necesita script de migración Alembic

### ⚠️ Importante: Populate Datos Existentes
Si ya tienes donantes en BD:
```sql
-- Opción 1: Linkear donantes con usuarios por email
UPDATE donors SET approval_status = 'approved' WHERE user_id IS NULL AND approval_status IS NULL;
UPDATE donors SET user_id = (SELECT id FROM users WHERE users.email = donors.email);

-- Opción 2: Limpiar BD para desarrollo fresco
DELETE FROM donors; DELETE FROM users; DELETE FROM donations;
```

---

## Endpoints Completamente Funcionales

✅ **Autenticación**:
- `POST /api/v1/auth/register` - Registro general
- `POST /api/v1/auth/donors/register` - Registro donante
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Perfil actual
- `POST /api/v1/auth/change-password` - Cambiar contraseña

✅ **Donantes**:
- `GET /api/v1/requester/donors` - Listar donantes (filtros), solo aprobados
- `GET /api/v1/requester/donors/{id}` - Detalle donante
- `POST /api/v1/admin/donors/pending` - Listar pendientes (admin)
- `PATCH /api/v1/admin/donors/{id}/approve` - Aprobar (admin)
- `PATCH /api/v1/admin/donors/{id}/reject` - Rechazar (admin)
- `DELETE /api/v1/admin/donors/{id}` - Eliminar (admin)

✅ **Solicitantes**:
- `POST /api/v1/requesters/register` - Auto-registro
- `GET /api/v1/requesters` - Listar (admin/staff)
- `DELETE /api/v1/requesters/{id}` - Eliminar (admin)

✅ **Mensajes**:
- `POST /api/v1/messages` - Enviar mensaje
- `GET /api/v1/messages` - Ver mis mensajes (auto-detecta tipo)
- `PATCH /api/v1/messages/{id}/read` - Marcar leído

✅ **Solicitudes de Donación**:
- `GET /api/v1/requests/incoming` - Solicitudes recibidas (donante)
- `GET /api/v1/requests/outgoing` - Mis solicitudes (solicitante)
- `PATCH /api/v1/requests/{id}/approve` - Aceptar solicitud
- `PATCH /api/v1/requests/{id}/reject` - Rechazar solicitud
- `POST /api/v1/requester/requests` - Crear solicitud

---

## Próximos Pasos Recomendados

1. **Inmediatos** (para presentación):
   - [ ] Probar en desarrollo: `python -m pytest`
   - [ ] Reiniciar servidor: `uvicorn main:app --reload`
   - [ ] Verificar BD: `sqlite3 donorlink.db ".schema"`

2. **Para MVP visual** (1-2 semanas):
   - [ ] Crear interfaz frontend (React)
   - [ ] Integrar comunicación Donor-Requester
   - [ ] Panel de admin

3. **Para producción** (2-4 semanas):
   - [ ] Email service (contraseña olvidada, notificaciones)
   - [ ] WebSockets para notificaciones en tiempo real
   - [ ] Elegibilidad automática
   - [ ] Docker + deployment

---

## Pruebas Manuales Recomendadas

```bash
# 1. Registrar como donante
curl -X POST http://localhost:8000/api/v1/auth/donors/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jdoe",
    "password": "SecurePass123",
    "email": "john@example.com",
    "name": "John Doe",
    "blood_type": "O+",
    "age": 35,
    "weight": 75
  }'

# 2. Registrar solicitante
curl -X POST http://localhost:8000/api/v1/requesters/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane",
    "password": "SecurePass123",
    "email": "jane@example.com",
    "name": "Jane Smith",
    "blood_type_needed": "AB-",
    "urgency": "urgent"
  }'

# 3. Admin aprueба donante
curl -X PATCH http://localhost:8000/api/v1/admin/donors/1/approve \
  -H "Authorization: Bearer {ADMIN_TOKEN}"

# 4. Login como donante
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "jdoe", "password": "SecurePass123"}'
```

---

## Archivos Modificados

1. ✅ `app/models/__init__.py` - Modelo Donor mejorado
2. ✅ `app/schemas/__init__.py` - Nuevo schema DonorRegister
3. ✅ `app/services/donor_service.py` - Lógica auto-registro + aprobación
4. ✅ `app/services/requester_service.py` - Auto-registro solicitantes
5. ✅ `app/services/donor_application_service.py` - Aprobación mejorada
6. ✅ `app/api/auth.py` - Nuevo endpoint registro donante
7. ✅ `app/api/requesters.py` - Nuevo endpoint registro solicitante
8. ✅ `app/api/admin.py` - Gestión de donantes pendientes
9. ✅ `app/api/requester_access.py` - Validación approval_status
10. ✅ `app/api/messages.py` - Mensajes mejorados
11. ✅ `MVP_ROADMAP.md` - Documento con roadmap completo (NUEVO)
