import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * PUT /api/admin/users/[id]/assign-coach
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        // Blindaje contra gimnasio_id NULL para admin
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'Administrador sin gimnasio asignado'
            }, { status: 403 });
        }

        const { id: userId } = await params;
        const body = await request.json();
        const { coachId } = body;

        logger.info(`🚀 [ASSIGN] Unificando asignación: User=${userId}, Coach=${coachId}`);

        // Usamos el cliente administrativo para saltar RLS y problemas de caché
        const adminClient = createAdminClient();

        // 1. Validar que el alumno pertenezca al gimnasio del administrador (o a algún gimnasio si es superadmin)
        const { data: studentProfile, error: studentError } = await adminClient
            .from('perfiles')
            .select('gimnasio_id')
            .eq('id', userId)
            .single();

        if (studentError || !studentProfile) {
            return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
        }

        if (profile?.role !== 'superadmin' && studentProfile.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: El alumno no pertenece a tu gimnasio' }, { status: 403 });
        }

        // 2. Si se especifica un coachId, validar que pertenezca al mismo gimnasio
        if (coachId && coachId !== "null" && coachId !== "") {
            const { data: coachProfile, error: coachError } = await adminClient
                .from('perfiles')
                .select('gimnasio_id, rol')
                .eq('id', coachId)
                .single();

            if (coachError || !coachProfile) {
                return NextResponse.json({ error: 'Entrenador no encontrado' }, { status: 404 });
            }

            if (coachProfile.rol !== 'coach' && coachProfile.rol !== 'admin' && coachProfile.rol !== 'superadmin') {
                return NextResponse.json({ error: 'El usuario especificado no es un entrenador' }, { status: 400 });
            }

            // Si es admin local, el coach debe ser del mismo gimnasio que el admin
            if (profile?.role !== 'superadmin' && coachProfile.gimnasio_id !== profile?.gimnasio_id) {
                return NextResponse.json({ error: 'Forbidden: El entrenador no pertenece a tu gimnasio' }, { status: 403 });
            }

            // Si es superadmin, el coach debe pertenecer al mismo gimnasio que el alumno
            if (profile?.role === 'superadmin' && coachProfile.gimnasio_id !== studentProfile.gimnasio_id) {
                return NextResponse.json({ error: 'Forbidden: El entrenador y el alumno deben pertenecer al mismo gimnasio' }, { status: 400 });
            }
        }

        // PASO ATÓMICO: Primero eliminamos CUALQUIER relación previa de este alumno
        // Ahora usamos usuario_id (confirmado en la base de datos)
        const { error: deleteError } = await (adminClient
            .from('relacion_alumno_coach') as any)
            .delete()
            .eq('usuario_id', userId);

        if (deleteError) {
            logger.error('❌ [ASSIGN] Error en DELETE previo:', { error: deleteError });
            return NextResponse.json({
                error: 'Error limpiando relaciones previas',
                details: deleteError.message
            }, { status: 500 });
        }

        // PASO 2: Insertar la nueva relación si se especificó un coach
        let finalData = null;
        if (coachId && coachId !== "null" && coachId !== "") {
            const { data: insertData, error: insertError } = await (adminClient
                .from('relacion_alumno_coach') as any)
                .insert({
                    usuario_id: userId,
                    entrenador_id: coachId,
                    es_principal: true,
                    esta_activo: true,
                    asignado_en: new Date().toISOString()
                })
                .select();

            if (insertError) {
                logger.error('❌ [ASSIGN] Error en INSERT definitivo:', { error: insertError });
                return NextResponse.json({
                    error: 'Error al insertar la nueva relación',
                    details: insertError.message
                }, { status: 500 });
            }

            finalData = insertData;
            logger.info(`✅ [ASSIGN] Éxito Global. DB Insertó (Esquema Español Real):`, { insertData });
        } else {
            logger.info(`ℹ️ [ASSIGN] El alumno ${userId} ha quedado sin coach (Atomic Delete Only).`);
        }

        return NextResponse.json({
            success: true,
            message: coachId ? 'Coach asignado correctamente' : 'Coach desvinculado correctamente',
            debug: finalData
        });

    } catch (error) {
        logger.error('❌ [ASSIGN] Error crítico:', { error: error instanceof Error ? error.message : error });
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
}
