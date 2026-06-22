-- MIGRACIÓN: 20260617040000_sprint13_remediate_security_rpc.sql
-- Revoca privilegios públicos para ejecutar funciones administrativas críticas y restringe su acceso a service_role.

-- 1. Asegurar la RPC solicitar_prorroga_pago
-- Revocar ejecución directa a roles públicos
REVOKE EXECUTE ON FUNCTION public.solicitar_prorroga_pago(UUID, UUID) FROM PUBLIC, anon, authenticated;
-- Conceder ejecución únicamente a service_role
GRANT EXECUTE ON FUNCTION public.solicitar_prorroga_pago(UUID, UUID) TO service_role;

-- 2. Asegurar la RPC calcular_churn_riesgo
-- Revocar ejecución directa a roles públicos
REVOKE EXECUTE ON FUNCTION public.calcular_churn_riesgo(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
-- Conceder ejecución únicamente a service_role
GRANT EXECUTE ON FUNCTION public.calcular_churn_riesgo(UUID, INT, INT) TO service_role;
