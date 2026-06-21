import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/admin/reports/tickets - List all tickets (BOLA Shield & Impersonation Support)
export async function GET(req: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(req, ['admin', 'superadmin']);
        if (authError) return authError;

        const { searchParams } = new URL(req.url);
        const urlGym = searchParams.get('gymId');
        let targetGymId = profile?.gimnasio_id;

        const adminClient = createAdminClient();

        // Impersonación de Superadmin
        if (profile?.role === 'superadmin' && urlGym) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(urlGym);
            if (isUUID) {
                targetGymId = urlGym;
            } else {
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', urlGym)
                    .single();
                if (gym) targetGymId = gym.id;
            }
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Forbidden: Gimnasio no especificado o no asignado' }, { status: 403 });
        }

        // Consultar los reportes vinculando con perfiles para obtener el gimnasio del alumno
        const { data, error } = await adminClient
            .from('reportes_de_alumnos')
            .select(`
                *,
                perfiles:usuario_id!inner (
                    nombre_completo,
                    correo,
                    gimnasio_id
                )
            `)
            .eq('perfiles.gimnasio_id', targetGymId)
            .order('creado_en', { ascending: false });

        if (error) {
            console.error('Database Error in GET reports/tickets:', error);
            throw error;
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Tickets API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/admin/reports/tickets - Update ticket status/response (BOLA Shield)
export async function PATCH(req: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(req, ['admin', 'superadmin']);
        if (authError) return authError;

        const body = await req.json();
        const { id, estado, admin_response } = body;

        if (!id || !estado) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 1. Obtener el reporte existente y el gimnasio del alumno para control BOLA
        const { data: existingReport, error: findError } = await adminClient
            .from('reportes_de_alumnos')
            .select(`
                id,
                perfiles:usuario_id!inner (
                    gimnasio_id
                )
            `)
            .eq('id', id)
            .single();

        if (findError || !existingReport) {
            return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
        }

        const reportGymId = (existingReport.perfiles as any)?.gimnasio_id;

        // Validar BOLA si no es superadmin
        if (profile?.role !== 'superadmin') {
            const targetGymId = profile?.gimnasio_id;
            if (!targetGymId || reportGymId !== targetGymId) {
                return NextResponse.json({ error: 'Forbidden: No tienes acceso a este reporte' }, { status: 403 });
            }
        }

        // 2. Realizar actualización segura
        const { data, error } = await adminClient
            .from('reportes_de_alumnos')
            .update({
                estado,
                admin_response,
                actualizado_en: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update Error in PATCH reports/tickets:', error);
            throw error;
        }

        return NextResponse.json({ success: true, ticket: data });

    } catch (error) {
        console.error('Tickets API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
