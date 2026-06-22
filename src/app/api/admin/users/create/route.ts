import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkGymLimits } from '@/lib/saas/limits';

/**
 * POST /api/admin/users/create
 * Crea un nuevo alumno verificando los límites del plan SaaS
 */
export async function POST(request: Request) {
    try {
        const { supabase, error: authError, user, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const body = await request.json();
        const { email, password, fullName, rol = 'member', gymId: bodyGymId } = body;

        if (!email || !fullName) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // Prevenir escalada de privilegios a superadmin por parte de administradores locales
        if (profile?.role !== 'superadmin' && rol === 'superadmin') {
            return NextResponse.json({ error: 'Forbidden: No tienes permisos para crear un superadmin' }, { status: 403 });
        }

        // 1. Resolver el gimnasio
        let gymId = profile?.gimnasio_id;

        // Si es superadmin, permitir especificar gymId en el body
        if (profile?.role === 'superadmin' && bodyGymId) {
            gymId = bodyGymId;
        }

        if (!gymId) {
            return NextResponse.json({ error: 'Forbidden: No tienes un gimnasio asignado o no especificaste uno' }, { status: 403 });
        }

        const adminClient = createAdminClient();

        // 2. VERIFICAR LÍMITES (HARD ENFORCEMENT)
        const limits = await checkGymLimits(gymId);

        if (!limits.canAddUser) {
            return NextResponse.json({
                error: 'Límite de alumnos alcanzado',
                details: `Tu plan actual permite hasta ${limits.limitUsers} socios. Por favor, sube de nivel tu plan en Configuración > Facturación.`,
                reason: limits.reason
            }, { status: 403 });
        }

        // 3. Crear usuario en Auth
        const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password: password || Math.random().toString(36).slice(-8), // Generar pass si no hay
            email_confirm: true,
            user_metadata: { nombre_completo: fullName }
        });

        if (createError) throw createError;

        if (!authData.user) {
            throw new Error('No se pudo crear el usuario en la base de datos de autenticación');
        }

        // 4. Crear perfil vinculado al gimnasio
        const { error: profileError } = await adminClient
            .from('perfiles')
            .insert({
                id: authData.user.id,
                correo: email,
                nombre_completo: fullName,
                rol: rol,
                gimnasio_id: gymId
            });

        if (profileError) {
            await adminClient.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        return NextResponse.json({
            success: true,
            message: 'Usuario creado exitosamente',
            user: { id: authData.user.id, email, fullName }
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Create User Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
