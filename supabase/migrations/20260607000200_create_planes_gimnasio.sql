-- Migración para crear la tabla planes_gimnasio y sus políticas RLS
-- Fecha: 7 de Junio de 2026

CREATE TABLE IF NOT EXISTS public.planes_gimnasio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gimnasio_id UUID NOT NULL REFERENCES public.gimnasios(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio NUMERIC NOT NULL,
    duracion_meses INTEGER NOT NULL DEFAULT 1,
    esta_activo BOOLEAN NOT NULL DEFAULT true,
    beneficios JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT now(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.planes_gimnasio ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS:
-- 1. Lectura (SELECT) para miembros autenticados del mismo gimnasio o superadmins
DROP POLICY IF EXISTS planes_gimnasio_select ON public.planes_gimnasio;
CREATE POLICY planes_gimnasio_select ON public.planes_gimnasio
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE perfiles.id = auth.uid()
              AND (perfiles.rol = 'superadmin' OR perfiles.gimnasio_id = planes_gimnasio.gimnasio_id)
        )
    );

-- 2. Escritura (ALL) para administradores del mismo gimnasio o superadmins
DROP POLICY IF EXISTS planes_gimnasio_write ON public.planes_gimnasio;
CREATE POLICY planes_gimnasio_write ON public.planes_gimnasio
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE perfiles.id = auth.uid()
              AND (perfiles.rol = 'superadmin' OR (perfiles.rol = 'admin' AND perfiles.gimnasio_id = planes_gimnasio.gimnasio_id))
        )
    );

-- Conceder permisos de uso a los roles del backend/API
GRANT ALL ON TABLE public.planes_gimnasio TO postgres;
GRANT ALL ON TABLE public.planes_gimnasio TO anon;
GRANT ALL ON TABLE public.planes_gimnasio TO authenticated;
GRANT ALL ON TABLE public.planes_gimnasio TO service_role;

