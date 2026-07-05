-- Migración para crear la tabla reportes_alumnos con RLS y aislamiento multi-tenant
BEGIN;

CREATE TABLE IF NOT EXISTS public.reportes_alumnos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE NOT NULL,
    gimnasio_id UUID REFERENCES public.gimnasios(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('injury', 'pain', 'question', 'concern')),
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending', 'resolved')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resuelto_en TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.reportes_alumnos ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (RLS)
DROP POLICY IF EXISTS "Multi-tenant: Select reportes_alumnos" ON public.reportes_alumnos;
CREATE POLICY "Multi-tenant: Select reportes_alumnos" ON public.reportes_alumnos
FOR SELECT USING (
    public.get_user_role() = 'superadmin' OR (
        gimnasio_id = public.get_user_gym_id() AND (
            usuario_id = auth.uid() OR
            public.get_user_role() IN ('coach', 'admin')
        )
    )
);

DROP POLICY IF EXISTS "Multi-tenant: Insert reportes_alumnos" ON public.reportes_alumnos;
CREATE POLICY "Multi-tenant: Insert reportes_alumnos" ON public.reportes_alumnos
FOR INSERT WITH CHECK (
    public.get_user_role() = 'superadmin' OR (
        gimnasio_id = public.get_user_gym_id() AND (
            usuario_id = auth.uid() OR
            public.get_user_role() IN ('coach', 'admin')
        )
    )
);

DROP POLICY IF EXISTS "Multi-tenant: Update reportes_alumnos" ON public.reportes_alumnos;
CREATE POLICY "Multi-tenant: Update reportes_alumnos" ON public.reportes_alumnos
FOR UPDATE USING (
    public.get_user_role() = 'superadmin' OR (
        gimnasio_id = public.get_user_gym_id() AND (
            usuario_id = auth.uid() OR
            public.get_user_role() IN ('coach', 'admin')
        )
    )
);

COMMIT;
