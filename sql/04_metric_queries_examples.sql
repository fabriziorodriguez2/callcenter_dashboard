USE proteus_crm;

-- Totales / Efectivas / Exitosas
SELECT
  COUNT(*)                                                   AS gestiones,
  SUM(g.id_resultado IN (1,2,8,10,11,14,16))                 AS efectivas,
  SUM(g.id_resultado = 1)                                    AS exitosas
FROM gestiones g;

-- KPIs calculados
SELECT
  ROUND(100 * t.efectivas / NULLIF(t.gestiones,0), 2) AS contactabilidad,
  ROUND(100 * t.exitosas / NULLIF(t.gestiones,0), 2)  AS penetracion_bruta,
  ROUND(100 * t.exitosas / NULLIF(t.efectivas,0), 2)  AS penetracion_neta
FROM (
  SELECT
    COUNT(*) AS gestiones,
    SUM(g.id_resultado IN (1,2,8,10,11,14,16)) AS efectivas,
    SUM(g.id_resultado = 1) AS exitosas
  FROM gestiones g
) t;

-- Distribución por resultado
SELECT r.nombre AS resultado, COUNT(*) AS cantidad
FROM gestiones g
JOIN gestiones_resultado r ON r.id = g.id_resultado
GROUP BY r.id, r.nombre
ORDER BY cantidad DESC;

-- Top actividad (campaña / agente)
SELECT c.nombre AS campaña,
       CONCAT(u.nombre, ' ', u.apellido) AS agente,
       COUNT(*) AS gestiones
FROM gestiones g
JOIN campaigns c ON c.id = g.id_campaign
JOIN users u     ON u.id = g.id_broker
GROUP BY c.id, u.id
ORDER BY gestiones DESC
LIMIT 20;

/* Filtros opcionales para aplicar en cualquiera:
WHERE g.`timestamp` BETWEEN '20200101000000' AND '20300101000000'
  AND (g.id_campaign = 1 OR 1=1)
  AND (g.id_broker  = 123 OR 1=1)
*/
