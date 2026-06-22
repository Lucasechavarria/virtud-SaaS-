-- Migración para el Sprint 9: Remediaciones críticas de seguridad RLS e índices compuestos
-- Resuelve conflictos de políticas permissivas y acota el acceso a roles de administración/personal.

BEGIN;

-- =========================================================================
-- 1. REMEDIACIÓN DE TABLA: public.pagos
-- =========================================================================
-- Eliminar políticas conflictivas heredadas
DROP POLICY IF EXISTS "Multi-tenant: Pagos privados por gimnasio" ON public.pagos;
DROP POLICY IF EXISTS pagos_usuario_admin ON public.pagos;

-- Política de lectura (SELECT): Dueño del pago o administración de su sucursal
CREATE POLICY "pagos_select_policy" ON public.pagos
    FOR SELECT
    USING (
        usuario_id = auth.uid() OR
        (
            public.get_user_role() IN ('admin', 'recepcion') AND
            gimnasio_id = public.get_user_gym_id()
        )
    );

-- Política de escritura (ALL): Solo administradores y recepcionistas de su respectivo gimnasio
CREATE POLICY "pagos_write_policy" ON public.pagos
    FOR ALL
    USING (
        public.get_user_role() IN ('admin', 'recepcion') AND
        gimnasio_id = public.get_user_gym_id()
    )
    WITH CHECK (
        public.get_user_role() IN ('admin', 'recepcion') AND
        gimnasio_id = public.get_user_gym_id()
    );


-- =========================================================================
-- 2. REMEDIACIÓN DE TABLA: public.asistencias
-- =========================================================================
-- Eliminar políticas conflictivas
DROP POLICY IF EXISTS "Multi-tenant: Acceso a asistencias por gimnasio" ON public.asistencias;

-- Política de lectura (SELECT): El alumno ve sus asistencias, o personal del gimnasio
CREATE POLICY "asistencias_select_policy" ON public.asistencias
    FOR SELECT
    USING (
        usuario_id = auth.uid() OR
        (
            public.get_user_role() IN ('admin', 'recepcion', 'coach') AND
            gimnasio_id = public.get_user_gym_id()
        )
    );

-- Política de escritura (ALL): Solo personal autorizado (admin, recepcion, coach)
CREATE POLICY "asistencias_write_policy" ON public.asistencias
    FOR ALL
    USING (
        public.get_user_role() IN ('admin', 'recepcion', 'coach') AND
        gimnasio_id = public.get_user_gym_id()
    )
    WITH CHECK (
        public.get_user_role() IN ('admin', 'recepcion', 'coach') AND
        gimnasio_id = public.get_user_gym_id()
    );


-- =========================================================================
-- 3. REMEDIACIÓN DE TABLA: public.crm_prospectos
-- =========================================================================
-- Eliminar política desprotegida
DROP POLICY IF EXISTS "Multi-tenant: Acceso a prospectos por gimnasio" ON public.crm_prospectos;

-- Política integral (ALL): Solo admins y recepcionistas de la sucursal pueden ver o editar prospectos
CREATE POLICY "crm_prospectos_admin_staff_policy" ON public.crm_prospectos
    FOR ALL
    USING (
        public.get_user_role() IN ('admin', 'recepcion') AND
        gimnasio_id = public.get_user_gym_id()
    )
    WITH CHECK (
        public.get_user_role() IN ('admin', 'recepcion') AND
        gimnasio_id = public.get_user_gym_id()
    );


-- =========================================================================
-- 4. REMEDIACIÓN DE TABLA: public.equipamiento
-- =========================================================================
-- Eliminar política desprotegida
DROP POLICY IF EXISTS "Multi-tenant: Acceso a equipamiento por gimnasio" ON public.equipamiento;

-- Política de lectura (SELECT): Todos los usuarios de la sucursal pueden consultar el equipamiento
CREATE POLICY "equipamiento_select_policy" ON public.equipamiento
    FOR SELECT
    USING (gimnasio_id = public.get_user_gym_id());

-- Política de escritura (ALL): Modificación reservada a administración
CREATE POLICY "equipamiento_write_policy" ON public.equipamiento
    FOR ALL
    USING (
        public.get_user_role() IN ('admin', 'recepcion') AND
        gimnasio_id = public.get_user_gym_id()
    )
    WITH CHECK (
        public.get_user_role() IN ('admin', 'recepcion') AND
        gimnasio_id = public.get_user_gym_id()
    );


-- =========================================================================
-- 5. CREACIÓN DE ÍNDICES COMPUESTOS PARA ALTO RENDIMIENTO (OPTIMIZACIÓN REPORTES)
-- =========================================================================
-- Acelerar agregaciones temporales de pagos
CREATE INDEX IF NOT EXISTS idx_pagos_gym_fecha ON public.pagos (gimnasio_id, creado_en DESC);

-- Acelerar conteos de nuevos alumnos e históricos
CREATE INDEX IF NOT EXISTS idx_perfiles_gym_fecha ON public.perfiles (gimnasio_id, creado_en DESC);

COMMIT;
