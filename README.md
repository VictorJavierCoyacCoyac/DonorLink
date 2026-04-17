# 🩸 DonorLink - Blood Donor Management Platform MVP

Una plataforma profesional, modular y lista para producción para la gestión inteligente de donantes de sangre. Desarrollada con **FastAPI** (backend) y **React + Vite** (frontend).

## ✨ Características Implementadas

### ✅ Backend (FastAPI)
- **Gestión de Donantes**: CRUD completo con validación
- **Autenticación JWT**: Login/registro con roles (Admin, Staff, Donor)
- **Búsqueda Avanzada**: Filtrar por nombre, email, tipo de sangre, edad, peso, fechas
- **Estadísticas**: Métricas de donantes y donaciones
- **Rate Limiting**: Protección contra abuso
- **Logging Estructurado**: Auditoría completa
- **Tests Unitarios**: Cobertura completa con pytest

### ✅ Frontend (React + Material-UI)
- **Dashboard**: Vista general con estadísticas
- **Gestión de Donantes**: Lista, crear, editar con búsqueda
- **Autenticación**: Login con JWT
- **Estadísticas Visuales**: Gráficas de distribución de tipos de sangre
- **UI Responsiva**: Material-UI para experiencia profesional

### ✅ Base de Datos
- **SQLite** para desarrollo (PostgreSQL listo para producción)
- Migraciones con Alembic
- Relaciones ORM completas

## 🚀 Inicio Rápido

### Prerrequisitos
- Python 3.8+
- Node.js 16+
- Git

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd donorlink_local
   ```

2. **Backend Setup**
   ```bash
   # Crear entorno virtual
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   # o .venv\Scripts\activate en Windows
   
   # Instalar dependencias
   pip install -r requirements.txt
   
   # Inicializar base de datos
   python -m app.core.init_db
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Ejecutar la Aplicación

1. **Backend** (Terminal 1)
   ```bash
   source .venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```

3. **Acceder**
   - **Frontend**: http://localhost:5173
   - **API Docs**: http://localhost:8000/docs
   - **API ReDoc**: http://localhost:8000/redoc

### Ejecutar Tests
```bash
source .venv/bin/activate
python -m pytest tests/ -v
```

## 🏗️ Estructura del Proyecto

```
donorlink_local/
├── main.py                              # Backend: Punto de entrada FastAPI
├── requirements.txt                     # Backend: Dependencias Python
├── conftest.py                          # Tests: Configuración pytest
├── tests/                               # Tests unitarios
│
├── app/                                 # Backend application
│   ├── api/                             # Endpoints FastAPI
│   ├── core/                            # Configuración, DB, security
│   ├── models/                          # Modelos SQLAlchemy
│   ├── schemas/                         # Esquemas Pydantic
│   ├── services/                        # Lógica de negocio
│   └── utils/                           # Utilidades
│
└── frontend/                            # Frontend React
    ├── src/
    │   ├── components/                  # Componentes React
    │   ├── App.jsx                      # App principal
    │   └── main.jsx                     # Punto de entrada
    ├── package.json                     # Dependencias Node.js
    └── vite.config.js                   # Config Vite
```

## 🔧 Configuración

### Variables de Entorno
Crear archivo `.env` basado en `.env.example`:

```env
DATABASE_URL=sqlite:///./donorlink.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Base de Datos
- **Desarrollo**: SQLite automático
- **Producción**: Configurar `DATABASE_URL` para PostgreSQL

## 📊 API Endpoints

### Autenticación
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token

### Donantes
- `POST /api/v1/donors` - Crear donante
- `GET /api/v1/donors` - Listar donantes
- `GET /api/v1/donors/{id}` - Obtener donante
- `PATCH /api/v1/donors/{id}` - Actualizar donante
- `DELETE /api/v1/donors/{id}` - Eliminar donante
- `POST /api/v1/donors/search` - Búsqueda avanzada

### Estadísticas
- `GET /api/v1/statistics/donors` - Estadísticas de donantes
- `GET /api/v1/statistics/donations` - Estadísticas de donaciones

## 🧪 Tests

Cobertura completa incluyendo:
- Autenticación y autorización
- CRUD de donantes
- Búsqueda y filtrado
- Validaciones
- Rate limiting
- RBAC (Role-Based Access Control)

## 🚢 Despliegue

### Docker (Próximamente)
```bash
docker-compose up -d
```

### Producción
- Configurar PostgreSQL
- Usar servidor ASGI (uvicorn/gunicorn)
- Configurar variables de entorno
- Habilitar HTTPS

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

## 📞 Contacto

Para preguntas o soporte, por favor abrir un issue en el repositorio.

## 🏗️ Estructura del Proyecto

```
donorlink_local/
├── main.py                              # Punto de entrada FastAPI
├── requirements.txt                     # Dependencias (actualizado)
├── .env.example                         # Plantilla de configuración
├── donorlink.db                         # Base de datos SQLite (auto-creada)
│
└── app/
    ├── __init__.py
    ├── core/
    │   ├── __init__.py
    │   ├── config.py                   # Configuración de la app
    │   ├── database.py                 # Sesiones SQLAlchemy
    │   ├── exceptions.py               # Excepciones personalizadas
    │   └── init_db.py                  # Inicialización de datos de prueba
    │
    ├── models/
    │   └── __init__.py                 # Modelos ORM (Donor, Donation, BloodType)
    │
    ├── schemas/
    │   └── __init__.py                 # Esquemas Pydantic v2 (validación)
    │
    ├── services/
    │   ├── __init__.py                 # EligibilityService (lógica de negocio)
    │   └── donor_service.py            # DonorService (operaciones CRUD)
    │
    ├── api/
    │   ├── __init__.py                 # Router principal con endpoints
    │   ├── dependencies.py             # Inyección de BD
    │   └── statistics.py               # Endpoints de estadísticas
    │
    └── utils/
        ├── __init__.py
        └── statistics.py               # Funciones de estadísticas
```

## 🚀 Inicio Rápido

### Requisitos
- Python 3.10+
- pip

### Instalación

```bash
# 1. Navegar al directorio
cd donorlink_local

# 2. Crear entorno virtual
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Ejecutar la aplicación
uvicorn main:app --reload
```

**✅ La API está lista en**: `http://localhost:8000`

### 📚 Documentación
- **Swagger UI** (interactivo): http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📊 Endpoints API

### 1. **Gestión de Donantes (CRUD)**
- Crear, leer, actualizar y eliminar donantes
- Campos esenciales:
  - Nombre (requerido)
  - Email (único, validado)
  - Tipo de sangre (O-, O+, A-, A+, B-, B+, AB-, AB+)
  - Edad (18-120 años)
  - Peso (mínimo 50kg)
  - Fecha de última donación

### 2. **Lógica de Elegibilidad**
Valida automáticamente si un donante puede donar basándose en:
- **Edad**: Entre 18 y 65 años
- **Peso**: Mínimo 50kg
- **Tiempo desde última donación**: Mínimo 56 días (8 semanas)

### 3. **Registro de Donaciones**
- Historial completo de donaciones por donante
- Volumen estándar de 450ml (configurable)
- Actualización automática de fecha de última donación

### 4. **Base de Datos Flexible**
- **SQLite** por defecto (desarrollo local)
- Preparado para **PostgreSQL** (solo cambiar `DATABASE_URL` en `.env`)

## 📡 API Endpoints

### Donantes

```bash
# Crear donante
POST /api/v1/donors
Body: {
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "blood_type": "O+",
  "age": 28,
  "weight": 75.5,
  "last_donation_date": null
}

# Listar donantes
GET /api/v1/donors?skip=0&limit=100

# Obtener donante
GET /api/v1/donors/{donor_id}

# Actualizar donante
PATCH /api/v1/donors/{donor_id}

# Eliminar donante
DELETE /api/v1/donors/{donor_id}
```

### Elegibilidad y Donaciones

```bash
# Verificar elegibilidad
GET /api/v1/donors/{donor_id}/eligibility

# Registrar donación
POST /api/v1/donors/{donor_id}/donate
Body: {
  "volume_ml": 450.0
}

# Historial de donaciones
GET /api/v1/donors/{donor_id}/donations
```

## 📚 Patrones de Diseño

### 1. **Service Layer**
Separa lógica de negocio de la API:
- `DonorService`: Operaciones CRUD
- `EligibilityService`: Lógica de elegibilidad

### 2. **Dependency Injection**
```python
def create_donor(donor: DonorCreate, db: Session = Depends(get_db)):
    ...
```

### 3. **Pydantic v2 Schemas**
Validación automática de entrada/salida:
- `DonorCreate`: Creación de donante
- `DonorUpdate`: Actualización parcial
- `DonorResponse`: Respuesta serializada
- `EligibilityResponse`: Respuesta de elegibilidad

## 🔧 Configuración

### Variables de entorno (`.env`)

```env
# Database
DATABASE_URL=sqlite:///./donorlink.db
# Para PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/donorlink

# API
API_TITLE=DonorLink API
API_VERSION=1.0.0
```

## 📈 Cambiar a PostgreSQL

1. Instala el driver:
```bash
pip install psycopg2-binary
```

2. Actualiza `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/donorlink
```

3. ¡Listo! El código está preparado para funcionar sin cambios adicionales.

## 🧪 Ejemplo de Flujo Completo

```bash
# 1. Crear donante
curl -X POST "http://localhost:8000/api/v1/donors" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos García",
    "email": "carlos@example.com",
    "blood_type": "A+",
    "age": 32,
    "weight": 80
  }'

# 2. Verificar elegibilidad
curl "http://localhost:8000/api/v1/donors/1/eligibility"

# 3. Registrar donación
curl -X POST "http://localhost:8000/api/v1/donors/1/donate" \
  -H "Content-Type: application/json" \
  -d '{"volume_ml": 450}'

# 4. Ver historial
curl "http://localhost:8000/api/v1/donors/1/donations"
```

## 🗄️ Modelos de Base de Datos

### Donor
- `id`: Primary key
- `name`: Nombre del donante
- `email`: Email único
- `blood_type`: Tipo de sangre (ENUM)
- `age`: Edad
- `weight`: Peso en kg
- `last_donation_date`: Fecha de última donación
- `created_at`, `updated_at`: Timestamps

### Donation
- `id`: Primary key
- `donor_id`: Foreign key a Donor
- `donation_date`: Fecha de donación
- `volume_ml`: Volumen en ml
- `created_at`: Timestamp

## 🛠️ Requisitos del Sistema

- Python 3.8+
- pip/poetry

## 📦 Dependencias

- **fastapi==0.104.1**
- **uvicorn==0.24.0**
- **sqlalchemy==2.0.23**
- **pydantic==2.5.0**
- **pydantic-settings==2.1.0**
- **python-dateutil==2.8.2**

## 💡 Próximos Pasos (Fuera del MVP)

- [ ] Autenticación JWT
- [ ] Rate limiting
- [ ] Tests unitarios (pytest)
- [ ] Logging y monitoreo
- [ ] Caching (Redis)
- [ ] Búsqueda avanzada de donantes
- [ ] Reportes y estadísticas
- [ ] Docker containerización
- [ ] CI/CD con GitHub Actions

## 📝 Notas

- La base de datos SQLite se crea automáticamente en `donorlink.db` en el directorio raíz
- Las tablas se inicializan cuando la aplicación arranca
- Todos los endpoints están documentados automáticamente en Swagger (`/docs`)

## 🤝 Desarrollo

Esta plataforma está diseñada con principios SOLID y patrones enterprise-ready:
- Estructura modular y escalable
- Separación clara de responsabilidades
- Validaciones robustas con Pydantic v2
- ORM type-safe con SQLAlchemy 2.0
- API RESTful documentada automáticamente

---

**DonorLink MVP** - Construido con ❤️ para salvar vidas 🩸
