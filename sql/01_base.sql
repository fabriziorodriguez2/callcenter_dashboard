-- ================================================================
-- PROTEUS CRM - ESTRUCTURA DE BASE DE DATOS (PRUEBA TÉCNICA)
-- ================================================================
-- Este archivo contiene las tablas principales para la gestión de
-- campañas, gestiones, usuarios y contactos del sistema Proteus CRM.
-- 
-- NOTA: Este archivo está diseñado para un proceso de reclutamiento.
-- Las restricciones de clave foránea (FK) no están implementadas 
-- físicamente en la BD original por razones de rendimiento y 
-- flexibilidad, pero se documentan aquí para comprensión del diseño.
-- ================================================================

-- ================================================================
-- MÓDULO DE USUARIOS Y PERMISOS
-- ================================================================

-- ----------------------------------------------------------------
-- Tabla: users
-- Propósito: Almacena la información principal de los usuarios del sistema
-- Incluye operadores telefónicos, supervisores, administradores, etc.
-- ----------------------------------------------------------------
CREATE TABLE `users` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `id_tipo` int(4) NOT NULL,                    -- FK hacia users_tipos.id
  `id_estado` int(2) NOT NULL,                  -- FK hacia users_estados.id  
  `id_grupo` int(4) NOT NULL,                   -- FK hacia users_grupos.id
  `id_categoria` int(8) NOT NULL,               -- FK hacia users_categorias.id
  `ci` int(8) NOT NULL,                         -- Cédula de identidad del usuario
  `nombre` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `apellido` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `usuario` char(32) COLLATE utf8_spanish_ci NOT NULL,  -- Login único
  `password` text COLLATE utf8_spanish_ci NOT NULL,     -- Hash de la contraseña
  `id_tipo_escala` int(2) NOT NULL,             -- Relacionado con esquema de comisiones
  PRIMARY KEY (`id`),
  KEY `id_tipo` (`id_tipo`,`id_estado`,`id_grupo`),
  KEY `id_categoria` (`id_categoria`),
  KEY `id_estado` (`id_estado`),
  KEY `id_grupo` (`id_grupo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: users_tipos
-- Propósito: Define los tipos de usuario del sistema
-- Ejemplos: Operador, Supervisor, Administrador, etc.
-- ----------------------------------------------------------------
CREATE TABLE `users_tipos` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `nombre` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `descripcion` text COLLATE utf8_spanish_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: users_estados
-- Propósito: Define los estados posibles de un usuario
-- Ejemplos: Activo, Inactivo, Suspendido, etc.
-- ----------------------------------------------------------------
CREATE TABLE `users_estados` (
  `id` int(2) NOT NULL AUTO_INCREMENT,
  `nombre` char(32) COLLATE utf8_spanish_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: users_grupos
-- Propósito: Agrupa usuarios por equipos o departamentos
-- Usado para organización jerárquica y permisos
-- ----------------------------------------------------------------
CREATE TABLE `users_grupos` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `nombre` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `descripcion` text COLLATE utf8_spanish_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: users_categorias
-- Propósito: Categorización adicional de usuarios (ej: Senior, Junior)
-- ----------------------------------------------------------------
CREATE TABLE `users_categorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `categoria` char(32) COLLATE utf8_spanish_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ================================================================
-- MÓDULO DE CONTACTOS
-- ================================================================

-- ----------------------------------------------------------------
-- Tabla: contactos
-- Propósito: Almacena la información personal de los clientes/prospectos
-- Es la entidad central que conecta todas las gestiones y servicios
-- ----------------------------------------------------------------
CREATE TABLE `contactos` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_estado` int(4) NOT NULL,                  -- FK hacia contactos_estado.id
  `id_domicilio` int(10) UNSIGNED NOT NULL,     -- FK hacia domicilios.id
  `id_ocupacion` int(4) NOT NULL,               -- FK hacia ocupaciones.id
  `id_estado_civil` int(2) NOT NULL,            -- FK hacia estados_civiles.id
  `ci` bigint(11) NOT NULL,                     -- Cédula de identidad
  `nombre1` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `nombre2` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `apellido1` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `apellido2` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `fc_nacimiento` int(8) NOT NULL,              -- Fecha en formato YYYYMMDD
  `sexo` char(1) COLLATE utf8_spanish_ci NOT NULL,  -- 'M' o 'F'
  `zurdo` char(1) COLLATE utf8_spanish_ci NOT NULL, -- Para seguros laborales,
  `id_tel_fijo1` int(10) NOT NULL,              -- FK hacia telefonos.id
  `id_tel_fijo2` int(10) NOT NULL,              -- FK hacia telefonos.id
  `id_tel_movil1` int(10) NOT NULL,             -- FK hacia telefonos.id
  `id_tel_movil2` int(10) NOT NULL,             -- FK hacia telefonos.id
  `email` text COLLATE utf8_spanish_ci NOT NULL,
  `id_userinsert` int(10) NOT NULL,             -- FK hacia users.id (quien creó el registro)
  `id_fuente_dato` int(10) NOT NULL,            -- FK hacia contactos_fuentes_datos.id
  `se_queda` int(1) NOT NULL,                   -- Flag para campañas de retención
  `timestamp` bigint(14) NOT NULL,              -- Fecha/hora de creación YYYYMMDDhhiiss
  `lastupdate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `mascota` int(1) DEFAULT '0',                 -- Si tiene mascotas (para productos específicos)
  PRIMARY KEY (`id`),
  KEY `id_tel_fijo1` (`id_tel_fijo1`),
  KEY `id_estado` (`id_estado`),
  KEY `id_domicilio` (`id_domicilio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: contactos_estado
-- Propósito: Estados del contacto en el proceso de gestión
-- Ejemplos: Prospecto, Cliente, Rechazado, No contactar, etc.
-- ----------------------------------------------------------------
CREATE TABLE `contactos_estado` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `nombre` char(32) COLLATE utf8_spanish_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: telefonos
-- Propósito: Almacena los números telefónicos de forma normalizada
-- Se relaciona con contactos a través de los campos id_tel_*
-- ----------------------------------------------------------------
CREATE TABLE `telefonos` (
  `id` bigint(16) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo` int(2) NOT NULL,                       -- 1=Fijo, 2=Móvil
  `numero` bigint(15) UNSIGNED NOT NULL,        -- Número sin prefijos ni formatos
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero` (`numero`),
  KEY `tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ================================================================
-- MÓDULO DE CAMPAÑAS
-- ================================================================

-- ----------------------------------------------------------------
-- Tabla: campaigns
-- Propósito: Define las campañas de marketing/ventas
-- Una campaña agrupa gestiones con un objetivo común
-- ----------------------------------------------------------------
CREATE TABLE `campaigns` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `id_estado` int(4) NOT NULL,                  -- FK hacia campaigns_estados.id
  `codigo` char(16) COLLATE utf8_spanish_ci NOT NULL,   -- Código único de campaña
  `nombre` char(64) COLLATE utf8_spanish_ci NOT NULL,
  `descripcion` text COLLATE utf8_spanish_ci NOT NULL,
  `brokers` text COLLATE utf8_spanish_ci NOT NULL,      -- Lista de usuarios asignados (formato legacy)
  `fc_inicio` int(8) NOT NULL,                  -- Fecha inicio YYYYMMDD
  `fc_final` int(8) NOT NULL,                   -- Fecha fin YYYYMMDD
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `id_estado` (`id_estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: campaigns_estados
-- Propósito: Estados de las campañas
-- Ejemplos: Activa, Pausada, Finalizada, Planificada
-- ----------------------------------------------------------------
CREATE TABLE `campaigns_estados` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `nombre` char(32) COLLATE utf8_spanish_ci NOT NULL,
  `descripcion` text COLLATE utf8_spanish_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ================================================================
-- MÓDULO DE GESTIONES
-- ================================================================

-- ----------------------------------------------------------------
-- Tabla: gestiones
-- Propósito: Registro de cada intento de contacto o gestión realizada
-- Es la entidad que conecta usuarios, contactos y campañas
-- Cada fila representa una llamada, visita o gestión específica
-- ----------------------------------------------------------------
CREATE TABLE `gestiones` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `id_tipo` int(4) NOT NULL,                    -- FK hacia gestiones_tipo.id
  `id_campaign` int(6) NOT NULL,                -- FK hacia campaigns.id
  `id_broker` int(4) NOT NULL,                  -- FK hacia users.id (operador asignado)
  `id_contacto` int(10) NOT NULL,               -- FK hacia contactos.id
  `id_resultado` int(4) NOT NULL,               -- FK hacia gestiones_resultado.id -> 0 significa sin resultado
  `notas` text COLLATE utf8_spanish_ci NOT NULL,    -- Observaciones del operador
  `timestamp` char(14) COLLATE utf8_spanish_ci NOT NULL,  -- Fecha/hora YYYYMMDDhhiiss
  `id_tel_fijo1` int(11) NOT NULL,              -- Teléfono usado en esta gestión
  `lastupdate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_contacto` (`id_contacto`),
  KEY `id_tipo` (`id_tipo`),
  KEY `id_campaign` (`id_campaign`),
  KEY `id_broker` (`id_broker`),
  KEY `id_resultado` (`id_resultado`),
  KEY `timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: gestiones_tipo
-- Propósito: Tipos de gestión que se pueden realizar
-- Ejemplos: Llamada, Email, Visita, SMS, etc.
-- ----------------------------------------------------------------
CREATE TABLE `gestiones_tipo` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `nombre` char(32) COLLATE utf8_spanish_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ----------------------------------------------------------------
-- Tabla: gestiones_resultado -> 0 significa sin resultado
-- Propósito: Resultados posibles de una gestión
-- Ejemplos: Contactado, No contesta, Ocupado, Coordinado, Rechazado, etc. -> 0 significa sin resultado
-- ----------------------------------------------------------------
CREATE TABLE `gestiones_resultado` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `nombre` char(32) COLLATE utf8_spanish_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- ================================================================
-- DATOS DE EJEMPLO PARA TESTING
-- ================================================================

-- Tipos de usuario básicos
INSERT INTO `users_tipos` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Operador', 'Agente telefónico que realiza gestiones'),
(2, 'Supervisor', 'Supervisa el trabajo de los operadores'),
(3, 'Administrador', 'Acceso completo al sistema');

-- Estados de usuario
INSERT INTO `users_estados` (`id`, `nombre`) VALUES
(1, 'Activo'),
(2, 'Inactivo'),
(3, 'Suspendido');

-- Grupos de usuarios
INSERT INTO `users_grupos` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Ventas', 'Equipo de ventas telefónicas'),
(2, 'Retención', 'Equipo de retención de clientes'),
(3, 'Cobranzas', 'Equipo de gestión de cobranzas');

-- Categorías de usuarios
INSERT INTO `users_categorias` (`id`, `categoria`) VALUES
(1, 'Junior'),
(2, 'Senior'),
(3, 'Team Leader');

-- Estados de contactos
INSERT INTO `contactos_estado` (`id`, `nombre`) VALUES
(1, 'Prospecto'),
(2, 'Cliente'),
(3, 'Rechazado'),
(4, 'No contactar'),
(5, 'Seguimiento');

-- Estados de campañas
INSERT INTO `campaigns_estados` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Activa', 'Campaña en ejecución'),
(2, 'Pausada', 'Campaña temporalmente suspendida'),
(3, 'Finalizada', 'Campaña completada'),
(4, 'Planificada', 'Campaña programada para el futuro');

-- Tipos de gestión
INSERT INTO `gestiones_tipo` (`id`, `nombre`) VALUES
(1, 'Llamada'),
(2, 'Email'),
(3, 'SMS'),
(4, 'Visita'),
(5, 'WhatsApp');

-- Resultados de gestión más comunes
INSERT INTO `gestiones_resultado` (`id`, `nombre`) VALUES
(1, 'Coordinado'),
(2, 'Contactado'),
(3, 'No contesta'),
(4, 'Ocupado'),
(5, 'Fuera de servicio'),
(6, 'Número equivocado'),
(7, 'Rechazado'),
(8, 'Agendado'),
(9, 'No interesado'),
(10, 'Volver a llamar'),
(11, 'Pendiente'),
(12, 'Datos incorrectos'),
(13, 'Menor de edad'),
(14, 'Ya tiene el servicio'),
(15, 'Coordinar por mail'),
(16, 'Encuesta completada');

-- ================================================================
-- DATOS DUMMY PARA TESTING COMPLETO
-- ================================================================

-- Usuarios de ejemplo (5 operadores/supervisores)
INSERT INTO `users` (`id`, `id_tipo`, `id_estado`, `id_grupo`, `id_categoria`, `ci`, `nombre`, `apellido`, `usuario`, `password`, `id_tipo_escala`) VALUES
(1, 1, 1, 1, 1, 12345678, 'Juan', 'Pérez', 'jperez', 'hash123', 1),
(2, 1, 1, 1, 1, 23456789, 'María', 'González', 'mgonzalez', 'hash456', 1),
(3, 1, 1, 1, 2, 34567890, 'Carlos', 'Rodríguez', 'crodriguez', 'hash789', 1),
(4, 2, 1, 1, 3, 45678901, 'Ana', 'Martínez', 'amartinez', 'hashabc', 2),
(5, 1, 1, 2, 2, 56789012, 'Pedro', 'López', 'plopez', 'hashdef', 1);

-- Campañas de ejemplo
INSERT INTO `campaigns` (`id`, `id_estado`, `codigo`, `nombre`, `descripcion`, `brokers`, `fc_inicio`, `fc_final`) VALUES
(1, 1, 'VENTA2025', 'Campaña Ventas Q1 2025', 'Campaña de ventas primer trimestre', '_1__2__3_', 20250101, 20250331),
(2, 1, 'RETEN2025', 'Retención Clientes', 'Campaña de retención de clientes existentes', '_2__4__5_', 20250101, 20250630),
(3, 1, 'CROSS2025', 'Cross Selling', 'Venta cruzada de productos adicionales', '_1__3__5_', 20250201, 20250430),
(4, 2, 'COBRA2025', 'Cobranzas', 'Gestión de cobranzas morosas', '_4__5_', 20250101, 20251231),
(5, 1, 'ENCUES25', 'Encuestas Satisfacción', 'Encuestas de satisfacción post-venta', '_1__2__3__4_', 20250115, 20250315);

-- Teléfonos de ejemplo (para usar en contactos)
INSERT INTO `telefonos` (`id`, `tipo`, `numero`) VALUES
(1, 1, 24001234),    -- Fijo
(2, 2, 98765432),    -- Móvil
(3, 1, 24005678),    -- Fijo
(4, 2, 99123456),    -- Móvil
(5, 1, 24009012),    -- Fijo
(6, 2, 97456789),    -- Móvil
(7, 1, 24003456),    -- Fijo
(8, 2, 96789012),    -- Móvil
(9, 1, 24007890),    -- Fijo
(10, 2, 95123456),   -- Móvil
(11, 2, 94567890),   -- Móvil adicional
(12, 2, 93456789),   -- Móvil adicional
(13, 1, 24002345),   -- Fijo adicional
(14, 1, 24006789),   -- Fijo adicional
(15, 2, 92345678),   -- Móvil adicional
(16, 2, 91234567),   -- Móvil adicional
(17, 1, 24004567),   -- Fijo adicional
(18, 1, 24008901),   -- Fijo adicional
(19, 2, 90123456),   -- Móvil adicional
(20, 2, 98901234);   -- Móvil adicional

-- Contactos de ejemplo (10 contactos)
INSERT INTO `contactos` (`id`, `id_estado`, `id_domicilio`, `id_ocupacion`, `id_estado_civil`, `ci`, `nombre1`, `nombre2`, `apellido1`, `apellido2`, `fc_nacimiento`, `sexo`, `zurdo`, `id_tel_fijo1`, `id_tel_fijo2`, `id_tel_movil1`, `id_tel_movil2`, `email`, `id_userinsert`, `id_fuente_dato`, `se_queda`, `timestamp`, `mascota`) VALUES
(1, 1, 1, 1, 1, 11111111, 'Roberto', 'Carlos', 'Silva', 'Mendoza', 19850315, 'M', 'N', 1, 13, 2, 11, 'roberto.silva@email.com', 1, 1, 0, 20250101120000, 1),
(2, 2, 2, 2, 2, 22222222, 'Laura', 'Isabel', 'Fernández', 'Castro', 19920708, 'F', 'N', 3, 14, 4, 12, 'laura.fernandez@email.com', 2, 1, 1, 20250102130000, 0),
(3, 1, 3, 3, 1, 33333333, 'Miguel', 'Ángel', 'Torres', 'Vega', 19880422, 'M', 'S', 5, 17, 6, 15, 'miguel.torres@email.com', 1, 2, 0, 20250103140000, 1),
(4, 1, 4, 1, 3, 44444444, 'Carmen', 'Rosa', 'Jiménez', 'Morales', 19750912, 'F', 'N', 7, 18, 8, 16, 'carmen.jimenez@email.com', 3, 1, 0, 20250104150000, 0),
(5, 3, 5, 4, 1, 55555555, 'Andrés', 'Felipe', 'Vargas', 'Ruiz', 19901203, 'M', 'N', 9, 0, 10, 19, 'andres.vargas@email.com', 2, 3, 1, 20250105160000, 1),
(6, 1, 6, 2, 2, 66666666, 'Patricia', 'Elena', 'Herrera', 'Díaz', 19860825, 'F', 'N', 0, 1, 20, 2, 'patricia.herrera@email.com', 4, 1, 0, 20250106170000, 0),
(7, 2, 7, 5, 1, 77777777, 'Francisco', 'Javier', 'Ramírez', 'Cruz', 19820617, 'M', 'S', 3, 5, 4, 6, 'francisco.ramirez@email.com', 1, 2, 1, 20250107180000, 1),
(8, 1, 8, 1, 4, 88888888, 'Beatriz', 'Alejandra', 'Guerrero', 'Peña', 19940210, 'F', 'N', 7, 9, 8, 10, 'beatriz.guerrero@email.com', 5, 1, 0, 20250108190000, 0),
(9, 1, 9, 3, 1, 99999999, 'Jorge', 'Luis', 'Mendoza', 'Flores', 19870530, 'M', 'N', 13, 17, 11, 15, 'jorge.mendoza@email.com', 3, 2, 0, 20250109200000, 1),
(10, 5, 10, 2, 2, 10101010, 'Valentina', 'Sofía', 'Ortega', 'Restrepo', 19910914, 'F', 'N', 14, 18, 12, 16, 'valentina.ortega@email.com', 2, 1, 1, 20250110210000, 0);

-- Gestiones de ejemplo (100 gestiones distribuidas entre contactos, campañas y operadores)
INSERT INTO `gestiones` (`id`, `id_tipo`, `id_campaign`, `id_broker`, `id_contacto`, `id_resultado`, `notas`, `timestamp`, `id_tel_fijo1`) VALUES
-- Gestiones para contacto 1
(1, 1, 1, 1, 1, 3, 'Primera llamada, no contesta', 20250115080000, 1),
(2, 1, 1, 1, 1, 2, 'Contactado, muestra interés', 20250116090000, 1),
(3, 1, 1, 1, 1, 1, 'Coordinada visita para el jueves', 20250117100000, 1),
(4, 1, 1, 2, 1, 8, 'Reagendado para la próxima semana', 20250118110000, 2),
(5, 1, 1, 2, 1, 1, 'Venta cerrada exitosamente', 20250119120000, 2),

-- Gestiones para contacto 2
(6, 1, 2, 3, 2, 2, 'Cliente actual, consulta sobre renovación', 20250115130000, 3),
(7, 1, 2, 3, 2, 1, 'Acepta renovación, coordinado pago', 20250116140000, 3),
(8, 1, 2, 4, 2, 11, 'Pendiente documentación', 20250117150000, 4),
(9, 1, 2, 4, 2, 1, 'Documentación completa, proceso finalizado', 20250118160000, 4),

-- Gestiones para contacto 3
(10, 1, 3, 5, 3, 4, 'Línea ocupada', 20250115170000, 5),
(11, 1, 3, 5, 3, 3, 'No contesta segunda llamada', 20250116180000, 5),
(12, 1, 3, 1, 3, 2, 'Contactado, interesado en producto', 20250117190000, 6),
(13, 1, 3, 1, 3, 8, 'Agendado para presentación', 20250118200000, 6),
(14, 1, 3, 2, 3, 1, 'Presentación realizada, coordinado', 20250119210000, 6),

-- Gestiones para contacto 4
(15, 1, 1, 3, 4, 7, 'No está interesada en el momento', 20250115220000, 7),
(16, 1, 1, 3, 4, 10, 'Solicita llamar en 2 semanas', 20250130080000, 7),
(17, 1, 1, 4, 4, 2, 'Segunda oportunidad, muestra interés', 20250201090000, 8),
(18, 1, 1, 4, 4, 1, 'Acepta propuesta, coordinado', 20250202100000, 8),

-- Gestiones para contacto 5
(19, 1, 4, 5, 5, 9, 'Cliente rechaza gestión de cobranza', 20250115110000, 9),
(20, 1, 4, 5, 5, 12, 'Datos de contacto incorrectos', 20250116120000, 10),
(21, 1, 4, 1, 5, 2, 'Actualización de datos, contactado', 20250117130000, 10),
(22, 1, 4, 1, 5, 11, 'Pendiente regularizar situación', 20250118140000, 10),

-- Gestiones para contacto 6
(23, 1, 5, 2, 6, 16, 'Encuesta de satisfacción completada', 20250115150000, 1),
(24, 1, 1, 2, 6, 2, 'Cross selling, consultó otros productos', 20250116160000, 20),
(25, 1, 1, 3, 6, 8, 'Interesada, agendada nueva llamada', 20250117170000, 20),
(26, 1, 1, 3, 6, 1, 'Adquiere producto adicional', 20250118180000, 20),

-- Gestiones para contacto 7
(27, 1, 2, 4, 7, 2, 'Cliente fidelizado, consulta beneficios', 20250115190000, 3),
(28, 1, 2, 4, 7, 1, 'Acepta upgrade del servicio', 20250116200000, 3),
(29, 1, 2, 5, 7, 11, 'Pendiente activación técnica', 20250117210000, 4),
(30, 1, 2, 5, 7, 1, 'Servicio activado correctamente', 20250118220000, 4),

-- Gestiones para contacto 8
(31, 1, 3, 1, 8, 13, 'Menor de edad, no puede contratar', 20250115230000, 7),
(32, 1, 3, 1, 8, 2, 'Habló con tutor, autoriza gestión', 20250120080000, 8),
(33, 1, 3, 2, 8, 15, 'Coordinación vía email con tutor', 20250121090000, 8),
(34, 1, 3, 2, 8, 1, 'Contrato firmado por tutor', 20250122100000, 8),

-- Gestiones para contacto 9
(35, 1, 1, 3, 9, 6, 'Número equivocado', 20250115110000, 13),
(36, 1, 1, 3, 9, 2, 'Número correcto, contactado', 20250116120000, 11),
(37, 1, 1, 4, 9, 14, 'Ya tiene servicio similar con competencia', 20250117130000, 11),
(38, 1, 1, 4, 9, 10, 'Solicita llamar cuando venza contrato', 20250118140000, 11),

-- Gestiones para contacto 10
(39, 1, 5, 5, 10, 16, 'Encuesta completada, muy satisfecha', 20250115150000, 14),
(40, 1, 2, 5, 10, 2, 'Consulta sobre nuevos servicios', 20250116160000, 12),
(41, 1, 2, 1, 10, 1, 'Contrata servicio adicional', 20250117170000, 12),

-- Gestiones adicionales distribuidas aleatoriamente
(42, 1, 1, 1, 2, 3, 'No contesta en horario laboral', 20250119080000, 3),
(43, 1, 2, 2, 3, 4, 'Línea ocupada durante la llamada', 20250119090000, 5),
(44, 1, 3, 3, 4, 5, 'Teléfono fuera de servicio', 20250119100000, 7),
(45, 1, 4, 4, 5, 2, 'Contactado para seguimiento cobranza', 20250119110000, 9),
(46, 1, 5, 5, 6, 16, 'Segunda encuesta completada', 20250119120000, 1),
(47, 1, 1, 1, 7, 3, 'No atiende llamada matutina', 20250119130000, 3),
(48, 1, 2, 2, 8, 2, 'Contactada para retención', 20250119140000, 7),
(49, 1, 3, 3, 9, 6, 'Número incorrecto en base datos', 20250119150000, 13),
(50, 1, 4, 4, 10, 11, 'Pendiente actualización datos', 20250119160000, 14),

(51, 1, 5, 5, 1, 2, 'Follow up encuesta anterior', 20250120080000, 1),
(52, 1, 1, 1, 3, 10, 'Reagendar para mejor horario', 20250120090000, 5),
(53, 1, 2, 2, 5, 7, 'Cliente rechaza propuesta', 20250120100000, 9),
(54, 1, 3, 3, 7, 2, 'Contactado para cross selling', 20250120110000, 3),
(55, 1, 4, 4, 9, 12, 'Actualizar información de contacto', 20250120120000, 11),
(56, 1, 5, 5, 2, 1, 'Encuesta y venta cruzada exitosa', 20250120130000, 3),
(57, 1, 1, 1, 4, 8, 'Agendar para próxima semana', 20250120140000, 7),
(58, 1, 2, 2, 6, 2, 'Consulta sobre renovación', 20250120150000, 20),
(59, 1, 3, 3, 8, 11, 'Pendiente documentación legal', 20250120160000, 7),
(60, 1, 4, 4, 10, 1, 'Regularización de cuenta exitosa', 20250120170000, 14),

(61, 1, 1, 2, 1, 3, 'Tercer intento, no contesta', 20250121080000, 1),
(62, 1, 2, 3, 2, 2, 'Consulta adicional sobre servicios', 20250121090000, 3),
(63, 1, 3, 4, 3, 1, 'Cierre exitoso de venta', 20250121100000, 5),
(64, 1, 4, 5, 4, 9, 'No interesada en momento actual', 20250121110000, 7),
(65, 1, 5, 1, 5, 16, 'Encuesta post-regularización', 20250121120000, 9),
(66, 1, 1, 2, 6, 2, 'Seguimiento producto adicional', 20250121130000, 20),
(67, 1, 2, 3, 7, 1, 'Upgrade confirmado y activado', 20250121140000, 3),
(68, 1, 3, 4, 8, 2, 'Contacto con tutor confirmado', 20250121150000, 7),
(69, 1, 4, 5, 9, 3, 'No contesta en nuevo número', 20250121160000, 11),
(70, 1, 5, 1, 10, 2, 'Seguimiento satisfacción cliente', 20250121170000, 14),

(71, 1, 1, 3, 1, 4, 'Ocupado durante horario comercial', 20250122080000, 1),
(72, 1, 2, 4, 2, 1, 'Renovación procesada exitosamente', 20250122090000, 3),
(73, 1, 3, 5, 3, 11, 'Pendiente activación técnica', 20250122100000, 5),
(74, 1, 4, 1, 4, 2, 'Recontacto después de rechazo', 20250122110000, 7),
(75, 1, 5, 2, 5, 2, 'Nueva encuesta de seguimiento', 20250122120000, 9),
(76, 1, 1, 3, 6, 8, 'Reagendado para presentación', 20250122130000, 20),
(77, 1, 2, 4, 7, 2, 'Cliente consulta nuevos beneficios', 20250122140000, 3),
(78, 1, 3, 5, 8, 1, 'Contrato menor edad procesado', 20250122150000, 7),
(79, 1, 4, 1, 9, 2, 'Contactado en número actualizado', 20250122160000, 11),
(80, 1, 5, 2, 10, 16, 'Encuesta satisfacción completada', 20250122170000, 14),

(81, 1, 1, 4, 1, 2, 'Contactado para nueva oferta', 20250123080000, 1),
(82, 1, 2, 5, 2, 11, 'Pendiente firma documentos', 20250123090000, 3),
(83, 1, 3, 1, 3, 1, 'Activación técnica completada', 20250123100000, 5),
(84, 1, 4, 2, 4, 10, 'Volver a llamar próximo mes', 20250123110000, 7),
(85, 1, 5, 3, 5, 2, 'Encuesta post regularización', 20250123120000, 9),
(86, 1, 1, 4, 6, 1, 'Producto adicional confirmado', 20250123130000, 20),
(87, 1, 2, 5, 7, 2, 'Seguimiento upgrade servicio', 20250123140000, 3),
(88, 1, 3, 1, 8, 11, 'Pendiente activación tutor', 20250123150000, 7),
(89, 1, 4, 2, 9, 14, 'Competencia vence en 6 meses', 20250123160000, 11),
(90, 1, 5, 3, 10, 1, 'Servicio adicional activado', 20250123170000, 14),

(91, 1, 1, 5, 1, 3, 'No contesta en horario tarde', 20250124080000, 1),
(92, 1, 2, 1, 2, 2, 'Cliente muy satisfecho', 20250124090000, 3),
(93, 1, 3, 2, 3, 1, 'Proceso completado exitosamente', 20250124100000, 5),
(94, 1, 4, 3, 4, 8, 'Reagendado para fin de mes', 20250124110000, 7),
(95, 1, 5, 4, 5, 16, 'Última encuesta del proceso', 20250124120000, 9),
(96, 1, 1, 5, 6, 2, 'Seguimiento final producto', 20250124130000, 20),
(97, 1, 2, 1, 7, 1, 'Fidelización completada', 20250124140000, 3),
(98, 1, 3, 2, 8, 2, 'Confirmación final tutor', 20250124150000, 7),
(99, 1, 4, 3, 9, 2, 'Datos actualizados correctamente', 20250124160000, 11),
(100, 1, 5, 4, 10, 1, 'Proceso integral completado', 20250124170000, 14);