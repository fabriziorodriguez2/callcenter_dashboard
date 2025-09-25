-- Vistas de apoyo para KPIs (ajustá mapeos según negocio)

-- 1) Qué consideramos gestión EFECTIVA (se habló con alguien)
-- Mapeo por id_resultado: contactado, coordinado, agendado, volver a llamar, pendiente,
-- ya tiene servicio, encuesta completada, etc.
-- IDs según datos de ejemplo:
-- 1 Coordinado, 2 Contactado, 8 Agendado, 10 Volver a llamar, 11 Pendiente,
-- 14 Ya tiene el servicio, 16 Encuesta completada
CREATE OR REPLACE VIEW vw_gestiones_efectivas AS
SELECT g.*
FROM gestiones g
WHERE g.id_resultado IN (1,2,8,10,11,14,16);

-- 2) Qué consideramos gestión EXITOSA (culmina en activación / venta)
-- En los datos de ejemplo, mapeamos EXITO a id_resultado = 1 (Coordinado),
-- ya que las notas y el flujo marcan cierres con ese ID.
CREATE OR REPLACE VIEW vw_gestiones_exitosas AS
SELECT g.*
FROM gestiones g
WHERE g.id_resultado = 1;
