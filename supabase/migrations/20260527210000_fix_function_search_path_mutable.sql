-- =========================================================================
-- 🛡️ MIGRACIÓN DE SEGURIDAD DEVSECOPS: RESOLVER WARNINGS DE SEARCH_PATH MUTABLE
-- Fecha: 27 de Mayo de 2026
-- Objetivo: Configurar de forma segura la variable 'search_path' en todas las
--           funciones del esquema 'public' para prevenir ataques de secuestro de
--           ruta de búsqueda (Search Path Hijacking) y resolver el warning 
--           'function_search_path_mutable' de la auditoría de seguridad de Supabase.
-- =========================================================================

DO $$
DECLARE
    r RECORD;
    sql_cmd TEXT;
BEGIN
    -- Iterar sobre todas las funciones creadas en el esquema public
    FOR r IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS arguments
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind = 'f' -- 'f' para funciones estándar y de trigger
    LOOP
        -- Construir el comando ALTER FUNCTION para definir la search_path segura
        -- Se define como 'public, pg_temp' para garantizar el aislamiento y evitar la inyección
        sql_cmd := format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', 
                          r.schema_name, 
                          r.function_name, 
                          r.arguments);
        BEGIN
            EXECUTE sql_cmd;
        EXCEPTION WHEN OTHERS THEN
            -- Registrar advertencia en caso de que alguna función del sistema no se pueda alterar
            RAISE NOTICE 'No se pudo alterar la función %: %', r.function_name, SQLERRM;
        END;
    END LOOP;
END $$;
