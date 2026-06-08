UPDATE public.gimnasios 
SET modulos_activos = '{"finanzas": true, "clases": true, "pos": true, "crm": true, "nutricion": true, "visionlab": true}'::jsonb 
WHERE slug = 'virtud-gym';
