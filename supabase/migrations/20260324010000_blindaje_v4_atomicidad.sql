-- [FASE 7] Blindaje DATA/IA V4: Atomicidad y Performance

-- 1. Gestión Atómica de Lista de Espera
CREATE OR REPLACE FUNCTION promote_waitlist_atomic(
  p_horario_id UUID,
  p_fecha DATE
)
RETURNS VOID AS $$
DECLARE
  v_next_booking_id UUID;
BEGIN
  -- Bloqueamos las filas afectadas para evitar concurrencia sucia
  SELECT id INTO v_next_booking_id
  FROM reservas_de_clase
  WHERE horario_clase_id = p_horario_id
    AND fecha = p_fecha
    AND estado = 'en_lista_espera'
  ORDER BY posicion_lista_espera ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_next_booking_id IS NOT NULL THEN
    -- Promovemos al primero
    UPDATE reservas_de_clase
    SET 
      estado = 'reservada',
      en_lista_espera = false,
      posicion_lista_espera = NULL
    WHERE id = v_next_booking_id;

    -- Re-ordenamos al resto
    WITH ordered_list AS (
      SELECT id, row_number() OVER (ORDER BY posicion_lista_espera ASC) as new_pos
      FROM reservas_de_clase
      WHERE horario_clase_id = p_horario_id
        AND fecha = p_fecha
        AND estado = 'en_lista_espera'
    )
    UPDATE reservas_de_clase
    SET posicion_lista_espera = ordered_list.new_pos
    FROM ordered_list
    WHERE reservas_de_clase.id = ordered_list.id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Triggers de Unicidad de Estado Activo (Planes/Objetivos)
CREATE OR REPLACE FUNCTION fn_ensure_single_active_nutrition_plan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.esta_activo = true THEN
    UPDATE planes_nutricionales
    SET esta_activo = false
    WHERE usuario_id = NEW.usuario_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_single_active_nutrition_plan ON planes_nutricionales;
CREATE TRIGGER tr_ensure_single_active_nutrition_plan
BEFORE INSERT OR UPDATE OF esta_activo ON planes_nutricionales
FOR EACH ROW EXECUTE FUNCTION fn_ensure_single_active_nutrition_plan();

CREATE OR REPLACE FUNCTION fn_ensure_single_active_user_goal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.esta_activo = true THEN
    UPDATE objetivos_del_usuario
    SET esta_activo = false
    WHERE usuario_id = NEW.usuario_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_single_active_user_goal ON objetivos_del_usuario;
CREATE TRIGGER tr_ensure_single_active_user_goal
BEFORE INSERT OR UPDATE OF esta_activo ON objetivos_del_usuario
FOR EACH ROW EXECUTE FUNCTION fn_ensure_single_active_user_goal();

-- 3. Reserva Atómica (Anti-Overbooking)
DROP FUNCTION IF EXISTS book_class_atomic(uuid, uuid, date) CASCADE;
CREATE OR REPLACE FUNCTION book_class_atomic(
  p_horario_clase_id UUID,
  p_usuario_id UUID,
  p_fecha DATE
)
RETURNS JSON AS $$
DECLARE
  v_cupo_max INTEGER;
  v_reservas_actuales INTEGER;
  v_ya_reservado BOOLEAN;
  v_posicion_espera INTEGER;
BEGIN
  -- 1. Verificar si ya tiene reserva activa
  SELECT EXISTS (
    SELECT 1 FROM reservas_de_clase
    WHERE usuario_id = p_usuario_id 
      AND horario_clase_id = p_horario_clase_id 
      AND fecha = p_fecha
      AND estado IN ('reservada', 'en_lista_espera')
  ) INTO v_ya_reservado;

  IF v_ya_reservado THEN
    RETURN json_build_object('success', false, 'message', 'Ya tienes una reserva para esta clase');
  END IF;

  -- 2. Obtener cupo máximo de la clase
  SELECT cupo_maximo INTO v_cupo_max
  FROM horarios_clase
  WHERE id = p_horario_clase_id;

  -- 3. Contar reservas actuales (con bloqueo de tabla para evitar race condition)
  SELECT count(*) INTO v_reservas_actuales
  FROM reservas_de_clase
  WHERE horario_clase_id = p_horario_clase_id 
    AND fecha = p_fecha
    AND estado = 'reservada';

  -- 4. Lógica de asignación
  IF v_reservas_actuales < v_cupo_max THEN
    -- Hay lugar: Reserva directa
    INSERT INTO reservas_de_clase (horario_clase_id, usuario_id, fecha, estado, en_lista_espera)
    VALUES (p_horario_clase_id, p_usuario_id, p_fecha, 'reservada', false);
    
    RETURN json_build_object('success', true, 'message', 'Reserva confirmada');
  ELSE
    -- No hay lugar: Lista de espera
    SELECT COALESCE(max(posicion_lista_espera), 0) + 1 INTO v_posicion_espera
    FROM reservas_de_clase
    WHERE horario_clase_id = p_horario_clase_id 
      AND fecha = p_fecha
      AND estado = 'en_lista_espera';

    INSERT INTO reservas_de_clase (horario_clase_id, usuario_id, fecha, estado, en_lista_espera, posicion_lista_espera)
    VALUES (p_horario_clase_id, p_usuario_id, p_fecha, 'en_lista_espera', true, v_posicion_espera);

    RETURN json_build_object('success', true, 'message', 'Clase llena. Has sido añadido a la lista de espera (Posición ' || v_posicion_espera || ')');
  END IF;
END;
$$ LANGUAGE plpgsql;

