-- =========================================================================
-- 🛡️ VIRTUD SAAS - SCALABILITY & PERFORMANCE PHASE (ELITE HUB)
-- B-Tree y GIN Indexes para optimizar búsquedas multi-tenant y dashboards
-- =========================================================================

-- 1. Rutinas activas por usuario (Dashboard alumno)
CREATE INDEX IF NOT EXISTS idx_rutinas_usuario_activa 
  ON public.rutinas(usuario_id, esta_activa) 
  WHERE esta_activa = true;

-- 2. Sesiones recientes (Gráficos de progreso y adherencia)
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_fecha 
  ON public.sesiones_de_entrenamiento(usuario_id, hora_inicio DESC);

-- 3. Asistencias del mes (Métricas de entrada rápida)
CREATE INDEX IF NOT EXISTS idx_asistencias_usuario_entrada 
  ON public.asistencias(usuario_id, entrada DESC);

-- 4. Reservas futuras (Calendario de clases del alumno)
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_estado 
  ON public.reservas_de_clase(fecha, estado)
  WHERE fecha >= CURRENT_DATE;

-- 5. Mensajes no leídos (Notificaciones de chat e interacciones)
CREATE INDEX IF NOT EXISTS idx_mensajes_receptor_no_leidos 
  ON public.mensajes(receptor_id, esta_leido) 
  WHERE esta_leido = false;

-- 6. Leaderboard de Gamificación (Podio 3D Elite)
CREATE INDEX IF NOT EXISTS idx_gamificacion_puntos_nivel 
  ON public.gamificacion_del_usuario(puntos DESC, nivel DESC);

-- 7. Videos de ejercicio pendientes de analizar (Worker Queue Vision Lab)
CREATE INDEX IF NOT EXISTS idx_videos_pendientes 
  ON public.videos_ejercicio(estado, creado_en)
  WHERE estado IN ('subido', 'procesando');

-- 8. Auditoría reciente por tabla (Trazabilidad DevSecOps)
CREATE INDEX IF NOT EXISTS idx_audit_tabla_fecha 
  ON public.audit_logs(tabla, creado_en DESC);

-- 9. Extensión pg_trgm para búsquedas semánticas difusas y GIN Index en ejercicios (Full-text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_ejercicios_nombre_trgm 
  ON public.ejercicios USING gin(nombre gin_trgm_ops);

-- 10. Aislamiento Multi-tenant general: Índices compuestos con gimnasio_id para acelerar el filtrado de RLS
CREATE INDEX IF NOT EXISTS idx_perfiles_gimnasio_id ON public.perfiles(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_actividades_gimnasio_id ON public.actividades(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_horarios_de_clase_gimnasio_id ON public.horarios_de_clase(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_rutinas_gimnasio_id ON public.rutinas(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_pagos_gimnasio_id ON public.pagos(gimnasio_id);
