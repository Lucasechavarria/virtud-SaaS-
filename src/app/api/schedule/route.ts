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

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const gymId = searchParams.get('gymId');
        const tenantSlug = searchParams.get('tenantSlug');

        if (!gymId && !tenantSlug) {
            return NextResponse.json({ error: 'Falta especificar el gimnasio (gymId o tenantSlug requerido)' }, { status: 400 });
        }

        const supabase = await createClient();
        let targetGymId: string | null = null;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (gymId) {
            if (!uuidRegex.test(gymId)) {
                return NextResponse.json({ error: 'ID de gimnasio inválido' }, { status: 400 });
            }
            targetGymId = gymId;
        } else if (tenantSlug) {
            const { data: gym } = await supabase
                .from('gimnasios')
                .select('id')
                .eq('slug', tenantSlug)
                .single();
            if (!gym) {
                return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
            }
            targetGymId = gym.id;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado o no encontrado' }, { status: 400 });
        }

        // Aislamiento de clave de caché L1 en Redis (estructurado con prefijo de gym)
        const cacheKey = `virtud:schedule:gym:${targetGymId}`;

        // 1. Intentar servir del Caché L1 (Redis Ultra-rápido ~10ms)
        if (redis) {
            const cachedSchedule = await redis.get(cacheKey);
            if (cachedSchedule) {
                return NextResponse.json(cachedSchedule);
            }
        }

        // 2. Fallback a L2 (Supabase con aislamiento multi-tenant)
        const { data: schedule, error } = await (supabase.from('horarios_de_clase') as any)
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
                  email:correo,
                  rol
                )
            `)
            .eq('esta_activa', true)
            .eq('gimnasio_id', targetGymId) // Aislamiento multi-tenant
            .order('dia_de_la_semana', { ascending: true })
            .order('hora_inicio', { ascending: true });

        if (error) {
            console.error('Error fetching schedule:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Guardar en Caché L1 con TTL de 10 min
        if (redis && schedule) {
            await redis.setex(cacheKey, 600, schedule);
        }

        return NextResponse.json(schedule);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
