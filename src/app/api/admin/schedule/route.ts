import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * Valida si el usuario actual tiene permisos de administración o delegación sobre las clases.
 */
async function checkSchedulePermission(profile: any, user: any, supabase: any): Promise<{ hasPermission: boolean; errorResponse?: NextResponse }> {
    if (profile?.role === 'admin' || profile?.role === 'superadmin') {
        return { hasPermission: true };
    }

    // Consultar permisos específicos de base de datos para roles operativos
    const { data: dbProfile } = await supabase
        .from('perfiles')
        .select('permisos')
        .eq('id', user.id)
        .single();
    
    const permisos = dbProfile?.permisos as any;
    if (permisos?.gestionar_clases === true) {
        return { hasPermission: true };
    }

    return {
        hasPermission: false,
        errorResponse: NextResponse.json(
            { error: 'Forbidden: No tienes permisos para gestionar el cronograma de clases' },
            { status: 403 }
        )
    };
}

export async function POST(request: Request) {
    try {
        const { error: authError, profile, user, supabase } = await authenticateAndRequireRole(
            request, 
            ['admin', 'superadmin', 'recepcion', 'coach']
        );
        if (authError || !supabase || !user) return authError || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Blindaje contra gimnasio_id NULL para personal no-superadmin
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        // Validar permisos delegados (gestionar_clases)
        const permissionCheck = await checkSchedulePermission(profile, user, supabase);
        if (!permissionCheck.hasPermission) return permissionCheck.errorResponse!;

        const body = await request.json();

        // Resolver gimnasio y forzar aislamiento
        let targetGymId = profile?.gimnasio_id;
        if (profile?.role === 'superadmin' && body.gimnasio_id) {
            const rawGymId: string = body.gimnasio_id;
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawGymId);
            const { createAdminClient } = await import('@/lib/supabase/admin');
            const adminClient = createAdminClient();
            if (isUUID) {
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('id', rawGymId)
                    .is('deleted_at', null)
                    .single();
                targetGymId = gym ? gym.id : null;
            } else {
                // Resolver slug a UUID
                const { data: gym } = await adminClient
                    .from('gimnasios')
                    .select('id')
                    .eq('slug', rawGymId)
                    .is('deleted_at', null)
                    .single();
                targetGymId = gym ? gym.id : null;
            }
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('horarios_de_clase')
            .insert({
                ...body,
                gimnasio_id: targetGymId
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('❌ Error creating class:', error);
        return NextResponse.json({ error: error.message || 'Error creating class' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { error: authError, profile, user, supabase } = await authenticateAndRequireRole(
            request, 
            ['admin', 'superadmin', 'recepcion', 'coach']
        );
        if (authError || !supabase || !user) return authError || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Blindaje contra gimnasio_id NULL para personal no-superadmin
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        // Validar permisos delegados (gestionar_clases)
        const permissionCheck = await checkSchedulePermission(profile, user, supabase);
        if (!permissionCheck.hasPermission) return permissionCheck.errorResponse!;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Verificar propiedad antes de actualizar (Multi-tenant BOLA Shield)
        const { data: existingClass, error: findError } = await supabase
            .from('horarios_de_clase')
            .select('gimnasio_id')
            .eq('id', id)
            .single();

        if (findError || !existingClass) {
            return NextResponse.json({ error: 'Clase no encontrada o sin acceso' }, { status: 404 });
        }

        if (profile?.role !== 'superadmin' && existingClass.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: No tienes acceso a este recurso' }, { status: 403 });
        }

        const body = await request.json();
        
        // Bloquear inyección maliciosa de gimnasio_id en la actualización
        delete body.gimnasio_id;

        const { data, error } = await supabase
            .from('horarios_de_clase')
            .update(body)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('❌ Error updating class:', error);
        return NextResponse.json({ error: error.message || 'Error updating class' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { error: authError, profile, user, supabase } = await authenticateAndRequireRole(
            request, 
            ['admin', 'superadmin', 'recepcion', 'coach']
        );
        if (authError || !supabase || !user) return authError || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Blindaje contra gimnasio_id NULL para personal no-superadmin
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        // Validar permisos delegados (gestionar_clases)
        const permissionCheck = await checkSchedulePermission(profile, user, supabase);
        if (!permissionCheck.hasPermission) return permissionCheck.errorResponse!;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Verificar propiedad antes de eliminar (Multi-tenant BOLA Shield)
        const { data: existingClass, error: findError } = await supabase
            .from('horarios_de_clase')
            .select('gimnasio_id')
            .eq('id', id)
            .single();

        if (findError || !existingClass) {
            return NextResponse.json({ error: 'Clase no encontrada o sin acceso' }, { status: 404 });
        }

        if (profile?.role !== 'superadmin' && existingClass.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: No tienes acceso a este recurso' }, { status: 403 });
        }

        const { error } = await supabase
            .from('horarios_de_clase')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ Error deleting class:', error);
        return NextResponse.json({ error: error.message || 'Error deleting class' }, { status: 500 });
    }
}
