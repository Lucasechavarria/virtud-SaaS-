import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET: List campaigns for a gym
export async function GET(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'coach', 'superadmin']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');
        let targetGymId = profile?.gimnasio_id;

        // Si es superadmin y viene por parámetro slug o id, resolver
        if (profile?.role === 'superadmin' && urlGym) {
            targetGymId = urlGym;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Si targetGymId no es un UUID (es decir, es un slug), resolverlo
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetGymId);
        if (!isUUID) {
            const { data: gym } = await adminClient
                .from('gimnasios')
                .select('id')
                .eq('slug', targetGymId)
                .single();
            if (gym) {
                targetGymId = gym.id;
            }
        }

        // Consultas en paralelo
        const [campaignsRes, profilesRes] = await Promise.all([
            adminClient
                .from('campanas_marketing')
                .select('*')
                .eq('gimnasio_id', targetGymId)
                .order('creado_en', { ascending: false }),
            adminClient
                .from('perfiles')
                .select('id, nombre_completo')
                .eq('gimnasio_id', targetGymId)
        ]);

        if (campaignsRes.error) throw campaignsRes.error;
        if (profilesRes.error) throw profilesRes.error;

        const campaigns = campaignsRes.data || [];
        const profiles = profilesRes.data || [];
        const userIds = profiles.map(p => p.id);

        let activityLog: any[] = [];
        if (userIds.length > 0) {
            const { data: logs, error: logsError } = await adminClient
                .from('registros_acceso_rutina')
                .select('id, accion, creado_en, usuario_id')
                .in('usuario_id', userIds)
                .order('creado_en', { ascending: false })
                .limit(10);

            if (!logsError && logs) {
                // Crear mapeo de id a nombre_completo
                const profileMap = new Map(profiles.map(p => [p.id, p.nombre_completo]));
                activityLog = logs.map(log => ({
                    id: log.id,
                    accion: log.accion,
                    creado_en: log.creado_en,
                    usuario: profileMap.get(log.usuario_id) || 'Usuario desconocido'
                }));
            }
        }

        return NextResponse.json({ 
            success: true, 
            campaigns,
            activityLog
        });
    } catch (error: any) {
        console.error('❌ GET Automation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new campaign
export async function POST(request: Request) {
    try {
        const { error: authError, profile, user } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const body = await request.json();
        const { nombre, tipo, mensaje_titulo, mensaje_cuerpo, segmento, gymId } = body;

        if (!nombre || !tipo || !mensaje_titulo || !mensaje_cuerpo) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        let targetGymId = profile?.gimnasio_id;
        if (profile?.role === 'superadmin' && gymId) {
            targetGymId = gymId;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        const { data: newCampaign, error: dbError } = await adminClient
            .from('campanas_marketing')
            .insert({
                nombre,
                tipo,
                mensaje_titulo,
                mensaje_cuerpo,
                segmento: segmento || {},
                gimnasio_id: targetGymId,
                estado: 'activa'
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, campaign: newCampaign });
    } catch (error: any) {
        console.error('❌ POST Automation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Toggle campaign status or edit details
export async function PUT(request: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError) return authError;

        const body = await request.json();
        const { id, estado, nombre, tipo, mensaje_titulo, mensaje_cuerpo, segmento } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de campaña requerido' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // 1. Obtener la campaña actual para verificar pertenencia
        const { data: campaign, error: getError } = await adminClient
            .from('campanas_marketing')
            .select('gimnasio_id')
            .eq('id', id)
            .single();

        if (getError || !campaign) {
            return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
        }

        // Blindaje RLS/BOLA en backend
        if (profile?.role !== 'superadmin' && campaign.gimnasio_id !== profile?.gimnasio_id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const updateData: any = {};
        if (estado) updateData.estado = estado;
        if (nombre) updateData.nombre = nombre;
        if (tipo) updateData.tipo = tipo;
        if (mensaje_titulo) updateData.mensaje_titulo = mensaje_titulo;
        if (mensaje_cuerpo) updateData.mensaje_cuerpo = mensaje_cuerpo;
        if (segmento) updateData.segmento = segmento;

        updateData.actualizado_en = new Date().toISOString();

        const { data: updatedCampaign, error: updateError } = await adminClient
            .from('campanas_marketing')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, campaign: updatedCampaign });
    } catch (error: any) {
        console.error('❌ PUT Automation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
