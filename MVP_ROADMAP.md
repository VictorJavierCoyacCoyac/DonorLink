# DonorLink MVP - Roadmap Completo para Producción

## ✅ Fase 1: COMPLETADA - Core Funcional
- [x] Backend FastAPI con autenticación JWT
- [x] CRUD de donantes con aprobación admin
- [x] CRUD de solicitantes 
- [x] Sistema de donaciones y solicitudes
- [x] Estadísticas y auditoría
- [x] Rate limiting y validación
- [x] Auto-registro donantes (con aprobación admin)
- [x] Auto-registro solicitantes
- [x] Sistema de mensajes mejorado
- [x] Eliminación de cuentas (usuarios y donantes)

---

## 📋 Fase 2: RECOMENDACIONES - Backend Crítico
*(Para un MVP presentable y funcionalmente completo)*

### 2.1 Notificaciones en Tiempo Real 🔔
**Importancia: CRÍTICA**
- Implementar WebSockets para notificaciones en vivo
- Tipos de notificaciones:
  - Solicitude-s de donación recibidas (para donantes)
  - Aceptación/rechazo de solicitudes (para solicitantes)
  - Nuevos mensajes
  - Cambios en estado del perfil
- Persistencia en BD: tabla `notifications` con campos `read_at`, `dismissed_at`
- Filtros: por tipo, fecha, leído/no leído

### 2.2 Validación de Elegibilidad 🏥
**Importancia: MEDIA-ALTA**
- Endpoint: `GET /api/v1/donors/{donor_id}/eligibility`
- Reglas:
  - Edad: 18-65 años ✓
  - Peso mínimo: 50kg ✓
  - Intervalo mínimo entre donaciones: 56 días (8 semanas) para hombres, 84 días para mujeres
  - HB mínimo: almacenar en BD
- Response: `{ "is_eligible": bool, "reasons": [str], "days_until_eligible": int }`

### 2.3 Búsqueda Avanzada de Donantes ✅
**Importancia: MEDIA**
- Filtros adicionales ya soportados en schemas:
  - Por tipo de sangre ✓
  - Por rango de edad ✓
  - Por peso ✓
  - Donantes nuevos (nunca donaron)
  - Donantes activos (últimas 8 semanas)
  - Elegibilidad actual
- Ordenamiento por:
  - Fecha de última donación (descendente)
  - Cercanía geográfica (requiere geocoding)

### 2.4 Gestión de Contraseñas 🔐
**Importancia: MEDIA-ALTA**
- [x] Cambio de contraseña endpoint ✓
- [ ] Recuperación de contraseña (¡FALTA!)
  - Endpoint: `POST /api/v1/auth/forgot-password`
  - Token de 24h con JWT
  - Email con enlace de reset
- [ ] Expiración de contraseña temporal
  - Donantes aprobados reciben contraseña temporal (ya implementado)
  - Forzar cambio al primer login (flag `password_expired`)

### 2.5 Auditoría Mejorada 📊
**Importancia: MEDIA**
- [x] Auditoría básica implementada ✓
- [ ] Mejoras:
  - Exportar logs a CSV/JSON (endpoint `/admin/audit-logs/export`)
  - Filtros avanzados en BD (date range, entity type, action)
  - Dashboard de actividad semanal/mensual
  - Alertas automáticas (10+ login fallidos = bloquear usuario)

### 2.6 Rate Limiting Específico por Rol 🚦
**Importancia: BAJA-MEDIA**
- Límites diferentes por endpoint y rol:
  - Registro: 3/min (ya implementado)
  - Login: 5/min, pero 3 fallos = bloquear 15 min
  - Búsqueda: 30/min
  - Mensajes: 20/min
- Implementar en redis para producción

---

## 🎨 Fase 3: Frontend - React + Vite
**Importancia: CRÍTICA para MVP visual**

### 3.1 Páginas Esenciales
- [ ] **Doni/Dashboards** (todos los roles)
  - Donante: próxima donación, solicitudes pendientes, historial
  - Solicitante: donantes disponibles, mis solicitudes, mensajes
  - Admin: estadísticas, usuarios pendientes, auditoría

- [ ] **Autenticación**
  - Login con email/username ✓ (backend ready)
  - Registro donante con contraseña ✓ (backend ready)
  - Registro solicitante con contraseña ✓ (backend ready)
  - Recuperación de contraseña (backend TO-DO)

- [ ] **Perfiles**
  - Ver/editar perfil
  - Historial de donaciones
  - Solicitudes enviadas/recibidas

- [ ] **Búsqueda & Solicitudes**
  - Filtro avanzado de donantes
  - Crear solicitud con mensaje
  - Ver estado de solicitudes

- [ ] **Mensajes**
  - Chat en tiempo real (WebSocket)
  - Notificaciones en vivo (WebSocket)
  - Marcar como leído

- [ ] **Admin Panel**
  - Gestión de usuarios
  - Aprobación de donantes
  - Ver auditoría
  - Estadísticas

### 3.2 Componentes Reutilizables
- [ ] Card de donantes (nombre, tipo sangre, última donación, botón contactar)
- [ ] Form de búsqueda con filtros
- [ ] Notificaciones toast (success, error, warning, info)
- [ ] Modal de confirmación
- [ ] Tablas paginadas
- [ ] Spinner de carga

### 3.3 Integraciones Frontend
- [ ] Consumir todos los endpoints `/api/v1`
- [ ] Manejo de errores HTTP
- [ ] Almacenar JWT en `localStorage` / `sessionStorage`
- [ ] Persistencia de sesión
- [ ] Logout con limpieza de tokens
- [ ] Rutas protegidas por rol

---

## 🚀 Fase 4: Deployment & DevOps

### 4.1 Containerización
- [ ] Dockerfile para backend (Python 3.11-slim)
- [ ] Dockerfile para frontend (Node.js 20 + nginx)
- [ ] Docker Compose para desarrollo local (backend + DB + frontend)
- [ ] Variables de entorno (`.env.example`)

### 4.2 CI/CD (GitHub Actions)
- [ ] Test automáticos (pytest, eslint, prettier)
- [ ] Build de imágenes Docker
- [ ] Push a registry (Docker Hub / ECR)
- [ ] Deploy automático a staging/production

### 4.3 Producción
- [ ] PostgreSQL en lugar de SQLite
- [ ] Redis para rate limiting y sesiones
- [ ] SSL/TLS (Let's Encrypt)
- [ ] CORS configurado correctamente
- [ ] HTTPS enforced
- [ ] Backup automático de BD

### 4.4 Monitoreo
- [ ] Sentry para error tracking
- [ ] Prometheus + Grafana para métricas
- [ ] Logs centralizados (ELK stack o Loki)
- [ ] Health check endpoints
- [ ] Alertas para errores críticos

---

## 📧 Fase 5: Comunicaciones & Email

### 5.1 Email Service
- [ ] Sendgrid / AWS SES / Mailgun
- [ ] Templates Jinja2:
  - Bienvenida donante/solicitante
  - Aprobación de donante
  - Solicitud de donación
  - Recordatorio próxima donación
  - Recuperación de contraseña

### 5.2 Notificaciones SMS (Opcional)
- [ ] Twilio para SMS
- [ ] Alertas críticas (donante aprobado, solicitud urgente)

---

## 🔐 Seguridad - Checklist

- [ ] OWASP Top 10 validación
- [ ] Inyección SQL: ✅ usando ORM SQLAlchemy
- [ ] XSS: ✅ Pydantic validation
- [ ] CSRF: Backend ready, frontend to-do
- [ ] Rate limiting: ✅ SlowAPI
- [ ] Hashing de contraseñas: ✅ Argon2
- [ ] JWT con expiration: ✅
- [ ] HTTPS en producción: TO-DO
- [ ] CORS restrictivo: TO-DO (configurar dominios específicos)
- [ ] SQL injection tests: TO-DO
- [ ] Load testing: TO-DO

---

## 📊 Base de Datos - Mejoras

### Tablas Adicionales Recomendadas
```sql
-- Tabla para notificaciones
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT FOREIGN KEY,
    type VARCHAR(50),  -- 'donation_request', 'message', 'approval'
    related_entity_id INT,
    related_entity_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    created_at TIMESTAMP
);

-- Tabla para recuperación de contraseña
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT FOREIGN KEY,
    token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP,
    used_at TIMESTAMP,
    created_at TIMESTAMP
);

-- Tabla para login attempts (security)
CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    user_id INT FOREIGN KEY,
    ip_address VARCHAR(45),
    success BOOLEAN,
    created_at TIMESTAMP
);
```

---

## 🧪 Testing

### Backend Tests
- [ ] Unit tests: Servicios, validaciones (pytest)
- [ ] Integration tests: Endpoints, BD
- [ ] E2E tests: Flujo completo usuario
- [ ] Load testing: 100 solicitudes/seg

### Frontend Tests
- [ ] Unit tests: Componentes (Vitest)
- [ ] Integration tests: Flujos principales
- [ ] E2E tests: Selenium / Cypress

---

## 📱 Versión Mobile (Post-MVP)

- [ ] React Native app
- [ ] Notificaciones push
- [ ] Localización GPS
- [ ] Cámara para fotos de documentos

---

## 🎯 Estimación de Tiempo (Semanas)

| Fase | Tarea | Semanas | Prioridad |
|------|-------|---------|-----------|
| 2 | Notificaciones (WebSocket) | 1.5 | 🔴 ALTA |
| 2 | Elegibilidad mejorada | 0.5 | 🟡 MEDIA |
| 2 | Recuperación contraseña | 0.5 | 🔴 ALTA |
| 3 | Frontend dashboards | 2 | 🔴 CRÍTICA |
| 3 | Frontend auth + forms | 1.5 | 🔴 CRÍTICA |
| 3 | Frontend admin panel | 1 | 🟡 MEDIA |
| 4 | Docker + CI/CD | 1.5 | 🟡 MEDIA |
| 4 | Deployment | 1 | 🟡 MEDIA |
| 5 | Emails | 0.5 | 🟡 MEDIA |

**Total: ~10-11 semanas para MVP completamente presentable y funcional**

---

## 🚀 MVP Mínimo Viable Recomendado

Para **presentar hoy** (con el código actual), necesitas:

1. ✅ **Backend**: LA MAYORÍA ESTÁ LISTO
2. ⚠️ **Frontend**: **CRÍTICO** - Crear al menos:
   - Login/Registro (3 días)
   - Dashboard básico (2 días)
   - Búsqueda de donantes (2 días)
   - Admin panel básico (2 días)
3. ✅ **Base de datos**: SQLite/PostgreSQL ready
4. ⚠️ **Email**: Opcional para MVP v1

**Con estas 3 semanas de frontend podrías tener un MVP presentable.**

---

## ✨ Diferenciadores sugeridos

- 🗺️ Mapa interactivo de donantes cercanos
- 🏆 Gamificación (puntos por donaciones)
- 📊 Dashboard de impacto (vidas salvadas)
- 🔔 Notificaciones inteligentes (donar cuando sea tiempo)
- ♻️ Historial de donaciones conectado con hospitales
