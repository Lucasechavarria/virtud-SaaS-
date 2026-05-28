-- ==========================================
-- 🛡️ VIRTUD SAAS - SCALABILITY PHASE
-- B-Tree Indexes para acelerar la vista de overbooking
-- ==========================================

-- Acelerar radicalmente el COUNT(*) del RPC book_class_atomic y la vista clases_con_disponibilidad
CREATE INDEX IF NOT EXISTS idx_reservas_horario_fecha
ON reservas_de_clase (horario_clase_id, fecha);

-- Acelerar la búsqueda de las reservas de un alumno específico
CREATE INDEX IF NOT EXISTS idx_reservas_usuario_fecha
ON reservas_de_clase (usuario_id, fecha);
