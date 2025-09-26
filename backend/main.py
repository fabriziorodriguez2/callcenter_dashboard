from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from .db import get_conn
import json
import re

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

def _dict_cur(conn):
    return conn.cursor(dictionary=True)

def _require(cond: bool, msg: str):
    if not cond:
        raise HTTPException(status_code=400, detail=msg)

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
        return row
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/consultas/gestiones")
def gestiones_por_operador_fecha(
    operator_id: int = Query(..., alias="operator_id"),
    date: str = Query(..., pattern=r"^\d{8}$"),  # YYYYMMDD
    conn = Depends(get_conn),
):
    start = f"{date}000000"; end = f"{date}235959"
    sql = """
      SELECT g.id, g.id_campaign, c.nombre AS campaña,
             g.id_contacto, co.nombre1, co.apellido1,
             r.nombre AS resultado, g.notas, g.`timestamp`
      FROM gestiones g
      JOIN campaigns c ON c.id = g.id_campaign
      JOIN contactos co ON co.id = g.id_contacto
      LEFT JOIN gestiones_resultado r ON r.id = g.id_resultado
      WHERE g.id_broker = %s
        AND g.`timestamp` BETWEEN %s AND %s
      ORDER BY g.`timestamp` DESC
    """
    cur = _dict_cur(conn); cur.execute(sql, (operator_id, start, end))
    return cur.fetchall()

@app.get("/api/consultas/no_contesta")
def contactos_no_contesta(
    campaign_id: int,
    conn = Depends(get_conn),
):
    sql = """
      SELECT DISTINCT co.id, co.ci, co.nombre1, co.apellido1
      FROM gestiones g
      JOIN contactos co ON co.id = g.id_contacto
      JOIN gestiones_resultado r ON r.id = g.id_resultado
      WHERE g.id_campaign = %s
        AND UPPER(r.nombre) = UPPER('No contesta')
      ORDER BY co.apellido1, co.nombre1
    """
    cur = _dict_cur(conn); cur.execute(sql, (campaign_id,))
    return cur.fetchall()

@app.get("/api/consultas/rendimiento")
def rendimiento(
    start: Optional[str] = Query(None, pattern=r"^\d{14}$"),  # YYYYMMDDhhmmss
    end:   Optional[str] = Query(None, pattern=r"^\d{14}$"),
    campaign_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    conn = Depends(get_conn),
):
    where = []
    params: List = []
    if start and end:
        where.append("g.`timestamp` BETWEEN %s AND %s")
        params += [start, end]
    if campaign_id:
        where.append("g.id_campaign = %s")
        params.append(campaign_id)
    if agent_id:
        where.append("g.id_broker = %s")
        params.append(agent_id)
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    sql = f"""
      SELECT
        g.id_campaign,
        c.nombre AS campaña,
        g.id_broker,
        CONCAT(u.nombre, ' ', u.apellido) AS operador,
        COUNT(*) AS gestiones,
        SUM(g.id_resultado IN (1,2,8,10,11,14,16)) AS efectivas,
        SUM(g.id_resultado = 1)                    AS exitosas,
        ROUND(100 * SUM(g.id_resultado IN (1,2,8,10,11,14,16)) / NULLIF(COUNT(*),0), 2) AS contactabilidad,
        ROUND(100 * SUM(g.id_resultado = 1) / NULLIF(COUNT(*),0), 2)                    AS penetracion_bruta,
        ROUND(100 * SUM(g.id_resultado = 1) / NULLIF(SUM(g.id_resultado IN (1,2,8,10,11,14,16)),0), 2) AS penetracion_neta
      FROM gestiones g
      JOIN campaigns c ON c.id = g.id_campaign
      JOIN users u     ON u.id = g.id_broker
      {where_sql}
      GROUP BY g.id_campaign, c.nombre, g.id_broker, operador
      ORDER BY campaña, operador
    """
    cur = _dict_cur(conn); cur.execute(sql, tuple(params))
    return cur.fetchall()

@app.get("/api/consultas/contactos")
def buscar_contactos(
    telefono: Optional[str] = None,
    ci: Optional[int] = None,
    conn = Depends(get_conn),
):
    _require(telefono or ci, "Debe enviar 'telefono' o 'ci'")
    cur = _dict_cur(conn)

    if telefono:
        sql = """
          SELECT co.id, co.ci, co.nombre1, co.apellido1, t.numero AS telefono
          FROM contactos co
          JOIN telefonos t
            ON t.id IN (co.id_tel_fijo1, co.id_tel_fijo2, co.id_tel_movil1, co.id_tel_movil2)
          WHERE t.numero = %s
        """
        cur.execute(sql, (telefono,))
        return cur.fetchall()

    sql = "SELECT co.id, co.ci, co.nombre1, co.apellido1 FROM contactos co WHERE co.ci = %s"
    cur.execute(sql, (ci,))
    return cur.fetchall()
