import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * GET /api/coach/classes
 * 
 * Retorna las clases programadas para el coach autenticado en una fecha específica,
 * incluyendo los detalles de la actividad y los alumnos inscritos (reservas).
 */
export async function GET(request: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['coach', 'admin']
        );

        if (error) return error;
        if (!supabase || !user || !profile) {
            throw new Error('No se pudo inicializar la sesión o el cliente de Supabase');
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

        // Determinar el día de la semana de la fecha (0 = Domingo, 1 = Lunes, etc.)
        // Evitar desajuste de zona horaria al parsear YYYY-MM-DD en Next.js Server
        const dateParts = dateParam.split('-');
        const targetDate = new Date(
            parseInt(dateParts[0], 10),
            parseInt(dateParts[1], 10) - 1,
            parseInt(dateParts[2], 10)
        );

        if (isNaN(targetDate.getTime())) {
            return NextResponse.json({ error: 'Formato de fecha inválido. Usar YYYY-MM-DD.' }, { status: 400 });
        }
        
        const dayOfWeek = targetDate.getDay();
        const targetGymId = profile.gimnasio_id;

        if (!targetGymId) {
            return NextResponse.json({ error: 'El usuario no tiene un gimnasio asignado.' }, { status: 400 });
        }

        // 1. Obtener los horarios de clase recurrentes del coach para este día de la semana
        const { data: classes, error: classesError } = await (supabase as any)
            .from('horarios_de_clase')
            .select(`
                id,
                dia_de_la_semana,
                hora_inicio,
                hora_fin,
                esta_activa,
                capacidad_maxima,
                capacidad_actual,
                notas_entrenador,
                actividades!actividad_id (
                    id,
                    nombre,
                    color,
                    duracion_minutos,
                    url_imagen
                )
            `)
            .eq('entrenador_id', user.id)
            .eq('esta_activa', true)
            .eq('dia_de_la_semana', dayOfWeek)
            .eq('gimnasio_id', targetGymId)
            .order('hora_inicio', { ascending: true });

        if (classesError) {
            throw classesError;
        }

        if (!classes || classes.length === 0) {
            return NextResponse.json({ success: true, classes: [] });
        }

        const classIds = classes.map(c => c.id);

        // 2. Obtener las reservas de clase reales para este conjunto de horarios en la fecha dada
        const { data: bookings, error: bookingsError } = await (supabase as any)
            .from('reservas_de_clase')
            .select(`
                id,
                usuario_id,
                horario_clase_id,
                fecha,
                estado,
                en_lista_espera,
                posicion_lista_espera,
                perfiles!usuario_id (
                    id,
                    nombre_completo,
                    url_avatar,
                    correo
                )
            `)
            .in('horario_clase_id', classIds)
            .eq('fecha', dateParam)
            .neq('estado', 'cancelada');

        if (bookingsError) {
            throw bookingsError;
        }

        // 3. Cruzar la información
        const classesWithBookings = classes.map((cls: any) => {
            const clsBookings = bookings?.filter(b => b.horario_clase_id === cls.id) || [];
            
            // Separar alumnos confirmados de la lista de espera
            const confirmedBookings = clsBookings.filter(b => !b.en_lista_espera);
            const waitlistBookings = clsBookings
                .filter(b => b.en_lista_espera)
                .sort((a, b) => (a.posicion_lista_espera || 0) - (b.posicion_lista_espera || 0));

            return {
                id: cls.id,
                dia_de_la_semana: cls.dia_de_la_semana,
                hora_inicio: cls.hora_inicio,
                hora_fin: cls.hora_fin,
                esta_activa: cls.esta_activa,
                capacidad_maxima: cls.capacidad_maxima || cls.actividades?.duracion_minutos || 15,
                capacidad_actual: confirmedBookings.length,
                notas_entrenador: cls.notas_entrenador,
                actividad: cls.actividades,
                students: confirmedBookings.map(b => ({
                    reserva_id: b.id,
                    id: b.perfiles?.id,
                    nombre_completo: b.perfiles?.nombre_completo || 'Sin Nombre',
                    email: b.perfiles?.correo,
                    url_avatar: b.perfiles?.url_avatar,
                    estado: b.estado // 'reservada' | 'asistida' | 'no_show' | 'cancelada'
                })),
                waitlist: waitlistBookings.map(b => ({
                    reserva_id: b.id,
                    id: b.perfiles?.id,
                    nombre_completo: b.perfiles?.nombre_completo || 'Sin Nombre',
                    email: b.perfiles?.correo,
                    url_avatar: b.perfiles?.url_avatar,
                    posicion: b.posicion_lista_espera
                }))
            };
        });

        return NextResponse.json({
            success: true,
            classes: classesWithBookings
        });

    } catch (error) {
        console.error('❌ Error GET /api/coach/classes:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error interno al cargar las clases del coach'
        }, { status: 500 });
    }
}
