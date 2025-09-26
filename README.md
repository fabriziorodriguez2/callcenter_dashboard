# Dashboard de Gestión FastAPI + MySQL + HTML/CSS/JS

Aplicación para supervisar campañas con 3 KPIs (Contactabilidad, Penetración Bruta, Penetración Neta), gráfica de distribución, tabla de detalles y snapshots persistentes.

======================================================================

## Estructura del repositorio

```
callcenter_dashboard/
├── backend/
│   ├── main.py          # API FastAPI (KPIs, snapshots, consultas típicas)
│   └── db.py            # conexión a la base (usa .env)
├── frontend/
│   ├── index.html       # UI (filtros, KPIs, gráfica, detalles, snapshots, modal)
│   ├── styles.css       # estilos (morado + blanco, texto negro, sombras)
│   └── app.js           # llamadas a API, render, modal, configuración API_URL
└── sql/
    ├── 00_create_db.sql                  # crea la base proteus_crm
    ├── 01_base.sql                       # estructura + datos de ejemplo (desafío)
    ├── 02_snapshots.sql                  # tabla de snapshots
    ├── 03_kpi_views.sql                  # vistas de apoyo para KPIs
    └── 04_metric_queries_examples.sql    # consultas SQL de ejemplo de KPIs
```

======================================================================

## 1) Instrucciones claras para instalar y ejecutar la solución

### Requisitos:
- Python 3.12+
- MySQL 8+ (o MariaDB compatible)
- Navegador web moderno

### Pasos:

#### 1) Base de datos (carpeta sql/)
```bash
# Crear base
mysql -u root -p < sql/00_create_db.sql

# Estructura + datos de ejemplo (SQL del desafío)
mysql -u root -p proteus_crm < sql/01_base.sql

# Infra del dashboard
mysql -u root -p proteus_crm < sql/02_snapshots.sql
mysql -u root -p proteus_crm < sql/03_kpi_views.sql
```

#### 2) Variables de entorno (.env en la raíz)
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=proteus_crm
```

#### 3) Backend (FastAPI)
```bash
python -m venv .venv

# Windows
.\.venv\Scripts\Activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000 --env-file .env
```

#### 4) Frontend
- Abrir `frontend/index.html` en el navegador.
- Si la API no corre en http://127.0.0.1:8000, usar el botón (abajo a la derecha) para configurar API_URL (ej.: http://localhost:8000).

======================================================================

## 2) Scripts / documentación para cargar los datos de ejemplo

### Carpeta sql/:
- `00_create_db.sql` crea la base proteus_crm.
- `01_base.sql` estructura completa + datos de ejemplo (contenido del desafío).
- `02_snapshots.sql` crea la tabla dashboard_snapshots para guardar snapshots.
- `03_kpi_views.sql` crea vistas de apoyo para KPIs (efectivas y exitosas).
- `04_metric_queries_examples.sql` consultas SQL de ejemplo (ver sección 4).

### Opción GUI (MySQL Workbench)
1) Ejecutar `00_create_db.sql`.
2) Server → Data Import → Import from Self-Contained File → `01_base.sql` → Target schema: proteus_crm → Start Import.
3) Ejecutar `02_snapshots.sql` y `03_kpi_views.sql` sobre proteus_crm.

**Nota:** si el SQL original usa `DEFAULT '0000-00-00 00:00:00'` en TIMESTAMP, reemplazar por `DEFAULT CURRENT_TIMESTAMP`.

======================================================================

## 3) Fórmulas utilizadas para calcular las métricas

- **Contactabilidad** = (Gestiones efectivas / Gestiones totales) × 100
- **Penetración Bruta (PB)** = (Gestiones exitosas / Gestiones totales) × 100
- **Penetración Neta (PN)** = (Gestiones exitosas / Gestiones efectivas) × 100

### Criterios (ajustables en 03_kpi_views.sql):
- **Efectivas:** `id_resultado IN (1,2,8,10,11,14,16)`
- **Exitosas:** `id_resultado = 1`

======================================================================

## 4) Ejemplos de consultas SQL aplicadas

### Formatos de fecha/hora en la base:
- `gestiones.timestamp`: CHAR(14) YYYYMMDDhhmmss
- Día completo: YYYYMMDD000000 a YYYYMMDD235959

### 4.1 Totales / Efectivas / Exitosas (base de KPIs)
```sql
SELECT
    COUNT(*) AS gestiones,
    SUM(g.id_resultado IN (1,2,8,10,11,14,16)) AS efectivas,
    SUM(g.id_resultado = 1) AS exitosas
FROM gestiones g;
```

### 4.2 KPIs calculados (en una sola consulta)
```sql
SELECT
    ROUND(100 * t.efectivas / NULLIF(t.gestiones,0), 2) AS contactabilidad,
    ROUND(100 * t.exitosas / NULLIF(t.gestiones,0), 2) AS penetracion_bruta,
    ROUND(100 * t.exitosas / NULLIF(t.efectivas,0), 2) AS penetracion_neta
FROM (
    SELECT
        COUNT(*) AS gestiones,
        SUM(g.id_resultado IN (1,2,8,10,11,14,16)) AS efectivas,
        SUM(g.id_resultado = 1) AS exitosas
    FROM gestiones g
) t;
```

### 4.3 Distribución por resultado
```sql
SELECT r.nombre AS resultado, COUNT(*) AS cantidad
FROM gestiones g
JOIN gestiones_resultado r ON r.id = g.id_resultado
GROUP BY r.id, r.nombre
ORDER BY cantidad DESC;
```

### 4.4 Gestiones de un operador en una fecha específica
```sql
-- Parámetros: :operator_id (users.id), :fecha_yyyymmdd (p.ej. '20250131')
SELECT
    g.id,
    g.id_campaign,
    c.nombre AS campaña,
    g.id_contacto,
    co.nombre1, co.apellido1,
    r.nombre AS resultado,
    g.notas,
    g.`timestamp`
FROM gestiones g
JOIN campaigns c ON c.id = g.id_campaign
JOIN contactos co ON co.id = g.id_contacto
LEFT JOIN gestiones_resultado r ON r.id = g.id_resultado
WHERE g.id_broker = :operator_id
    AND g.`timestamp` BETWEEN CONCAT(:fecha_yyyymmdd,'000000')
    AND CONCAT(:fecha_yyyymmdd,'235959')
ORDER BY g.`timestamp` DESC;
```

### 4.5 Contactos de una campaña con resultado "No contesta"
```sql
-- :campaign_id -> campaigns.id
SELECT DISTINCT
    co.id, co.ci, co.nombre1, co.apellido1
FROM gestiones g
JOIN contactos co ON co.id = g.id_contacto
JOIN gestiones_resultado r ON r.id = g.id_resultado
WHERE g.id_campaign = :campaign_id
    AND UPPER(r.nombre) = UPPER('No contesta')
ORDER BY co.apellido1, co.nombre1;
```

### 4.6 Rendimiento por operador/campaña (con KPIs)
```sql
-- Filtros opcionales:
-- WHERE g.`timestamp` BETWEEN 'YYYYMMDDhhmmss' AND 'YYYYMMDDhhmmss'
-- AND g.id_campaign = :campaign_id
-- AND g.id_broker = :agent_id
SELECT
    g.id_campaign,
    c.nombre AS campaña,
    g.id_broker,
    CONCAT(u.nombre, ' ', u.apellido) AS operador,
    COUNT(*) AS gestiones,
    SUM(g.id_resultado IN (1,2,8,10,11,14,16)) AS efectivas,
    SUM(g.id_resultado = 1) AS exitosas,
    ROUND(100 * SUM(g.id_resultado IN (1,2,8,10,11,14,16)) / NULLIF(COUNT(*),0), 2) AS contactabilidad,
    ROUND(100 * SUM(g.id_resultado = 1) / NULLIF(COUNT(*),0), 2) AS penetracion_bruta,
    ROUND(100 * SUM(g.id_resultado = 1) / NULLIF(SUM(g.id_resultado IN (1,2,8,10,11,14,16)),0), 2) AS penetracion_neta
FROM gestiones g
JOIN campaigns c ON c.id = g.id_campaign
JOIN users u ON u.id = g.id_broker
-- WHERE ...
GROUP BY g.id_campaign, c.nombre, g.id_broker, operador
ORDER BY campaña, operador;
```

### 4.7 Búsqueda de contactos (teléfono / documento)
```sql
-- Por teléfono normalizado
-- :telefono -> p.ej. '099123456'
SELECT
    co.id, co.ci, co.nombre1, co.apellido1, t.numero AS telefono
FROM contactos co
JOIN telefonos t
    ON t.id IN (co.id_tel_fijo1, co.id_tel_fijo2, co.id_tel_movil1, co.id_tel_movil2)
WHERE t.numero = :telefono;

-- Por documento
-- :ci -> p.ej. 12345678
SELECT co.id, co.ci, co.nombre1, co.apellido1
FROM contactos co
WHERE co.ci = :ci;
```

======================================================================
