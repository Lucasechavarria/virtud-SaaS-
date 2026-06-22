-- Migración: 20260620000000_fix_book_class_atomic.sql
-- Objetivo:
--   1. Asegurar la existencia de las columnas en_lista_espera y posicion_lista_espera en reservas_de_clase.
--   2. Corregir y blindar book_class_atomic (resolver tablas incorrectas y agregar validación cross-tenant).
--   3. Redefinir promote_waitlist_atomic con search_path seguro.
--   4. Establecer políticas RLS herméticas para la tabla reservas_de_clase.

BEGIN;

-- 1. Agregar columnas faltantes de lista de espera si no existen
ALTER TABLE public.reservas_de_clase ADD COLUMN IF NOT EXISTS en_lista_espera BOOLEAN DEFAULT false;
ALTER TABLE public.reservas_de_clase ADD COLUMN IF NOT EXISTS posicion_lista_espera INTEGER;

-- 2. Eliminar funciones anteriores para evitar conflictos de firmas
DROP FUNCTION IF EXISTS public.book_class_atomic(UUID, UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.promote_waitlist_atomic(UUID, DATE) CASCADE;

-- 3. Crear RPC book_class_atomic robustecida
CREATE OR REPLACE FUNCTION public.book_class_atomic(
  p_horario_clase_id UUID,
  p_usuario_id UUID,
  p_fecha DATE
)
RETURNS public.reservas_de_clase AS $$
DECLARE
  v_cupo_max INTEGER;
  v_reservas_actuales INTEGER;
  v_ya_reservado BOOLEAN;
  v_posicion_espera INTEGER;
  v_estado TEXT;
  v_nueva_reserva public.reservas_de_clase;
  v_usuario_gym_id UUID;
  v_clase_gym_id UUID;
BEGIN
  -- A. Validar que el usuario pertenece al mismo gimnasio que la clase (Blindaje Cross-Tenant)
  SELECT gimnasio_id INTO v_usuario_gym_id FROM public.perfiles WHERE id = p_usuario_id;
  SELECT gimnasio_id, capacidad_maxima INTO v_clase_gym_id, v_cupo_max FROM public.horarios_de_clase WHERE id = p_horario_clase_id;
  
  IF v_clase_gym_id IS NULL THEN
    RAISE EXCEPTION 'Clase no encontrada';
  END IF;

  IF v_usuario_gym_id IS NULL OR v_usuario_gym_id <> v_clase_gym_id THEN
    RAISE EXCEPTION 'Acceso denegado: El alumno pertenece a otra sucursal';
  END IF;

  -- B. Verificar si ya tiene reserva activa (reservada o en lista de espera)
  SELECT EXISTS (
    SELECT 1 FROM public.reservas_de_clase
    WHERE usuario_id = p_usuario_id 
      AND horario_clase_id = p_horario_clase_id 
      AND fecha = p_fecha
      AND estado IN ('reservada', 'en_lista_espera')
  ) INTO v_ya_reservado;

  IF v_ya_reservado THEN
    RAISE EXCEPTION 'Ya tienes una reserva para esta clase';
  END IF;

  -- C. Adquirir lock del horario de clase para evitar sobrecupos concurrentes
  PERFORM 1 FROM public.horarios_de_clase WHERE id = p_horario_clase_id FOR UPDATE;

  -- D. Contar reservas actuales
  SELECT count(*) INTO v_reservas_actuales
  FROM public.reservas_de_clase
  WHERE horario_clase_id = p_horario_clase_id 
    AND fecha = p_fecha
    AND estado = 'reservada';

  -- E. Decisión e inserción atómica
  IF v_reservas_actuales < v_cupo_max THEN
    -- Hay lugar: Reserva directa
    INSERT INTO public.reservas_de_clase (horario_clase_id, usuario_id, fecha, estado, en_lista_espera)
    VALUES (p_horario_clase_id, p_usuario_id, p_fecha, 'reservada', false)
    RETURNING * INTO v_nueva_reserva;
  ELSE
    -- No hay lugar: Lista de espera
    SELECT COALESCE(max(posicion_lista_espera), 0) + 1 INTO v_posicion_espera
    FROM public.reservas_de_clase
    WHERE horario_clase_id = p_horario_clase_id 
      AND fecha = p_fecha
      AND estado = 'en_lista_espera';

    INSERT INTO public.reservas_de_clase (horario_clase_id, usuario_id, fecha, estado, en_lista_espera, posicion_lista_espera)
    VALUES (p_horario_clase_id, p_usuario_id, p_fecha, 'en_lista_espera', true, v_posicion_espera)
    RETURNING * INTO v_nueva_reserva;
  END IF;

  RETURN v_nueva_reserva;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Crear RPC promote_waitlist_atomic robustecida
CREATE OR REPLACE FUNCTION public.promote_waitlist_atomic(
  p_horario_id UUID,
  p_fecha DATE
)
RETURNS VOID AS $$
DECLARE
  v_next_booking_id UUID;
BEGIN
  -- Bloqueamos las filas afectadas para evitar concurrencia sucia
  SELECT id INTO v_next_booking_id
  FROM public.reservas_de_clase
  WHERE horario_clase_id = p_horario_id
    AND fecha = p_fecha
    AND estado = 'en_lista_espera'
  ORDER BY posicion_lista_espera ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_next_booking_id IS NOT NULL THEN
    -- Promovemos al primero
    UPDATE public.reservas_de_clase
    SET 
      estado = 'reservada',
      en_lista_espera = false,
      posicion_lista_espera = NULL
    WHERE id = v_next_booking_id;

    -- Re-ordenamos al resto
    WITH ordered_list AS (
      SELECT id, row_number() OVER (ORDER BY posicion_lista_espera ASC) as new_pos
      FROM public.reservas_de_clase
      WHERE horario_clase_id = p_horario_id
        AND fecha = p_fecha
        AND estado = 'en_lista_espera'
    )
    UPDATE public.reservas_de_clase
    SET posicion_lista_espera = ordered_list.new_pos
    FROM ordered_list
    WHERE public.reservas_de_clase.id = ordered_list.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Revocar y re-conceder accesos de ejecución seguros a las RPCs
REVOKE EXECUTE ON FUNCTION public.book_class_atomic(UUID, UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_class_atomic(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_class_atomic(UUID, UUID, DATE) TO service_role;

REVOKE EXECUTE ON FUNCTION public.promote_waitlist_atomic(UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_waitlist_atomic(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_waitlist_atomic(UUID, DATE) TO service_role;

-- 6. Configuración de Row Level Security (RLS) en reservas_de_clase
ALTER TABLE public.reservas_de_clase ENABLE ROW LEVEL SECURITY;

-- Política de lectura (SELECT)
DROP POLICY IF EXISTS "reservas_select_policy" ON public.reservas_de_clase;
CREATE POLICY "reservas_select_policy" ON public.reservas_de_clase
FOR SELECT USING (
  usuario_id = auth.uid()
  OR public.get_user_role() = 'superadmin'
  OR (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = usuario_id AND p.gimnasio_id = public.get_user_gym_id()
    )
    AND public.get_user_role() IN ('admin', 'recepcion', 'coach')
  )
);

-- Política de escritura (ALL: INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "reservas_write_policy" ON public.reservas_de_clase;
CREATE POLICY "reservas_write_policy" ON public.reservas_de_clase
FOR ALL USING (
  usuario_id = auth.uid()
  OR public.get_user_role() = 'superadmin'
  OR (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = usuario_id AND p.gimnasio_id = public.get_user_gym_id()
    )
    AND public.get_user_role() IN ('admin', 'recepcion', 'coach')
  )
)
WITH CHECK (
  usuario_id = auth.uid()
  OR public.get_user_role() = 'superadmin'
  OR (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = usuario_id AND p.gimnasio_id = public.get_user_gym_id()
    )
    AND public.get_user_role() IN ('admin', 'recepcion', 'coach')
  )
);

COMMIT;
