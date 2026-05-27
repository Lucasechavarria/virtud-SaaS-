-- =========================================================================
-- 🛡️ MIGRACIÓN DE CORRECCIÓN: RESTAURAR PRIVILEGIOS DE EJECUCIÓN SEGUROS
-- Fecha: 27 de Mayo de 2026
-- Objetivo: Conceder de forma segura privilegios de ejecución (EXECUTE) a
--           los roles 'authenticated' y 'anon' para funciones requeridas en
--           la evaluación de RLS y operaciones de cliente legítimas. Resuelve
--           el error de base de datos ("Database error querying schema") en 
--           Cypress y flujo de autenticación al iniciar sesión.
-- =========================================================================

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

        -- 1. Si no es trigger y no es administrativa, conceder EXECUTE al rol 'authenticated'
        -- Permite que los usuarios logueados legítimos invoquen los RPCs de negocio y RLS correspondientes
        IF NOT is_trigger AND NOT is_admin_system THEN
            sql_cmd := format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', 
                              r.schema_name, 
                              r.function_name, 
                              r.arguments);
            BEGIN
                EXECUTE sql_cmd;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'No se pudo conceder EXECUTE a authenticated en %: %', r.function_name, SQLERRM;
            END;
        END IF;

        -- 2. Conceder EXECUTE también al rol 'anon' para funciones auxiliares de RLS
        -- Crucial: Impide fallos de permisos y crashes de base de datos ("Database error querying schema")
        -- durante la evaluación de políticas RLS en sesiones de visitantes o flujos de login.
        IF r.function_name IN ('get_user_gym_id', 'get_user_role') THEN
            sql_cmd := format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO anon', 
                              r.schema_name, 
                              r.function_name, 
                              r.arguments);
            BEGIN
                EXECUTE sql_cmd;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'No se pudo conceder EXECUTE a anon en %: %', r.function_name, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;
