-- Migración para corregir filtraciones de aislamiento multi-tenant en nutrición, mediciones y sesiones.
-- Añade también la columna gimnasio_id en equipamiento e implementa la tabla crm_prospectos con sus políticas.

BEGIN;

-- 0. Corregir funciones de auditoría para el esquema particionado de audit_logs
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    v_origen TEXT := 'HUMAN';
    v_gimnasio_id UUID;
BEGIN
    -- Determinar gimnasio_id de la fila o del contexto del usuario
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            v_gimnasio_id := COALESCE(OLD.gimnasio_id, public.get_user_gym_id());
        ELSE
            v_gimnasio_id := COALESCE(NEW.gimnasio_id, public.get_user_gym_id());
        END IF;
    EXCEPTION WHEN others THEN
        v_gimnasio_id := public.get_user_gym_id();
    END;

    -- Si aún es NULL, buscar el gimnasio del usuario_id o perfil
    IF (v_gimnasio_id IS NULL) THEN
        BEGIN
            IF (TG_OP = 'DELETE') THEN
                SELECT gimnasio_id INTO v_gimnasio_id FROM public.perfiles WHERE id = OLD.usuario_id;
            ELSE
                SELECT gimnasio_id INTO v_gimnasio_id FROM public.perfiles WHERE id = NEW.usuario_id;
            END IF;
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;

    -- Si sigue siendo NULL, usar el gimnasio por defecto (Sede Central)
    IF (v_gimnasio_id IS NULL) THEN
        SELECT id INTO v_gimnasio_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;
        IF (v_gimnasio_id IS NULL) THEN
            SELECT id INTO v_gimnasio_id FROM public.gimnasios LIMIT 1;
        END IF;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (
            gimnasio_id,
            tabla,
            operacion,
            registro_id,
            usuario_id,
            datos_nuevos
        )
        VALUES (
            v_gimnasio_id,
            TG_TABLE_NAME,
            TG_OP,
            NEW.id,
            COALESCE(NEW.usuario_id, auth.uid()),
            to_jsonb(NEW)
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (
            gimnasio_id,
            tabla,
            operacion,
            registro_id,
            usuario_id,
            datos_anteriores,
            datos_nuevos
        )
        VALUES (
            v_gimnasio_id,
            TG_TABLE_NAME,
            TG_OP,
            NEW.id,
            COALESCE(NEW.usuario_id, auth.uid()),
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_id uuid;
  v_gimnasio_id UUID;
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

  -- Determinar gimnasio_id de la fila o del contexto del usuario
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_gimnasio_id := COALESCE(OLD.gimnasio_id, public.get_user_gym_id());
    ELSE
      v_gimnasio_id := COALESCE(NEW.gimnasio_id, public.get_user_gym_id());
    END IF;
  EXCEPTION WHEN others THEN
    v_gimnasio_id := public.get_user_gym_id();
  END;

  -- Si aún es NULL, buscar el gimnasio del usuario_id o perfil
  IF (v_gimnasio_id IS NULL) THEN
    DECLARE
      v_user_id UUID;
    BEGIN
      BEGIN
        IF TG_OP = 'DELETE' THEN v_user_id := OLD.usuario_id; ELSE v_user_id := NEW.usuario_id; END IF;
      EXCEPTION WHEN others THEN
        v_user_id := auth.uid();
      END;
      IF v_user_id IS NOT NULL THEN
        SELECT gimnasio_id INTO v_gimnasio_id FROM public.perfiles WHERE id = v_user_id;
      END IF;
    END;
  END IF;

  -- Si sigue siendo NULL, usar el gimnasio por defecto (Sede Central)
  IF (v_gimnasio_id IS NULL) THEN
    SELECT id INTO v_gimnasio_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;
    IF (v_gimnasio_id IS NULL) THEN
      SELECT id INTO v_gimnasio_id FROM public.gimnasios LIMIT 1;
    END IF;
  END IF;

  -- Lógica de inserción en audit_logs según la operación
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      gimnasio_id,
      tabla, 
      operacion, 
      registro_id, 
      usuario_id, 
      datos_anteriores
    )
    VALUES (
      v_gimnasio_id,
      TG_TABLE_NAME, 
      TG_OP, 
      v_id, 
      auth.uid(), 
      row_to_json(OLD)::jsonb
    );
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      gimnasio_id,
      tabla, 
      operacion, 
      registro_id, 
      usuario_id, 
      datos_anteriores, 
      datos_nuevos
    )
    VALUES (
      v_gimnasio_id,
      TG_TABLE_NAME, 
      TG_OP, 
      v_id, 
      auth.uid(), 
      row_to_json(OLD)::jsonb, 
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      gimnasio_id,
      tabla, 
      operacion, 
      registro_id, 
      usuario_id, 
      datos_nuevos
    )
    VALUES (
      v_gimnasio_id,
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

-- 1. Estructura de Datos para CRM Prospectos/Leads
CREATE TABLE IF NOT EXISTS public.crm_prospectos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gimnasio_id UUID REFERENCES public.gimnasios(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    estado TEXT DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'contactado', 'prueba_agendada', 'convertido', 'perdido')),
    valor_estimado DECIMAL(10, 2) DEFAULT 0,
    origen TEXT DEFAULT 'Instagram',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registrar trigger para actualizar fecha de actualización en crm_prospectos
DROP TRIGGER IF EXISTS update_crm_prospectos_updated_at ON public.crm_prospectos;
CREATE TRIGGER update_crm_prospectos_updated_at BEFORE UPDATE ON public.crm_prospectos 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Modificaciones estructurales para Aislamiento Multi-tenant
ALTER TABLE public.equipamiento ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES public.gimnasios(id);
ALTER TABLE public.planes_nutricionales ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES public.gimnasios(id);
ALTER TABLE public.mediciones ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES public.gimnasios(id);
ALTER TABLE public.sesiones_de_entrenamiento ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES public.gimnasios(id);

-- 3. Poblar gimnasio_id en registros huérfanos
DO $$
DECLARE
    default_gym_id UUID;
BEGIN
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;
    IF default_gym_id IS NULL THEN
        SELECT id INTO default_gym_id FROM public.gimnasios LIMIT 1;
    END IF;

    IF default_gym_id IS NOT NULL THEN
        UPDATE public.crm_prospectos SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
        UPDATE public.equipamiento SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
        
        -- Para planes, mediciones y sesiones, preferir tomar el gimnasio_id del perfil de su usuario_id correspondiente
        UPDATE public.planes_nutricionales pn 
        SET gimnasio_id = p.gimnasio_id 
        FROM public.perfiles p 
        WHERE pn.usuario_id = p.id AND pn.gimnasio_id IS NULL;
        
        UPDATE public.mediciones m 
        SET gimnasio_id = p.gimnasio_id 
        FROM public.perfiles p 
        WHERE m.usuario_id = p.id AND m.gimnasio_id IS NULL;
        
        UPDATE public.sesiones_de_entrenamiento s 
        SET gimnasio_id = p.gimnasio_id 
        FROM public.perfiles p 
        WHERE s.usuario_id = p.id AND s.gimnasio_id IS NULL;
        
        -- Fallbacks en caso de que perfiles no tengan gimnasio o queden nulos
        UPDATE public.planes_nutricionales SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
        UPDATE public.mediciones SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
        UPDATE public.sesiones_de_entrenamiento SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    END IF;
END $$;

-- 4. Habilitar RLS en CRM y Equipamiento
ALTER TABLE public.crm_prospectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamiento ENABLE ROW LEVEL SECURITY;

-- 5. Definir Políticas RLS Multi-tenant de Aislamiento Estricto
-- CRM
DROP POLICY IF EXISTS "Multi-tenant: Acceso a prospectos por gimnasio" ON public.crm_prospectos;
CREATE POLICY "Multi-tenant: Acceso a prospectos por gimnasio" ON public.crm_prospectos
FOR ALL USING (gimnasio_id = public.get_user_gym_id());

-- Equipamiento
DROP POLICY IF EXISTS "Multi-tenant: Acceso a equipamiento por gimnasio" ON public.equipamiento;
CREATE POLICY "Multi-tenant: Acceso a equipamiento por gimnasio" ON public.equipamiento
FOR ALL USING (gimnasio_id = public.get_user_gym_id());

-- Planes Nutricionales (Aislamiento y RBAC combinado en AND)
DROP POLICY IF EXISTS planes_nutricionales_usuario_coach ON public.planes_nutricionales;
DROP POLICY IF EXISTS planes_nutricionales_coach_crear ON public.planes_nutricionales;

CREATE POLICY "Multi-tenant: Select planes_nutricionales" ON public.planes_nutricionales
FOR SELECT USING (
    gimnasio_id = public.get_user_gym_id() AND (
        usuario_id = auth.uid() OR
        entrenador_id = auth.uid() OR
        public.get_user_role() IN ('admin', 'recepcion')
    )
);

CREATE POLICY "Multi-tenant: Insert/Update/Delete planes_nutricionales" ON public.planes_nutricionales
FOR ALL USING (
    gimnasio_id = public.get_user_gym_id() AND
    public.get_user_role() IN ('coach', 'admin')
);

-- Mediciones (Aislamiento y RBAC combinado en AND)
DROP POLICY IF EXISTS mediciones_usuario_coach ON public.mediciones;
DROP POLICY IF EXISTS mediciones_insertar ON public.mediciones;

CREATE POLICY "Multi-tenant: Select mediciones" ON public.mediciones
FOR SELECT USING (
    gimnasio_id = public.get_user_gym_id() AND (
        usuario_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.relacion_alumno_coach rac
            WHERE rac.usuario_id = mediciones.usuario_id
              AND rac.entrenador_id = auth.uid()
              AND rac.esta_activo = true
        ) OR
        public.get_user_role() IN ('admin', 'recepcion')
    )
);

CREATE POLICY "Multi-tenant: Insert/Update/Delete mediciones" ON public.mediciones
FOR ALL USING (
    gimnasio_id = public.get_user_gym_id() AND (
        usuario_id = auth.uid() OR
        public.get_user_role() IN ('coach', 'admin')
    )
);

-- Sesiones de Entrenamiento (Aislamiento y RBAC combinado en AND)
DROP POLICY IF EXISTS sesiones_usuario_propias ON public.sesiones_de_entrenamiento;

CREATE POLICY "Multi-tenant: Select/All sesiones" ON public.sesiones_de_entrenamiento
FOR ALL USING (
    gimnasio_id = public.get_user_gym_id() AND (
        usuario_id = auth.uid() OR
        public.get_user_role() IN ('coach', 'admin')
    )
);

COMMIT;
