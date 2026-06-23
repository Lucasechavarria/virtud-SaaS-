import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/gyms/backup
 * Consolida toda la información de un gimnasio y sus registros asociados
 * para ofrecer una descarga de backup y mostrar las estadísticas antes del borrado.
 * Solo Superadmin.
 */
export async function GET(request: Request) {
    try {
        // Solo superadmin puede generar backups y ver estadísticas
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const gymId = searchParams.get('gymId');

        if (!gymId) {
            return NextResponse.json({ error: 'Falta el ID del gimnasio (gymId)' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Obtener el gimnasio y validar que exista
        const { data: gym, error: gymError } = await adminClient
            .from('gimnasios')
            .select('*')
            .eq('id', gymId)
            .single();

        if (gymError || !gym) {
            return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
        }

        // Consultar de forma paralela todas las entidades asociadas al gimnasio
        const [
            sucursalesRes,
            perfilesRes,
            actividadesRes,
            pagosRes
        ] = await Promise.all([
            adminClient.from('sucursales').select('*').eq('gimnasio_id', gymId),
            adminClient.from('perfiles').select('id, correo, nombre_completo, nombre, apellido, DNI, telefono, rol, estado_membresia, creado_en').eq('gimnasio_id', gymId),
            adminClient.from('actividades').select('*').eq('gimnasio_id', gymId),
            adminClient.from('pagos').select('*').eq('gimnasio_id', gymId)
        ]);

        if (sucursalesRes.error) throw sucursalesRes.error;
        if (perfilesRes.error) throw perfilesRes.error;
        if (actividadesRes.error) throw actividadesRes.error;
        if (pagosRes.error) throw pagosRes.error;

        const sucursales = sucursalesRes.data || [];
        const perfiles = perfilesRes.data || [];
        const actividades = actividadesRes.data || [];
        const pagos = pagosRes.data || [];

        // Generar un resumen estadístico del impacto
        const summary = {
            id: gym.id,
            nombre: gym.nombre,
            slug: gym.slug,
            sociosCount: perfiles.filter(p => p.rol === 'member').length,
            coachesCount: perfiles.filter(p => p.rol === 'coach').length,
            adminsCount: perfiles.filter(p => p.rol === 'admin').length,
            sucursalesCount: sucursales.length,
            actividadesCount: actividades.length,
            pagosCount: pagos.length,
            fechaGeneracion: new Date().toISOString()
        };

        // Estructurar el backup completo
        return NextResponse.json({
            success: true,
            summary,
            data: {
                gimnasio: gym,
                sucursales,
                perfiles,
                actividades,
                pagos
            }
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error generating gym backup:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
