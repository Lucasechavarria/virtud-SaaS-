-- Migración: Crear logs_seguridad_global para registrar intentos de bypass de seguridad
CREATE TABLE IF NOT EXISTS public.logs_seguridad_global (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    gimnasio_origen_id UUID,
    gimnasio_destino_intentado_id UUID,
    tipo_evento TEXT NOT NULL DEFAULT 'SECURITY_VIOLATION',
    detalles JSONB,
    creado_en TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.logs_seguridad_global ENABLE ROW LEVEL SECURITY;

-- Política de RLS: Solo el superadmin puede consultar estos logs
DROP POLICY IF EXISTS "Solo superadmins pueden ver logs de seguridad global" ON public.logs_seguridad_global;
CREATE POLICY "Solo superadmins pueden ver logs de seguridad global" ON public.logs_seguridad_global
    FOR SELECT USING (public.get_user_role() = 'superadmin');
