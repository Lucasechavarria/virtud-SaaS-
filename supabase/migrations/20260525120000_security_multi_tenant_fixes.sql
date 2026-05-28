-- =========================================================================
-- 🛡️ MIGRACIÓN DE SEGURIDAD MULTI-TENANT & PRIVACIDAD (SPRINT 1)
-- Fecha: 25 de Mayo de 2026
-- Objetivo: Crear funciones auxiliares, activar RLS global, agregar aislamiento 
--           de gimnasio a videos_ejercicio y blindar políticas de seguridad.
-- =========================================================================

-- 1. CREAR FUNCIONES AUXILIARES DE IDENTIDAD PARA RLS (AUTOCONTENIDAS)
-- Estas funciones permiten evaluar de forma segura el tenant y rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_gym_id() 
RETURNS UUID AS $$
  SELECT gimnasio_id FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS TEXT AS $$
  SELECT rol::text FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_user_gym_id() IS 'Retorna el gimnasio_id del usuario autenticado para políticas RLS.';
COMMENT ON FUNCTION public.get_user_role() IS 'Retorna el rol como TEXT del usuario autenticado para políticas RLS.';

-- 2. ACTIVACIÓN EXPLÍCITA DE ROW LEVEL SECURITY (RLS)
-- Asegura que el motor de Postgres aplique el aislamiento en la API pública de Supabase
ALTER TABLE public.gimnasios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_de_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas_de_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ejercicios_equipamiento ENABLE ROW LEVEL SECURITY;

-- 3. AMPLIACIÓN DE ESQUEMA: AISLAMIENTO MULTI-TENANT EN VIDEOS
-- Agregar columna gimnasio_id a la tabla videos_ejercicio
ALTER TABLE public.videos_ejercicio 
  ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES public.gimnasios(id);

-- 4. MIGRACIÓN Y NORMALIZACIÓN DE DATA EXISTENTE
-- Asocia los videos existentes al gimnasio correspondiente de su alumno
UPDATE public.videos_ejercicio ve
SET gimnasio_id = p.gimnasio_id
FROM public.perfiles p
WHERE ve.usuario_id = p.id AND ve.gimnasio_id IS NULL;

-- Asignar el gimnasio por defecto (Sede Central / virtud-central) como fallback en caso de registros huérfanos
DO $$
DECLARE
    default_gym_id UUID;
BEGIN
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'virtud-central' LIMIT 1;
    IF default_gym_id IS NULL THEN
        SELECT id INTO default_gym_id FROM public.gimnasios LIMIT 1;
    END IF;
    
    IF default_gym_id IS NOT NULL THEN
        UPDATE public.videos_ejercicio SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    END IF;
END $$;

-- Forzar restricción NOT NULL para mantener la integridad multi-tenant
ALTER TABLE public.videos_ejercicio 
  ALTER COLUMN gimnasio_id SET NOT NULL;

-- 5. ÍNDICE DE RENDIMIENTO
-- Acelera las consultas filtradas por gimnasio_id (crítico para RLS)
CREATE INDEX IF NOT EXISTS idx_videos_ejercicio_gimnasio ON public.videos_ejercicio(gimnasio_id);

-- 6. BLINDAJE DE POLÍTICAS DE RLS CONTRA CROSS-TENANT LEAKS
-- Eliminar políticas previas inseguras o duplicadas
DROP POLICY IF EXISTS "coach_ve_sus_videos" ON public.videos_ejercicio;
DROP POLICY IF EXISTS "Multi-tenant: Acceso a videos por gimnasio" ON public.videos_ejercicio;

-- Crear política RLS robustecida que bloquea fugas de datos entre inquilinos
-- Un coach o admin del Gimnasio A NO puede ver videos del Gimnasio B bajo ninguna circunstancia
CREATE POLICY "Multi-tenant: Acceso a videos por gimnasio" ON public.videos_ejercicio
FOR ALL USING (
  gimnasio_id = public.get_user_gym_id() AND (
    -- El alumno dueño del video puede verlo únicamente si ha sido compartido
    (usuario_id = auth.uid() AND compartido_con_alumno = true)
    OR
    -- El coach que subió el video puede verlo/gestionarlo
    subido_por = auth.uid()
    OR
    -- Coaches o administradores del mismo gimnasio pueden ver el video
    public.get_user_role() IN ('coach', 'admin', 'superadmin')
  )
);

COMMENT ON POLICY "Multi-tenant: Acceso a videos por gimnasio" ON public.videos_ejercicio IS 
  'Aislamiento estricto de videos de técnica: prohíbe el acceso cruzado entre gimnasios y condiciona visualización de alumnos.';
