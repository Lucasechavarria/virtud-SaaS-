-- ==============================================================================
-- MIGRACIÓN MASIVA DE SEGURIDAD (GRANTs + RLS) PARA ESQUEMA EN ESPAÑOL (IDEMPOTENTE)
-- ==============================================================================

-- 1. Funciones Auxiliares (Security Definer para evitar recursión)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
    AND role IN ('coach', 'admin', 'superadmin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO service_role;
GRANT EXECUTE ON FUNCTION public.is_coach TO service_role;


-- 2. Grant de Permisos Básicos
-- ------------------------------------------------------------------------------
GRANT ALL ON TABLE 
  actividades, asistencia_entrenador, desafios, ejercicios, equipamiento, 
  gamificacion_usuario, historial_cambios_perfil, horarios_de_clase, logros, 
  logros_usuario, mediciones, mensajes, objetivos_del_usuario, pagos, 
  participantes_desafio, perfiles, planes_nutricionales, registros_acceso_rutina, 
  registros_de_ejercicio, reportes_de_alumnos, reservas_de_clase, rutinas, 
  sesiones_de_entrenamiento
TO authenticated;

GRANT ALL ON TABLE 
  actividades, asistencia_entrenador, desafios, ejercicios, equipamiento, 
  gamificacion_usuario, historial_cambios_perfil, horarios_de_clase, logros, 
  logros_usuario, mediciones, mensajes, objetivos_del_usuario, pagos, 
  participantes_desafio, perfiles, planes_nutricionales, registros_acceso_rutina, 
  registros_de_ejercicio, reportes_de_alumnos, reservas_de_clase, rutinas, 
  sesiones_de_entrenamiento
TO service_role;


-- 3. Habilitar RLS en TODAS las tablas
-- ------------------------------------------------------------------------------
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_entrenador ENABLE ROW LEVEL SECURITY;
ALTER TABLE desafios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamificacion_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_cambios_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_de_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE logros ENABLE ROW LEVEL SECURITY;
ALTER TABLE logros_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetivos_del_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes_desafio ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_nutricionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_acceso_rutina ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_de_ejercicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_de_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_de_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_de_entrenamiento ENABLE ROW LEVEL SECURITY;


-- 4. Definición de Políticas (Policies) - CON DROP PREVIO
-- ------------------------------------------------------------------------------

-- === PERFILES ===
DROP POLICY IF EXISTS "Usuarios ven propio perfil" ON perfiles;
CREATE POLICY "Usuarios ven propio perfil" ON perfiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins ven todo perfil" ON perfiles;
CREATE POLICY "Admins ven todo perfil" ON perfiles FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Update propio perfil" ON perfiles;
CREATE POLICY "Update propio perfil" ON perfiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins update todo perfil" ON perfiles;
CREATE POLICY "Admins update todo perfil" ON perfiles FOR UPDATE USING (is_admin());

-- === ACTIVIDADES ===
DROP POLICY IF EXISTS "Todos ven actividades" ON actividades;
CREATE POLICY "Todos ven actividades" ON actividades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gestionan actividades" ON actividades;
CREATE POLICY "Admins gestionan actividades" ON actividades FOR ALL USING (is_admin());

-- === EQUIPAMIENTO ===
DROP POLICY IF EXISTS "Todos ven equipamiento" ON equipamiento;
CREATE POLICY "Todos ven equipamiento" ON equipamiento FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gestionan equipamiento" ON equipamiento;
CREATE POLICY "Admins gestionan equipamiento" ON equipamiento FOR ALL USING (is_admin());

-- === HORARIOS DE CLASE ===
DROP POLICY IF EXISTS "Todos ven horarios" ON horarios_de_clase;
CREATE POLICY "Todos ven horarios" ON horarios_de_clase FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins/Coach gestionan horarios" ON horarios_de_clase;
CREATE POLICY "Admins/Coach gestionan horarios" ON horarios_de_clase FOR ALL USING (is_coach());

-- === LOGROS ===
DROP POLICY IF EXISTS "Todos ven logros" ON logros;
CREATE POLICY "Todos ven logros" ON logros FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gestionan logros" ON logros;
CREATE POLICY "Admins gestionan logros" ON logros FOR ALL USING (is_admin());

-- === DESAFIOS ===
DROP POLICY IF EXISTS "Todos ven desafios" ON desafios;
CREATE POLICY "Todos ven desafios" ON desafios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gestionan desafios" ON desafios;
CREATE POLICY "Admins gestionan desafios" ON desafios FOR ALL USING (is_admin());


-- === RUTINAS ===
DROP POLICY IF EXISTS "Ver propias rutinas" ON rutinas;
CREATE POLICY "Ver propias rutinas" ON rutinas FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach ve rutinas asignadas" ON rutinas;
CREATE POLICY "Coach ve rutinas asignadas" ON rutinas FOR SELECT USING (is_coach());

DROP POLICY IF EXISTS "Coach crea/edita rutinas" ON rutinas;
CREATE POLICY "Coach crea/edita rutinas" ON rutinas FOR ALL USING (is_coach());

DROP POLICY IF EXISTS "Usuario edita propia rutina" ON rutinas;
CREATE POLICY "Usuario edita propia rutina" ON rutinas FOR UPDATE USING (auth.uid() = user_id);

-- === EJERCICIOS ===
DROP POLICY IF EXISTS "Ver ejercicios rutina" ON ejercicios;
CREATE POLICY "Ver ejercicios rutina" ON ejercicios FOR SELECT USING (
  EXISTS (SELECT 1 FROM rutinas WHERE rutinas.id = ejercicios.routine_id AND (rutinas.user_id = auth.uid() OR is_coach()))
);

DROP POLICY IF EXISTS "Coach gestiona ejercicios" ON ejercicios;
CREATE POLICY "Coach gestiona ejercicios" ON ejercicios FOR ALL USING (is_coach());

-- === PLANES NUTRICIONALES ===
DROP POLICY IF EXISTS "Ver propio plan" ON planes_nutricionales;
CREATE POLICY "Ver propio plan" ON planes_nutricionales FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach gestiona plan" ON planes_nutricionales;
CREATE POLICY "Coach gestiona plan" ON planes_nutricionales FOR ALL USING (is_coach());

-- === SESIONES DE ENTRENAMIENTO ===
DROP POLICY IF EXISTS "Ver propias sesiones" ON sesiones_de_entrenamiento;
CREATE POLICY "Ver propias sesiones" ON sesiones_de_entrenamiento FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach ve sesiones" ON sesiones_de_entrenamiento;
CREATE POLICY "Coach ve sesiones" ON sesiones_de_entrenamiento FOR SELECT USING (is_coach());

DROP POLICY IF EXISTS "Crear propia sesion" ON sesiones_de_entrenamiento;
CREATE POLICY "Crear propia sesion" ON sesiones_de_entrenamiento FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Editar propia sesion" ON sesiones_de_entrenamiento;
CREATE POLICY "Editar propia sesion" ON sesiones_de_entrenamiento FOR UPDATE USING (auth.uid() = user_id);

-- === REGISTROS DE EJERCICIO ===
DROP POLICY IF EXISTS "Ver propios registros" ON registros_de_ejercicio;
CREATE POLICY "Ver propios registros" ON registros_de_ejercicio FOR SELECT USING (
  EXISTS (SELECT 1 FROM sesiones_de_entrenamiento s WHERE s.id = registros_de_ejercicio.session_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Insert propios registros" ON registros_de_ejercicio;
CREATE POLICY "Insert propios registros" ON registros_de_ejercicio FOR INSERT WITH CHECK (
   EXISTS (SELECT 1 FROM sesiones_de_entrenamiento s WHERE s.id = registros_de_ejercicio.session_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Update propios registros" ON registros_de_ejercicio;
CREATE POLICY "Update propios registros" ON registros_de_ejercicio FOR UPDATE USING (
   EXISTS (SELECT 1 FROM sesiones_de_entrenamiento s WHERE s.id = registros_de_ejercicio.session_id AND s.user_id = auth.uid())
);

-- === OBJETIVOS DEL USUARIO ===
DROP POLICY IF EXISTS "Ver propios objetivos" ON objetivos_del_usuario;
CREATE POLICY "Ver propios objetivos" ON objetivos_del_usuario FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Gestionar propios objetivos" ON objetivos_del_usuario;
CREATE POLICY "Gestionar propios objetivos" ON objetivos_del_usuario FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach ve objetivos" ON objetivos_del_usuario;
CREATE POLICY "Coach ve objetivos" ON objetivos_del_usuario FOR SELECT USING (is_coach());

-- === MEDICIONES ===
DROP POLICY IF EXISTS "Ver propias mediciones" ON mediciones;
CREATE POLICY "Ver propias mediciones" ON mediciones FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Gestionar propias mediciones" ON mediciones;
CREATE POLICY "Gestionar propias mediciones" ON mediciones FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach ve mediciones" ON mediciones;
CREATE POLICY "Coach ve mediciones" ON mediciones FOR SELECT USING (is_coach());

-- === PAGOS ===
DROP POLICY IF EXISTS "Ver propios pagos" ON pagos;
CREATE POLICY "Ver propios pagos" ON pagos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins gestionan pagos" ON pagos;
CREATE POLICY "Admins gestionan pagos" ON pagos FOR ALL USING (is_admin());

-- === RESERVAS DE CLASE ===
DROP POLICY IF EXISTS "Ver propias reservas" ON reservas_de_clase;
CREATE POLICY "Ver propias reservas" ON reservas_de_clase FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Crear/Cancelar propias reservas" ON reservas_de_clase;
CREATE POLICY "Crear/Cancelar propias reservas" ON reservas_de_clase FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach ve reservas" ON reservas_de_clase;
CREATE POLICY "Coach ve reservas" ON reservas_de_clase FOR SELECT USING (is_coach());

-- === MENSAJES ===
DROP POLICY IF EXISTS "Ver mis mensajes" ON mensajes;
CREATE POLICY "Ver mis mensajes" ON mensajes FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Enviar mensajes" ON mensajes;
CREATE POLICY "Enviar mensajes" ON mensajes FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- === REPORTES ===
DROP POLICY IF EXISTS "Ver mis reportes" ON reportes_de_alumnos;
CREATE POLICY "Ver mis reportes" ON reportes_de_alumnos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Crear reportes" ON reportes_de_alumnos;
CREATE POLICY "Crear reportes" ON reportes_de_alumnos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins gestionan reportes" ON reportes_de_alumnos;
CREATE POLICY "Admins gestionan reportes" ON reportes_de_alumnos FOR ALL USING (is_admin());

-- === GAMIFICACION ===
DROP POLICY IF EXISTS "Ver mi gamificacion" ON gamificacion_usuario;
CREATE POLICY "Ver mi gamificacion" ON gamificacion_usuario FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Ver leaderboard" ON gamificacion_usuario;
CREATE POLICY "Ver leaderboard" ON gamificacion_usuario FOR SELECT USING (true); 

DROP POLICY IF EXISTS "Sistema actualiza gamificacion" ON gamificacion_usuario;
CREATE POLICY "Sistema actualiza gamificacion" ON gamificacion_usuario FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Ver mis logros" ON logros_usuario;
CREATE POLICY "Ver mis logros" ON logros_usuario FOR SELECT USING (auth.uid() = user_id);
