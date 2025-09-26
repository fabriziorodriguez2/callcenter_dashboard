# Dashboard de Gestión con Snapshots (FastAPI + MySQL + HTML/CSS/JS)

Backend en **FastAPI**, base en **MySQL** y frontend **vanilla**.


## Requisitos

- **Python 3.12+**
- **MySQL 8+** (o MariaDB compatible)
- Navegador web moderno

---

## Estructura del repositorio

callcenter_dashboard/
├─ backend/
│ ├─ main.py # API FastAPI (KPIs, snapshots, consultas típicas)
│ └─ db.py # conexión a la base (usa .env)
├─ frontend/
│ ├─ index.html # UI (filtros, KPIs, gráfica, detalles, snapshots, modal)
│ ├─ styles.css # estilos (morado + blanco, texto negro, sombras)
│ └─ app.js # llamadas a API, render, modal, configuración API_URL
└─ sql/
├─ 00_create_db.sql # crea la base proteus_crm
├─ 01_base.sql # estructura + datos de ejemplo (desafío)
├─ 02_snapshots.sql # tabla de snapshots
├─ 03_kpi_views.sql # vistas de apoyo para KPIs
└─ 04_metric_queries_examples.sql # consultas SQL de ejemplo de KPIs

---

## Instalación y ejecución

### 1) Base de datos

Ejecutar los scripts en **sql/** en este orden:

# Crear base
mysql -u root -p < sql/00_create_db.sql

# Estructura + datos de ejemplo (SQL del desafío)
mysql -u root -p proteus_crm < sql/01_base.sql

# Infra del dashboard
mysql -u root -p proteus_crm < sql/02_snapshots.sql
mysql -u root -p proteus_crm < sql/03_kpi_views.sql
Alternativa GUI (MySQL Workbench)

Ejecutar sql/00_create_db.sql.

Server → Data Import → Import from Self-Contained File → seleccionar sql/01_base.sql → Default Target Schema: proteus_crm → Start Import.

Ejecutar sql/02_snapshots.sql y sql/03_kpi_views.sql sobre proteus_crm.

### 2) Variables de entorno
Crear un archivo .env en la raíz del proyecto:

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SU_PASSWORD
DB_NAME=proteus_crm

### 3) Backend (FastAPI)
Instalar dependencias y levantar la API.

python -m venv .venv
# Windows:
.\.venv\Scripts\Activate
# macOS / Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000 --env-file .env

### 4) Frontend
Abrir frontend/index.html en el navegador.

## Uso
Aplicar filtros (rango de fechas / campaña / agente) en la parte superior.

Ver los 3 KPIs en el centro y la gráfica debajo.

Revisar detalles en la tabla.

Guardar snapshot y, en la sección “Snapshots”, pulsar Ver para abrir el modal con KPIs, filtros y distribución tal como se guardó.

## Endpoints principales
### KPIs / Snapshots

GET /api/kpis?start=&end=&campaign_id=&agent_id=

Formato de fechas: start/end = YYYYMMDDhhmmss

POST /api/snapshots

Body: { "filters": {...}, "kpis": {...}, "distribution": [...] }

GET /api/snapshots

GET /api/snapshots/{id}

### Consultas típicas

GET /api/consultas/gestiones?operator_id=&date=YYYYMMDD

GET /api/consultas/no_contesta?campaign_id=

GET /api/consultas/rendimiento?start=YYYYMMDDhhmmss&end=YYYYMMDDhhmmss&campaign_id=&agent_id=

GET /api/consultas/contactos?telefono=&ci=
