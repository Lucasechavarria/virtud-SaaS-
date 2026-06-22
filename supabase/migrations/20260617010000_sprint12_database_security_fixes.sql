-- =========================================================================
-- 🛡️ MIGRACIÓN SPRINT 12: CONSISTENCIA DE ESTADOS Y SEGURIDAD MULTITENANT
-- Fecha: 17 de Junio de 2026
-- Objetivo:
--   1. Incorporar 'overdue' y 'extended' al tipo ENUM estado_pago.
--   2. Redefinir solicitar_prorroga_pago para validar roles y gimnasios.
--   3. Redefinir notificar_pagos_proximos y actualizar_pagos_vencidos en inglés.
--   4. Actualizar políticas RLS de la tabla perfiles para superadmin bypass.
--   5. Agregar columnas exencion_aceptada y fecha_exencion en perfiles.
-- =========================================================================

-- 1. Agregar valores al ENUM estado_pago si no existen
ALTER TYPE public.estado_pago ADD VALUE IF NOT EXISTS 'overdue';
ALTER TYPE public.estado_pago ADD VALUE IF NOT EXISTS 'extended';

-- 2. Asegurar que las columnas de deslinde/exención existan en public.perfiles
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS exencion_aceptada BOOLEAN DEFAULT false;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS fecha_exencion TIMESTAMP WITH TIME ZONE;

-- 3. Redefinir función solicitar_prorroga_pago con validación robusta
CREATE OR REPLACE FUNCTION public.solicitar_prorroga_pago(
    p_pago_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    v_pago RECORD;
    v_admin RECORD;
    v_max_prorrogas INTEGER := 2;
    v_dias_prorroga INTEGER := 7;
    v_conteo_prorrogas INTEGER;
BEGIN
    -- Obtener datos del pago
    SELECT * INTO v_pago FROM public.pagos WHERE id = p_pago_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pago no encontrado');
    END IF;

    -- Obtener el gimnasio y rol del administrador
    SELECT rol, gimnasio_id INTO v_admin FROM public.perfiles WHERE id = p_admin_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Administrador no encontrado');
    END IF;

    -- VALIDACIÓN DE TENANT SHIELD
    -- Si es superadmin, se omite el control. Si es admin local, se exige coincidencia.
    IF v_admin.rol <> 'superadmin' THEN
        IF v_admin.gimnasio_id IS NULL OR v_admin.gimnasio_id <> v_pago.gimnasio_id THEN
            RETURN jsonb_build_object('error', 'Acceso denegado: El pago pertenece a otro gimnasio');
        END IF;
    END IF;

    -- Validar que el estado del pago permita prórroga (pendiente, vencido o ya prorrogado)
    IF v_pago.estado::text NOT IN ('pending', 'pendiente', 'overdue', 'vencido', 'extended', 'prorrogado') THEN
        RETURN jsonb_build_object('error', 'El estado del pago no permite prórroga');
    END IF;

    -- Validar cantidad de prórrogas acumuladas
    v_conteo_prorrogas := COALESCE(v_pago.conteo_prorrogas, 0);
    IF v_conteo_prorrogas >= v_max_prorrogas THEN
        RETURN jsonb_build_object('error', 'Máximo de prórrogas alcanzado (2)');
    END IF;

    -- Guardar la fecha de vencimiento original si es la primera prórroga
    IF v_pago.fecha_vencimiento_original IS NULL THEN
        UPDATE public.pagos 
        SET fecha_vencimiento_original = fecha_vencimiento
        WHERE id = p_pago_id;
    END IF;

    -- Aplicar la prórroga de fecha y cambiar estado a 'extended'
    UPDATE public.pagos
    SET fecha_vencimiento = fecha_vencimiento + (v_dias_prorroga || ' days')::INTERVAL,
        conteo_prorrogas = v_conteo_prorrogas + 1,
        es_prorroga = true,
        estado = 'extended'::public.estado_pago,
        notas = COALESCE(notas, '') || E'\nPrórroga #' || (v_conteo_prorrogas + 1) || ' aplicada el ' || NOW()
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

-- Revocar y re-asignar privilegios seguros
REVOKE EXECUTE ON FUNCTION public.solicitar_prorroga_pago(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_prorroga_pago(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_prorroga_pago(UUID, UUID) TO service_role;


-- 4. Redefinir función notificar_pagos_proximos usando inglés
CREATE OR REPLACE FUNCTION public.notificar_pagos_proximos()
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
        WHERE p.estado::text IN ('pending', 'pendiente')
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

REVOKE EXECUTE ON FUNCTION public.notificar_pagos_proximos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notificar_pagos_proximos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notificar_pagos_proximos() TO service_role;


-- 5. Redefinir función actualizar_pagos_vencidos usando 'overdue' en inglés
CREATE OR REPLACE FUNCTION public.actualizar_pagos_vencidos()
RETURNS INTEGER
SECURITY DEFINER
AS $$
DECLARE
    pagos_actualizados INTEGER;
BEGIN
    UPDATE public.pagos
    SET estado = 'overdue'::public.estado_pago
    WHERE estado::text IN ('pending', 'pendiente')
    AND fecha_vencimiento < NOW();
    
    GET DIAGNOSTICS pagos_actualizados = ROW_COUNT;
    
    RETURN pagos_actualizados;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.actualizar_pagos_vencidos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_pagos_vencidos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_pagos_vencidos() TO service_role;


-- 6. Actualizar las políticas RLS en la tabla public.perfiles para superadmin bypass
-- Lectura
DROP POLICY IF EXISTS "Permitir lectura de propio perfil o por coaches/admins" ON public.perfiles;
CREATE POLICY "Permitir lectura de propio perfil o por coaches/admins" ON public.perfiles
FOR SELECT USING (
  id = auth.uid()
  OR public.get_user_role() = 'superadmin'
  OR (
    gimnasio_id = public.get_user_gym_id()
    AND public.get_user_role() IN ('coach', 'admin')
  )
);

-- Actualización
DROP POLICY IF EXISTS "Permitir update de propio perfil o por admins" ON public.perfiles;
CREATE POLICY "Permitir update de propio perfil o por admins" ON public.perfiles
FOR UPDATE USING (
  id = auth.uid()
  OR public.get_user_role() = 'superadmin'
  OR (
    gimnasio_id = public.get_user_gym_id()
    AND public.get_user_role() IN ('admin')
  )
);

-- Inserción
DROP POLICY IF EXISTS "Permitir insert de propio perfil o por admins" ON public.perfiles;
CREATE POLICY "Permitir insert de propio perfil o por admins" ON public.perfiles
FOR INSERT WITH CHECK (
  id = auth.uid()
  OR public.get_user_role() = 'superadmin'
  OR (
    gimnasio_id = public.get_user_gym_id()
    AND public.get_user_role() IN ('admin')
  )
);
