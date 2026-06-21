-- =========================================================================
-- 🛒 MIGRACIÓN: INVENTARIO DE PRODUCTOS Y VENTAS DEL POS (SPRINT 3)
-- Fecha: 16 de Junio de 2026
-- Objetivo: Crear tablas para productos, ventas y detalles del POS con RLS y función transaccional
-- =========================================================================

-- Limpieza de tablas previas para evitar conflictos de esquema (Sprint 3)
DROP TABLE IF EXISTS public.ventas_tienda_detalles CASCADE;
DROP TABLE IF EXISTS public.ventas_tienda CASCADE;
DROP TABLE IF EXISTS public.inventario_productos CASCADE;

-- 1. Tabla de Inventario de Productos
CREATE TABLE IF NOT EXISTS public.inventario_productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gimnasio_id UUID NOT NULL REFERENCES public.gimnasios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_venta NUMERIC NOT NULL CHECK (precio_venta >= 0),
    stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    categoria TEXT NOT NULL,
    url_imagen TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Ventas de la Tienda (Cabecera)
CREATE TABLE IF NOT EXISTS public.ventas_tienda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gimnasio_id UUID NOT NULL REFERENCES public.gimnasios(id) ON DELETE CASCADE,
    socio_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    monto_total NUMERIC NOT NULL CHECK (monto_total >= 0),
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'qr', 'transferencia')),
    vendedor_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Detalles de Ventas
CREATE TABLE IF NOT EXISTS public.ventas_tienda_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas_tienda(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.inventario_productos(id) ON DELETE SET NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC NOT NULL CHECK (precio_unitario >= 0)
);

-- Triggers para actualizar 'actualizado_en' automático en productos
DROP TRIGGER IF EXISTS update_inventario_productos_updated_at ON public.inventario_productos;
CREATE TRIGGER update_inventario_productos_updated_at BEFORE UPDATE ON public.inventario_productos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_inventario_productos_gimnasio ON public.inventario_productos(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_tienda_gimnasio ON public.ventas_tienda(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_tienda_socio ON public.ventas_tienda(socio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_tienda_detalles_venta ON public.ventas_tienda_detalles(venta_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.inventario_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_tienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_tienda_detalles ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS de Seguridad Multi-tenant

-- A. Inventario de Productos
DROP POLICY IF EXISTS inventario_productos_select ON public.inventario_productos;
CREATE POLICY inventario_productos_select ON public.inventario_productos
    FOR SELECT
    TO authenticated
    USING (
        gimnasio_id = public.get_user_gym_id() OR public.get_user_role() = 'superadmin'
    );

DROP POLICY IF EXISTS inventario_productos_write ON public.inventario_productos;
CREATE POLICY inventario_productos_write ON public.inventario_productos
    FOR ALL
    TO authenticated
    USING (
        public.get_user_role() = 'superadmin' 
        OR (
            gimnasio_id = public.get_user_gym_id() 
            AND (
                public.get_user_role() = 'admin' 
                OR EXISTS (
                    SELECT 1 FROM public.perfiles p
                    WHERE p.id = auth.uid() 
                      AND (p.permisos->>'gestionar_inventario')::boolean = true
                )
            )
        )
    );

-- B. Ventas de Tienda (Cabecera)
DROP POLICY IF EXISTS ventas_tienda_access ON public.ventas_tienda;
CREATE POLICY ventas_tienda_access ON public.ventas_tienda
    FOR ALL
    TO authenticated
    USING (
        public.get_user_role() = 'superadmin'
        OR (
            gimnasio_id = public.get_user_gym_id()
            AND public.get_user_role() IN ('admin', 'recepcion')
        )
    );

-- C. Detalles de Ventas
DROP POLICY IF EXISTS ventas_tienda_detalles_access ON public.ventas_tienda_detalles;
CREATE POLICY ventas_tienda_detalles_access ON public.ventas_tienda_detalles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ventas_tienda vt
            WHERE vt.id = ventas_tienda_detalles.venta_id
              AND (
                  public.get_user_role() = 'superadmin'
                  OR vt.gimnasio_id = public.get_user_gym_id()
              )
        )
    );

-- 6. Conceder privilegios
GRANT ALL ON TABLE public.inventario_productos TO postgres;
GRANT ALL ON TABLE public.inventario_productos TO anon;
GRANT ALL ON TABLE public.inventario_productos TO authenticated;
GRANT ALL ON TABLE public.inventario_productos TO service_role;

GRANT ALL ON TABLE public.ventas_tienda TO postgres;
GRANT ALL ON TABLE public.ventas_tienda TO anon;
GRANT ALL ON TABLE public.ventas_tienda TO authenticated;
GRANT ALL ON TABLE public.ventas_tienda TO service_role;

GRANT ALL ON TABLE public.ventas_tienda_detalles TO postgres;
GRANT ALL ON TABLE public.ventas_tienda_detalles TO anon;
GRANT ALL ON TABLE public.ventas_tienda_detalles TO authenticated;
GRANT ALL ON TABLE public.ventas_tienda_detalles TO service_role;

-- 7. Cargar Datos de Prueba (Seed) para el Gimnasio 'Virtud Central'
INSERT INTO public.inventario_productos (gimnasio_id, nombre, descripcion, precio_venta, stock_actual, categoria, url_imagen)
VALUES 
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Agua Mineral 500ml', 'Agua fresca sin gas', 1500, 50, 'Bebidas', 'https://images.unsplash.com/photo-1523362628745-0c14b62dc5be?auto=format&fit=crop&q=80&w=200'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Gatorade Naranja', 'Bebida isotónica sabor naranja', 2200, 30, 'Bebidas', 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&q=80&w=200'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Barra Proteína', 'Barra energética alta en proteína', 1800, 40, 'Snacks', 'https://images.unsplash.com/photo-1622312686150-13d8e58fa267?auto=format&fit=crop&q=80&w=200'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Pre-Entreno', 'Suplemento energizante de 300g', 15000, 15, 'Suplementos', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=200'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Toalla VIRTUD', 'Toalla deportiva de microfibra bordada', 4500, 25, 'Accesorios', 'https://images.unsplash.com/photo-1616712128790-2808c109ecd5?auto=format&fit=crop&q=80&w=200')
ON CONFLICT DO NOTHING;

-- 8. Función Transaccional de Cobro en Mostrador en PL/pgSQL
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
            SET estado = 'aprobado',
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
        VALUES (p_socio_id, p_gimnasio_id, p_monto_total, v_concepto, p_metodo_pago, 'aprobado', p_vendedor_id, NOW(), NOW(), NOW());
    END IF;

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.procesar_venta_pos(UUID, UUID, UUID, JSONB, UUID[], NUMERIC, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_venta_pos(UUID, UUID, UUID, JSONB, UUID[], NUMERIC, TEXT, NUMERIC) TO service_role;
