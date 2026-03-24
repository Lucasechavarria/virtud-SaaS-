import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/whoami
 * Endpoint de diagnóstico — ver exactamente qué rol tiene el usuario actual.
 * ELIMINAR DESPUÉS DEL DEBUG.
 */
export async function GET(_request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({
                status: 'NOT_AUTHENTICATED',
                error: authError?.message || 'No user session found'
            });
        }

        // 1. Leer perfil con el cliente normal (respeta RLS)
        const { data: profileRLS, error: rlsError } = await supabase
            .from('perfiles')
            .select('id, correo, rol, gimnasio_id, onboarding_completado')
            .eq('id', user.id)
            .single();

        // 2. Leer perfil con el cliente admin (ignora RLS) — para ver si RLS es el problema
        const adminClient = createAdminClient();
        const { data: profileAdmin, error: adminError } = await adminClient
            .from('perfiles')
            .select('id, correo, rol, gimnasio_id')
            .eq('id', user.id)
            .single();

        return NextResponse.json({
            status: 'OK',
            user: {
                id: user.id,
                email: user.email,
                app_metadata_role: user.app_metadata?.rol || user.app_metadata?.role,
                user_metadata_role: user.user_metadata?.rol || user.user_metadata?.role,
            },
            profile_via_rls: profileRLS || null,
            rls_error: rlsError?.message || null,
            profile_via_admin: profileAdmin || null,
            admin_error: adminError?.message || null,
            diagnosis: {
                rls_works: !!profileRLS && !rlsError,
                role_from_rls: profileRLS?.rol || 'null',
                role_from_admin: profileAdmin?.rol || 'null',
                should_redirect_to: profileAdmin?.rol === 'superadmin' ? '/admin'
                    : profileAdmin?.rol === 'admin' ? '/admin'
                        : profileAdmin?.rol === 'coach' ? '/coach'
                            : '/dashboard'
            }
        });
    } catch (error) {
        return NextResponse.json({
            status: 'ERROR',
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
