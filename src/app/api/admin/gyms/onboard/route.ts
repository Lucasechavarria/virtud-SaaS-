import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    const { user: requester, error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
    if (authError) return authError;

    const adminSupabase = createAdminClient();

    try {
        const body = await request.json();
        const { nombre, slug, plan_id, modulos, admin_nombre, admin_email, admin_password, configuracion } = body;

        // 1. Validar slug único
        const { data: existingGym } = await adminSupabase
            .from('gimnasios')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existingGym) {
            return NextResponse.json({ error: 'El slug ya está en uso por otro gimnasio' }, { status: 400 });
        }

        // 2. Crear el Gimnasio
        const { data: gym, error: gymError } = await adminSupabase
            .from('gimnasios')
            .insert({
                nombre,
                slug,
                plan_id,
                modulos_activos: modulos,
                estado_pago_saas: 'active', // O inicializar como trial
                configuracion: configuracion || {}
            })
            .select()
            .single();

        if (gymError) throw gymError;

        // 3. Crear el Usuario Administrador en Auth
        const { data: authUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
            email: admin_email,
            password: admin_password,
            email_confirm: true,
            user_metadata: {
                nombre_completo: admin_nombre,
                rol: 'admin'
            },
            app_metadata: {
                rol: 'admin',
                gimnasio_id: gym.id
            }
        });

        if (createUserError) {
            // Rollback: Eliminar gimnasio si falla el usuario
            await adminSupabase.from('gimnasios').delete().eq('id', gym.id);
            throw createUserError;
        }

        // 4. Crear el Perfil del Administrador
        const { error: profileError } = await adminSupabase
            .from('perfiles')
            .insert({
                id: authUser.user.id,
                correo: admin_email,
                nombre_completo: admin_nombre,
                rol: 'admin',
                gimnasio_id: gym.id,
                onboarding_completado: true
            });

        if (profileError) {
            // Rollback parcial: Eliminar usuario y gimnasio (opcional, mejor loggear error crítico)
            console.error('Critical: Profile creation failed after auth user creation', profileError);
            throw profileError;
        }

        // 5. Registrar en Audit Log
        await adminSupabase.from('audit_logs').insert({
            usuario_id: requester?.id,
            tabla: 'gimnasios',
            operacion: 'INSERT',
            registro_id: gym.id,
            datos_nuevos: { gym, admin_user: authUser.user.id }
        });

        return NextResponse.json({
            success: true,
            gym_id: gym.id,
            admin_id: authUser.user.id
        });

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Onboarding API Error:', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
