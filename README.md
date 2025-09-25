# Dashboard de Gestión con Snapshots (FastAPI + MySQL + HTML/CSS/JS)

Este repo es un **starter** listo para correr el desafío. Backend en **FastAPI**, base en **MySQL** y frontend **vanilla**.

## Requisitos
- Python 3.10+
- MySQL 8+ (o MariaDB equivalente)
- (Opcional) virtualenv

## Setup rápido

1. Crea la base y carga datos **base** (usa tu script original `prueba_tecnica_estructura_db.sql`).  
2. Ejecuta los scripts de **snapshots** y **vistas KPI**:
   ```sql
   SOURCE sql/02_snapshots.sql;
   SOURCE sql/03_kpi_views.sql;
   ```
3. Configura variables de entorno para el backend:
   - `DB_HOST` (p.ej. `localhost`)
   - `DB_PORT` (p.ej. `3306`)
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
4. Instala dependencias y levanta el server:
   ```bash
   pip install -r requirements.txt
   uvicorn backend.main:app --reload --port 8000
   ```
5. Abre el frontend:
   - Sirve `frontend/` con un server estático (o abre `index.html` directo).
   - Editá `frontend/app.js` si el backend no corre en `http://localhost:8000`.

## Endpoints principales
- `GET /api/kpis` → KPIs y distribución por resultados (filtrable por fecha/campaña/agente).
- `POST /api/snapshots` → guarda un snapshot con los KPIs actuales + filtros.
- `GET /api/snapshots` → lista snapshots.
- `GET /api/snapshots/{id}` → devuelve el snapshot sin recalcular.

## Fórmulas (definiciones en README y consultas en `03_kpi_views.sql`)
- **Contactabilidad** = gestiones **efectivas** / gestiones totales.
- **Penetración Bruta** = gestiones **exitosas** / gestiones totales.
- **Penetración Neta** = gestiones **exitosas** / gestiones **efectivas**.

> *Gestión efectiva:* se habló con alguien (mapeo de resultados en las vistas).  
> *Gestión exitosa:* culmina en activación/venta (mapeado a `resultado_id = 1` - 'Coordinado').

Podés ajustar los mapeos en `03_kpi_views.sql` según tu criterio de negocio.

## Estructura
```
callcenter_dashboard/
├─ backend/
│  ├─ main.py
│  └─ db.py
├─ frontend/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
└─ sql/
   ├─ 02_snapshots.sql
   └─ 03_kpi_views.sql
```
