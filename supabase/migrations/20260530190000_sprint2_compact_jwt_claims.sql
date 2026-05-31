-- =========================================================================
-- 🛡️ MIGRACIÓN SPRINT 6: CLAIMS COMPACTOS Y PREVENCIÓN DE DESBORDAMIENTO JWT
-- Fecha: 30 de Mayo de 2026
-- Objetivo: Compactar la lista de módulos activos a un bitmask entero (integer)
--           dentro del JWT de Supabase Auth, previniendo errores HTTP 431.
-- =========================================================================

-- 1. FUNCIÓN DE CÁLCULO DE BITMASK DE MÓDULOS ACTIVOS
CREATE OR REPLACE FUNCTION public.calculate_modules_bitmask(modules_json jsonb)
RETURNS integer AS $$
DECLARE
  v_bitmask integer := 0;
  v_module text;
  v_key text;
  v_val jsonb;
BEGIN
  IF modules_json IS NULL THEN
    RETURN 0;
  END IF;

  -- CASO A: El JSONB es una lista de strings (Array), ej: ["Pos", "Finanzas"]
  IF jsonb_typeof(modules_json) = 'array' THEN
    FOR v_module IN SELECT jsonb_array_elements_text(modules_json) LOOP
      CASE LOWER(v_module)
        WHEN 'pos' THEN v_bitmask := v_bitmask | 1;
        WHEN 'finanzas' THEN v_bitmask := v_bitmask | 2;
        WHEN 'crm' THEN v_bitmask := v_bitmask | 4;
        WHEN 'nutricion' THEN v_bitmask := v_bitmask | 8;
        WHEN 'clases' THEN v_bitmask := v_bitmask | 16;
        WHEN 'visionlab' THEN v_bitmask := v_bitmask | 32;
        ELSE NULL;
      END CASE;
    END LOOP;

  -- CASO B: El JSONB es un objeto booleano, ej: {"Pos": true, "Finanzas": true}
  ELSIF jsonb_typeof(modules_json) = 'object' THEN
    FOR v_key, v_val IN SELECT * FROM jsonb_each(modules_json) LOOP
      IF v_val::text = 'true' THEN
        CASE LOWER(v_key)
          WHEN 'pos' THEN v_bitmask := v_bitmask | 1;
          WHEN 'finanzas' THEN v_bitmask := v_bitmask | 2;
          WHEN 'crm' THEN v_bitmask := v_bitmask | 4;
          WHEN 'nutricion' THEN v_bitmask := v_bitmask | 8;
          WHEN 'clases' THEN v_bitmask := v_bitmask | 16;
          WHEN 'visionlab' THEN v_bitmask := v_bitmask | 32;
          ELSE NULL;
        END CASE;
      END IF;
    END LOOP;
  END IF;

  RETURN v_bitmask;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_modules_bitmask(jsonb) IS 'Convierte un JSONB híbrido (objeto o array) de módulos activos de un gimnasio en un entero bitmask compacto.';


-- 2. ACTUALIZAR FUNCIÓN DE TRIGGER PARA PERFILES
CREATE OR REPLACE FUNCTION public.sync_user_role_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_gym_slug TEXT;
  v_gym_modules_json JSONB;
  v_modules_bitmask INTEGER;
BEGIN
  -- 2.1 Obtener los detalles del gimnasio asociado y calcular su bitmask
  IF NEW.gimnasio_id IS NOT NULL THEN
    SELECT slug, COALESCE(modulos_activos, '[]'::jsonb) 
    INTO v_gym_slug, v_gym_modules_json
    FROM public.gimnasios 
    WHERE id = NEW.gimnasio_id;
    
    v_modules_bitmask := public.calculate_modules_bitmask(v_gym_modules_json);
  ELSE
    v_gym_slug := NULL;
    v_modules_bitmask := 0;
  END IF;

  -- 2.2 Actualizar los claims en auth.users (inyectando el entero compacto)
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'rol', NEW.rol::text,
      'role', NEW.rol::text,
      'gimnasio_id', COALESCE(NEW.gimnasio_id::text, ''),
      'gimnasio_slug', COALESCE(v_gym_slug, ''),
      'modulos_activos', v_modules_bitmask
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. ACTUALIZAR FUNCIÓN DE TRIGGER PARA CAMBIOS EN GIMNASIOS
CREATE OR REPLACE FUNCTION public.sync_gym_modules_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_modules_bitmask INTEGER;
BEGIN
  v_modules_bitmask := public.calculate_modules_bitmask(NEW.modulos_activos);

  -- Actualizar la metadata de todos los usuarios vinculados a este gimnasio
  UPDATE auth.users u
  SET raw_app_meta_data = 
    COALESCE(u.raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'gimnasio_slug', NEW.slug::text,
      'modulos_activos', v_modules_bitmask
    )
  FROM public.perfiles p
  WHERE u.id = p.id AND p.gimnasio_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. EJECUTAR SINCRONIZACIÓN INICIAL PARA USUARIOS EXISTENTES
DO $$
DECLARE
  u RECORD;
  v_gym_slug TEXT;
  v_gym_modules_json JSONB;
  v_modules_bitmask INTEGER;
BEGIN
  FOR u IN SELECT id, rol, gimnasio_id FROM public.perfiles LOOP
    -- Obtener datos del gimnasio y calcular bitmask
    IF u.gimnasio_id IS NOT NULL THEN
      SELECT slug, COALESCE(modulos_activos, '[]'::jsonb) 
      INTO v_gym_slug, v_gym_modules_json
      FROM public.gimnasios 
      WHERE id = u.gimnasio_id;
      
      v_modules_bitmask := public.calculate_modules_bitmask(v_gym_modules_json);
    ELSE
      v_gym_slug := NULL;
      v_modules_bitmask := 0;
    END IF;

    -- Inyectar claims compactos
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'rol', u.rol::text,
        'role', u.rol::text,
        'gimnasio_id', COALESCE(u.gimnasio_id::text, ''),
        'gimnasio_slug', COALESCE(v_gym_slug, ''),
        'modulos_activos', v_modules_bitmask
      )
    WHERE id = u.id;
  END LOOP;
END $$;
