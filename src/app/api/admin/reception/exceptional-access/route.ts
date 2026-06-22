import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reception/exceptional-access
 * Registra un ingreso manual excepcional (bypass) de un socio con justificación obligatoria.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion']);
        if (authError) return authError;

        const body = await request.json();
        const { socioId, motivo } = body;

        // Validar campos requeridos
        if (!socioId || !motivo) {
            return NextResponse.json({ error: 'Faltan campos obligatorios (socioId, motivo)' }, { status: 400 });
        }

        if (typeof motivo !== 'string' || motivo.trim().length < 6) {
            return NextResponse.json({ error: 'La justificación debe tener al menos 6 caracteres' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Obtener el perfil del socio para verificar pertenencia y gimnasio
        const { data: socioProfile, error: socioError } = await adminClient
            .from('perfiles')
            .select('gimnasio_id, nombre_completo, nombre, apellido, rol')
            .eq('id', socioId)
            .single();

        if (socioError || !socioProfile) {
            return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
        }

        // Blindaje multitenant: Si el recepcionista no es superadmin, debe compartir gimnasio con el socio
        if (profile?.role !== 'superadmin' && profile?.gimnasio_id !== socioProfile.gimnasio_id) {
            return NextResponse.json({ error: 'No tienes permiso para autorizar ingresos en este gimnasio' }, { status: 403 });
        }

        const targetGymId = socioProfile.gimnasio_id;
        if (!targetGymId) {
            return NextResponse.json({ error: 'El socio no tiene un gimnasio asignado' }, { status: 400 });
        }

        // 1. Insertar registro de asistencia excepcional
        const { error: asistenciaError } = await adminClient
            .from('asistencias')
            .insert({
                usuario_id: socioId,
                gimnasio_id: targetGymId,
                rol_asistencia: socioProfile.rol || 'member',
                source: 'reception_bypass',
                entrada: new Date().toISOString()
            });

        if (asistenciaError) {
            console.error('Error al insertar asistencia excepcional:', asistenciaError);
            return NextResponse.json({ error: 'Error al registrar la asistencia en la base de datos' }, { status: 500 });
        }

        // 2. Registrar evento inmutable en auditoria_global
        const recepcionistaNombre = profile?.nombre_completo || `${profile?.nombre || 'Recepcionista'} ${profile?.apellido || ''}`.trim();
        const socioNombre = socioProfile.nombre_completo || `${socioProfile.nombre || 'Socio'} ${socioProfile.apellido || ''}`.trim();

        const { error: auditError } = await adminClient
            .from('auditoria_global' as any)
            .insert({
                accion: 'bypass_acceso_repcion',
                entidad_tipo: 'perfil',
                entidad_id: socioId,
                usuario_id: user!.id,
                gimnasio_id: targetGymId,
                detalles: {
                    motivo: motivo.trim(),
                    bypass: true,
                    autorizado_por: recepcionistaNombre,
                    socio_nombre: socioNombre
                }
            });

        if (auditError) {
            console.error('Error al registrar auditoría de ingreso excepcional:', auditError);
            // No bloqueamos la respuesta exitosa de asistencia porque el ingreso ya se efectuó físicamente, 
            // pero lo dejamos plasmado en la salida del log del servidor.
        }

        return NextResponse.json({
            success: true,
            message: 'Ingreso excepcional autorizado y registrado correctamente'
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in POST exceptional-access:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
