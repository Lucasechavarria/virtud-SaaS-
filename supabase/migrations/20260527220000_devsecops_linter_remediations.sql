-- =========================================================================
-- 🛡️ MIGRACIÓN DE SEGURIDAD DEVSECOPS: REMEDIACIONES DEL LINTER DE SUPABASE
-- Fecha: 27 de Mayo de 2026
-- Objetivo: Resolver vulnerabilidades críticas del linter de base de datos:
--           1. Mover extensiones del esquema 'public' al esquema 'extensions'.
--           2. Blindar políticas RLS demasiado permisivas (WITH CHECK ALWAYS TRUE).
--           3. Revocar privilegios de ejecución no controlados en funciones 
--              SECURITY DEFINER (previniendo ejecuciones maliciosas RPC).
-- =========================================================================

-- 1. DESPLAZAR EXTENSIONES DE SEGURIDAD FUERA DEL ESQUEMA PÚBLICO
-- Evita exponer funciones y operadores internos de las extensiones a la API de PostgREST.
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
    -- Mover btree_gist
    BEGIN
        ALTER EXTENSION btree_gist SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover la extensión btree_gist: %', SQLERRM;
    END;

    -- Mover pg_trgm
    BEGIN
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover la extensión pg_trgm: %', SQLERRM;
    END;

    -- Mover vector (usada para embeddings de IA)
    BEGIN
        ALTER EXTENSION vector SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover la extensión vector: %', SQLERRM;
    END;
END $$;


-- 2. BLINDAJE DE POLÍTICAS DE RLS PERMISIVAS (INSERT ALWAYS TRUE)
-- Para audit_logs: eliminamos la política de inserción pública ya que no se requiere
-- (las inserciones se realizan vía triggers SECURITY DEFINER o service_role, los cuales evaden RLS).
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

-- Para historial_engagement: restringimos para que el alumno solo inserte sus propios registros.
DROP POLICY IF EXISTS "Sistema puede insertar eventos" ON public.historial_engagement;
CREATE POLICY "Sistema puede insertar eventos" ON public.historial_engagement
FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- Para historial_notificaciones: eliminamos la inserción libre, solo permitida para el sistema y backend.
DROP POLICY IF EXISTS "Sistema puede insertar notificaciones" ON public.historial_notificaciones;


-- 3. REVOCACIÓN DINÁMICA DE PERMISOS DE EJECUCIÓN (BOLA & PRIVACIDAD RPC)
DO $$
DECLARE
    r RECORD;
    sql_cmd TEXT;
    is_trigger BOOLEAN;
    is_admin_system BOOLEAN;
BEGIN
    -- Iterar sobre todas las funciones en el esquema public
    FOR r IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS arguments,
            t.typname AS return_type
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_type t ON p.prorettype = t.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
    LOOP
        -- A. Revocar de forma absoluta para PUBLIC y anon en TODAS las funciones.
        -- Esto soluciona la advertencia 'anon_security_definer_function_executable' universalmente.
        sql_cmd := format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', 
                          r.schema_name, 
                          r.function_name, 
                          r.arguments);
        BEGIN
            EXECUTE sql_cmd;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo revocar privilegios públicos de %: %', r.function_name, SQLERRM;
        END;

        -- B. Evaluar si la función es un trigger o una función administrativa/del sistema
        is_trigger := (r.return_type = 'trigger');
        
        is_admin_system := r.function_name IN (
            'actualizar_pagos_vencidos',
            'aprobar_pago_con_reglas',
            'detectar_usuarios_inactivos',
            'notificar_pagos_proximos',
            'notificar_usuarios_inactivos',
            'get_videos_pendientes_analisis',
            'get_audit_history',
            'solicitar_prorroga_pago',
            'update_class_capacity',
            'update_saas_metrics_on_payment',
            'registrar_auditoria'
        );

        -- C. Si es trigger o administrativa, revocar privilegios del rol 'authenticated'
        -- Esto soluciona la advertencia 'authenticated_security_definer_function_executable'.
        IF is_trigger OR is_admin_system THEN
            sql_cmd := format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated', 
                              r.schema_name, 
                              r.function_name, 
                              r.arguments);
            BEGIN
                EXECUTE sql_cmd;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'No se pudo revocar privilegios autenticados de %: %', r.function_name, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;
