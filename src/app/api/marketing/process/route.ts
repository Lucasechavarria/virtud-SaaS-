import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const supabase = await createClient();
        const results = {
            pagos_actualizados: 0,
            recordatorios_pago: 0,
            reengagement: 0,
            campanas_procesadas: 0,
            notificaciones_enviadas: 0
        };

        // 1. Actualizar pagos vencidos
        const { data: pagosActualizados } = await (supabase as any).rpc('actualizar_pagos_vencidos');
        results.pagos_actualizados = (pagosActualizados as number) || 0;

        // 2. Procesar recordatorios de pago
        const { data: recordatorios } = await (supabase as any).rpc('notificar_pagos_proximos');
        results.recordatorios_pago = (recordatorios as number) || 0;

        // 3. Procesar re-engagement
        const { data: reengagement } = await (supabase as any).rpc('notificar_usuarios_inactivos');
        results.reengagement = (reengagement as number) || 0;

        // 4. Procesar campañas activas
        const now = new Date().toISOString();
        const { data: campaigns } = await (supabase as any)
            .from('campanas_marketing')
            .select('*')
            .eq('estado', 'active')
            .lte('fecha_envio', now);

        for (const campaign of (campaigns || [])) {
            const campaignData = campaign as any;
            const segment = campaignData.segmento || {};
            
            let query = (supabase as any)
                .from('perfiles')
                .select('id');

            // Aplicar filtros de segmentación
            if (segment.rol) {
                query = query.eq('rol', segment.rol);
            }

            if (segment.objetivo_principal) {
                const { data: objetivos } = await (supabase as any)
                    .from('objetivos_del_usuario')
                    .select('usuario_id')
                    .eq('objetivo_principal', segment.objetivo_principal)
                    .eq('esta_activo', true);

                const userIds = objetivos?.map((o: any) => o.usuario_id) || [];
                query = query.in('id', userIds);
            }

            const { data: targetUsers } = await query;
            results.campanas_procesadas++;
            results.notificaciones_enviadas += targetUsers?.length || 0;
            
            // Marcar campaña como enviada
            await (supabase as any)
                .from('campanas_marketing')
                .update({ estado: 'sent', enviado_en: now })
                .eq('id', campaignData.id);
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Marketing Process Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
