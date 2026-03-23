-- Migración DATA/IA: Optimización de Concurrencia de Reservas
-- Evita locks en producción reemplazando el trigger "current_capacity" por vistas dinámicas calculadas.

DO $$
BEGIN
  -- 1. Eliminar Triggers y Funciones obsoletas que bloquean los INSERTs masivos.
  DROP TRIGGER IF EXISTS update_class_capacity_trigger ON public.reservas_de_clase;
  DROP FUNCTION IF EXISTS update_class_capacity();

  -- 2. Eliminar columnas estáticas residuales si alguna vez existieron o migrarlas.
  -- Usamos IF EXISTS como cerrojo de seguridad por el histórico irregular de la base.
  ALTER TABLE IF EXISTS public.horarios_de_clase DROP COLUMN IF EXISTS capacidad_actual;
  ALTER TABLE IF EXISTS public.horarios_de_clase DROP COLUMN IF EXISTS current_capacity;
END $$;

-- 3. Crear Vista en Tiempo Real de Alta Velocidad (Solución DATA/IA)
-- Integra la cuenta dinámica con la capacidad base anulando los phantom limits.
CREATE OR REPLACE VIEW public.vista_capacidad_clases AS
SELECT 
    hc.id as horario_id,
    hc.actividad_id,
    hc.entrenador_id,
    hc.gimnasio_id,
    hc.dia_de_la_semana,
    hc.hora_inicio,
    hc.hora_fin,
    hc.esta_activa,
    a.nombre AS actividad_nombre,
    a.duracion_minutos,
    a.capacidad_maxima,
    a.dificultad,
    COALESCE(COUNT(r.id), 0) AS reservas_actuales,
    (a.capacidad_maxima - COALESCE(COUNT(r.id), 0)) AS lugares_disponibles,
    CASE 
        WHEN COALESCE(COUNT(r.id), 0) >= a.capacidad_maxima THEN 'full'
        WHEN COALESCE(COUNT(r.id), 0) >= (a.capacidad_maxima * 0.8) THEN 'almost_full'
        ELSE 'available'
    END AS estado_disponibilidad
FROM 
    public.horarios_de_clase hc
JOIN 
    public.actividades a ON hc.actividad_id = a.id
LEFT JOIN 
    public.reservas_de_clase r ON r.horario_clase_id = hc.id AND r.estado = 'reservada'
WHERE 
    hc.esta_activa = true
GROUP BY 
    hc.id, a.id;

-- 4. Documentación del Motor
COMMENT ON VIEW public.vista_capacidad_clases IS 'Vista dinámica IA: Reemplaza la columna current_capacity para abolir bloqueos paralelos de escritura durante las reservas masivas de alumnos.';
