-- 1. Soporte para Newsletter Global
ALTER TABLE public.anuncios_globales 
ADD COLUMN IF NOT EXISTS enviado_newsletter boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_envio_newsletter timestamp with time zone;

-- 2. Mejoras para Centro de Auditoría (Performance)
CREATE INDEX IF NOT EXISTS idx_audit_logs_creado_en ON public.audit_logs (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabla ON public.audit_logs (tabla);

-- 3. Soporte para Hub de MercadoPago (Cross-Gym)
-- Añadir gimnasio_id a pagos para consultas rápidas sin joins pesados
ALTER TABLE public.pagos 
ADD COLUMN IF NOT EXISTS gimnasio_id uuid REFERENCES public.gimnasios(id);

-- Poblar gimnasio_id para pagos existentes basados en el perfil del usuario
UPDATE public.pagos p
SET gimnasio_id = pr.gimnasio_id
FROM public.perfiles pr
WHERE p.usuario_id = pr.id 
AND p.gimnasio_id IS NULL;

-- 4. Crear tabla de Historial de Pagos SaaS (si no existe, para el webhook)
CREATE TABLE IF NOT EXISTS public.saas_pagos_historial (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gimnasio_id uuid REFERENCES public.gimnasios(id),
    monto numeric NOT NULL,
    moneda text DEFAULT 'ARS',
    tipo_pago text,
    referencia_externa text UNIQUE,
    estado text,
    fecha_pago timestamp with time zone DEFAULT now(),
    periodo_inicio date,
    periodo_fin date,
    metadata jsonb DEFAULT '{}'::jsonb,
    creado_en timestamp with time zone DEFAULT now()
);

-- Indexar para el Hub Financiero
CREATE INDEX IF NOT EXISTS idx_pagos_gimnasio_id ON public.pagos (gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON public.pagos (estado);
CREATE INDEX IF NOT EXISTS idx_pagos_creado_en ON public.pagos (creado_en DESC);
