-- MIGRACIÓN: 20260617020000_sprint13_payment_security_and_consistency.sql
-- Correcciones de seguridad para BOLA/IDOR en aprobar_pago_con_reglas (SEC-02) y normalización de estados de pago (SEC-04).

-- 1. RECREACIÓN DE FUNCION APROBAR PAGO CON REGLAS (Aislamiento de Tenant)
CREATE OR REPLACE FUNCTION public.aprobar_pago_con_reglas(
    p_pago_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pago    RECORD;
    v_admin   RECORD;
    v_nueva_fecha_fin TIMESTAMPTZ;
    v_fecha_base TIMESTAMPTZ;
BEGIN
    -- Obtener datos del pago
    SELECT * INTO v_pago FROM public.pagos WHERE id = p_pago_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pago no encontrado');
    END IF;

    -- Obtener rol y gimnasio del administrador
    SELECT rol, gimnasio_id INTO v_admin FROM public.perfiles WHERE id = p_admin_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Administrador no encontrado');
    END IF;

    -- VALIDACIÓN DE TENANT: Bloquear acceso cruzado multitenant para no-superadmins
    IF v_admin.rol <> 'superadmin' THEN
        IF v_admin.gimnasio_id IS NULL THEN
            RETURN jsonb_build_object('error', 'Acceso denegado: Administrador sin gimnasio asignado');
        END IF;
        IF v_admin.gimnasio_id <> v_pago.gimnasio_id THEN
            RETURN jsonb_build_object('error', 'Acceso denegado: El pago pertenece a otro gimnasio');
        END IF;
    END IF;

    -- Calcular nueva fecha de vencimiento (preservando lógica original)
    IF v_pago.fecha_vencimiento_original IS NOT NULL THEN
        v_fecha_base := v_pago.fecha_vencimiento_original;
        v_nueva_fecha_fin := v_fecha_base + INTERVAL '1 month';
    ELSIF v_pago.fecha_vencimiento IS NOT NULL THEN
        v_nueva_fecha_fin := v_pago.fecha_vencimiento + INTERVAL '1 month';
    ELSE
        v_nueva_fecha_fin := NOW() + INTERVAL '30 days';
    END IF;

    -- Actualizar perfil del usuario
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

-- Revocar ejecución directa de PostgREST y conceder únicamente a service_role (Seguridad API)
REVOKE EXECUTE ON FUNCTION public.aprobar_pago_con_reglas(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aprobar_pago_con_reglas(UUID, UUID) TO service_role;


-- 2. NORMALIZACIÓN DE ESTADOS DE PAGO A INGLÉS
-- Asegurar que el default sea 'pending' en inglés
ALTER TABLE public.pagos 
  ALTER COLUMN estado SET DEFAULT 'pending'::public.estado_pago;

-- Migración de registros antiguos en español
UPDATE public.pagos SET estado = 'approved'::public.estado_pago 
  WHERE estado::text IN ('aprobado', 'completado', 'pendiente_aprobado');
UPDATE public.pagos SET estado = 'pending'::public.estado_pago 
  WHERE estado::text = 'pendiente';
UPDATE public.pagos SET estado = 'rejected'::public.estado_pago 
  WHERE estado::text IN ('rechazado', 'cancelado');
UPDATE public.pagos SET estado = 'overdue'::public.estado_pago 
  WHERE estado::text = 'vencido';

-- Agregar CHECK constraint defensivo
ALTER TABLE public.pagos 
  ADD CONSTRAINT chk_estado_pago_ingles 
  CHECK (estado::text IN ('approved','pending','rejected','refunded','overdue','extended'));
