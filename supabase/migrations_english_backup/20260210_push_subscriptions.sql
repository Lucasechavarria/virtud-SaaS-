-- Crear tabla para suscripciones push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    pwa_platform TEXT, -- ios, android, desktop
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, subscription)
);

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuarios pueden ver sus propias suscripciones"
    ON public.push_subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden insertar sus propias suscripciones"
    ON public.push_subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus propias suscripciones"
    ON public.push_subscriptions FOR DELETE
    TO authenticated
    USING (auth.uid() = usuario_id);

-- Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_usuario_id ON public.push_subscriptions(usuario_id);
