-- MIGRACIÓN: 20260617030000_sprint13_crm_churn_optimization.sql
-- Declara la función calcular_churn_riesgo en la base de datos para delegar el cálculo del churn desde Next.js de manera eficiente.

CREATE OR REPLACE FUNCTION public.calcular_churn_riesgo(
    p_gimnasio_id UUID, 
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE(
    usuario_id UUID, 
    nombre TEXT, 
    correo TEXT, 
    telefono TEXT,
    dias_ausente INT, 
    actividades_30d INT, 
    nivel_riesgo TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH ultimas_actividades AS (
        -- Asistencias a clase en los últimos 90 días
        SELECT 
            r.usuario_id,
            r.fecha AS fecha_actividad,
            CASE WHEN r.fecha >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END AS en_30d
        FROM public.reservas_de_clase r
        WHERE r.estado = 'asistida'
          AND r.fecha >= NOW() - INTERVAL '90 days'
        
        UNION ALL
        
        -- Sesiones de entrenamiento en los últimos 90 días
        SELECT 
            s.usuario_id,
            s.hora_inicio AS fecha_actividad,
            CASE WHEN s.hora_inicio >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END AS en_30d
        FROM public.sesiones_de_entrenamiento s
        WHERE s.hora_inicio >= NOW() - INTERVAL '90 days'
    ),
    actividad_agrupada AS (
        SELECT 
            ua.usuario_id,
            MAX(ua.fecha_actividad) AS max_fecha,
            SUM(ua.en_30d)::INT AS total_30d
        FROM ultimas_actividades ua
        GROUP BY ua.usuario_id
    )
    SELECT 
        p.id,
        p.nombre_completo::TEXT,
        p.correo::TEXT,
        p.telefono::TEXT,
        EXTRACT(DAY FROM NOW() - COALESCE(aa.max_fecha, p.creado_en))::INT AS dias_ausente,
        COALESCE(aa.total_30d, 0)::INT AS actividades_30d,
        CASE WHEN EXTRACT(DAY FROM NOW() - COALESCE(aa.max_fecha, p.creado_en)) >= 14
             THEN 'alto'::TEXT ELSE 'medio'::TEXT END AS nivel_riesgo
    FROM public.perfiles p
    LEFT JOIN actividad_agrupada aa ON aa.usuario_id = p.id
    WHERE p.gimnasio_id = p_gimnasio_id
      AND p.estado_membresia = 'active'
      AND p.rol NOT IN ('admin','superadmin','coach','recepcion')
      -- Solo alumnos ausentes por 7 o más días
      AND EXTRACT(DAY FROM NOW() - COALESCE(aa.max_fecha, p.creado_en)) >= 7
    ORDER BY dias_ausente DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
