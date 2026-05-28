-- 🛡️ AUDITORÍA IA: LDE SYSTEM V8
-- Esta migración crea la infraestructura para auditar todas las mutaciones realizadas por modelos Gemini.

-- 1. Tabla de Logs de Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id),
    gimnasio_id UUID,
    tabla_afectada TEXT NOT NULL,
    registro_id UUID NOT NULL,
    accion TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    origen TEXT DEFAULT 'HUMAN', -- 'HUMAN' o 'IA_GENERATED'
    modelo_ia TEXT, -- 'gemini-1.5-pro', 'gemini-1.5-flash'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Función de Registro de Auditoría
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    v_origen TEXT := 'HUMAN';
    v_modelo TEXT := NULL;
BEGIN
    -- Intentar detectar si la mutación viene con flags de IA en session variables
    -- o si la tabla es específicamente de resultados de IA.
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.generada_por_ia = TRUE) THEN
            v_origen := 'IA_GENERATED';
        END IF;
        
        INSERT INTO audit_logs (
            usuario_id, 
            tabla_afectada, 
            registro_id, 
            accion, 
            datos_nuevos, 
            origen
        )
        VALUES (
            COALESCE(NEW.usuario_id, auth.uid()), 
            TG_TABLE_NAME, 
            NEW.id, 
            TG_OP, 
            to_jsonb(NEW), 
            v_origen
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (
            usuario_id, 
            tabla_afectada, 
            registro_id, 
            accion, 
            datos_anteriores, 
            datos_nuevos, 
            origen
        )
        VALUES (
            COALESCE(NEW.usuario_id, auth.uid()), 
            TG_TABLE_NAME, 
            NEW.id, 
            TG_OP, 
            to_jsonb(OLD), 
            to_jsonb(NEW), 
            v_origen
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Triggers para tablas CORE
DROP TRIGGER IF EXISTS tr_audit_rutinas ON rutinas;
CREATE TRIGGER tr_audit_rutinas
AFTER INSERT OR UPDATE ON rutinas
FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

DROP TRIGGER IF EXISTS tr_audit_planes_nutricionales ON planes_nutricionales;
CREATE TRIGGER tr_audit_planes_nutricionales
AFTER INSERT OR UPDATE ON planes_nutricionales
FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
