import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Autenticar y requerir rol administrativo
        const { supabase: userClient, error: authError, profile } = await authenticateAndRequireRole(request, ['admin', 'superadmin']);
        if (authError || !profile) {
            return authError || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Blindaje contra gimnasio_id NULL para admin
        if (profile.role !== 'superadmin' && !profile.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || 'week';
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const urlGym = searchParams.get('gymId');
        const receptionistId = searchParams.get('usuario_id') || searchParams.get('usuarioId');

        // Resolver gimnasio multitenant
        const { targetGymId, errorResponse } = await resolveGymIdForAdmin(profile, urlGym);
        if (errorResponse) return errorResponse;

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        // 3. Resolver rango de fechas
        const today = new Date();
        let startDate = new Date();
        let endDate = new Date();

        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);
            
            // Evitar desfasajes por setHours locales si el parámetro ya incluye tiempo explícito (T)
            if (!startDateParam.includes('T')) {
                startDate.setHours(0, 0, 0, 0);
            }
            if (!endDateParam.includes('T')) {
                endDate.setHours(23, 59, 59, 999);
            }
        } else {
            if (range === 'week') {
                startDate.setDate(today.getDate() - 6);
            } else if (range === 'month') {
                startDate.setDate(today.getDate() - 29);
            } else if (range === 'quarter') {
                startDate.setDate(today.getDate() - 89);
            } else if (range === 'year') {
                startDate = new Date(today.getFullYear(), 0, 1);
            } else {
                startDate.setDate(today.getDate() - 6);
            }
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        }

        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();

        const adminClient = createAdminClient();

        // 4. Consultar cierres de caja en auditoria_global
        let closuresQuery = adminClient
            .from('auditoria_global' as any)
            .select(`
                id,
                creado_en,
                usuario_id,
                detalles,
                perfiles:usuario_id (
                    nombre,
                    apellido,
                    nombre_completo
                )
            `)
            .eq('gimnasio_id', targetGymId)
            .eq('accion', 'cierre_caja_recepcion')
            .gte('creado_en', startDateISO)
            .lte('creado_en', endDateISO);

        if (receptionistId) {
            closuresQuery = closuresQuery.eq('usuario_id', receptionistId);
        }

        const { data: closures, error: closuresError } = await closuresQuery.order('creado_en', { ascending: false });

        if (closuresError) {
            console.error('Error al consultar cierres de caja:', closuresError);
            return NextResponse.json({ error: 'Error al consultar cierres de caja' }, { status: 500 });
        }

        // 5. Consultar los últimos estados de caja de los cajeros del gimnasio para detectar turnos abiertos
        let latestEventsQuery = adminClient
            .from('auditoria_global' as any)
            .select(`
                id,
                accion,
                creado_en,
                usuario_id,
                detalles,
                perfiles:usuario_id (
                    nombre,
                    apellido,
                    nombre_completo
                )
            `)
            .eq('gimnasio_id', targetGymId)
            .in('accion', ['apertura_caja_recepcion', 'cierre_caja_recepcion']);

        if (receptionistId) {
            latestEventsQuery = latestEventsQuery.eq('usuario_id', receptionistId);
        }

        const { data: latestEvents, error: latestEventsError } = await latestEventsQuery
            .order('creado_en', { ascending: false })
            .limit(100);

        if (latestEventsError) {
            console.error('Error al consultar últimos eventos de caja:', latestEventsError);
            return NextResponse.json({ error: 'Error al consultar estados de caja abiertos' }, { status: 500 });
        }

        // 6. Formatear cierres de caja
        const formattedClosures = (closures || []).map((c: any) => {
            const userName = c.perfiles
                ? c.perfiles.nombre_completo || `${c.perfiles.nombre || ''} ${c.perfiles.apellido || ''}`.trim()
                : c.detalles?.recepcionista || 'Cajero';

            const det = c.detalles || {};
            return {
                id: c.id,
                fecha: c.creado_en,
                usuarioId: c.usuario_id,
                usuarioNombre: userName,
                montoInicial: Number(det.monto_inicial || 0),
                ventasEfectivo: Number(det.ventas_efectivo || 0),
                ventasTarjeta: Number(det.ventas_tarjeta || 0),
                ventasQR: Number(det.ventas_qr || 0),
                efectivoDeclarado: Number(det.efectivo_declarado || 0),
                tarjetaDeclarado: Number(det.tarjeta_declarado || 0),
                qrDeclarado: Number(det.qr_declarado || 0),
                diferenciaEfectivo: Number(det.diferencia_efectivo || 0),
                diferenciaTarjeta: Number(det.diferencia_tarjeta || 0),
                diferenciaQR: Number(det.diferencia_qr || 0),
                egresos: det.egresos || [],
                fechaApertura: det.fecha_apertura,
                fechaCierre: det.fecha_cierre || c.creado_en
            };
        });

        // 7. Agrupar el último estado de cada cajero para detectar turnos abiertos
        const userLatestState: Record<string, any> = {};
        (latestEvents || []).forEach((ev: any) => {
            if (!userLatestState[ev.usuario_id]) {
                userLatestState[ev.usuario_id] = ev;
            }
        });

        const openSessions: any[] = [];
        Object.keys(userLatestState).forEach((userId) => {
            const ev = userLatestState[userId];
            if (ev.accion === 'apertura_caja_recepcion') {
                const userName = ev.perfiles
                    ? ev.perfiles.nombre_completo || `${ev.perfiles.nombre || ''} ${ev.perfiles.apellido || ''}`.trim()
                    : ev.detalles?.recepcionista || 'Cajero';
                
                openSessions.push({
                    id: ev.id,
                    usuarioId: ev.usuario_id,
                    usuarioNombre: userName,
                    fechaApertura: ev.creado_en,
                    montoInicial: Number(ev.detalles?.monto_inicial || 0),
                    egresos: ev.detalles?.egresos || []
                });
            }
        });

        // 8. Calcular métricas consolidadas del arqueo en el periodo
        let totalDiferencias = 0;
        let totalEgresosValores = 0;
        let totalCierresRealizados = formattedClosures.length;

        formattedClosures.forEach((c) => {
            totalDiferencias += (c.diferenciaEfectivo + c.diferenciaTarjeta + c.diferenciaQR);
            (c.egresos || []).forEach((eg: any) => {
                totalEgresosValores += Number(eg.monto || 0);
            });
        });

        return NextResponse.json({
            success: true,
            metrics: {
                totalDiferencias: Number(totalDiferencias.toFixed(2)),
                totalEgresos: Number(totalEgresosValores.toFixed(2)),
                totalCierres: totalCierresRealizados
            },
            history: formattedClosures,
            openSessions
        });

    } catch (error) {
        console.error('Unexpected error in GET reception/cash-sessions report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
