-- Migración para el Sprint 3: Completar WIPs críticos y Omisiones de Alumno y Coach
BEGIN;

-- 1. Añadir columna permitir_edicion_alumno a la tabla rutinas
ALTER TABLE public.rutinas 
ADD COLUMN IF NOT EXISTS permitir_edicion_alumno BOOLEAN DEFAULT false;

-- 2. Crear tabla ejercicios_completados_dia
CREATE TABLE IF NOT EXISTS public.ejercicios_completados_dia (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE NOT NULL,
    gimnasio_id UUID REFERENCES public.gimnasios(id) ON DELETE CASCADE NOT NULL,
    ejercicio_id UUID REFERENCES public.ejercicios(id) ON DELETE CASCADE NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, ejercicio_id, fecha)
);

-- Habilitar RLS en ejercicios_completados_dia
ALTER TABLE public.ejercicios_completados_dia ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para ejercicios_completados_dia
DROP POLICY IF EXISTS "Multi-tenant: Select ejercicios_completados_dia" ON public.ejercicios_completados_dia;
CREATE POLICY "Multi-tenant: Select ejercicios_completados_dia" ON public.ejercicios_completados_dia
FOR SELECT USING (
    public.get_user_role() = 'superadmin' OR (
        gimnasio_id = public.get_user_gym_id() AND (
            usuario_id = auth.uid() OR
            public.get_user_role() IN ('coach', 'admin')
        )
    )
);

DROP POLICY IF EXISTS "Multi-tenant: Insert ejercicios_completados_dia" ON public.ejercicios_completados_dia;
CREATE POLICY "Multi-tenant: Insert ejercicios_completados_dia" ON public.ejercicios_completados_dia
FOR INSERT WITH CHECK (
    usuario_id = auth.uid() AND
    gimnasio_id = public.get_user_gym_id()
);

DROP POLICY IF EXISTS "Multi-tenant: Delete ejercicios_completados_dia" ON public.ejercicios_completados_dia;
CREATE POLICY "Multi-tenant: Delete ejercicios_completados_dia" ON public.ejercicios_completados_dia
FOR DELETE USING (
    usuario_id = auth.uid()
);

-- 3. Crear tabla ejercicios_sesion_log
CREATE TABLE IF NOT EXISTS public.ejercicios_sesion_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sesion_id UUID REFERENCES public.sesiones_de_entrenamiento(id) ON DELETE CASCADE NOT NULL,
    ejercicio_id UUID REFERENCES public.ejercicios(id) ON DELETE CASCADE NOT NULL,
    set_numero INTEGER NOT NULL,
    reps_realizadas INTEGER NOT NULL,
    peso_kg NUMERIC(6,2) NOT NULL,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en ejercicios_sesion_log
ALTER TABLE public.ejercicios_sesion_log ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para ejercicios_sesion_log (acceso indirecto mediante la sesión de entrenamiento)
DROP POLICY IF EXISTS "Select ejercicios_sesion_log" ON public.ejercicios_sesion_log;
CREATE POLICY "Select ejercicios_sesion_log" ON public.ejercicios_sesion_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.sesiones_de_entrenamiento s
        WHERE s.id = sesion_id AND (
            s.usuario_id = auth.uid() OR
            public.get_user_role() IN ('coach', 'admin', 'superadmin')
        )
    )
);

DROP POLICY IF EXISTS "Insert ejercicios_sesion_log" ON public.ejercicios_sesion_log;
CREATE POLICY "Insert ejercicios_sesion_log" ON public.ejercicios_sesion_log
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sesiones_de_entrenamiento s
        WHERE s.id = sesion_id AND s.usuario_id = auth.uid()
    )
);

COMMIT;
