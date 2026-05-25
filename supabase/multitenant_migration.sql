-- ============================================
-- MIGRACIÓN MULTI-TENANT (SaaS) - TABLAS EN ESPAÑOL
-- ============================================

-- 1. Asegurar Tabla de Gimnasios (Tenants)
-- Si la tabla 'gimnasios' ya existe, esta consulta ignorará la creación y mantendrá tu data.
CREATE TABLE IF NOT EXISTS gimnasios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    configuracion JSONB DEFAULT '{
        "color_primario": "#00ff00",
        "logo_url": null,
        "tema": "dark"
    }',
    plan_id TEXT DEFAULT 'basico',
    es_activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sistema de Módulos (Entitlements)
CREATE TABLE IF NOT EXISTS gimnasio_modulos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gimnasio_id UUID REFERENCES gimnasios(id) ON DELETE CASCADE,
    modulo_key TEXT NOT NULL, -- Ej: 'crm', 'nutricion', 'ia_vision', 'marketing'
    activo BOOLEAN DEFAULT true,
    fecha_expiracion TIMESTAMP WITH TIME ZONE,
    UNIQUE(gimnasio_id, modulo_key)
);

-- 3. Relacionar tablas existentes con gimnasios (Añadir tenant_id)
-- Al usar 'IF NOT EXISTS' evitamos errores en tablas como perfiles o pagos que quizá ya lo tengan.
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES gimnasios(id);
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES gimnasios(id);
ALTER TABLE horarios_de_clase ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES gimnasios(id);
ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES gimnasios(id);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES gimnasios(id);
ALTER TABLE reservas_de_clase ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES gimnasios(id);
ALTER TABLE ejercicios ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES gimnasios(id);

-- 4. Crear "Gimnasio por Defecto" y migrar registros existentes a este gimnasio
DO $$
DECLARE
    default_gym_id UUID;
BEGIN
    -- Intentar obtener un gimnasio sede central primero, en caso de que ya exista
    SELECT id INTO default_gym_id FROM gimnasios WHERE slug = 'sede-central' LIMIT 1;

    -- Si no existe un gimnasio "sede-central", crearlo
    IF default_gym_id IS NULL THEN
        INSERT INTO gimnasios (nombre, slug, plan_id)
        VALUES ('Sede Central', 'sede-central', 'pro')
        RETURNING id INTO default_gym_id;
    END IF;

    -- Actualizar registros existentes para pertenecer al gimnasio por defecto
    UPDATE perfiles SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    UPDATE actividades SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    UPDATE horarios_de_clase SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    UPDATE rutinas SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    UPDATE pagos SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    UPDATE reservas_de_clase SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    UPDATE ejercicios SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;

EXCEPTION WHEN others THEN 
    -- Evitar fallo por error transaccional de migraciones duplicadas
    RAISE NOTICE 'Error normalizando las migraciones: %', SQLERRM;
END $$;

-- 5. Función Auxiliar de Identidad para RLS
-- (Creada en el esquema public para evitar problemas de permisos con el esquema auth)
CREATE OR REPLACE FUNCTION public.get_user_gym_id() 
RETURNS UUID AS $$
  SELECT gimnasio_id FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS TEXT AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 6. Eliminar políticas RLS viejas si existen (para mantener limpieza en supabase)
DROP POLICY IF EXISTS "Anyone can view active activities" ON actividades;
DROP POLICY IF EXISTS "Admins can manage activities" ON actividades;
DROP POLICY IF EXISTS "Multi-tenant: Acceso a actividades por gimnasio" ON actividades;
DROP POLICY IF EXISTS "Multi-tenant: Acceso a clases por gimnasio" ON horarios_de_clase;
DROP POLICY IF EXISTS "Multi-tenant: Acceso a reservas por gimnasio" ON reservas_de_clase;
DROP POLICY IF EXISTS "Multi-tenant: Pagos privados por gimnasio" ON pagos;
DROP POLICY IF EXISTS "Multi-tenant: Rutinas por gimnasio" ON rutinas;
DROP POLICY IF EXISTS "Multi-tenant: Ejercicios por gimnasio" ON ejercicios;

-- 7. Configuración de Seguridad Multi-Tenant (RLS) en TABLAS ESPAÑOL
-- ACTIVIDADES Y CLASES: Acceso por gimnasio
CREATE POLICY "Multi-tenant: Acceso a actividades por gimnasio" ON public.actividades
FOR ALL USING (gimnasio_id = public.get_user_gym_id());

CREATE POLICY "Multi-tenant: Acceso a clases por gimnasio" ON public.horarios_de_clase
FOR ALL USING (gimnasio_id = public.get_user_gym_id());

CREATE POLICY "Multi-tenant: Acceso a reservas por gimnasio" ON public.reservas_de_clase
FOR ALL USING (gimnasio_id = public.get_user_gym_id());

-- PAGOS: Crítico y privado por gimnasio
CREATE POLICY "Multi-tenant: Pagos privados por gimnasio" ON public.pagos
FOR ALL USING (gimnasio_id = public.get_user_gym_id());

-- RUTINAS Y EJERCICIOS
CREATE POLICY "Multi-tenant: Rutinas por gimnasio" ON public.rutinas
FOR ALL USING (gimnasio_id = public.get_user_gym_id());

CREATE POLICY "Multi-tenant: Ejercicios por gimnasio" ON public.ejercicios
FOR ALL USING (gimnasio_id = public.get_user_gym_id());

-- PERFILES (Alumnos/Coaches/Admins)
DROP POLICY IF EXISTS "Admins can view all profiles" ON perfiles;
DROP POLICY IF EXISTS "Coaches can view member profiles" ON perfiles;
DROP POLICY IF EXISTS "Multi-tenant: Ver perfiles del mismo gimnasio" ON perfiles;
DROP POLICY IF EXISTS "Multi-tenant: Admins gestionan perfiles" ON perfiles;

-- Los miembros solo ven a personas de su mismo gimnasio
CREATE POLICY "Multi-tenant: Ver perfiles del mismo gimnasio" ON public.perfiles
FOR SELECT USING (gimnasio_id = public.get_user_gym_id());

-- Solo Admins o SuperAdmins pueden editar / gestionar perfiles del gimnasio
CREATE POLICY "Multi-tenant: Admins gestionan perfiles" ON public.perfiles
FOR ALL USING (
  gimnasio_id = public.get_user_gym_id() AND 
  public.get_user_role() IN ('admin', 'superadmin')
);
