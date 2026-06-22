import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/coach/export
 * Exporta datos en formato CSV
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'csv';
        const type = searchParams.get('type') || 'students';

        if (format !== 'csv') {
            return NextResponse.json({ error: 'Solo formato CSV soportado por ahora' }, { status: 400 });
        }

        // Obtener datos según el tipo
        let data;
        let filename;

        switch (type) {
            case 'students':
                data = await exportStudents(supabase, user.id);
                filename = `alumnos_${Date.now()}.csv`;
                break;
            case 'attendance':
                data = await exportAttendance(supabase, user.id);
                filename = `asistencia_${Date.now()}.csv`;
                break;
            case 'performance':
                data = await exportPerformance(supabase, user.id);
                filename = `rendimiento_${Date.now()}.csv`;
                break;
            default:
                return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'No hay datos para exportar' }, { status: 404 });
        }

        const csv = convertToCSV(data);

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (_error) {
        console.error('[API] Error en exportación:', _error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

async function exportStudents(supabase: any, coachId: string) {
    const { data } = await supabase
        .from('relacion_alumno_coach')
        .select(`
            usuario_id,
            perfiles!inner(nombre_completo, email:correo, telefono, fecha_nacimiento)
        `)
        .eq('entrenador_id', coachId)
        .eq('esta_activo', true);

    if (!data) return [];

    return data.map((item: any) => ({
        ID: item.usuario_id,
        Nombre: item.perfiles.nombre_completo,
        Email: item.perfiles.email,
        Teléfono: item.perfiles.telefono || 'N/A',
        'Fecha de Nacimiento': item.perfiles.fecha_nacimiento || 'N/A',
    }));
}

async function exportAttendance(supabase: any, coachId: string) {
    // Obtener alumnos del coach
    const { data: students } = await supabase
        .from('relacion_alumno_coach')
        .select('usuario_id')
        .eq('entrenador_id', coachId)
        .eq('esta_activo', true);

    const studentIds = students?.map((s: any) => s.usuario_id) || [];

    if (studentIds.length === 0) return [];

    const { data } = await supabase
        .from('asistencias')
        .select(`
            usuario_id,
            entrada,
            rol_asistencia,
            perfiles!inner(nombre_completo)
        `)
        .in('usuario_id', studentIds)
        .order('entrada', { ascending: false })
        .limit(1000);

    if (!data) return [];

    return data.map((item: any) => ({
        Alumno: item.perfiles.nombre_completo,
        Fecha: item.entrada,
        Rol: item.rol_asistencia,
    }));
}

async function exportPerformance(supabase: any, coachId: string) {
    // Obtener alumnos del coach
    const { data: students } = await supabase
        .from('relacion_alumno_coach')
        .select('usuario_id')
        .eq('entrenador_id', coachId)
        .eq('esta_activo', true);

    const studentIds = students?.map((s: any) => s.usuario_id) || [];

    if (studentIds.length === 0) return [];

    const { data } = await supabase
        .from('sesiones_de_entrenamiento')
        .select(`
            usuario_id,
            hora_inicio,
            puntos_totales,
            perfiles!inner(nombre_completo)
        `)
        .in('usuario_id', studentIds)
        .order('hora_inicio', { ascending: false })
        .limit(1000);

    if (!data) return [];

    return data.map((item: any) => ({
        Alumno: item.perfiles.nombre_completo,
        Fecha: item.hora_inicio,
        Puntos: item.puntos_totales || 0,
    }));
}

function convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(header => {
            const value = row[header];
            // Escapar comillas y envolver en comillas si contiene comas
            const stringValue = String(value || '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}
