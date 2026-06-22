-- Migración para el Sprint 6 (Parte 1): Agregar valores al tipo ENUM estado_pago
-- NOTA: Postgres requiere que los nuevos valores de ENUM estén commiteados antes de poder usarse en operaciones de actualización
-- en la misma transacción. Por ello, esta migración se divide en dos partes.

ALTER TYPE public.estado_pago ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.estado_pago ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.estado_pago ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.estado_pago ADD VALUE IF NOT EXISTS 'refunded';
