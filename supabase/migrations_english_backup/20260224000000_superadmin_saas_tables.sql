-- ==============================================================================
-- MIGRACIÓN: MÓDULO SUPER ADMIN Y ESTRUCTURA SAAS
-- Fecha: 2026-02-24
-- ==============================================================================

-- 1. Tabla de Métricas Globales (SaaS)
-- Ya existe en la DB pero se define aquí para persistencia en el repositorio.
CREATE TABLE IF NOT EXISTS public.saas_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    mrr double precision DEFAULT 0,
    gyms_activos integer DEFAULT 0,
    churn_gyms_mes double precision DEFAULT 0,
    total_alumnos integer DEFAULT 0,
    alumnos_activos_hoy integer DEFAULT 0,
    ingresos_totales_mes double precision DEFAULT 0,
    rutinas_ia_hoy integer DEFAULT 0,
    videos_procesados_hoy integer DEFAULT 0,
    creado_en timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT saas_metrics_pkey PRIMARY KEY (id),
    CONSTRAINT saas_metrics_fecha_key UNIQUE (fecha)
);

-- 2. Anuncios Globales (Broadcast Center)
CREATE TABLE IF NOT EXISTS public.anuncios_globales (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    contenido text NOT NULL,
    tipo text DEFAULT 'info'::text CHECK (tipo = ANY (ARRAY['info'::text, 'alerta'::text, 'novedad'::text, 'mantenimiento'::text])),
    destino text DEFAULT 'todos'::text CHECK (destino = ANY (ARRAY['todos'::text, 'admin_gym'::text, 'alumnos'::text, 'coaches'::text, 'especifico'::text])),
    creado_por uuid REFERENCES public.perfiles(id),
    activo boolean DEFAULT true,
    expires_at timestamp with time zone,
    creado_en timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT anuncios_globales_pkey PRIMARY KEY (id)
);

-- 3. Logs de Acceso Remoto (Impersonation)
CREATE TABLE IF NOT EXISTS public.logs_acceso_remoto (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    superadmin_id uuid REFERENCES public.perfiles(id),
    gimnasio_id uuid REFERENCES public.gimnasios(id),
    motivo text,
    fecha timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT logs_acceso_remoto_pkey PRIMARY KEY (id)
);

-- 4. Historial de Pagos de Gimnasios a la Plataforma (SaaS Revenue)
CREATE TABLE IF NOT EXISTS public.saas_pagos_historial (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gimnasio_id uuid NOT NULL REFERENCES public.gimnasios(id),
    plan_id uuid REFERENCES public.planes_suscripcion(id),
    monto double precision NOT NULL,
    moneda text DEFAULT 'USD',
    periodo_inicio date NOT NULL,
    periodo_fin date NOT NULL,
    metodo_pago text,
    referencia_externa text,
    estado text DEFAULT 'completado' CHECK (estado = ANY (ARRAY['completado'::text, 'pendiente'::text, 'fallido'::text, 'reembolsado'::text])),
    creado_en timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT saas_pagos_historial_pkey PRIMARY KEY (id)
);

-- 5. Tickets de Soporte Platform-Level (B2B)
CREATE TABLE IF NOT EXISTS public.tickets_soporte_saas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gimnasio_id uuid NOT NULL REFERENCES public.gimnasios(id),
    usuario_id uuid NOT NULL REFERENCES public.perfiles(id), -- El admin que reporta
    asunto text NOT NULL,
    descripcion text NOT NULL,
    prioridad text DEFAULT 'media' CHECK (prioridad = ANY (ARRAY['baja'::text, 'media'::text, 'alta'::text, 'critica'::text])),
    estado text DEFAULT 'abierto' CHECK (estado = ANY (ARRAY['abierto'::text, 'en_progreso'::text, 'resuelto'::text, 'cerrado'::text])),
    categoria text DEFAULT 'tecnico' CHECK (categoria = ANY (ARRAY['tecnico'::text, 'facturacion'::text, 'configuracion'::text, 'sugerencia'::text])),
    creado_en timestamp with time zone DEFAULT timezone('utc'::text, now()),
    actualizado_en timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT tickets_soporte_saas_pkey PRIMARY KEY (id)
);

-- 6. Configuración Global de la Plataforma
CREATE TABLE IF NOT EXISTS public.configuracion_plataforma (
    clave text PRIMARY KEY,
    valor jsonb NOT NULL,
    descripcion text,
    actualizado_en timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insertar configuraciones iniciales
INSERT INTO public.configuracion_plataforma (clave, valor, descripcion)
VALUES 
    ('tasas_ia', '{"costo_token_promedio": 0.0002, "precio_venta_rutina": 0.50}', 'Costos y precios para servicios de IA'),
    ('app_version', '{"min_android": "1.0.0", "min_ios": "1.0.0", "current": "1.2.0"}', 'Control de versiones de la aplicación móvil')
ON CONFLICT (clave) DO NOTHING;

-- 7. Políticas de RLS para estas tablas (Solo Superadmin)
ALTER TABLE public.saas_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios_globales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acceso_remoto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_pagos_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets_soporte_saas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_plataforma ENABLE ROW LEVEL SECURITY;

-- Política Genérica: Solo Superadmin puede ver/gestionar estas tablas
DO $$ 
DECLARE 
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
        'saas_metrics', 'anuncios_globales', 'logs_acceso_remoto', 
        'saas_pagos_historial', 'tickets_soporte_saas', 'configuracion_plataforma'
    ) LOOP
        EXECUTE format('CREATE POLICY "Solo superadmin puede gestionar %I" ON public.%I 
                        FOR ALL 
                        USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = ''superadmin''))', tbl, tbl);
    END LOOP;
END $$;

-- Excepción: Anuncios globales deben ser legibles por todos los autenticados si están activos
CREATE POLICY "Todos pueden ver anuncios activos" ON public.anuncios_globales 
    FOR SELECT USING (activo = true);

-- Excepción: Admins de gimnasio pueden ver sus propios tickets de soporte SaaS
CREATE POLICY "Admins pueden ver sus propios tickets SaaS" ON public.tickets_soporte_saas 
    FOR SELECT USING (gimnasio_id IN (SELECT gimnasio_id FROM perfiles WHERE id = auth.uid()));

CREATE POLICY "Admins pueden crear tickets SaaS" ON public.tickets_soporte_saas 
    FOR INSERT WITH CHECK (gimnasio_id IN (SELECT gimnasio_id FROM perfiles WHERE id = auth.uid()));
