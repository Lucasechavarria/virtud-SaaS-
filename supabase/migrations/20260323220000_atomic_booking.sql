-- ==========================================
-- 🛡️ VIRTUD SAAS - DATA & IA PHASE
-- Atomic Booking Stored Procedure (RPC)
-- Patrón: Check-Then-Act con Row-Level Locking
-- ==========================================

DROP FUNCTION IF EXISTS public.book_class_atomic(UUID, UUID, DATE);

CREATE OR REPLACE FUNCTION public.book_class_atomic(
    p_horario_clase_id UUID,
    p_usuario_id UUID,
    p_fecha DATE
) RETURNS public.reservas_de_clase AS $$
DECLARE
    v_max_capacity INT;
    v_current_count INT;
    v_estado TEXT;
    v_nueva_reserva public.reservas_de_clase; 
BEGIN
    -- 1️⃣ Adquirir Lock de Fila
    -- JOIN con actividades para obtener la capacidad_maxima real (Master Data)
    SELECT a.capacidad_maxima INTO v_max_capacity
    FROM public.horarios_de_clase h
    JOIN public.actividades a ON h.actividad_id = a.id
    WHERE h.id = p_horario_clase_id
    FOR UPDATE OF h; 

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clase no encontrada';
    END IF;

    -- 2️⃣ Contar la capacidad real actual
    SELECT count(*) INTO v_current_count
    FROM public.reservas_de_clase
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
    INSERT INTO public.reservas_de_clase (horario_clase_id, usuario_id, fecha, estado)
    VALUES (p_horario_clase_id, p_usuario_id, p_fecha, v_estado)
    RETURNING * INTO v_nueva_reserva;

    RETURN v_nueva_reserva;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
