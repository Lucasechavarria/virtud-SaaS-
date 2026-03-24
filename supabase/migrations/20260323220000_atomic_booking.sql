-- ==========================================
-- 🛡️ VIRTUD SAAS - DATA & IA PHASE
-- Atomic Booking Stored Procedure (RPC)
-- Patrón: Check-Then-Act con Row-Level Locking
-- ==========================================

CREATE OR REPLACE FUNCTION book_class_atomic(
    p_horario_clase_id UUID,
    p_usuario_id UUID,
    p_fecha DATE
) RETURNS reservas_de_clase AS $$
DECLARE
    v_max_capacity INT;
    v_current_count INT;
    v_estado TEXT;
    v_nueva_reserva reservas_de_clase;
BEGIN
    -- 1️⃣ Adquirir Lock de Fila (Row-Level Lock) en el horario para serializar intentos concurrentes.
    -- Nadie más podrá hacer SELECT FOR UPDATE sobre este horario_id hasta que la transacción termine.
    SELECT capacidad_maxima INTO v_max_capacity
    FROM horarios_de_clase
    WHERE id = p_horario_clase_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clase no encontrada';
    END IF;

    -- 2️⃣ Contar la capacidad real actual (eliminamos la dependencia de triggers ineficientes)
    SELECT count(*) INTO v_current_count
    FROM reservas_de_clase
    WHERE horario_clase_id = p_horario_clase_id 
      AND fecha = p_fecha
      AND estado = 'reservada';

    -- 3️⃣ Lógica de decisión atómica
    IF v_current_count >= v_max_capacity THEN
        v_estado := 'en_lista_espera';
    ELSE
        v_estado := 'reservada';
    END IF;

    -- 4️⃣ Inserción blindada
    INSERT INTO reservas_de_clase (horario_clase_id, usuario_id, fecha, estado)
    VALUES (p_horario_clase_id, p_usuario_id, p_fecha, v_estado)
    RETURNING * INTO v_nueva_reserva;

    RETURN v_nueva_reserva;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
