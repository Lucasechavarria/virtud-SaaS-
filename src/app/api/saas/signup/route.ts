import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    try {
        const { email, password, firstName, lastName, gymName, gymSlug, planId } = await request.json();

        if (!email || !password || !gymName || !gymSlug || !planId) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Crear el usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                nombre: firstName,
                apellido: lastName,
                nombre_completo: `${firstName} ${lastName}`.trim(),
            }
        });

        if (authError) throw authError;
        const userId = authData.user.id;

        // 2. Crear el Gimnasio
        const { data: gymData, error: gymError } = await supabase
            .from('gimnasios')
            .insert({
                nombre: gymName,
                slug: gymSlug,
                plan_id: planId,
                estado_pago_saas: 'active', // Trial por defecto (podemos ajustar luego)
                fecha_proximo_pago: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 días de trial
            })
            .select()
            .single();

        if (gymError) {
            // Rollback auth user if gym fails (manual cleanup since admin.createUser is used)
            await supabase.auth.admin.deleteUser(userId);
            throw gymError;
        }

        // 3. Crear el Perfil como ADMIN del nuevo gimnasio
        const { error: profileError } = await supabase
            .from('perfiles')
            .insert({
                id: userId,
                correo: email,
                nombre_completo: `${firstName} ${lastName}`.trim(),
                rol: 'admin',
                gimnasio_id: gymData.id
            });

        if (profileError) {
            // Cleanup
            await supabase.from('gimnasios').delete().eq('id', gymData.id);
            await supabase.auth.admin.deleteUser(userId);
            throw profileError;
        }

        // 4. Actualizar metadatos de la aplicación en Supabase Auth (Claims de Seguridad)
        const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
            userId,
            {
                app_metadata: {
                    rol: 'admin',
                    gimnasio_id: gymData.id
                }
            }
        );

        if (updateAuthError) {
            // Cleanup
            await supabase.from('perfiles').delete().eq('id', userId);
            await supabase.from('gimnasios').delete().eq('id', gymData.id);
            await supabase.auth.admin.deleteUser(userId);
            throw updateAuthError;
        }

        return NextResponse.json({
            success: true,
            message: 'Gimnasio y cuenta creados con éxito',
            gymId: gymData.id
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('SaaS Signup Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
