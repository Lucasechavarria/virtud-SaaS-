-- MIGRACIÓN: AÑADIR COLUMNA TELEMETRIA A VIDEOS_EJERCICIO
-- Para soportar tracking de articulaciones en Next.js (MediaPipe Pose) y visualizacion por canvas.

ALTER TABLE public.videos_ejercicio ADD COLUMN IF NOT EXISTS telemetria JSONB DEFAULT '[]'::jsonb;
