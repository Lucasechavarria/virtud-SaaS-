import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Inicialización condicional: Fallback a Base de Datos directa si no hay keys de Redis.
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

export async function GET() {
    try {
        const cacheKey = 'virtud:schedule:all';

        // 1. Intentar servir del Caché L1 (Redis Ultra-rápido ~10ms)
        if (redis) {
            const cachedSchedule = await redis.get(cacheKey);
            if (cachedSchedule) {
                return NextResponse.json(cachedSchedule);
            }
        }

        // 2. Fallback a L2 (Supabase Materialized View ~20ms-50ms)
        const supabase = await createClient();
        const { data: schedule, error } = await supabase
            .from('horarios_de_clase')
            .select(`
        id,
        dia_de_la_semana,
        hora_inicio,
        hora_fin,
        esta_activa,
        notas_entrenador,
        actividades (
          id,
          nombre,
          color,
          duracion_minutos
        ),
        perfiles (
          id,
          nombre_completo,
          email,
          rol
        )
      `)
            .eq('esta_activa', true)
            .order('dia_de_la_semana', { ascending: true })
            .order('hora_inicio', { ascending: true });

        if (error) {
            console.error('Error fetching schedule:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Guardar en Caché con Time-To-Live (Ej. 1 hora, la VM ya es asíncrona pero esto evita reads globales)
        if (redis && schedule) {
            // Expira a los 10 minutos (600s). Refresco pasivo.
            await redis.setex(cacheKey, 600, schedule);
        }

        return NextResponse.json(schedule);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
