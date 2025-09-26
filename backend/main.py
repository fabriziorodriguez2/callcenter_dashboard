from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Tuple
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

# ---------------------------- modelos ----------------------------

class SnapshotIn(BaseModel):
    filters: Dict[str, Any]
    kpis: Dict[str, Any]
    distribution: List[Dict[str, Any]]

# ---------------------------- helpers ----------------------------

def _dict_cur(conn):
    return conn.cursor(dictionary=True)

def _require(cond: bool, msg: str):
    if not cond:
        raise HTTPException(status_code=400, detail=msg)

def _build_filters(
    cur,
    start: Optional[str],
    end: Optional[str],
    campaign_token: Optional[str],
    agent_token: Optional[str],
) -> Tuple[str, str, List[Any], Dict[str, Optional[str]]]:
    """
    Construye los JOIN/WHERE/params y además resuelve labels legibles
    para campaña y agente (para snapshots y UI).
    """
    joins: List[str] = []
    where: List[str] = []
    params: List[Any] = []
    labels: Dict[str, Optional[str]] = {"campaign_label": None, "agent_label": None}

    # Rango de fechas
    if start and end:
        where.append("g.`timestamp` BETWEEN %s AND %s")
        params += [start, end]
    elif start:
        where.append("g.`timestamp` >= %s")
        params += [start]
    elif end:
        where.append("g.`timestamp` <= %s")
        params += [end]

    # Campaign: ID o nombre/código
    if campaign_token:
        if campaign_token.isdigit():
            where.append("g.id_campaign = %s")
            params.append(int(campaign_token))
            cur.execute("SELECT nombre FROM campaigns WHERE id = %s", (int(campaign_token),))
            row = cur.fetchone()
            labels["campaign_label"] = row["nombre"] if row else f"ID {campaign_token}"
        else:
            joins.append("JOIN campaigns c ON c.id = g.id_campaign")
            where.append("(c.codigo = %s OR c.nombre LIKE %s)")
            params += [campaign_token, f"%{campaign_token}%"]
            cur.execute(
                "SELECT GROUP_CONCAT(DISTINCT nombre ORDER BY nombre SEPARATOR ', ') AS label "
                "FROM campaigns WHERE (codigo = %s OR nombre LIKE %s)",
                (campaign_token, f"%{campaign_token}%"),
            )
            row = cur.fetchone()
            labels["campaign_label"] = row["label"] or campaign_token

    # Agent: ID o usuario/nombre-apellido
    if agent_token:
        if agent_token.isdigit():
            where.append("g.id_broker = %s")
            params.append(int(agent_token))
            cur.execute(
                "SELECT CONCAT(nombre, ' ', apellido) AS label FROM users WHERE id = %s",
                (int(agent_token),),
            )
            row = cur.fetchone()
            labels["agent_label"] = row["label"] if row else f"ID {agent_token}"
        else:
            joins.append("JOIN users u ON u.id = g.id_broker")
            where.append("(u.usuario = %s OR CONCAT(u.nombre,' ',u.apellido) LIKE %s)")
            params += [agent_token, f"%{agent_token}%"]
            cur.execute(
                "SELECT GROUP_CONCAT(DISTINCT CONCAT(nombre,' ',apellido) ORDER BY nombre,apellido SEPARATOR ', ') AS label "
                "FROM users WHERE (usuario = %s OR CONCAT(nombre,' ',apellido) LIKE %s)",
                (agent_token, f"%{agent_token}%"),
            )
            row = cur.fetchone()
            labels["agent_label"] = row["label"] or agent_token

    join_sql = (" " + " ".join(sorted(set(joins)))) if joins else ""
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    return join_sql, where_sql, params, labels

# ---------------------------- endpoints ----------------------------

@app.get("/api/health")
def health():
    return {"ok": True}

@app.get("/")
def root():
    return {"message": "API OK", "docs": "/docs"}

@app.get("/api/kpis")
def get_kpis(
    start: Optional[str] = Query(None, description="YYYYMMDDhhmmss"),
    end: Optional[str]   = Query(None, description="YYYYMMDDhhmmss"),
    campaign_id: Optional[str] = Query(None, description="ID, código o nombre de campaña"),
    agent_id: Optional[str] = Query(None, description="ID, usuario o nombre y apellido del agente"),
):
    """
    KPIs + distribución. `campaign_id` y `agent_id` aceptan ID numérico o texto.
    Si es texto, se filtra por campañas (codigo/nombre) y por agentes (usuario o nombre+apellido).
    """
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        join_sql, where_sql, params, labels = _build_filters(cur, start, end, campaign_id, agent_id)

        # KPIs (sin vistas): contactabilidad, PB, PN
        sql_kpis = f"""
            SELECT
              ROUND(100 * SUM(g.id_resultado IN (1,2,8,10,11,14,16)) / NULLIF(COUNT(*),0), 2) AS contactabilidad,
              ROUND(100 * SUM(g.id_resultado = 1) / NULLIF(COUNT(*),0), 2) AS penetracion_bruta,
              ROUND(100 * SUM(g.id_resultado = 1) /
                    NULLIF(SUM(g.id_resultado IN (1,2,8,10,11,14,16)),0), 2) AS penetracion_neta
            FROM gestiones g
            {join_sql}
            {where_sql}
        """
        cur.execute(sql_kpis, params)
        kpis = cur.fetchone() or {"contactabilidad": 0, "penetracion_bruta": 0, "penetracion_neta": 0}

        # Distribución por resultado
        sql_dist = f"""
            SELECT r.nombre AS resultado, COUNT(*) AS cantidad
            FROM gestiones g
            {join_sql}
            JOIN gestiones_resultado r ON r.id = g.id_resultado
            {where_sql}
            GROUP BY r.id, r.nombre
            ORDER BY cantidad DESC
        """
        cur.execute(sql_dist, params)
        distribution = cur.fetchall() or []

       
        cur.execute(f"""
            SELECT c.nombre AS campaña,
                   CONCAT(u.nombre,' ',u.apellido) AS agente,
                   COUNT(*) AS gestiones
            FROM gestiones g
            JOIN campaigns c ON c.id = g.id_campaign
            JOIN users u     ON u.id = g.id_broker
            {where_sql}
            GROUP BY c.id, u.id
            ORDER BY gestiones DESC
            LIMIT 10
        """, params)
        top_resumen = cur.fetchall() or []

        return {
            "kpis": kpis,
            "distribution": distribution,
            "top_resumen": top_resumen,
            "filters": {
                "start": start,
                "end": end,
                "campaign_id": campaign_id,
                "agent_id": agent_id,
                "campaign_label": labels["campaign_label"],
                "agent_label": labels["agent_label"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------- snapshots ----------------------------

@app.post("/api/snapshots")
def create_snapshot(payload: SnapshotIn):
    """
    Guarda el snapshot tal cual lo envía el frontend. Como en /api/kpis
    ya agregamos campaign_label/agent_label dentro de filters, los snapshots
    nuevos quedarán con esa info legible.
    """
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
        return cur.fetchall()
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

# ---------------------------- consultas típicas ----------------------------

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
    where: List[str] = []
    params: List[Any] = []
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
        SUM(g.id_resultado = 1) AS exitosas,
        ROUND(100 * SUM(g.id_resultado IN (1,2,8,10,11,14,16)) / NULLIF(COUNT(*),0), 2) AS contactabilidad,
        ROUND(100 * SUM(g.id_resultado = 1) / NULLIF(COUNT(*),0), 2) AS penetracion_bruta,
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

@app.get("/api/campaigns")
def campaigns(q: Optional[str] = Query(None, description="Texto a buscar"), limit: int = 10):
    """
    Devuelve campañas para autocompletar. Busca por nombre o código (LIKE).
    Si no se envía q, devuelve las primeras N ordenadas por nombre.
    """
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        if q:
            cur.execute(
                """
                SELECT id, codigo, nombre
                FROM campaigns
                WHERE nombre LIKE %s OR codigo LIKE %s
                ORDER BY nombre
                LIMIT %s
                """,
                (f"%{q}%", f"%{q}%", limit),
            )
        else:
            cur.execute(
                "SELECT id, codigo, nombre FROM campaigns ORDER BY nombre LIMIT %s",
                (limit,),
            )
        return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents")
def agents(q: Optional[str] = Query(None, description="Texto a buscar"), limit: int = 10):
    """
    Devuelve agentes para autocompletar. Busca por usuario o por nombre y apellido (LIKE).
    Si no se envía q, devuelve los primeros N ordenados por nombre/apellido.
    """
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        if q:
            cur.execute(
                """
                SELECT id, usuario, CONCAT(nombre,' ',apellido) AS nombre_completo
                FROM users
                WHERE usuario LIKE %s OR CONCAT(nombre,' ',apellido) LIKE %s
                ORDER BY nombre, apellido
                LIMIT %s
                """,
                (f"%{q}%", f"%{q}%", limit),
            )
        else:
            cur.execute(
                """
                SELECT id, usuario, CONCAT(nombre,' ',apellido) AS nombre_completo
                FROM users
                ORDER BY nombre, apellido
                LIMIT %s
                """,
                (limit,),
            )
        return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))