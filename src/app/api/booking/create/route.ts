import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { bookingsService } from '@/services/bookings.service';

/**
 * POST /api/booking/create
 * 
 * Crea o cancela una reserva de clase.
 * Maneja lógica de capacidad máxima y lista de espera automáticamente.
 * 
 * @route POST /api/booking/create
 * @access Protected (requiere autenticación Supabase)
 * 
 * @param {Object} request.body
 * @param {string} request.body.action - Acción a realizar: 'reserve' | 'cancel'
 * @param {string} request.body.classId - ID de la clase a reservar
 * @param {string} request.body.date - Fecha de la clase en formato ISO (YYYY-MM-DD)
 * 
 * @returns {Object} 200 - Reserva creada exitosamente
 * @returns {Object} 400 - Parámetros inválidos
 * @returns {Object} 401 - No autorizado (token faltante o inválido)
 * @returns {Object} 500 - Error del servidor
 * 
 * @example
 * // Request - Reservar clase
 * POST /api/booking/create
 * Body: {
 *   "action": "reserve",
 *   "classId": "class_123",
 *   "date": "2025-12-10"
 * }
 * 
 * // Response - Confirmada
 * {
 *   "success": true,
 *   "message": "Reserva confirmada",
 *   "booking": { ... }
 * }
 * 
 * // Response - Lista de espera
 * {
 *   "success": true,
 *   "status": "waitlist",
 *   "message": "Clase llena. Agregado a lista de espera.",
 *   "booking": { ... }
 * }
 */
export async function POST(request: Request) {
    try {
        // Verificar autenticación
        const { user, supabase, error: authError } = await authenticateRequest(request);
        if (authError) return authError;

        const { action, classId, date } = await request.json();

        // Validar parámetros
        if (!action || !classId || !date) {
            return NextResponse.json({
                error: 'Missing required fields',
                message: 'action, classId, and date are required'
            }, { status: 400 });
        }

        if (action === 'reserve') {
            // Verificar si el usuario ya tiene una reserva para esta clase y fecha
            const hasBooked = await bookingsService.hasUserBooked(user!.id, classId, date);

            if (hasBooked) {
                return NextResponse.json({
                    error: 'Already booked',
                    message: 'Ya tienes una reserva para esta clase en esta fecha'
                }, { status: 400 });
            }

            // Crear la reserva usando el servicio
            const booking = await bookingsService.create({
                usuario_id: user!.id,
                horario_clase_id: classId,
                fecha: date
            });

            return NextResponse.json({
                success: true,
                message: (booking as { estado: string }).estado === 'en_lista_espera'
                    ? 'Clase llena. Agregado a lista de espera.'
                    : 'Reserva confirmada',
                status: (booking as { estado: string }).estado,
                booking
            });

        } else if (action === 'cancel') {
            // Buscar la reserva del usuario para esta clase y fecha
            const { data: bookings } = await supabase!
                .from('reservas_de_clase')
                .select('id')
                .eq('usuario_id', user!.id)
                .eq('horario_clase_id', classId)
                .eq('fecha', date)
                .in('estado', ['reservada', 'en_lista_espera'])
                .limit(1);

            if (!bookings || bookings.length === 0) {
                return NextResponse.json({
                    error: 'Booking not found',
                    message: 'No se encontró una reserva activa para cancelar'
                }, { status: 404 });
            }

            // Cancelar la reserva
            await bookingsService.cancel(bookings[0].id);

            return NextResponse.json({
                success: true,
                message: 'Reserva cancelada exitosamente'
            });
        }

        return NextResponse.json({
            error: 'Invalid action',
            message: 'Action must be "reserve" or "cancel"'
        }, { status: 400 });

    } catch (_error) {
        const err = _error as Error;
        console.error('Booking API Error:', err);
        return NextResponse.json({
            error: 'Booking failed',
            message: err.message || 'Error al procesar la reserva'
        }, { status: 500 });
    }
}
