-- =====================================================
-- Sprint 17: Automatización de Marketing
-- Fecha: 2026-02-11
-- =====================================================

-- 1. Actualizar enum estado_pago para incluir estados de vencimiento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid  
                   WHERE t.typname = 'estado_pago' AND e.enumlabel = 'proximo_a_vencer') THEN
        ALTER TYPE estado_pago ADD VALUE 'proximo_a_vencer';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid  
                   WHERE t.typname = 'estado_pago' AND e.enumlabel = 'vencido') THEN
        ALTER TYPE estado_pago ADD VALUE 'vencido';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid  
                   WHERE t.typname = 'estado_pago' AND e.enumlabel = 'prorrogado') THEN
        ALTER TYPE estado_pago ADD VALUE 'prorrogado';
    END IF;
END $$;

-- 1.1 Agregar columnas a tabla pagos si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'pagos' 
                   AND column_name = 'fecha_vencimiento') THEN
        ALTER TABLE public.pagos ADD COLUMN fecha_vencimiento TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'pagos' 
                   AND column_name = 'fecha_vencimiento_original') THEN
        ALTER TABLE public.pagos ADD COLUMN fecha_vencimiento_original TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'pagos' 
                   AND column_name = 'es_prorroga') THEN
        ALTER TABLE public.pagos ADD COLUMN es_prorroga BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'pagos' 
                   AND column_name = 'conteo_prorrogas') THEN
        ALTER TABLE public.pagos ADD COLUMN conteo_prorrogas INTEGER DEFAULT 0;
    END IF;
END $$;

-- 1.2 Función para solicitar prórroga de pago
CREATE OR REPLACE FUNCTION solicitar_prorroga_pago(
    p_pago_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    v_pago RECORD;
    v_max_prorrogas INTEGER := 2;
    v_dias_prorroga INTEGER := 7;
BEGIN
    SELECT * INTO v_pago FROM public.pagos WHERE id = p_pago_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pago no encontrado');
    END IF;

    IF v_pago.estado NOT IN ('pendiente', 'proximo_a_vencer', 'vencido', 'prorrogado') THEN
        RETURN jsonb_build_object('error', 'El estado del pago no permite prórroga');
    END IF;

    IF v_pago.conteo_prorrogas >= v_max_prorrogas THEN
        RETURN jsonb_build_object('error', 'Máximo de prórrogas alcanzado (2)');
    END IF;

    -- Guardar fecha original si es la primera prórroga
    IF v_pago.fecha_vencimiento_original IS NULL THEN
        UPDATE public.pagos 
        SET fecha_vencimiento_original = fecha_vencimiento
        WHERE id = p_pago_id;
    END IF;

    -- Aplicar prórroga
    UPDATE public.pagos
    SET fecha_vencimiento = fecha_vencimiento + (v_dias_prorroga || ' days')::INTERVAL,
        conteo_prorrogas = conteo_prorrogas + 1,
        es_prorroga = true,
        estado = 'prorrogado',
        notas = COALESCE(notas, '') || E'\nPrórroga #' || (conteo_prorrogas + 1) || ' aplicada el ' || NOW()
    WHERE id = p_pago_id;

    -- Recargar dato actualizado
    SELECT * INTO v_pago FROM public.pagos WHERE id = p_pago_id;

    RETURN jsonb_build_object(
        'success', true, 
        'nueva_fecha_vencimiento', v_pago.fecha_vencimiento,
        'prorrogas_usadas', v_pago.conteo_prorrogas
    );
END;
$$ LANGUAGE plpgsql;

-- 1.3 Función para aprobar pago con reglas de ciclo
CREATE OR REPLACE FUNCTION aprobar_pago_con_reglas(
    p_pago_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    v_pago RECORD;
    v_nueva_fecha_fin TIMESTAMPTZ;
    v_fecha_base TIMESTAMPTZ;
BEGIN
    -- Obtener datos del pago
    SELECT * INTO v_pago FROM public.pagos WHERE id = p_pago_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pago no encontrado');
    END IF;

    -- Calcular nueva fecha de vencimiento
    -- Si tiene fecha_vencimiento_original (ciclo respetado), usar esa + 1 mes
    IF v_pago.fecha_vencimiento_original IS NOT NULL THEN
        v_fecha_base := v_pago.fecha_vencimiento_original;
        v_nueva_fecha_fin := v_fecha_base + INTERVAL '1 month';
        
        -- Ajuste: Si por alguna razón la fecha calculada ya pasó (ej: deuda de meses), 
        -- podría requerirse lógica adicional, pero para este caso respetamos el ciclo.
    ELSE
        -- Caso normal: Si pagó a tiempo o sin prórroga, y tiene fecha_vencimiento, usarla
        IF v_pago.fecha_vencimiento IS NOT NULL THEN
             v_nueva_fecha_fin := v_pago.fecha_vencimiento + INTERVAL '1 month';
        ELSE
             -- Fallback: fecha actual + 30 días
             v_nueva_fecha_fin := NOW() + INTERVAL '30 days';
        END IF;
    END IF;

    -- Actualizar perfil (membresía)
    UPDATE public.perfiles
    SET estado_membresia = 'active',
        fecha_fin_membresia = v_nueva_fecha_fin
    WHERE id = v_pago.usuario_id;

    -- Actualizar pago
    UPDATE public.pagos
    SET estado = 'approved',
        aprobado_por = p_admin_id,
        aprobado_en = NOW()
    WHERE id = p_pago_id;

    RETURN jsonb_build_object(
        'success', true,
        'fecha_fin_membresia', v_nueva_fecha_fin
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Tabla de campañas de marketing
CREATE TABLE IF NOT EXISTS public.campanas_marketing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('recordatorio_pago', 'reengagement', 'promocion', 'personalizada')),
    segmento JSONB NOT NULL DEFAULT '{}', -- Criterios de segmentación
    mensaje_titulo TEXT NOT NULL,
    mensaje_cuerpo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'completada')),
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    enviados INTEGER DEFAULT 0,
    abiertos INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.campanas_marketing IS 'Campañas de marketing automatizadas';
COMMENT ON COLUMN public.campanas_marketing.segmento IS 'Criterios de segmentación en formato JSON';

-- 3. Tabla de historial de engagement
CREATE TABLE IF NOT EXISTS public.historial_engagement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('login', 'sesion', 'pago', 'clase', 'mensaje', 'notificacion_abierta')),
    fecha_evento TIMESTAMPTZ DEFAULT NOW(),
    metadatos JSONB DEFAULT '{}'
);

COMMENT ON TABLE public.historial_engagement IS 'Historial de eventos de engagement de usuarios';

CREATE INDEX IF NOT EXISTS idx_historial_engagement_usuario ON public.historial_engagement(usuario_id, fecha_evento DESC);
CREATE INDEX IF NOT EXISTS idx_historial_engagement_tipo ON public.historial_engagement(tipo_evento, fecha_evento DESC);
CREATE INDEX IF NOT EXISTS idx_historial_engagement_fecha ON public.historial_engagement(fecha_evento DESC);

-- 4. RLS para campañas de marketing
ALTER TABLE public.campanas_marketing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches y admins pueden ver campañas" ON public.campanas_marketing;
CREATE POLICY "Coaches y admins pueden ver campañas"
    ON public.campanas_marketing FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid()
            AND rol IN ('coach', 'admin')
        )
    );

DROP POLICY IF EXISTS "Solo admins pueden crear campañas" ON public.campanas_marketing;
CREATE POLICY "Solo admins pueden crear campañas"
    ON public.campanas_marketing FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

DROP POLICY IF EXISTS "Solo admins pueden actualizar campañas" ON public.campanas_marketing;
CREATE POLICY "Solo admins pueden actualizar campañas"
    ON public.campanas_marketing FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

-- 5. RLS para historial de engagement
ALTER TABLE public.historial_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven su propio historial" ON public.historial_engagement;
CREATE POLICY "Usuarios ven su propio historial"
    ON public.historial_engagement FOR SELECT
    USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Sistema puede insertar eventos" ON public.historial_engagement;
CREATE POLICY "Sistema puede insertar eventos"
    ON public.historial_engagement FOR INSERT
    WITH CHECK (true);

-- 6. Función para detectar usuarios inactivos
CREATE OR REPLACE FUNCTION detectar_usuarios_inactivos(dias_inactividad INTEGER DEFAULT 7)
RETURNS TABLE(usuario_id UUID, dias_sin_actividad INTEGER, ultima_actividad TIMESTAMPTZ) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        EXTRACT(DAY FROM NOW() - COALESCE(MAX(he.fecha_evento), p.creado_en))::INTEGER as dias,
        COALESCE(MAX(he.fecha_evento), p.creado_en) as ultima
    FROM public.perfiles p
    LEFT JOIN public.historial_engagement he ON he.usuario_id = p.id
    WHERE p.rol = 'student'
    GROUP BY p.id, p.creado_en
    HAVING EXTRACT(DAY FROM NOW() - COALESCE(MAX(he.fecha_evento), p.creado_en)) >= dias_inactividad;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detectar_usuarios_inactivos IS 'Detecta usuarios sin actividad por N días';

-- 7. Función para recordatorios de pago
CREATE OR REPLACE FUNCTION notificar_pagos_proximos()
RETURNS INTEGER
SECURITY DEFINER
AS $$
DECLARE
    pago_record RECORD;
    dias_anticipacion INTEGER := 3;
    notificaciones_enviadas INTEGER := 0;
BEGIN
    FOR pago_record IN
        SELECT 
            p.id as pago_id,
            p.usuario_id,
            p.monto,
            p.fecha_vencimiento,
            prof.nombre_completo
        FROM public.pagos p
        JOIN public.perfiles prof ON prof.id = p.usuario_id
        WHERE p.estado = 'pendiente'
        AND p.fecha_vencimiento BETWEEN NOW() AND NOW() + INTERVAL '3 days'
        AND NOT EXISTS (
            SELECT 1 FROM public.historial_notificaciones hn
            WHERE hn.usuario_id = p.usuario_id
            AND hn.tipo = 'recordatorio_pago'
            AND hn.datos->>'pago_id' = p.id::TEXT
            AND hn.creado_en > NOW() - INTERVAL '1 day'
        )
    LOOP
        INSERT INTO public.historial_notificaciones (
            usuario_id,
            tipo,
            titulo,
            cuerpo,
            datos
        ) VALUES (
            pago_record.usuario_id,
            'recordatorio_pago',
            '💰 Recordatorio de Pago',
            'Tu pago de $' || pago_record.monto || ' vence el ' || 
            TO_CHAR(pago_record.fecha_vencimiento, 'DD/MM/YYYY'),
            jsonb_build_object(
                'pago_id', pago_record.pago_id,
                'monto', pago_record.monto,
                'fecha_vencimiento', pago_record.fecha_vencimiento
            )
        );
        
        notificaciones_enviadas := notificaciones_enviadas + 1;
    END LOOP;
    
    RETURN notificaciones_enviadas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notificar_pagos_proximos IS 'Envía recordatorios de pagos próximos a vencer (3 días)';

-- 8. Función para re-engagement de usuarios inactivos
CREATE OR REPLACE FUNCTION notificar_usuarios_inactivos()
RETURNS INTEGER
SECURITY DEFINER
AS $$
DECLARE
    usuario_record RECORD;
    notificaciones_enviadas INTEGER := 0;
BEGIN
    FOR usuario_record IN
        SELECT * FROM detectar_usuarios_inactivos(7)
    LOOP
        -- Solo notificar si no se ha enviado en las últimas 48 horas
        IF NOT EXISTS (
            SELECT 1 FROM public.historial_notificaciones
            WHERE usuario_id = usuario_record.usuario_id
            AND tipo = 'reengagement'
            AND creado_en > NOW() - INTERVAL '48 hours'
        ) THEN
            INSERT INTO public.historial_notificaciones (
                usuario_id,
                tipo,
                titulo,
                cuerpo,
                datos
            ) VALUES (
                usuario_record.usuario_id,
                'reengagement',
                '💪 ¡Te extrañamos!',
                'Hace ' || usuario_record.dias_sin_actividad || ' días que no te vemos. ¿Todo bien?',
                jsonb_build_object(
                    'dias_inactividad', usuario_record.dias_sin_actividad,
                    'ultima_actividad', usuario_record.ultima_actividad
                )
            );
            
            notificaciones_enviadas := notificaciones_enviadas + 1;
        END IF;
    END LOOP;
    
    RETURN notificaciones_enviadas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notificar_usuarios_inactivos IS 'Envía notificaciones de re-engagement a usuarios inactivos (7+ días)';

-- 9. Función para actualizar estado de pagos vencidos
CREATE OR REPLACE FUNCTION actualizar_pagos_vencidos()
RETURNS INTEGER
SECURITY DEFINER
AS $$
DECLARE
    pagos_actualizados INTEGER;
BEGIN
    UPDATE public.pagos
    SET estado = 'vencido'
    WHERE estado = 'pendiente'
    AND fecha_vencimiento < NOW();
    
    GET DIAGNOSTICS pagos_actualizados = ROW_COUNT;
    
    RETURN pagos_actualizados;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_pagos_vencidos IS 'Actualiza el estado de pagos vencidos';

-- 10. Índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_pagos_estado_vencimiento ON public.pagos(estado, fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_campanas_estado_fechas ON public.campanas_marketing(estado, fecha_inicio, fecha_fin)
WHERE estado = 'activa';

-- 11. Trigger para actualizar timestamp de campañas
CREATE OR REPLACE FUNCTION actualizar_timestamp_campana()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_timestamp_campana ON public.campanas_marketing;
CREATE TRIGGER trigger_actualizar_timestamp_campana
    BEFORE UPDATE ON public.campanas_marketing
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp_campana();

-- =====================================================
-- Fin de migración
-- =====================================================
