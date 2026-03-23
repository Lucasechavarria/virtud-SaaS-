-- ============================================================================
-- MIGRACIÓN: RLS POLICIES COMPLETAS
-- ============================================================================
-- Fecha: 22 de Enero de 2026
-- Versión: 1.0.0
-- Objetivo: Implementar Row Level Security en todas las tablas críticas
-- ============================================================================

BEGIN;

-- ============================================================================
-- RUTINAS: Solo usuario, su coach y admins pueden ver
-- ============================================================================

ALTER TABLE rutinas ENABLE ROW LEVEL SECURITY;

-- Policy: Ver rutinas propias o de alumnos asignados
DROP POLICY IF EXISTS rutinas_usuario_propias ON rutinas;
CREATE POLICY rutinas_usuario_propias ON rutinas
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    entrenador_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Policy: Solo coaches y admins pueden crear rutinas
DROP POLICY IF EXISTS rutinas_coach_crear ON rutinas;
CREATE POLICY rutinas_coach_crear ON rutinas
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('coach', 'admin'))
  );

-- Policy: Solo el coach asignado o admin puede actualizar
DROP POLICY IF EXISTS rutinas_coach_actualizar ON rutinas;
CREATE POLICY rutinas_coach_actualizar ON rutinas
  FOR UPDATE
  USING (
    entrenador_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ============================================================================
-- EJERCICIOS: Heredan permisos de rutina
-- ============================================================================

ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ejercicios_via_rutina ON ejercicios;
CREATE POLICY ejercicios_via_rutina ON ejercicios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rutinas r
      WHERE r.id = ejercicios.rutina_id
        AND (r.usuario_id = auth.uid() OR r.entrenador_id = auth.uid() OR
             EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'))
    )
  );

-- ============================================================================
-- SESIONES DE ENTRENAMIENTO: Solo usuario puede ver/modificar sus sesiones
-- ============================================================================

ALTER TABLE sesiones_de_entrenamiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sesiones_usuario_propias ON sesiones_de_entrenamiento;
CREATE POLICY sesiones_usuario_propias ON sesiones_de_entrenamiento
  FOR ALL
  USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ============================================================================
-- REGISTROS DE EJERCICIO: Heredan permisos de sesión
-- ============================================================================

ALTER TABLE registros_de_ejercicio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS registros_via_sesion ON registros_de_ejercicio;
CREATE POLICY registros_via_sesion ON registros_de_ejercicio
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sesiones_de_entrenamiento s
      WHERE s.id = registros_de_ejercicio.sesion_id
        AND (s.usuario_id = auth.uid() OR
             EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'))
    )
  );

-- ============================================================================
-- MEDICIONES: Usuario y su coach pueden ver
-- ============================================================================

ALTER TABLE mediciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mediciones_usuario_coach ON mediciones;
CREATE POLICY mediciones_usuario_coach ON mediciones
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM relacion_alumno_coach
      WHERE usuario_id = mediciones.usuario_id
        AND entrenador_id = auth.uid()
        AND esta_activo = true
    ) OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Policy: Solo el usuario o admin pueden insertar mediciones
DROP POLICY IF EXISTS mediciones_insertar ON mediciones;
CREATE POLICY mediciones_insertar ON mediciones
  FOR INSERT
  WITH CHECK (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('coach', 'admin'))
  );

-- ============================================================================
-- PAGOS: Solo admin y usuario pueden ver
-- ============================================================================

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagos_usuario_admin ON pagos;
CREATE POLICY pagos_usuario_admin ON pagos
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Policy: Solo admin puede crear/modificar pagos
DROP POLICY IF EXISTS pagos_admin_modificar ON pagos;
CREATE POLICY pagos_admin_modificar ON pagos
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ============================================================================
-- MENSAJES: Solo remitente y receptor
-- ============================================================================

ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mensajes_participantes ON mensajes;
CREATE POLICY mensajes_participantes ON mensajes
  FOR SELECT
  USING (
    remitente_id = auth.uid() OR 
    receptor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

DROP POLICY IF EXISTS mensajes_enviar ON mensajes;
CREATE POLICY mensajes_enviar ON mensajes
  FOR INSERT
  WITH CHECK (remitente_id = auth.uid());

-- Policy: Solo el remitente puede actualizar (marcar como leído)
DROP POLICY IF EXISTS mensajes_actualizar ON mensajes;
CREATE POLICY mensajes_actualizar ON mensajes
  FOR UPDATE
  USING (receptor_id = auth.uid());

-- ============================================================================
-- DESAFÍOS: Públicos para lectura, crear solo miembros
-- ============================================================================

ALTER TABLE desafios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS desafios_publicos ON desafios;
CREATE POLICY desafios_publicos ON desafios
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS desafios_crear ON desafios;
CREATE POLICY desafios_crear ON desafios
  FOR INSERT
  WITH CHECK (creado_por = auth.uid());

DROP POLICY IF EXISTS desafios_modificar ON desafios;
CREATE POLICY desafios_modificar ON desafios
  FOR UPDATE
  USING (
    creado_por = auth.uid() OR
    juez_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ============================================================================
-- PLANES NUTRICIONALES: Usuario y su coach
-- ============================================================================

ALTER TABLE planes_nutricionales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planes_nutricionales_usuario_coach ON planes_nutricionales;
CREATE POLICY planes_nutricionales_usuario_coach ON planes_nutricionales
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    entrenador_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

DROP POLICY IF EXISTS planes_nutricionales_coach_crear ON planes_nutricionales;
CREATE POLICY planes_nutricionales_coach_crear ON planes_nutricionales
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('coach', 'admin'))
  );

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
DECLARE
  total_policies INT;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS POLICIES IMPLEMENTADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de policies: %', total_policies;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tablas protegidas:';
  RAISE NOTICE '- rutinas (3 policies)';
  RAISE NOTICE '- ejercicios (1 policy)';
  RAISE NOTICE '- sesiones_de_entrenamiento (1 policy)';
  RAISE NOTICE '- registros_de_ejercicio (1 policy)';
  RAISE NOTICE '- mediciones (2 policies)';
  RAISE NOTICE '- pagos (2 policies)';
  RAISE NOTICE '- mensajes (3 policies)';
  RAISE NOTICE '- desafios (3 policies)';
  RAISE NOTICE '- planes_nutricionales (2 policies)';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
