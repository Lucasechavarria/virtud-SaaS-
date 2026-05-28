-- Nueva tabla para el Sprint 13: Mental Performance & Recovery

CREATE TABLE IF NOT EXISTS public.registros_recuperacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    horas_sueno DECIMAL(4,1),
    calidad_sueno INTEGER CHECK (calidad_sueno >= 1 AND calidad_sueno <= 10),
    nivel_estres INTEGER CHECK (nivel_estres >= 1 AND nivel_estres <= 10),
    nivel_fatiga INTEGER CHECK (nivel_fatiga >= 1 AND nivel_fatiga <= 10),
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Un registro por usuario por día
    UNIQUE(usuario_id, fecha)
);

-- Habilitar RLS
ALTER TABLE public.registros_recuperacion ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Usuarios pueden ver sus propios registros de recuperación"
ON public.registros_recuperacion FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden insertar sus propios registros de recuperación"
ON public.registros_recuperacion FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Coaches pueden ver los registros de sus alumnos"
ON public.registros_recuperacion FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.relacion_alumno_coach
        WHERE entrenador_id = auth.uid()
        AND usuario_id = registros_recuperacion.usuario_id
        AND esta_activo = true
    )
);

-- Comentario para documentación
COMMENT ON TABLE public.registros_recuperacion IS 'Almacena biométricos diarios de descanso y estado mental de los alumnos.';
