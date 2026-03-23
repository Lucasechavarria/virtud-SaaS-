-- Migración: Functional Training Sessions
-- Fecha: 2026-01-11

-- 1. Seguimiento de Sesiones (Real-time Execution)
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id),
    routine_id uuid NOT NULL REFERENCES public.routines(id),
    start_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone,
    status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    total_points integer DEFAULT 0,
    mood_rating integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workout_sessions_pkey PRIMARY KEY (id)
);

-- 2. Registro detallado de ejecución por ejercicio
CREATE TABLE IF NOT EXISTS public.exercise_performance_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    exercise_id uuid NOT NULL REFERENCES public.exercises(id),
    actual_sets integer,
    actual_reps text,
    actual_weight numeric,
    rest_time_seconds integer,
    is_completed boolean DEFAULT true,
    difficulty_rating integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT exercise_performance_logs_pkey PRIMARY KEY (id)
);

-- 3. Funciones y Triggers para gamificación automática
CREATE OR REPLACE FUNCTION public.after_session_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status = 'active' THEN
        -- Incrementar puntos globales del usuario en su perfil gamificado
        UPDATE public.user_gamification 
        SET points = points + COALESCE(NEW.total_points, 0),
            current_streak = CASE 
                WHEN last_activity_date = CURRENT_DATE THEN current_streak
                WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
                ELSE 1
            END,
            last_activity_date = CURRENT_DATE,
            updated_at = now()
        WHERE user_id = NEW.user_id;

        -- Actualizar el récord de mayor racha si aplica
        UPDATE public.user_gamification 
        SET longest_streak = current_streak
        WHERE user_id = NEW.user_id AND current_streak > longest_streak;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_session_completed ON public.workout_sessions;
CREATE TRIGGER tr_session_completed
    AFTER UPDATE ON public.workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.after_session_completed();
