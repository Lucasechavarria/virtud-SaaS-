-- 🛡️ REPARACIÓN DE TRIGGERS DE GAMIFICACIÓN (HUÉRFANOS)
-- Corrige funciones que referencian 'user_gamification' (Inglés) en lugar de 'gamificacion_del_usuario' (Español).

-- 1. Redefinir handle_new_measurement_xp
CREATE OR REPLACE FUNCTION handle_new_measurement_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronización con el nuevo esquema en Español
    -- user_gamification -> gamificacion_del_usuario
    -- user_id -> usuario_id
    -- last_activity_date -> fecha_ultima_actividad
    
    UPDATE public.gamificacion_del_usuario
    SET 
        puntos = puntos + 10,
        fecha_ultima_actividad = CURRENT_DATE,
        actualizado_en = NOW()
    WHERE usuario_id = NEW.usuario_id;

    -- Si el perfil de gamificación no existe, lo inicializamos
    IF NOT FOUND THEN
        INSERT INTO public.gamificacion_del_usuario (usuario_id, puntos, fecha_ultima_actividad)
        VALUES (NEW.usuario_id, 10, CURRENT_DATE);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que el trigger esté vinculado a public.mediciones
-- (Normalmente ya existe, pero esto asegura la función correcta)
DROP TRIGGER IF EXISTS tr_new_measurement_xp ON public.mediciones;
CREATE TRIGGER tr_new_measurement_xp
    AFTER INSERT ON public.mediciones
    FOR EACH ROW EXECUTE FUNCTION handle_new_measurement_xp();

-- 3. Otros posibles triggers huérfanos (Ajuste preventivo si existen)
CREATE OR REPLACE FUNCTION handle_new_workout_xp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.gamificacion_del_usuario
    SET 
        puntos = puntos + 50,
        fecha_ultima_actividad = CURRENT_DATE,
        actualizado_en = NOW()
    WHERE usuario_id = NEW.usuario_id;

    IF NOT FOUND THEN
        INSERT INTO public.gamificacion_del_usuario (usuario_id, puntos, fecha_ultima_actividad)
        VALUES (NEW.usuario_id, 50, CURRENT_DATE);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
