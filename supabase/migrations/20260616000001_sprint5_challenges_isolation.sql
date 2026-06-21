-- Migración para el Sprint 5: Aislamiento Multi-tenant en Desafíos (Gamificación)
-- Añade la columna gimnasio_id en desafios y establece políticas RLS seguras.

BEGIN;

-- 1. Agregar columna gimnasio_id en desafios si no existe
ALTER TABLE public.desafios ADD COLUMN IF NOT EXISTS gimnasio_id UUID REFERENCES public.gimnasios(id);

-- 2. Poblar retroactivamente la columna gimnasio_id
DO $$
DECLARE
    default_gym_id UUID;
BEGIN
    -- Buscar gimnasio por defecto
    SELECT id INTO default_gym_id FROM public.gimnasios WHERE slug = 'sede-central' LIMIT 1;
    IF default_gym_id IS NULL THEN
        SELECT id INTO default_gym_id FROM public.gimnasios LIMIT 1;
    END IF;

    -- Actualizar desafios según el creador (creado_por o creator_id)
    UPDATE public.desafios d
    SET gimnasio_id = p.gimnasio_id
    FROM public.perfiles p
    WHERE d.creado_por = p.id AND d.gimnasio_id IS NULL;

    -- Fallback si no tienen gimnasio o creador
    IF default_gym_id IS NOT NULL THEN
        UPDATE public.desafios SET gimnasio_id = default_gym_id WHERE gimnasio_id IS NULL;
    END IF;
END $$;

-- 3. Establecer constraint NOT NULL tras poblar los datos
ALTER TABLE public.desafios ALTER COLUMN gimnasio_id SET NOT NULL;

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.desafios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes_desafio ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas antiguas (español e inglés) para evitar conflictos
DROP POLICY IF EXISTS "desafios_publicos" ON public.desafios;
DROP POLICY IF EXISTS "desafios_crear" ON public.desafios;
DROP POLICY IF EXISTS "desafios_modificar" ON public.desafios;
DROP POLICY IF EXISTS "Permitir lectura de desafíos públicos" ON public.desafios;
DROP POLICY IF EXISTS "Permitir creación de desafíos" ON public.desafios;
DROP POLICY IF EXISTS "Permitir modificación de desafíos" ON public.desafios;

DROP POLICY IF EXISTS "Ver propios desafíos inscritos" ON public.participantes_desafio;
DROP POLICY IF EXISTS "Inscribirse en desafíos" ON public.participantes_desafio;
DROP POLICY IF EXISTS "Actualizar puntuacion participante" ON public.participantes_desafio;
DROP POLICY IF EXISTS "Multi-tenant: Acceso a participantes" ON public.participantes_desafio;

-- 6. Crear nuevas políticas RLS Multi-tenant
-- DESAFIOS
-- SELECT: Usuarios, entrenadores y administradores ven los desafíos de su propio gimnasio
CREATE POLICY "Multi-tenant: Select desafios" ON public.desafios
FOR SELECT USING (gimnasio_id = public.get_user_gym_id());

-- INSERT/UPDATE/DELETE: Solo administradores o coaches del gimnasio
CREATE POLICY "Multi-tenant: Insert/Update/Delete desafios" ON public.desafios
FOR ALL USING (
    gimnasio_id = public.get_user_gym_id()
    AND public.get_user_role() IN ('coach', 'admin', 'superadmin')
);

-- PARTICIPANTES_DESAFIO
-- SELECT: Alumnos ven sus propios registros. Admins y coaches ven los del gimnasio.
CREATE POLICY "Multi-tenant: Select participantes_desafio" ON public.participantes_desafio
FOR SELECT USING (
    usuario_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.desafios d
        WHERE d.id = participantes_desafio.desafio_id
          AND d.gimnasio_id = public.get_user_gym_id()
          AND public.get_user_role() IN ('coach', 'admin', 'superadmin')
    )
);

-- ALL (Insert/Update/Delete): Alumnos se inscriben en desafíos de su gimnasio. Admins/coaches arbitran.
CREATE POLICY "Multi-tenant: All participantes_desafio" ON public.participantes_desafio
FOR ALL USING (
    (
        usuario_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.desafios d
            WHERE d.id = participantes_desafio.desafio_id
              AND d.gimnasio_id = public.get_user_gym_id()
        )
    )
    OR EXISTS (
        SELECT 1 FROM public.desafios d
        WHERE d.id = participantes_desafio.desafio_id
          AND d.gimnasio_id = public.get_user_gym_id()
          AND public.get_user_role() IN ('coach', 'admin', 'superadmin')
    )
);

-- 7. Crear índices para optimizar búsquedas multi-tenant en desafíos
CREATE INDEX IF NOT EXISTS desafios_gimnasio_id_idx ON public.desafios(gimnasio_id);
CREATE INDEX IF NOT EXISTS participantes_desafio_desafio_id_idx ON public.participantes_desafio(desafio_id);

COMMIT;
