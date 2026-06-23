-- Agregar columna deleted_at para soft-delete en gimnasios
ALTER TABLE public.gimnasios ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_gimnasios_deleted_at ON public.gimnasios (deleted_at);
