-- =========================================================================
-- 🚀 SPRINT 8: MIGRACIÓN DE PARTICIONADO DECLARATIVO POR LISTA EN POSTGRES
-- Fecha: 30 de Mayo de 2026
-- Objetivo: Implementar particionado físico nativo en PostgreSQL para las
--           tablas transaccionales de alto volumen: asistencias, pagos, 
--           audit_logs e historial_notificaciones, basado en 'gimnasio_id'.
--           (Estructura 100% Idempotente, Resiliente a ejecuciones parciales)
-- =========================================================================

BEGIN;

-- Limpieza preventiva de tablas temporales de particionado que puedan haber quedado 
-- de ejecuciones fallidas previas (evita error de relación ya existente).
DROP TABLE IF EXISTS public.asistencias_particionada CASCADE;
DROP TABLE IF EXISTS public.asistencias_default CASCADE;
DROP TABLE IF EXISTS public.pagos_particionada CASCADE;
DROP TABLE IF EXISTS public.pagos_default CASCADE;
DROP TABLE IF EXISTS public.audit_logs_particionada CASCADE;
DROP TABLE IF EXISTS public.audit_logs_default CASCADE;
DROP TABLE IF EXISTS public.historial_notificaciones_particionada CASCADE;
DROP TABLE IF EXISTS public.historial_notificaciones_default CASCADE;

-- 0. RECUPERAR EL GIMNASIO POR DEFECTO (SEDE CENTRAL)
-- En caso de que algún registro histórico no tenga gimnasio_id o usuario_id asociado,
-- se asignará a 'sede-central' para evitar violación de clave primaria no nula.
DO $$
DECLARE
    default_gym_id UUID;
BEGIN
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;
    IF default_gym_id IS NULL THEN
        INSERT INTO public.gimnasios (nombre, slug)
        VALUES ('Sede Central', 'sede-central')
        RETURNING id INTO default_gym_id;
    END IF;
END $$;

-- =========================================================================
-- 1. PARTICIONADO DE LA TABLA: public.asistencias (CONDICIONAL & IDEMPOTENTE)
-- =========================================================================
DO $$
DECLARE
    is_partitioned BOOLEAN;
    default_gym_id UUID;
BEGIN
    -- Verificar si la tabla ya está particionada
    SELECT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' 
          AND c.relname = 'asistencias' 
          AND c.relkind = 'p'
    ) INTO is_partitioned;

    IF NOT is_partitioned THEN
        -- A. Crear la nueva tabla particionada (Preserva tipo 'rol_asistencia')
        CREATE TABLE public.asistencias_particionada (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
            gimnasio_id UUID NOT NULL REFERENCES public.gimnasios(id) ON DELETE CASCADE,
            rol_asistencia rol_asistencia NOT NULL,
            entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            salida TIMESTAMP WITH TIME ZONE,
            source TEXT DEFAULT 'qr'::text,
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT asistencias_particionada_pkey PRIMARY KEY (id, gimnasio_id)
        ) PARTITION BY LIST (gimnasio_id);

        -- B. Crear la partición por defecto global
        CREATE TABLE public.asistencias_default PARTITION OF public.asistencias_particionada DEFAULT;

        -- C. Migrar los datos desde la tabla original rellenando el gimnasio_id
        SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;
        
        INSERT INTO public.asistencias_particionada (id, usuario_id, gimnasio_id, rol_asistencia, entrada, salida, source, creado_en)
        SELECT 
            a.id, 
            a.usuario_id, 
            COALESCE(p.gimnasio_id, default_gym_id) AS gimnasio_id, 
            a.rol_asistencia, 
            a.entrada, 
            a.salida, 
            a.source, 
            a.creado_en
        FROM public.asistencias a
        LEFT JOIN public.perfiles p ON a.usuario_id = p.id;

        -- D. Intercambiar tablas
        DROP TABLE public.asistencias CASCADE;
        ALTER TABLE public.asistencias_particionada RENAME TO asistencias;

        -- E. Aplicar índices compuestos optimizados
        CREATE INDEX asistencias_gym_user_idx ON public.asistencias (gimnasio_id, usuario_id, creado_en DESC);
        CREATE INDEX asistencias_entrada_idx ON public.asistencias (entrada DESC);

        -- F. Aplicar RLS
        ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Multi-tenant: Acceso a asistencias por gimnasio" ON public.asistencias;
        CREATE POLICY "Multi-tenant: Acceso a asistencias por gimnasio" ON public.asistencias
            FOR ALL USING (gimnasio_id = public.get_user_gym_id());
            
        RAISE NOTICE 'Tabla public.asistencias particionada exitosamente.';
    ELSE
        RAISE NOTICE 'La tabla public.asistencias ya se encuentra particionada. Omitiendo.';
    END IF;
END $$;


-- =========================================================================
-- 2. PARTICIONADO DE LA TABLA: public.pagos (CONDICIONAL & IDEMPOTENTE)
-- =========================================================================
DO $$
DECLARE
    is_partitioned BOOLEAN;
    default_gym_id UUID;
BEGIN
    -- Verificar si la tabla ya está particionada
    SELECT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' 
          AND c.relname = 'pagos' 
          AND c.relkind = 'p'
    ) INTO is_partitioned;

    IF NOT is_partitioned THEN
        -- A. Crear la nueva tabla particionada (Preserva ENUMs y campos de prórroga reales)
        CREATE TABLE public.pagos_particionada (
            id UUID NOT NULL DEFAULT uuid_generate_v4(),
            usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE,
            gimnasio_id UUID NOT NULL REFERENCES public.gimnasios(id) ON DELETE CASCADE,
            monto NUMERIC NOT NULL,
            moneda TEXT DEFAULT 'ARS'::text,
            concepto TEXT NOT NULL,
            proveedor_pago TEXT,
            id_pago_proveedor TEXT,
            aprobado_por UUID REFERENCES public.perfiles(id),
            aprobado_en TIMESTAMP WITH TIME ZONE,
            notas TEXT,
            metadatos JSONB,
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metodo_pago tipo_metodo_pago,
            estado estado_pago DEFAULT 'pendiente'::estado_pago,
            fecha_vencimiento TIMESTAMP WITH TIME ZONE,
            fecha_vencimiento_original TIMESTAMP WITH TIME ZONE,
            es_prorroga BOOLEAN DEFAULT false,
            conteo_prorrogas INTEGER DEFAULT 0,
            CONSTRAINT pagos_particionada_pkey PRIMARY KEY (id, gimnasio_id)
        ) PARTITION BY LIST (gimnasio_id);

        -- B. Crear la partición por defecto global
        CREATE TABLE public.pagos_default PARTITION OF public.pagos_particionada DEFAULT;

        -- C. Migrar datos históricos
        SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;
        
        INSERT INTO public.pagos_particionada (
            id, usuario_id, gimnasio_id, monto, moneda, concepto, proveedor_pago, 
            id_pago_proveedor, aprobado_por, aprobado_en, notas, metadatos, creado_en, actualizado_en, 
            metodo_pago, estado, fecha_vencimiento, fecha_vencimiento_original, es_prorroga, conteo_prorrogas
        )
        SELECT 
            id, usuario_id, COALESCE(gimnasio_id, default_gym_id), monto, moneda, concepto, proveedor_pago, 
            id_pago_proveedor, aprobado_por, aprobado_en, notas, metadatos, creado_en, actualizado_en, 
            metodo_pago, estado, fecha_vencimiento, fecha_vencimiento_original, es_prorroga, conteo_prorrogas
        FROM public.pagos;

        -- D. Intercambiar tablas
        DROP TABLE public.pagos CASCADE;
        ALTER TABLE public.pagos_particionada RENAME TO pagos;

        -- E. Aplicar índices compuestos optimizados
        CREATE INDEX pagos_gym_user_idx ON public.pagos (gimnasio_id, usuario_id, creado_en DESC);
        CREATE INDEX pagos_fecha_vencimiento_idx ON public.pagos (fecha_vencimiento DESC);

        -- F. Aplicar RLS
        ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Multi-tenant: Pagos privados por gimnasio" ON public.pagos;
        CREATE POLICY "Multi-tenant: Pagos privados por gimnasio" ON public.pagos
            FOR ALL USING (gimnasio_id = public.get_user_gym_id());

        -- Re-vincular trigger de updated_at
        DROP TRIGGER IF EXISTS update_pagos_updated_at ON public.pagos;
        CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON public.pagos 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            
        RAISE NOTICE 'Tabla public.pagos particionada exitosamente.';
    ELSE
        RAISE NOTICE 'La tabla public.pagos ya se encuentra particionada. Omitiendo.';
    END IF;
END $$;


-- =========================================================================
-- 3. PARTICIONADO DE LA TABLA: public.audit_logs (CONDICIONAL & IDEMPOTENTE)
-- =========================================================================
DO $$
DECLARE
    is_partitioned BOOLEAN;
    default_gym_id UUID;
BEGIN
    -- Verificar si la tabla ya está particionada
    SELECT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' 
          AND c.relname = 'audit_logs' 
          AND c.relkind = 'p'
    ) INTO is_partitioned;

    IF NOT is_partitioned THEN
        -- A. Crear la nueva tabla particionada
        CREATE TABLE public.audit_logs_particionada (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            gimnasio_id UUID NOT NULL REFERENCES public.gimnasios(id) ON DELETE CASCADE,
            tabla TEXT NOT NULL,
            operacion TEXT NOT NULL CHECK (operacion = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
            registro_id UUID,
            usuario_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
            datos_anteriores JSONB,
            datos_nuevos JSONB,
            direccion_ip INET,
            agente_usuario TEXT,
            creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT audit_logs_particionada_pkey PRIMARY KEY (id, gimnasio_id)
        ) PARTITION BY LIST (gimnasio_id);

        -- B. Crear la partición por defecto global
        CREATE TABLE public.audit_logs_default PARTITION OF public.audit_logs_particionada DEFAULT;

        -- C. Migrar datos resolviendo gimnasio_id
        SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;
        
        INSERT INTO public.audit_logs_particionada (
            id, gimnasio_id, tabla, operacion, registro_id, usuario_id, datos_anteriores, datos_nuevos, direccion_ip, agente_usuario, creado_en
        )
        SELECT 
            al.id, 
            COALESCE(p.gimnasio_id, default_gym_id) AS gimnasio_id, 
            al.tabla, 
            al.operacion, 
            al.registro_id, 
            al.usuario_id, 
            al.datos_anteriores, 
            al.datos_nuevos, 
            al.direccion_ip, 
            al.agente_usuario, 
            al.creado_en
        FROM public.audit_logs al
        LEFT JOIN public.perfiles p ON al.usuario_id = p.id;

        -- D. Intercambiar tablas
        DROP TABLE public.audit_logs CASCADE;
        ALTER TABLE public.audit_logs_particionada RENAME TO audit_logs;

        -- E. Aplicar índices
        CREATE INDEX audit_logs_gym_fecha_idx ON public.audit_logs (gimnasio_id, creado_en DESC);

        -- F. Aplicar RLS
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Multi-tenant: Acceso a logs por gimnasio" ON public.audit_logs;
        CREATE POLICY "Multi-tenant: Acceso a logs por gimnasio" ON public.audit_logs
            FOR SELECT USING (
                gimnasio_id = public.get_user_gym_id() AND 
                public.get_user_role() IN ('admin', 'superadmin')
            );
            
        RAISE NOTICE 'Tabla public.audit_logs particionada exitosamente.';
    ELSE
        RAISE NOTICE 'La tabla public.audit_logs ya se encuentra particionada. Omitiendo.';
    END IF;
END $$;


-- =========================================================================
-- 4. PARTICIONADO DE LA TABLA: public.historial_notificaciones (CONDICIONAL)
-- =========================================================================
DO $$
DECLARE
    is_partitioned BOOLEAN;
    table_exists BOOLEAN;
    default_gym_id UUID;
BEGIN
    -- 1. Verificar si ya es particionada
    SELECT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' 
          AND c.relname = 'historial_notificaciones' 
          AND c.relkind = 'p'
    ) INTO is_partitioned;

    IF NOT is_partitioned THEN
        -- 2. Verificar si existe la tabla original no particionada
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = 'historial_notificaciones'
        ) INTO table_exists;
        
        SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;

        IF table_exists THEN
            -- Crear tabla particionada
            CREATE TABLE public.historial_notificaciones_particionada (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                gimnasio_id UUID NOT NULL REFERENCES public.gimnasios(id) ON DELETE CASCADE,
                usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
                tipo TEXT NOT NULL,
                titulo TEXT NOT NULL,
                cuerpo TEXT NOT NULL,
                datos JSONB,
                enviada BOOLEAN DEFAULT false,
                enviada_en TIMESTAMP WITH TIME ZONE,
                error TEXT,
                creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT hn_particionada_pkey PRIMARY KEY (id, gimnasio_id)
            ) PARTITION BY LIST (gimnasio_id);

            -- Crear partición default
            CREATE TABLE public.historial_notificaciones_default PARTITION OF public.historial_notificaciones_particionada DEFAULT;

            -- Migrar registros de forma segura
            EXECUTE '
                INSERT INTO public.historial_notificaciones_particionada (
                    id, gimnasio_id, usuario_id, tipo, titulo, cuerpo, datos, enviada, enviada_en, error, creado_en
                )
                SELECT 
                    hn.id, 
                    COALESCE(p.gimnasio_id, $1) AS gimnasio_id, 
                    hn.usuario_id, 
                    hn.tipo, 
                    hn.titulo, 
                    hn.cuerpo, 
                    hn.datos, 
                    hn.enviada, 
                    hn.enviada_en, 
                    hn.error, 
                    hn.creado_en
                FROM public.historial_notificaciones hn
                LEFT JOIN public.perfiles p ON hn.usuario_id = p.id
            ' USING default_gym_id;

            -- Borrar tabla vieja e intercambiar
            DROP TABLE public.historial_notificaciones CASCADE;
            ALTER TABLE public.historial_notificaciones_particionada RENAME TO historial_notificaciones;

        ELSE
            -- Si no existe la tabla, crear la estructura particionada desde cero
            CREATE TABLE public.historial_notificaciones (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                gimnasio_id UUID NOT NULL REFERENCES public.gimnasios(id) ON DELETE CASCADE,
                usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
                tipo TEXT NOT NULL,
                titulo TEXT NOT NULL,
                cuerpo TEXT NOT NULL,
                datos JSONB,
                enviada BOOLEAN DEFAULT false,
                enviada_en TIMESTAMP WITH TIME ZONE,
                error TEXT,
                creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT hn_pkey PRIMARY KEY (id, gimnasio_id)
            ) PARTITION BY LIST (gimnasio_id);

            CREATE TABLE public.historial_notificaciones_default PARTITION OF public.historial_notificaciones DEFAULT;
        END IF;

        -- Índices comunes
        CREATE INDEX hn_gym_user_idx ON public.historial_notificaciones (gimnasio_id, usuario_id, creado_en DESC);

        -- RLS comunes
        ALTER TABLE public.historial_notificaciones ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Multi-tenant: Alumnos leen sus notificaciones" ON public.historial_notificaciones;
        CREATE POLICY "Multi-tenant: Alumnos leen sus notificaciones" ON public.historial_notificaciones
            FOR SELECT USING (
                gimnasio_id = public.get_user_gym_id() AND 
                usuario_id = auth.uid()
            );

        DROP POLICY IF EXISTS "Multi-tenant: Admins gestionan notificaciones" ON public.historial_notificaciones;
        CREATE POLICY "Multi-tenant: Admins gestionan notificaciones" ON public.historial_notificaciones
            FOR ALL USING (
                gimnasio_id = public.get_user_gym_id() AND 
                public.get_user_role() IN ('admin', 'superadmin')
            );
            
        RAISE NOTICE 'Tabla public.historial_notificaciones particionada exitosamente.';
    ELSE
        RAISE NOTICE 'La tabla public.historial_notificaciones ya se encuentra particionada. Omitiendo.';
    END IF;
END $$;


-- =========================================================================
-- 5. PROCEDIMIENTOS ADMINISTRATIVOS PREMIUM (ENTERPRISE SCALING)
-- =========================================================================

-- Función para que el Super Administrador cree particiones físicas exclusivas al vuelo
-- para segregar inquilinos Enterprise masivos sin downtime.
CREATE OR REPLACE FUNCTION public.crear_particion_gimnasio(
    gimnasio_uuid UUID,
    nombre_particion TEXT
)
RETURNS VOID AS $$
DECLARE
    part_suffix TEXT;
    sql_cmd TEXT;
    gym_exists BOOLEAN;
BEGIN
    -- 1. Validar existencia del gimnasio
    SELECT EXISTS(SELECT 1 FROM public.gimnasios WHERE id = gimnasio_uuid) INTO gym_exists;
    IF NOT gym_exists THEN
        RAISE EXCEPTION 'El gimnasio con UUID % no existe.', gimnasio_uuid;
    END IF;

    part_suffix := lower(regexp_replace(nombre_particion, '[^a-zA-Z0-9_]', '', 'g'));

    -- 2. ASISTENCIAS:
    -- A. Respaldar temporalmente data que pueda estar en default para ese gimnasio
    CREATE TEMP TABLE temp_asistencias AS 
    WITH deleted_rows AS (
        DELETE FROM public.asistencias WHERE gimnasio_id = gimnasio_uuid RETURNING *
    )
    SELECT * FROM deleted_rows;

    -- B. Crear la nueva partición física específica
    sql_cmd := format('CREATE TABLE IF NOT EXISTS public.asistencias_%I PARTITION OF public.asistencias FOR VALUES IN (%L)', part_suffix, gimnasio_uuid);
    EXECUTE sql_cmd;

    -- C. Re-insertar la data respaldada, la cual caerá automáticamente en la nueva partición
    INSERT INTO public.asistencias SELECT * FROM temp_asistencias;
    DROP TABLE temp_asistencias;

    -- 3. PAGOS:
    CREATE TEMP TABLE temp_pagos AS 
    WITH deleted_rows AS (
        DELETE FROM public.pagos WHERE gimnasio_id = gimnasio_uuid RETURNING *
    )
    SELECT * FROM deleted_rows;

    sql_cmd := format('CREATE TABLE IF NOT EXISTS public.pagos_%I PARTITION OF public.pagos FOR VALUES IN (%L)', part_suffix, gimnasio_uuid);
    EXECUTE sql_cmd;

    INSERT INTO public.pagos SELECT * FROM temp_pagos;
    DROP TABLE temp_pagos;

    -- 4. AUDIT LOGS:
    CREATE TEMP TABLE temp_audit_logs AS 
    WITH deleted_rows AS (
        DELETE FROM public.audit_logs WHERE gimnasio_id = gimnasio_uuid RETURNING *
    )
    SELECT * FROM deleted_rows;

    sql_cmd := format('CREATE TABLE IF NOT EXISTS public.audit_logs_%I PARTITION OF public.audit_logs FOR VALUES IN (%L)', part_suffix, gimnasio_uuid);
    EXECUTE sql_cmd;

    INSERT INTO public.audit_logs SELECT * FROM temp_audit_logs;
    DROP TABLE temp_audit_logs;

    -- 5. HISTORIAL NOTIFICACIONES:
    CREATE TEMP TABLE temp_hn AS 
    WITH deleted_rows AS (
        DELETE FROM public.historial_notificaciones WHERE gimnasio_id = gimnasio_uuid RETURNING *
    )
    SELECT * FROM deleted_rows;

    sql_cmd := format('CREATE TABLE IF NOT EXISTS public.historial_notificaciones_%I PARTITION OF public.historial_notificaciones FOR VALUES IN (%L)', part_suffix, gimnasio_uuid);
    EXECUTE sql_cmd;

    INSERT INTO public.historial_notificaciones SELECT * FROM temp_hn;
    DROP TABLE temp_hn;

    RAISE NOTICE 'Particiones físicas creadas exitosamente para el gimnasio % con sufijo %', gimnasio_uuid, part_suffix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revocar accesos por defecto en la función administrativa por seguridad
REVOKE EXECUTE ON FUNCTION public.crear_particion_gimnasio(UUID, TEXT) FROM PUBLIC, anon, authenticated;

COMMIT;
