-- Migración para el Sprint 6 (Parte 2): Actualizar registros de pagos y recrear la función de aprobación
-- Esta migración corre en una transacción separada tras haber commiteado los nuevos valores de ENUM.

BEGIN;

-- 1. Migrar registros existentes en la tabla pagos
UPDATE public.pagos 
SET estado = 'approved'::public.estado_pago 
WHERE estado::text IN ('aprobado', 'completado', 'approved');

UPDATE public.pagos 
SET estado = 'pending'::public.estado_pago 
WHERE estado::text IN ('pendiente', 'pending');

UPDATE public.pagos 
SET estado = 'rejected'::public.estado_pago 
WHERE estado::text IN ('rechazado', 'rejected');

UPDATE public.pagos 
SET estado = 'refunded'::public.estado_pago 
WHERE estado::text IN ('reembolsado', 'refunded');

-- 2. Confirmar que la función aprobar_pago_con_reglas asigne 'approved'
CREATE OR REPLACE FUNCTION public.aprobar_pago_con_reglas(
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
    IF v_pago.fecha_vencimiento_original IS NOT NULL THEN
        v_fecha_base := v_pago.fecha_vencimiento_original;
        v_nueva_fecha_fin := v_fecha_base + INTERVAL '1 month';
    ELSE
        IF v_pago.fecha_vencimiento IS NOT NULL THEN
             v_nueva_fecha_fin := v_pago.fecha_vencimiento + INTERVAL '1 month';
        ELSE
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
    SET estado = 'approved'::public.estado_pago,
        aprobado_por = p_admin_id,
        aprobado_en = NOW()
    WHERE id = p_pago_id;

    RETURN jsonb_build_object(
        'success', true,
        'fecha_fin_membresia', v_nueva_fecha_fin
    );
END;
$$ LANGUAGE plpgsql;

-- Revocar privilegios para mantener seguridad DevSecOps
REVOKE EXECUTE ON FUNCTION public.aprobar_pago_con_reglas(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- 3. Recrear la función procesar_venta_pos usando 'approved' en lugar de 'aprobado'
CREATE OR REPLACE FUNCTION public.procesar_venta_pos(
    p_gimnasio_id UUID,
    p_vendedor_id UUID,
    p_socio_id UUID,
    p_productos JSONB, -- Array de objetos: [{producto_id, cantidad, precio_unitario}]
    p_pagos_saldar UUID[], -- Array de IDs de pagos a saldar
    p_monto_abono_cc NUMERIC, -- Abono extra a la cuenta corriente del alumno
    p_metodo_pago TEXT,
    p_monto_total NUMERIC
)
RETURNS UUID AS $$
DECLARE
    v_venta_id UUID := NULL;
    v_item JSONB;
    v_producto_id UUID;
    v_cantidad INT;
    v_precio_unit NUMERIC;
    v_stock_actual INT;
    v_nombre_prod TEXT;
    v_concepto TEXT := '';
    v_cuenta_id UUID;
    v_pago_id UUID;
    v_monto_prod_total NUMERIC := 0;
BEGIN
    -- 1. Validar y procesar productos (si hay elementos)
    IF p_productos IS NOT NULL AND jsonb_array_length(p_productos) > 0 THEN
        -- Calcular total de productos
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_productos) LOOP
            v_monto_prod_total := v_monto_prod_total + ((v_item->>'cantidad')::int * (v_item->>'precio_unitario')::numeric);
        END LOOP;

        -- Crear cabecera de la venta de la tienda
        INSERT INTO public.ventas_tienda (gimnasio_id, socio_id, monto_total, metodo_pago, vendedor_id, creado_en)
        VALUES (p_gimnasio_id, p_socio_id, v_monto_prod_total, p_metodo_pago, p_vendedor_id, NOW())
        RETURNING id INTO v_venta_id;

        -- Descontar stock e insertar detalles
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_productos) LOOP
            v_producto_id := (v_item->>'producto_id')::uuid;
            v_cantidad := (v_item->>'cantidad')::int;
            v_precio_unit := (v_item->>'precio_unitario')::numeric;

            -- Bloquear y validar stock de forma atómica
            SELECT stock_actual, nombre INTO v_stock_actual, v_nombre_prod
            FROM public.inventario_productos
            WHERE id = v_producto_id FOR UPDATE;

            IF v_stock_actual IS NULL THEN
                RAISE EXCEPTION 'Producto no encontrado en inventario.';
            END IF;

            IF v_stock_actual < v_cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para el producto: % (Disponible: %, Solicitado: %)', v_nombre_prod, v_stock_actual, v_cantidad;
            END IF;

            -- Descontar
            UPDATE public.inventario_productos
            SET stock_actual = stock_actual - v_cantidad
            WHERE id = v_producto_id;

            -- Detalle
            INSERT INTO public.ventas_tienda_detalles (venta_id, producto_id, cantidad, precio_unitario)
            VALUES (v_venta_id, v_producto_id, v_cantidad, v_precio_unit);
        END LOOP;
        
        v_concepto := 'Venta Tienda - Ticket #' || SUBSTRING(v_venta_id::text FROM 1 FOR 8);
    END IF;

    -- 2. Procesar saldado de cuotas pendientes
    IF p_pagos_saldar IS NOT NULL AND array_length(p_pagos_saldar, 1) > 0 THEN
        FOREACH v_pago_id IN ARRAY p_pagos_saldar LOOP
            UPDATE public.pagos
            SET estado = 'approved'::public.estado_pago, -- Corregido: antes 'aprobado'
                aprobado_por = p_vendedor_id,
                aprobado_en = NOW(),
                metodo_pago = p_metodo_pago,
                actualizado_en = NOW()
            WHERE id = v_pago_id;
        END LOOP;

        IF v_concepto <> '' THEN
            v_concepto := v_concepto || ' + Pago Cuotas';
        ELSE
            v_concepto := 'Pago Cuotas Pendientes';
        END IF;
    END IF;

    -- 3. Procesar abono a cuenta corriente
    IF p_monto_abono_cc IS NOT NULL AND p_monto_abono_cc > 0 THEN
        IF p_socio_id IS NULL THEN
            RAISE EXCEPTION 'Debe especificar un socio para abonar saldo a cuenta corriente.';
        END IF;

        -- Obtener o crear cuenta corriente para el alumno de forma segura
        SELECT id INTO v_cuenta_id
        FROM public.cuentas_corrientes
        WHERE alumno_id = p_socio_id FOR UPDATE;

        IF v_cuenta_id IS NULL THEN
            INSERT INTO public.cuentas_corrientes (alumno_id, gimnasio_id, saldo_actual, limite_credito, estado)
            VALUES (p_socio_id, p_gimnasio_id, 0, 0, 'al_dia')
            RETURNING id INTO v_cuenta_id;
        END IF;

        -- Insertar movimiento de abono
        INSERT INTO public.movimientos_cuenta (cuenta_id, tipo_movimiento, concepto, monto, registrado_por, creado_en)
        VALUES (v_cuenta_id, 'abono', 'Abono en Mostrador POS', p_monto_abono_cc, p_vendedor_id, NOW());

        -- Actualizar saldo de la cuenta corriente
        UPDATE public.cuentas_corrientes
        SET saldo_actual = saldo_actual + p_monto_abono_cc,
            actualizado_en = NOW()
        WHERE id = v_cuenta_id;

        -- Corregir estado de cuenta corriente si ya no posee saldo negativo
        UPDATE public.cuentas_corrientes
        SET estado = CASE WHEN saldo_actual >= 0 THEN 'al_dia' ELSE 'con_deuda' END
        WHERE id = v_cuenta_id;

        IF v_concepto <> '' THEN
            v_concepto := v_concepto || ' + Abono CC';
        ELSE
            v_concepto := 'Abono a Cuenta Corriente';
        END IF;
    END IF;

    -- 4. Registrar el pago unificado/consolidado para las estadísticas de recaudación
    IF p_monto_total > 0 THEN
        INSERT INTO public.pagos (usuario_id, gimnasio_id, monto, concepto, metodo_pago, estado, aprobado_por, aprobado_en, creado_en, actualizado_en)
        VALUES (p_socio_id, p_gimnasio_id, p_monto_total, v_concepto, p_metodo_pago, 'approved'::public.estado_pago, p_vendedor_id, NOW(), NOW(), NOW()); -- Corregido: antes 'aprobado'
    END IF;

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos correspondientes a la función recreada
GRANT EXECUTE ON FUNCTION public.procesar_venta_pos(UUID, UUID, UUID, JSONB, UUID[], NUMERIC, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_venta_pos(UUID, UUID, UUID, JSONB, UUID[], NUMERIC, TEXT, NUMERIC) TO service_role;

COMMIT;
