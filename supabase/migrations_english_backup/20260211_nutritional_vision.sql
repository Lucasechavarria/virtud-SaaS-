-- Create nutrition logs table for AI Vision Nutricional
create table if not exists public.registros_nutricion (
    id uuid default gen_random_uuid() primary key,
    usuario_id uuid references public.perfiles(id) on delete cascade not null,
    nombre_comida text not null,
    url_imagen text,
    calorias_estimadas integer,
    macros jsonb, -- {proteinas: number, carbohidratos: number, grasas: number}
    ingredientes_detectados text[],
    puntuacion_salud integer,
    recomendacion_tactica text,
    creado_en timestamp with time zone default timezone('utc'::text, now()) not null,
    actualizado_en timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.registros_nutricion enable row level security;

create policy "Users can view their own nutrition logs"
    on public.registros_nutricion for select
    using (auth.uid() = usuario_id);

create policy "Users can insert their own nutrition logs"
    on public.registros_nutricion for insert
    with check (auth.uid() = usuario_id);

create policy "Users can update their own nutrition logs"
    on public.registros_nutricion for update
    using (auth.uid() = usuario_id);
