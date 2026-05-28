-- =============================================================================================
-- MIGRACIÓN: LIMPIEZA Y REFACTORIZACIÓN DE SCHEMA
-- Fecha: 2026-01-20
-- Objetivo: Eliminar duplicados, normalizar nomenclatura, mantener funcionalidades
-- =============================================================================================

-- 0. DESACTIVAR TRIGGERS TEMPORALMENTE
SET session_replication_role = 'replica';

-- =============================================================================================
-- 1. ELIMINAR TABLA DUPLICADA: gamificación_del_usuario (con tilde)
-- =============================================================================================
-- Esta tabla está duplicada. Solo mantenemos gamificacion_del_usuario (sin tilde)
DROP TABLE IF EXISTS public.gamificación_del_usuario CASCADE;

-- =============================================================================================
-- 2. NORMALIZAR TABLA: ejercicios
-- =============================================================================================
-- Renombrar columnas que aún están en inglés
ALTER TABLE public.ejercicios 
  RENAME COLUMN name TO nombre;

ALTER TABLE public.ejercicios 
  RENAME COLUMN description TO descripcion;

ALTER TABLE public.ejercicios 
  RENAME COLUMN sets TO series;

ALTER TABLE public.ejercicios 
  RENAME COLUMN reps TO repeticiones;

ALTER TABLE public.ejercicios 
  RENAME COLUMN instructions TO instrucciones;

-- =============================================================================================
-- 3. NORMALIZAR TABLA: equipamiento
-- =============================================================================================
ALTER TABLE public.equipamiento 
  RENAME COLUMN name TO nombre;

ALTER TABLE public.equipamiento 
  RENAME COLUMN brand TO marca;

ALTER TABLE public.equipamiento 
  RENAME COLUMN quantity TO cantidad;

ALTER TABLE public.equipamiento 
  RENAME COLUMN notes TO notas;

ALTER TABLE public.equipamiento 
  RENAME COLUMN image_url TO url_imagen;

-- =============================================================================================
-- 4. NORMALIZAR TABLA: rutinas
-- =============================================================================================
ALTER TABLE public.rutinas 
  RENAME COLUMN name TO nombre;

ALTER TABLE public.rutinas 
  RENAME COLUMN description TO descripcion;

ALTER TABLE public.rutinas 
  RENAME COLUMN goal TO objetivo;

-- =============================================================================================
-- 5. NORMALIZAR TABLA: desafios
-- =============================================================================================
ALTER TABLE public.desafios 
  RENAME COLUMN title TO titulo;

ALTER TABLE public.desafios 
  RENAME COLUMN description TO descripcion;

ALTER TABLE public.desafios 
  RENAME COLUMN rules TO reglas;

ALTER TABLE public.desafios 
  RENAME COLUMN type TO tipo;

ALTER TABLE public.desafios 
  RENAME COLUMN points_reward TO puntos_recompensa;

ALTER TABLE public.desafios 
  RENAME COLUMN status TO estado;

ALTER TABLE public.desafios 
  RENAME COLUMN created_by TO creado_por;

ALTER TABLE public.desafios 
  RENAME COLUMN judge_id TO juez_id;

ALTER TABLE public.desafios 
  RENAME COLUMN winner_id TO ganador_id;

ALTER TABLE public.desafios 
  RENAME COLUMN start_date TO fecha_inicio;

ALTER TABLE public.desafios 
  RENAME COLUMN end_date TO fecha_fin;

ALTER TABLE public.desafios 
  RENAME COLUMN created_at TO creado_en;

ALTER TABLE public.desafios 
  RENAME COLUMN updated_at TO actualizado_en;

-- =============================================================================================
-- 6. NORMALIZAR TABLA: participantes_desafio
-- =============================================================================================
ALTER TABLE public.participantes_desafio 
  RENAME COLUMN challenge_id TO desafio_id;

ALTER TABLE public.participantes_desafio 
  RENAME COLUMN user_id TO usuario_id;

ALTER TABLE public.participantes_desafio 
  RENAME COLUMN current_score TO puntuacion_actual;

ALTER TABLE public.participantes_desafio 
  RENAME COLUMN status TO estado;

ALTER TABLE public.participantes_desafio 
  RENAME COLUMN joined_at TO unido_en;

ALTER TABLE public.participantes_desafio 
  RENAME COLUMN updated_at TO actualizado_en;

-- =============================================================================================
-- 7. NORMALIZAR TABLA: reportes_de_alumnos
-- =============================================================================================
ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN user_id TO usuario_id;

ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN title TO titulo;

ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN description TO descripcion;

ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN type TO tipo;

ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN status TO estado;

ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN created_at TO creado_en;

ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN updated_at TO actualizado_en;

ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN resolved_at TO resuelto_en;

ALTER TABLE public.reportes_de_alumnos 
  RENAME COLUMN resolved_by TO resuelto_por;

-- =============================================================================================
-- 8. NORMALIZAR TABLA: registros_acceso_rutina
-- =============================================================================================
ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN routine_id TO rutina_id;

ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN user_id TO usuario_id;

ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN action TO accion;

ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN ip_address TO direccion_ip;

ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN user_agent TO agente_usuario;

ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN device_info TO info_dispositivo;

ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN latitude TO latitud;

ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN longitude TO longitud;

ALTER TABLE public.registros_acceso_rutina 
  RENAME COLUMN created_at TO creado_en;

-- =============================================================================================
-- 9. NORMALIZAR TABLA: relacion_alumno_coach
-- =============================================================================================
ALTER TABLE public.relacion_alumno_coach 
  RENAME COLUMN user_id TO usuario_id;

ALTER TABLE public.relacion_alumno_coach 
  RENAME COLUMN coach_id TO entrenador_id;

ALTER TABLE public.relacion_alumno_coach 
  RENAME COLUMN is_primary TO es_principal;

ALTER TABLE public.relacion_alumno_coach 
  RENAME COLUMN assigned_at TO asignado_en;

ALTER TABLE public.relacion_alumno_coach 
  RENAME COLUMN is_active TO esta_activo;

-- =============================================================================================
-- 10. NORMALIZAR TABLA: participantes_conversacion
-- =============================================================================================
ALTER TABLE public.participantes_conversacion 
  RENAME COLUMN conversation_id TO conversacion_id;

ALTER TABLE public.participantes_conversacion 
  RENAME COLUMN user_id TO usuario_id;

ALTER TABLE public.participantes_conversacion 
  RENAME COLUMN joined_at TO unido_en;

-- =============================================================================================
-- 11. NORMALIZAR TABLA: objetivos_del_usuario
-- =============================================================================================
ALTER TABLE public.objetivos_del_usuario 
  RENAME COLUMN target_body_fat_percentage TO porcentaje_grasa_objetivo;

ALTER TABLE public.objetivos_del_usuario 
  RENAME COLUMN target_muscle_mass TO masa_muscular_objetivo;

ALTER TABLE public.objetivos_del_usuario 
  RENAME COLUMN start_date TO fecha_inicio;

ALTER TABLE public.objetivos_del_usuario 
  RENAME COLUMN target_date TO fecha_objetivo;

-- =============================================================================================
-- 12. NORMALIZAR TABLA: mediciones
-- =============================================================================================
ALTER TABLE public.mediciones 
  RENAME COLUMN weight TO peso;

ALTER TABLE public.mediciones 
  RENAME COLUMN notes TO notas;

-- =============================================================================================
-- 13. NORMALIZAR TABLA: pagos
-- =============================================================================================
ALTER TABLE public.pagos 
  RENAME COLUMN concept TO concepto;

ALTER TABLE public.pagos 
  RENAME COLUMN payment_provider TO proveedor_pago;

ALTER TABLE public.pagos 
  RENAME COLUMN provider_payment_id TO id_pago_proveedor;

ALTER TABLE public.pagos 
  RENAME COLUMN notes TO notas;

ALTER TABLE public.pagos 
  RENAME COLUMN metadata TO metadatos;

-- =============================================================================================
-- 14. NORMALIZAR TABLA: planes_nutricionales
-- =============================================================================================
ALTER TABLE public.planes_nutricionales 
  RENAME COLUMN meals TO comidas;

ALTER TABLE public.planes_nutricionales 
  RENAME COLUMN supplements TO suplementos;

ALTER TABLE public.planes_nutricionales 
  RENAME COLUMN restrictions TO restricciones;

-- =============================================================================================
-- 15. NORMALIZAR TABLA: reservas_de_clase
-- =============================================================================================
ALTER TABLE public.reservas_de_clase 
  RENAME COLUMN date TO fecha;

-- =============================================================================================
-- 16. NORMALIZAR TABLA: actividades
-- =============================================================================================
-- Eliminar columna duplicada 'category' (ya existe 'tipo')
ALTER TABLE public.actividades 
  DROP COLUMN IF EXISTS category;

-- =============================================================================================
-- 17. NORMALIZAR TABLA: logros_del_usuario
-- =============================================================================================
ALTER TABLE public.logros_del_usuario 
  RENAME COLUMN achievement_id TO logro_id;

-- =============================================================================================
-- 18. LIMPIAR CONSTRAINTS Y RECREAR CON NOMBRES CORRECTOS
-- =============================================================================================

-- Desafíos
ALTER TABLE public.desafios 
  DROP CONSTRAINT IF EXISTS challenges_created_by_fkey;
ALTER TABLE public.desafios 
  ADD CONSTRAINT desafios_creado_por_fkey 
  FOREIGN KEY (creado_por) REFERENCES public.perfiles(id);

ALTER TABLE public.desafios 
  DROP CONSTRAINT IF EXISTS challenges_judge_id_fkey;
ALTER TABLE public.desafios 
  ADD CONSTRAINT desafios_juez_id_fkey 
  FOREIGN KEY (juez_id) REFERENCES public.perfiles(id);

ALTER TABLE public.desafios 
  DROP CONSTRAINT IF EXISTS challenges_winner_id_fkey;
ALTER TABLE public.desafios 
  ADD CONSTRAINT desafios_ganador_id_fkey 
  FOREIGN KEY (ganador_id) REFERENCES public.perfiles(id);

-- Participantes Desafío
ALTER TABLE public.participantes_desafio 
  DROP CONSTRAINT IF EXISTS challenge_participants_challenge_id_fkey;
ALTER TABLE public.participantes_desafio 
  ADD CONSTRAINT participantes_desafio_desafio_id_fkey 
  FOREIGN KEY (desafio_id) REFERENCES public.desafios(id);

ALTER TABLE public.participantes_desafio 
  DROP CONSTRAINT IF EXISTS challenge_participants_user_id_fkey;
ALTER TABLE public.participantes_desafio 
  ADD CONSTRAINT participantes_desafio_usuario_id_fkey 
  FOREIGN KEY (usuario_id) REFERENCES public.perfiles(id);

-- =============================================================================================
-- 19. ACTUALIZAR FUNCIÓN DE TIMESTAMP
-- =============================================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================================
-- 20. RECREAR TRIGGERS PARA TABLAS QUE LO NECESITEN
-- =============================================================================================
DROP TRIGGER IF EXISTS update_desafios_updated_at ON public.desafios;
CREATE TRIGGER update_desafios_updated_at
    BEFORE UPDATE ON public.desafios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_participantes_desafio_updated_at ON public.participantes_desafio;
CREATE TRIGGER update_participantes_desafio_updated_at
    BEFORE UPDATE ON public.participantes_desafio
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reportes_updated_at ON public.reportes_de_alumnos;
CREATE TRIGGER update_reportes_updated_at
    BEFORE UPDATE ON public.reportes_de_alumnos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================================
-- 21. REACTIVAR TRIGGERS
-- =============================================================================================
SET session_replication_role = 'origin';

-- =============================================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================================
