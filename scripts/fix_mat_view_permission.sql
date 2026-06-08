-- Modificar la función de refresco para que corra como SECURITY DEFINER
CREATE OR REPLACE FUNCTION refresh_clases_mat_view_func()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY clases_con_disponibilidad;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
