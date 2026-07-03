import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface TemporalAttendanceData {
    name: string;
    qr: number;
    manual: number;
    bypass: number;
    total: number;
}

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

        // 4. Consultar asistencias
        const { data: asistencias, error: asistenciasError } = await adminClient
            .from('asistencias')
            .select('id, creado_en, source, entrada, usuario_id')
            .eq('gimnasio_id', targetGymId)
            .gte('entrada', startDateISO)
            .lte('entrada', endDateISO)
            .order('entrada', { ascending: true });

        if (asistenciasError) {
            console.error('Error al consultar asistencias de reporte:', asistenciasError);
            return NextResponse.json({ error: 'Error al consultar asistencias' }, { status: 500 });
        }

        // 5. Consultar bypasses detallados con justificación en auditoria_global
        let bypassQuery = adminClient
            .from('auditoria_global' as any)
            .select(`
                id,
                creado_en,
                entidad_id,
                usuario_id,
                detalles,
                perfiles:usuario_id (
                    nombre,
                    apellido,
                    nombre_completo
                )
            `)
            .eq('gimnasio_id', targetGymId)
            .eq('accion', 'bypass_acceso_repcion')
            .gte('creado_en', startDateISO)
            .lte('creado_en', endDateISO);

        if (receptionistId) {
            bypassQuery = bypassQuery.eq('usuario_id', receptionistId);
        }

        const { data: bypassLogs, error: bypassLogsError } = await bypassQuery.order('creado_en', { ascending: false });

        if (bypassLogsError) {
            console.error('Error al consultar logs de bypass:', bypassLogsError);
            return NextResponse.json({ error: 'Error al consultar logs de bypass' }, { status: 500 });
        }

        // Obtener la información de los alumnos (foto de perfil y nombre completo) en lote
        const studentIds = Array.from(new Set((bypassLogs || []).map((log: any) => log.entidad_id).filter(Boolean)));
        let studentProfiles: any[] = [];
        if (studentIds.length > 0) {
            const { data } = await adminClient
                .from('perfiles')
                .select('id, nombre_completo, url_avatar')
                .in('id', studentIds);
            studentProfiles = data || [];
        }
        const studentMap = new Map(studentProfiles.map(p => [p.id, p]));

        // 6. Procesar métricas generales
        let totalAsistencias = 0;
        let qrCount = 0;
        let manualCount = 0;
        let bypassCount = 0;
        let filteredAsistencias: any[] = [];

        if (receptionistId) {
            // Si filtramos por un recepcionista específico:
            // - QR y manual_recepcion se cuentan como 0 porque no están asociados al recepcionista en la BD de asistencias.
            // - Solo conservamos las asistencias de tipo 'reception_bypass' que tengan un log correspondiente en bypassLogs de este recepcionista.
            const bypassLogsMap = new Map<string, any[]>();
            (bypassLogs || []).forEach((log: any) => {
                const dateStr = new Date(log.creado_en).toDateString();
                const key = `${log.entidad_id}_${dateStr}`;
                if (!bypassLogsMap.has(key)) {
                    bypassLogsMap.set(key, []);
                }
                bypassLogsMap.get(key)!.push(log);
            });

            filteredAsistencias = (asistencias || []).filter((a) => {
                const src = (a.source || '').toLowerCase();
                if (src !== 'reception_bypass') return false;

                // Buscar un log que coincida por alumno e ingresado el mismo día
                const aDateStr = new Date(a.entrada || a.creado_en).toDateString();
                const key = `${a.usuario_id}_${aDateStr}`;
                return bypassLogsMap.has(key);
            });

            bypassCount = filteredAsistencias.length;
            totalAsistencias = bypassCount;
        } else {
            // Comportamiento normal (sin filtro de recepcionista)
            filteredAsistencias = asistencias || [];
            totalAsistencias = filteredAsistencias.length;
            filteredAsistencias.forEach((a) => {
                const src = (a.source || '').toLowerCase();
                if (src === 'qr') {
                    qrCount++;
                } else if (src === 'reception_bypass') {
                    bypassCount++;
                } else {
                    // reception_manual, manual_recepcion o cualquier otro se agrupa en manual
                    manualCount++;
                }
            });
        }

        // 7. Agrupación temporal para el gráfico
        const chartData = aggregateAttendanceTemporal(filteredAsistencias, range, startDate, endDate);

        // 8. Formatear bypasses
        const formattedBypasses = (bypassLogs || []).map((log: any) => {
            const receptionistName = log.perfiles
                ? log.perfiles.nombre_completo || `${log.perfiles.nombre || ''} ${log.perfiles.apellido || ''}`.trim()
                : log.detalles?.autorizado_por || 'Cajero';

            const studentProfile = studentMap.get(log.entidad_id);
            const socioNombre = studentProfile?.nombre_completo || log.detalles?.socio_nombre || 'Socio';
            const urlAvatar = studentProfile?.url_avatar || null;

            return {
                id: log.id,
                fecha: log.creado_en,
                socioId: log.entidad_id,
                socioNombre,
                urlAvatar,
                autorizadoPor: receptionistName,
                motivo: log.detalles?.motivo || 'Bypass manual'
            };
        });

        return NextResponse.json({
            success: true,
            metrics: {
                totalAsistencias,
                qr: qrCount,
                manual: manualCount,
                bypass: bypassCount
            },
            charts: {
                timeline: chartData
            },
            bypasses: formattedBypasses
        });

    } catch (error) {
        console.error('Unexpected error in GET reception/attendance report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Agrupa y acumula datos cronológicamente por día o semana para asistencias
 */
function aggregateAttendanceTemporal(
    records: any[],
    range: string,
    startDate: Date,
    endDate: Date
): TemporalAttendanceData[] {
    const tempMap: Record<string, { qr: number; manual: number; bypass: number; total: number }> = {};
    const keysOrder: string[] = [];

    const today = new Date();

    // 1. Inicializar la estructura y orden cronológico de las claves
    if (range === 'week') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            const dayKey = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
            tempMap[dayKey] = { qr: 0, manual: 0, bypass: 0, total: 0 };
            keysOrder.push(dayKey);
        }
    } else if (range === 'month') {
        // Agrupar por semanas (Semana 1, Semana 2, Semana 3, Semana 4)
        keysOrder.push('Semana 1', 'Semana 2', 'Semana 3', 'Semana 4');
        keysOrder.forEach(k => { tempMap[k] = { qr: 0, manual: 0, bypass: 0, total: 0 }; });
    } else if (range === 'quarter' || range === 'year') {
        // Agrupar por meses
        const totalMonths = range === 'quarter' ? 3 : 12;
        const currentMonth = today.getMonth();
        for (let i = totalMonths - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), currentMonth - i, 1);
            const monthKey = d.toLocaleString('es-ES', { month: 'short' });
            tempMap[monthKey] = { qr: 0, manual: 0, bypass: 0, total: 0 };
            keysOrder.push(monthKey);
        }
    } else {
        // Rango personalizado (días individuales si es corto, sino por meses/semanas)
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 15) {
            for (let i = 0; i < diffDays; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                const dayKey = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
                tempMap[dayKey] = { qr: 0, manual: 0, bypass: 0, total: 0 };
                keysOrder.push(dayKey);
            }
        } else {
            // Agrupar por meses
            const startMonth = startDate.getMonth();
            const startYear = startDate.getFullYear();
            const endMonth = endDate.getMonth();
            const endYear = endDate.getFullYear();
            let m = startMonth;
            let y = startYear;
            while (y < endYear || (y === endYear && m <= endMonth)) {
                const d = new Date(y, m, 1);
                const monthKey = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
                tempMap[monthKey] = { qr: 0, manual: 0, bypass: 0, total: 0 };
                keysOrder.push(monthKey);
                m++;
                if (m > 11) {
                    m = 0;
                    y++;
                }
            }
        }
    }

    // Helper para mapear registro a su clave temporal
    const getRecordKey = (date: Date): string => {
        if (range === 'week') {
            return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
        } else if (range === 'month') {
            // Dividir el mes de 30 días en 4 semanas
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const diffDays = Math.floor((date.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 7) return 'Semana 1';
            if (diffDays < 14) return 'Semana 2';
            if (diffDays < 21) return 'Semana 3';
            return 'Semana 4';
        } else if (range === 'quarter' || range === 'year') {
            return date.toLocaleString('es-ES', { month: 'short' });
        } else {
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 15) {
                return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
            } else {
                return date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
            }
        }
    };

    // 2. Acumular registros
    records.forEach((r) => {
        const date = new Date(r.entrada || r.creado_en);
        const key = getRecordKey(date);

        if (tempMap[key]) {
            const src = (r.source || '').toLowerCase();
            if (src === 'qr') {
                tempMap[key].qr++;
            } else if (src === 'reception_bypass') {
                tempMap[key].bypass++;
            } else {
                tempMap[key].manual++;
            }
            tempMap[key].total++;
        }
    });

    // 3. Convertir mapa a array
    return keysOrder.map(name => ({
        name,
        qr: tempMap[name].qr,
        manual: tempMap[name].manual,
        bypass: tempMap[name].bypass,
        total: tempMap[name].total
    }));
}
