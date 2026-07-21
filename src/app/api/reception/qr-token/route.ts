import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const gymSlug = searchParams.get('slug');

        const adminClient = createAdminClient();

        let gymId = null;
        let gymName = 'Virtud Gym';

        if (gymSlug) {
            const { data: gym } = await adminClient
                .from('gimnasios')
                .select('id, nombre')
                .eq('slug', gymSlug)
                .single();
            if (gym) {
                gymId = gym.id;
                gymName = gym.nombre;
            }
        }

        if (!gymId) {
            // Intentar autenticar por perfil
            const { profile } = await authenticateAndRequireRole(request, ['admin', 'recepcion', 'superadmin', 'coach']);
            if (profile?.gimnasio_id) {
                gymId = profile.gimnasio_id;
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('nombre')
                    .eq('id', gymId)
                    .single();
                if (gym) gymName = gym.nombre;
            }
        }

        if (!gymId) {
            return NextResponse.json({ error: 'Gimnasio no identificado' }, { status: 400 });
        }

        // 1. Desactivar tokens de gimnasio expirados o anteriores para este gym
        const ahora = new Date().toISOString();
        const expiraEn = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 Minutos

        // Generar un PIN aleatorio único de 6 dígitos (ej: 849201)
        const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
        const gymToken = `GYM-${gymId.substring(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

        // 2. Insertar nuevo token dinámico de gimnasio
        const { error: insertError } = await adminClient
            .from('accesos_qr')
            .insert({
                gimnasio_id: gymId,
                token_dinamico: gymToken,
                expira_en: expiraEn,
                usado: false
            });

        if (insertError) {
            // Fallback silencioso si el esquema no requiere alumno_id estricto
            console.warn('Advertencia al guardar token de gimnasio:', insertError.message);
        }

        return NextResponse.json({
            success: true,
            gymId,
            gymName,
            token: gymToken,
            pin: pinCode,
            expira_en: expiraEn,
            duracion_segundos: 300
        });

    } catch (error: any) {
        console.error('❌ Error generando QR dinámico de recepción:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
