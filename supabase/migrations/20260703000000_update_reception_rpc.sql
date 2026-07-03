-- Migración para el Módulo de Recepción: Transacciones Atómicas de Ventas y Caja Chica
-- Creado: 2026-07-03

BEGIN;

-- 1. Crear o reemplazar la función registrar_egreso_caja para manejo atómico y concurrente de egresos menores
CREATE OR REPLACE FUNCTION public.registrar_egreso_caja(
    p_apertura_id UUID,
    p_egreso JSONB
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.auditoria_global
    SET detalles = jsonb_set(
        detalles,
        '{egresos}',
        COALESCE(detalles->'egresos', '[]'::jsonb) || p_egreso
    )
    WHERE id = p_apertura_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para la función de egresos
GRANT EXECUTE ON FUNCTION public.registrar_egreso_caja(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_egreso_caja(UUID, JSONB) TO service_role;

-- 2. Crear la función procesar_venta_pos_v2 para cobros unificados 100% transaccionales
CREATE OR REPLACE FUNCTION public.procesar_venta_pos_v2(
    p_gimnasio_id UUID,
    p_vendedor_id UUID,
    p_socio_id UUID,
    p_productos JSONB, -- Array de objetos: [{producto_id, cantidad, precio_unitario}]
    p_pagos_saldar UUID[], -- Array de IDs de pagos a saldar
    p_monto_abono_cc NUMERIC, -- Abono extra a la cuenta corriente del alumno
    p_membresia JSONB, -- Objeto: {planId, precio, nombre, duracionMeses}
    p_metodo_pago TEXT,
    p_monto_total NUMERIC -- Total cobrado (suma de productos + cuotas + abono CC + membresia)
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
    v_pago_saldar_monto NUMERIC;
    
    -- Variables para membresía
    v_current_fecha_fin TIMESTAMPTZ;
    v_current_estado TEXT;
    v_fecha_inicio TIMESTAMPTZ;
    v_fecha_fin TIMESTAMPTZ;
    v_duracion_meses INT;
    v_monto_membresia NUMERIC := 0;
    
    -- Totales y contabilidad
    v_monto_prod_total NUMERIC := 0;
    v_monto_cuotas NUMERIC := 0;
    v_monto_consolidado NUMERIC := 0;
BEGIN
    -- =========================================================================
    -- A. PROCESAR LA MEMBRESÍA DE MANERA TRANSACCIONAL SI SE ESPECIFICA
    -- =========================================================================
    IF p_membresia IS NOT NULL AND p_socio_id IS NOT NULL THEN
        -- 1. Obtener la membresía actual del socio (bloqueando fila para escritura)
        SELECT fecha_fin_membresia, estado_membresia 
        INTO v_current_fecha_fin, v_current_estado
        FROM public.perfiles 
        WHERE id = p_socio_id FOR UPDATE;

        v_fecha_inicio := NOW();
        IF v_current_estado = 'active' AND v_current_fecha_fin IS NOT NULL THEN
            IF v_current_fecha_fin > NOW() THEN
                v_fecha_inicio := v_current_fecha_fin;
            END IF;
        END IF;

        -- Calcular fecha de vencimiento
        v_duracion_meses := (p_membresia->>'duracionMeses')::int;
        IF v_duracion_meses IS NULL OR v_duracion_meses <= 0 THEN
            v_duracion_meses := 1;
        END IF;
        v_fecha_fin := v_fecha_inicio + (v_duracion_meses || ' month')::interval;

        -- 2. Actualizar el perfil del socio
        UPDATE public.perfiles
        SET plan_id = (p_membresia->>'planId')::uuid,
            estado_membresia = 'active',
            fecha_fin_membresia = v_fecha_fin,
            actualizado_en = NOW()
        WHERE id = p_socio_id;

        -- 3. Registrar el pago aprobado de la membresía (para la auditoría individual)
        v_monto_membresia := (p_membresia->>'precio')::numeric;
        INSERT INTO public.pagos (
            usuario_id, gimnasio_id, monto, concepto, metodo_pago, estado, aprobado_por, aprobado_en, creado_en, actualizado_en
        ) VALUES (
            p_socio_id,
            p_gimnasio_id,
            v_monto_membresia,
            'Adquisición Plan: ' || (p_membresia->>'nombre'),
            p_metodo_pago,
            'approved'::public.estado_pago,
            p_vendedor_id,
            NOW(),
            NOW(),
            NOW()
        );
        
        v_concepto := 'Adquisición Plan: ' || (p_membresia->>'nombre');
    END IF;

    -- =========================================================================
    -- B. PROCESAR PRODUCTOS DE LA TIENDA
    -- =========================================================================
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
        
        IF v_concepto <> '' THEN
            v_concepto := v_concepto || ' + Venta Tienda - Ticket #' || SUBSTRING(v_venta_id::text FROM 1 FOR 8);
        ELSE
            v_concepto := 'Venta Tienda - Ticket #' || SUBSTRING(v_venta_id::text FROM 1 FOR 8);
        END IF;
    END IF;

    -- =========================================================================
    -- C. PROCESAR SALDADO DE CUOTAS PENDIENTES
    -- =========================================================================
    IF p_pagos_saldar IS NOT NULL AND array_length(p_pagos_saldar, 1) > 0 THEN
        FOREACH v_pago_id IN ARRAY p_pagos_saldar LOOP
            -- Obtener monto del pago a saldar
            SELECT monto INTO v_pago_saldar_monto FROM public.pagos WHERE id = v_pago_id;
            v_monto_cuotas := v_monto_cuotas + COALESCE(v_pago_saldar_monto, 0);

            -- Marcar la cuota como aprobada asignando el cajero y el timestamp de aprobación
            UPDATE public.pagos
            SET estado = 'approved'::public.estado_pago,
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

    -- =========================================================================
    -- D. PROCESAR ABONO A CUENTA CORRIENTE
    -- =========================================================================
    IF p_monto_abono_cc IS NOT NULL AND p_monto_abono_cc > 0 THEN
        IF p_socio_id IS NULL THEN
            RAISE EXCEPTION 'Debe especificar un socio para abonar saldo a cuenta corriente.';
        END IF;

        -- Obtener o crear cuenta corriente para el alumno
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

        -- Corregir estado
        UPDATE public.cuentas_corrientes
        SET estado = CASE WHEN saldo_actual >= 0 THEN 'al_dia' ELSE 'con_deuda' END
        WHERE id = v_cuenta_id;

        IF v_concepto <> '' THEN
            v_concepto := v_concepto || ' + Abono CC';
        ELSE
            v_concepto := 'Abono a Cuenta Corriente';
        END IF;
    END IF;

    -- =========================================================================
    -- E. REGISTRAR PAGO CONSOLIDADO (DEDUCIENDO CUOTAS Y MEMBRESÍAS YA REGISTRADAS)
    -- =========================================================================
    v_monto_consolidado := p_monto_total - v_monto_cuotas - v_monto_membresia;
    
    IF v_monto_consolidado > 0 THEN
        INSERT INTO public.pagos (
            usuario_id, gimnasio_id, monto, concepto, metodo_pago, estado, aprobado_por, aprobado_en, creado_en, actualizado_en
        ) VALUES (
            p_socio_id,
            p_gimnasio_id,
            v_monto_consolidado,
            v_concepto,
            p_metodo_pago,
            'approved'::public.estado_pago,
            p_vendedor_id,
            NOW(),
            NOW(),
            NOW()
        );
    END IF;

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos para la función de cobros
GRANT EXECUTE ON FUNCTION public.procesar_venta_pos_v2(UUID, UUID, UUID, JSONB, UUID[], NUMERIC, JSONB, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_venta_pos_v2(UUID, UUID, UUID, JSONB, UUID[], NUMERIC, JSONB, TEXT, NUMERIC) TO service_role;

COMMIT;
