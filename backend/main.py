from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from .db import get_conn
import json

app = FastAPI(title="Dashboard de Gestión con Snapshots")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SnapshotIn(BaseModel):
    filters: Dict[str, Any]
    kpis: Dict[str, Any]
    distribution: List[Dict[str, Any]]

@app.get("/api/health")
def health():
    return {"ok": True}

@app.get("/")
def root():
    return {"message": "API OK", "docs": "/docs"}


def _filters_to_sql(start_date: Optional[str], end_date: Optional[str], campaign_id: Optional[int], agent_id: Optional[int]):
    wheres = []
    params = []
    if start_date:
        wheres.append("g.`timestamp` >= %s")
        params.append(start_date)
    if end_date:
        wheres.append("g.`timestamp` <= %s")
        params.append(end_date)
    if campaign_id:
        wheres.append("g.id_campaign = %s")
        params.append(campaign_id)
    if agent_id:
        wheres.append("g.id_broker = %s")
        params.append(agent_id)
    where_sql = ("WHERE " + " AND ".join(wheres)) if wheres else ""
    return where_sql, params

@app.get("/api/kpis")
def get_kpis(
    start: Optional[str] = Query(None, description="YYYYMMDDhhmmss o YYYYMMDD"),
    end: Optional[str]   = Query(None, description="YYYYMMDDhhmmss o YYYYMMDD"),
    campaign_id: Optional[int] = None,
    agent_id: Optional[int] = None,
):
    """
    Retorna KPIs + distribución de resultados usando las vistas definidas en sql/03_kpi_views.sql
    """
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        where_sql, params = _filters_to_sql(start, end, campaign_id, agent_id)

        # Totales
        cur.execute(f"SELECT COUNT(*) as total FROM gestiones g {where_sql}", params)
        total = cur.fetchone()["total"]

        # Efectivas (vista)
        cur.execute(f"SELECT COUNT(*) as efectivas FROM vw_gestiones_efectivas g {where_sql.replace('g.', 'g.')} ", params)
        efectivas = cur.fetchone()["efectivas"] if cur.rowcount is not None else 0

        # Exitosas (vista)
        cur.execute(f"SELECT COUNT(*) as exitosas FROM vw_gestiones_exitosas g {where_sql.replace('g.', 'g.')}", params)
        exitosas = cur.fetchone()["exitosas"] if cur.rowcount is not None else 0

        contactabilidad = (efectivas / total) * 100 if total else 0.0
        penetracion_bruta = (exitosas / total) * 100 if total else 0.0
        penetracion_neta = (exitosas / efectivas) * 100 if efectivas else 0.0

        # Distribución por resultado
        cur.execute(f"""
            SELECT r.nombre as resultado, COUNT(*) as cantidad
            FROM gestiones g
            JOIN gestiones_resultado r ON r.id = g.id_resultado
            {where_sql}
            GROUP BY r.id, r.nombre
            ORDER BY cantidad DESC
        """, params)
        distrib = cur.fetchall()

        # Resumen por campaña y agente (extra útil en el dashboard)
        cur.execute(f"""
            SELECT c.nombre as campaña, u.nombre as agente_nombre, u.apellido as agente_apellido, 
                   COUNT(*) as gestiones
            FROM gestiones g
            JOIN campaigns c ON c.id = g.id_campaign
            JOIN users u ON u.id = g.id_broker
            {where_sql}
            GROUP BY c.id, u.id
            ORDER BY gestiones DESC
            LIMIT 10
        """, params)
        top_resumen = cur.fetchall()

        return {
            "totals": {"gestiones": total, "efectivas": efectivas, "exitosas": exitosas},
            "kpis": {
                "contactabilidad": round(contactabilidad, 2),
                "penetracion_bruta": round(penetracion_bruta, 2),
                "penetracion_neta": round(penetracion_neta, 2),
            },
            "distribution": distrib,
            "top_resumen": top_resumen,
            "filters": {"start": start, "end": end, "campaign_id": campaign_id, "agent_id": agent_id},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/snapshots")
def create_snapshot(payload: SnapshotIn):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO dashboard_snapshots(filters_json, kpis_json, distribution_json) VALUES (%s, %s, %s)",
            (json.dumps(payload.filters), json.dumps(payload.kpis), json.dumps(payload.distribution)),
        )
        snapshot_id = cur.lastrowid
        return {"id": snapshot_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/snapshots")
def list_snapshots():
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id, created_at, filters_json, kpis_json 
            FROM dashboard_snapshots
            ORDER BY created_at DESC
            LIMIT 100
        """)
        rows = cur.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/snapshots/{snapshot_id}")
def get_snapshot(snapshot_id: int):
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id, created_at, filters_json, kpis_json, distribution_json
            FROM dashboard_snapshots
            WHERE id = %s
        """, (snapshot_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Snapshot no encontrado")
        # No se recalcula nada: se devuelve tal cual fue guardado
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
