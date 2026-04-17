# DonorLink Frontend Current State

## Login Page
- Ruta principal: `/login`
- Formulario de inicio de sesión con campos `username` y `password`
- Botones funcionales:
  - `Aplicar como Donante` -> `/donor-application`
  - `Registrarse como Solicitante` -> `/requester-register`
- Estilo actualizado con tarjeta clara, fondo degradado y botones más modernos.
- Error de login se muestra en un recuadro rojo.

## Admin Dashboard
- Ruta principal para admin: `/`
- Panel de bienvenida con nombre de usuario y rol activo.
- Se despliega un panel de privilegios de administrador:
  - revisión de solicitudes de donantes
  - gestión de usuarios
  - configuración del sistema
  - auditorías / eventos importantes
- Botones directos para:
  - ver solicitudes de donantes (`/admin/applications`)
  - ver donantes
- Resumen del sistema con métricas para admin:
  - usuarios totales
  - usuarios activos
  - donantes
  - solicitantes
  - donaciones
  - mensajes
  - logs de auditoría

## Estructura principal del frontend
- `src/App.jsx` - control de rutas y flujo de login
- `src/components/Login.jsx` - formulario de login con navegación a formularios públicos
- `src/components/Dashboard.jsx` - dashboard principal, adaptado para admin y usuarios generales
- `src/components/AdminApplications.jsx` - panel para revisar y aprobar/rechazar solicitudes de donantes
- `src/index.css` - estilos globales y aspecto actualizado

## Backend relevante para admin
- `app/api/admin.py` - endpoints de administración protegidos por `UserRole.ADMIN`
- `app/services/admin_service.py` - métricas del sistema para admin
- `app/api/auth.py` - login e información de usuario actual (`/auth/me`)

## Notas
- El login usa el usuario `admin` con contraseña `admin123`.
- El frontend se conecta al backend en `http://localhost:8000/api/v1`.
