-- Agregar columna fecha_salida para registrar cuándo el superadmin sale del acceso remoto (impersonación)
ALTER TABLE public.logs_acceso_remoto ADD COLUMN IF NOT EXISTS fecha_salida timestamp with time zone;
