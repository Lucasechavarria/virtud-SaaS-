-- Migración para la Fase Incremental: Soporte de rol 'superadmin' en políticas RLS discretas
-- Concede acceso a nivel de base de datos para que las cuentas de superadmin puedan auditar y gestionar registros sin restricciones de gimnasio_id.

BEGIN;

-- =========================================================================
-- 1. TABLA: public.pagos
-- =========================================================================
DROP POLICY IF EXISTS "pagos_select_policy" ON public.pagos;
DROP POLICY IF EXISTS "pagos_write_policy" ON public.pagos;

-- Lectura (SELECT): El dueño del pago, administración de la sucursal, o superadmins
CREATE POLICY "pagos_select_policy" ON public.pagos
    FOR SELECT
    USING (
        usuario_id = auth.uid() OR
        public.get_user_role() = 'superadmin' OR
        (
            public.get_user_role() IN ('admin', 'recepcion') AND
            gimnasio_id = public.get_user_gym_id()
        )
    );

-- Escritura (ALL): Administradores locales y recepcionistas de sucursal, o superadmins globalmente
CREATE POLICY "pagos_write_policy" ON public.pagos
    FOR ALL
    USING (
        public.get_user_role() IN ('admin', 'recepcion', 'superadmin') AND
        (public.get_user_role() = 'superadmin' OR gimnasio_id = public.get_user_gym_id())
    )
    WITH CHECK (
        public.get_user_role() IN ('admin', 'recepcion', 'superadmin') AND
        (public.get_user_role() = 'superadmin' OR gimnasio_id = public.get_user_gym_id())
    );


-- =========================================================================
-- 2. TABLA: public.asistencias
-- =========================================================================
DROP POLICY IF EXISTS "asistencias_select_policy" ON public.asistencias;
DROP POLICY IF EXISTS "asistencias_write_policy" ON public.asistencias;

-- Lectura (SELECT): El alumno ve sus asistencias, personal del gimnasio, o superadmins
CREATE POLICY "asistencias_select_policy" ON public.asistencias
    FOR SELECT
    USING (
        usuario_id = auth.uid() OR
        public.get_user_role() = 'superadmin' OR
        (
            public.get_user_role() IN ('admin', 'recepcion', 'coach') AND
            gimnasio_id = public.get_user_gym_id()
        )
    );

-- Escritura (ALL): Personal del gimnasio, o superadmins
CREATE POLICY "asistencias_write_policy" ON public.asistencias
    FOR ALL
    USING (
        public.get_user_role() IN ('admin', 'recepcion', 'coach', 'superadmin') AND
        (public.get_user_role() = 'superadmin' OR gimnasio_id = public.get_user_gym_id())
    )
    WITH CHECK (
        public.get_user_role() IN ('admin', 'recepcion', 'coach', 'superadmin') AND
        (public.get_user_role() = 'superadmin' OR gimnasio_id = public.get_user_gym_id())
    );


-- =========================================================================
-- 3. TABLA: public.crm_prospectos
-- =========================================================================
DROP POLICY IF EXISTS "crm_prospectos_admin_staff_policy" ON public.crm_prospectos;

-- Acceso completo (ALL): Admins locales, recepcionistas, o superadmins
CREATE POLICY "crm_prospectos_admin_staff_policy" ON public.crm_prospectos
    FOR ALL
    USING (
        public.get_user_role() IN ('admin', 'recepcion', 'superadmin') AND
        (public.get_user_role() = 'superadmin' OR gimnasio_id = public.get_user_gym_id())
    )
    WITH CHECK (
        public.get_user_role() IN ('admin', 'recepcion', 'superadmin') AND
        (public.get_user_role() = 'superadmin' OR gimnasio_id = public.get_user_gym_id())
    );


-- =========================================================================
-- 4. TABLA: public.equipamiento
-- =========================================================================
DROP POLICY IF EXISTS "equipamiento_select_policy" ON public.equipamiento;
DROP POLICY IF EXISTS "equipamiento_write_policy" ON public.equipamiento;

-- Lectura (SELECT): Todos los de la sucursal o superadmins
CREATE POLICY "equipamiento_select_policy" ON public.equipamiento
    FOR SELECT
    USING (
        public.get_user_role() = 'superadmin' OR
        gimnasio_id = public.get_user_gym_id()
    );

-- Escritura (ALL): Personal administrativo de la sucursal o superadmins
CREATE POLICY "equipamiento_write_policy" ON public.equipamiento
    FOR ALL
    USING (
        public.get_user_role() IN ('admin', 'recepcion', 'superadmin') AND
        (public.get_user_role() = 'superadmin' OR gimnasio_id = public.get_user_gym_id())
    )
    WITH CHECK (
        public.get_user_role() IN ('admin', 'recepcion', 'superadmin') AND
        (public.get_user_role() = 'superadmin' OR gimnasio_id = public.get_user_gym_id())
    );

COMMIT;
