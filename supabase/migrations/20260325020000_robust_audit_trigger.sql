-- 🛡️ REPARACIÓN DE AUDITORÍA ROBUSTA
-- Corrige el fallo en audit_trigger_function para tablas que no usan 'id' como clave primaria (ej. gamificacion_del_usuario).

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Detección segura de ID: Intentar 'id', si falla, intentar 'usuario_id', si falla, NULL.
  BEGIN
    IF TG_OP = 'DELETE' THEN v_id := OLD.id; ELSE v_id := NEW.id; END IF;
  EXCEPTION WHEN others THEN
    BEGIN
      IF TG_OP = 'DELETE' THEN v_id := OLD.usuario_id; ELSE v_id := NEW.usuario_id; END IF;
    EXCEPTION WHEN others THEN
      v_id := NULL;
    END;
  END;

  -- Lógica de inserción en audit_logs según la operación
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
      v_id, 
      auth.uid(), 
      row_to_json(OLD)::jsonb
    );
    RETURN OLD;
    
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
      v_id, 
      auth.uid(), 
      row_to_json(OLD)::jsonb, 
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
    
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
      v_id, 
      auth.uid(), 
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_function() IS 
  'Función robusta de auditoría que soporta múltiples nombres de claves primarias (id, usuario_id)';
