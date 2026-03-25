-- ===============================================
-- 🛡️ VIRTUD SAAS - DATA & IA FINAL ESCALATION
-- MATERIALIZED VIEW & EVENT TRIGGERS (CACHE)
-- ===============================================

-- 1️⃣ Desmantelar la Vista Dinámica lenta sin romper el ecosistema subyacente
DROP VIEW IF EXISTS clases_con_disponibilidad CASCADE;

-- 2️⃣ Inyectar la Caché (Materialized View)
CREATE MATERIALIZED VIEW clases_con_disponibilidad AS
SELECT 
    h.id, 
    h.actividad_id, 
    h.entrenador_id, 
    h.dia_de_la_semana, 
    h.hora_inicio, 
    h.hora_fin, 
    a.capacidad_maxima, 
    h.esta_activa,
    a.nombre as nombre_actividad,
    e.nombre_completo as nombre_entrenador,
    COALESCE((SELECT count(*) FROM reservas_de_clase r WHERE r.horario_clase_id = h.id AND r.estado = 'reservada'), 0) as capacidad_actual,
    (a.capacidad_maxima - COALESCE((SELECT count(*) FROM reservas_de_clase r WHERE r.horario_clase_id = h.id AND r.estado = 'reservada'), 0)) as cupos_disponibles
FROM horarios_de_clase h
LEFT JOIN actividades a ON h.actividad_id = a.id
LEFT JOIN perfiles e ON h.entrenador_id = e.id;

-- 3️⃣ Requisito técnico para REFRESH CONCURRENTLY (Lecturas sin bloqueo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_clases_disp_id ON clases_con_disponibilidad(id);

-- 4️⃣ Procedimiento de Refresco Asíncrono
CREATE OR REPLACE FUNCTION refresh_clases_mat_view_func()
RETURNS TRIGGER AS $$
BEGIN
    -- Concurrent evita bloquear las lecturas (0 downtime para los usuarios)
    REFRESH MATERIALIZED VIEW CONCURRENTLY clases_con_disponibilidad;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5️⃣ Event Triggers (Auto Re-validación del Caché DB)
DROP TRIGGER IF EXISTS trigger_clases_mat_view ON reservas_de_clase;
CREATE TRIGGER trigger_clases_mat_view
AFTER INSERT OR UPDATE OR DELETE ON reservas_de_clase
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_clases_mat_view_func();

DROP TRIGGER IF EXISTS trigger_horarios_mat_view ON horarios_de_clase;
CREATE TRIGGER trigger_horarios_mat_view
AFTER INSERT OR UPDATE OR DELETE ON horarios_de_clase
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_clases_mat_view_func();
