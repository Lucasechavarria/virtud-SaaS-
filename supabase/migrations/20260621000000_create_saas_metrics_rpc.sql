-- =========================================================================
-- 📊 MIGRACIÓN: CREAR RPC PARA ACTUALIZACIÓN ATÓMICA DE MÉTRICAS SAAS
-- Fecha: 21 de Junio de 2026
-- Objetivo: Definir la función RPC 'update_saas_metrics_on_payment' de forma
--           segura en la base de datos para registrar ingresos de forma aditiva,
--           previniendo colisiones destructivas en concurrencia y habilitando
--           aislamiento de search_path para cumplir con estándares de seguridad.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.update_saas_metrics_on_payment(
    p_amount NUMERIC,
    p_fecha DATE,
    p_is_subscription BOOLEAN DEFAULT TRUE
)
RETURNS VOID 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_mrr_increment NUMERIC;
BEGIN
    -- MRR solo aplica a suscripciones estables, no a recargas de créditos
    IF p_is_subscription THEN
        v_mrr_increment := p_amount;
    ELSE
        v_mrr_increment := 0;
    END IF;

    INSERT INTO public.saas_metrics (fecha, ingresos_totales_mes, mrr)
    VALUES (p_fecha, p_amount, v_mrr_increment)
    ON CONFLICT (fecha) DO UPDATE
    SET ingresos_totales_mes = saas_metrics.ingresos_totales_mes + EXCLUDED.ingresos_totales_mes,
        mrr = saas_metrics.mrr + v_mrr_increment;
END;
$$ LANGUAGE plpgsql;
