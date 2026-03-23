-- ============================================================================
-- MIGRACIÓN: SISTEMA DE AUDITORÍA COMPLETA
-- ============================================================================
-- Fecha: 22 de Enero de 2026
-- Versión: 1.0.0
-- Objetivo: Implementar auditoría completa para trazabilidad y cumplimiento
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLA DE AUDITORÍA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla text NOT NULL,
  operacion text NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id uuid,
  usuario_id uuid REFERENCES perfiles(id),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  direccion_ip inet,
  agente_usuario text,
  creado_en timestamptz DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabla ON audit_logs(tabla);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_fecha ON audit_logs(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operacion ON audit_logs(operacion);
CREATE INDEX IF NOT EXISTS idx_audit_logs_registro ON audit_logs(registro_id);

COMMENT ON TABLE audit_logs IS 
  'Registro de auditoría para todas las operaciones críticas en la base de datos';

-- ============================================================================
-- FUNCIÓN GENÉRICA DE AUDITORÍA
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- DELETE: Solo guardar datos anteriores
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      tabla, 
      operacion, 
      registro_id, 
      usuario_id, 
      datos_anteriores
    )
    VALUES (
      TG_TABLE_NAME, 
      TG_OP, 
      OLD.id, 
      auth.uid(), 
      row_to_json(OLD)::jsonb
    );
    RETURN OLD;
    
  -- UPDATE: Guardar datos anteriores y nuevos
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      tabla, 
      operacion, 
      registro_id, 
      usuario_id, 
      datos_anteriores, 
      datos_nuevos
    )
    VALUES (
      TG_TABLE_NAME, 
      TG_OP, 
      NEW.id, 
      auth.uid(), 
      row_to_json(OLD)::jsonb, 
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
    
  -- INSERT: Solo guardar datos nuevos
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      tabla, 
      operacion, 
      registro_id, 
      usuario_id, 
      datos_nuevos
    )
    VALUES (
      TG_TABLE_NAME, 
      TG_OP, 
      NEW.id, 
      auth.uid(), 
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_function() IS 
  'Función genérica para auditar INSERT, UPDATE y DELETE en tablas críticas';

-- ============================================================================
-- APLICAR TRIGGERS A TABLAS CRÍTICAS
-- ============================================================================

-- PERFILES: Auditar cambios en usuarios
DROP TRIGGER IF EXISTS audit_perfiles ON perfiles;
CREATE TRIGGER audit_perfiles
  AFTER INSERT OR UPDATE OR DELETE ON perfiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- RUTINAS: Auditar creación y modificación de rutinas
DROP TRIGGER IF EXISTS audit_rutinas ON rutinas;
CREATE TRIGGER audit_rutinas
  AFTER INSERT OR UPDATE OR DELETE ON rutinas
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- PAGOS: Auditar todas las transacciones
DROP TRIGGER IF EXISTS audit_pagos ON pagos;
CREATE TRIGGER audit_pagos
  AFTER INSERT OR UPDATE OR DELETE ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- MEDICIONES: Auditar cambios en mediciones corporales
DROP TRIGGER IF EXISTS audit_mediciones ON mediciones;
CREATE TRIGGER audit_mediciones
  AFTER INSERT OR UPDATE OR DELETE ON mediciones
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ASISTENCIAS: Auditar registro de asistencias
DROP TRIGGER IF EXISTS audit_asistencias ON asistencias;
CREATE TRIGGER audit_asistencias
  AFTER INSERT OR UPDATE OR DELETE ON asistencias
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- RESERVAS DE CLASE: Auditar reservas y cancelaciones
DROP TRIGGER IF EXISTS audit_reservas ON reservas_de_clase;
CREATE TRIGGER audit_reservas
  AFTER INSERT OR UPDATE OR DELETE ON reservas_de_clase
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- GAMIFICACIÓN: Auditar cambios en puntos y logros
DROP TRIGGER IF EXISTS audit_gamificacion ON gamificacion_del_usuario;
CREATE TRIGGER audit_gamificacion
  AFTER INSERT OR UPDATE OR DELETE ON gamificacion_del_usuario
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- FUNCIÓN HELPER PARA CONSULTAR AUDITORÍA
-- ============================================================================

CREATE OR REPLACE FUNCTION get_audit_history(
  p_tabla text,
  p_registro_id uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  operacion text,
  usuario_email text,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  fecha timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.operacion,
    p.email as usuario_email,
    a.datos_anteriores,
    a.datos_nuevos,
    a.creado_en as fecha
  FROM audit_logs a
  LEFT JOIN perfiles p ON p.id = a.usuario_id
  WHERE a.tabla = p_tabla
    AND a.registro_id = p_registro_id
  ORDER BY a.creado_en DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_audit_history(text, uuid, int) IS 
  'Obtiene el historial de auditoría para un registro específico';

-- ============================================================================
-- RLS PARA TABLA DE AUDITORÍA
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de auditoría
DROP POLICY IF EXISTS audit_logs_admin_only ON audit_logs;
CREATE POLICY audit_logs_admin_only ON audit_logs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
DECLARE
  total_triggers INT;
BEGIN
  SELECT COUNT(*) INTO total_triggers
  FROM pg_trigger
  WHERE tgname LIKE 'audit_%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SISTEMA DE AUDITORÍA IMPLEMENTADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Triggers de auditoría: %', total_triggers;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tablas auditadas:';
  RAISE NOTICE '- perfiles';
  RAISE NOTICE '- rutinas';
  RAISE NOTICE '- pagos';
  RAISE NOTICE '- mediciones';
  RAISE NOTICE '- asistencias';
  RAISE NOTICE '- reservas_de_clase';
  RAISE NOTICE '- gamificacion_del_usuario';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Funciones disponibles:';
  RAISE NOTICE '- audit_trigger_function()';
  RAISE NOTICE '- get_audit_history(tabla, id, limit)';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
