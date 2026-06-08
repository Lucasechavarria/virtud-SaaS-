import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/admin/crm/leads - List prospects
export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'recepcion', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();
        let targetGymId = profile?.gimnasio_id;

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');

        if (profile?.role === 'superadmin' && urlGym) {
            // Resolver UUID si se pasa slug
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
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const { data: leads, error } = await adminClient
            .from('crm_prospectos')
            .select('*')
            .eq('gimnasio_id', targetGymId)
            .order('creado_en', { ascending: false });

        if (error) throw error;

        return NextResponse.json(leads || []);
    } catch (error: any) {
        console.error('❌ CRM Leads GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/admin/crm/leads - Create a prospect
export async function POST(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'recepcion', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();
        let targetGymId = profile?.gimnasio_id;

        const body = await request.json();
        const { nombre_completo, telefono, email, estado = 'nuevo', valor_estimado = 0, origen = 'Instagram' } = body;

        if (!nombre_completo) {
            return NextResponse.json({ error: 'El nombre completo es obligatorio' }, { status: 400 });
        }

        if (profile?.role === 'superadmin' && body.gimnasio_id) {
            targetGymId = body.gimnasio_id;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const { data: newLead, error } = await adminClient
            .from('crm_prospectos')
            .insert({
                gimnasio_id: targetGymId,
                nombre_completo,
                telefono,
                email,
                estado,
                valor_estimado: Number(valor_estimado),
                origen
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(newLead);
    } catch (error: any) {
        console.error('❌ CRM Leads POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/admin/crm/leads - Update prospect details or state
export async function PATCH(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'recepcion', 'superadmin']);
        if (authError) return authError;

        const adminClient = createAdminClient();
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID del prospecto requerido' }, { status: 400 });
        }

        // Si no es superadmin, verificar que el prospecto pertenece a su gimnasio
        if (profile?.role !== 'superadmin') {
            const { data: checkLead, error: checkError } = await adminClient
                .from('crm_prospectos')
                .select('gimnasio_id')
                .eq('id', id)
                .single();

            if (checkError || !checkLead) {
                return NextResponse.json({ error: 'Prospecto no encontrado' }, { status: 404 });
            }

            if (checkLead.gimnasio_id !== profile?.gimnasio_id) {
                return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
            }
        }

        const mappedUpdates: any = {};
        if (updates.nombre_completo !== undefined) mappedUpdates.nombre_completo = updates.nombre_completo;
        if (updates.telefono !== undefined) mappedUpdates.telefono = updates.telefono;
        if (updates.email !== undefined) mappedUpdates.email = updates.email;
        if (updates.estado !== undefined) mappedUpdates.estado = updates.estado;
        if (updates.valor_estimado !== undefined) mappedUpdates.valor_estimado = Number(updates.valor_estimado);
        if (updates.origen !== undefined) mappedUpdates.origen = updates.origen;

        const { data: updatedLead, error } = await adminClient
            .from('crm_prospectos')
            .update(mappedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Si el estado cambia a 'convertido', pre-provisionar el usuario
        if (updates.estado === 'convertido') {
            try {
                const { data: leadData } = await adminClient
                    .from('crm_prospectos')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (leadData && leadData.email) {
                    const { data: authUser } = await adminClient.auth.admin.createUser({
                        email: leadData.email,
                        email_confirm: true,
                        user_metadata: {
                            full_name: leadData.nombre_completo,
                            gimnasio_id: leadData.gimnasio_id
                        }
                    });

                    if (authUser?.user) {
                        await adminClient
                            .from('perfiles')
                            .update({
                                gimnasio_id: leadData.gimnasio_id,
                                telefono: leadData.telefono,
                                nombre_completo: leadData.nombre_completo
                            })
                            .eq('id', authUser.user.id);
                    }
                }
            } catch (createErr) {
                console.warn('⚠️ No se pudo pre-crear el usuario auth:', createErr);
            }
        }

        return NextResponse.json(updatedLead);
    } catch (error: any) {
        console.error('❌ CRM Leads PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/crm/leads - Delete a prospect
export async function DELETE(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Si no es superadmin, verificar pertenencia
        if (profile?.role !== 'superadmin') {
            const { data: checkLead, error: checkError } = await adminClient
                .from('crm_prospectos')
                .select('gimnasio_id')
                .eq('id', id)
                .single();

            if (checkError || !checkLead) {
                return NextResponse.json({ error: 'Prospecto no encontrado' }, { status: 404 });
            }

            if (checkLead.gimnasio_id !== profile?.gimnasio_id) {
                return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
            }
        }

        const { error } = await adminClient
            .from('crm_prospectos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ CRM Leads DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
