
CREATE OR REPLACE VIEW vw_gestiones_efectivas AS
SELECT g.*
FROM gestiones g
WHERE g.id_resultado IN (1,2,8,10,11,14,16);


CREATE OR REPLACE VIEW vw_gestiones_exitosas AS
SELECT g.*
FROM gestiones g
WHERE g.id_resultado = 1;
