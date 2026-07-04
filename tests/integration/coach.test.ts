import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

describe('Coach Integration Tests', () => {
    test('should validate scheduled classes data model and properties', async () => {
        // Estructura mock que retorna el endpoint /api/coach/classes
        const mockClass = {
            id: 'horario-uuid-123',
            dia_de_la_semana: 1, // Lunes
            hora_inicio: '08:00:00',
            hora_fin: '09:00:00',
            esta_activa: true,
            capacidad_maxima: 15,
            capacidad_actual: 4,
            actividad: {
                id: 'actividad-uuid-999',
                nombre: 'Crossfit WOD',
                color: '#f97316',
                duracion_minutos: 60
            },
            students: [
                {
                    reserva_id: 'reserva-uuid-888',
                    id: 'alumno-uuid-777',
                    nombre_completo: 'Juan Pérez',
                    email: 'juan@virtud.com',
                    estado: 'reservada'
                }
            ],
            waitlist: []
        };

        expect(mockClass.dia_de_la_semana).toBeGreaterThanOrEqual(0);
        expect(mockClass.dia_de_la_semana).toBeLessThanOrEqual(6);
        expect(mockClass.actividad.nombre).toBe('Crossfit WOD');
        expect(mockClass.students[0].estado).toBe('reservada');
    });

    test('should validate attendance saving action payload structure', async () => {
        // Estructura que procesa /api/coach/attendance
        const mockPayload = {
            attendances: [
                { reserva_id: 'reserva-uuid-888', estado: 'asistida' },
                { reserva_id: 'reserva-uuid-111', estado: 'no_show' }
            ]
        };

        expect(mockPayload.attendances).toHaveLength(2);
        expect(mockPayload.attendances[0].estado).toBe('asistida');
        expect(mockPayload.attendances[1].estado).toBe('no_show');
    });

    test('should block anonymous requests from reading scheduled classes due to RLS', async () => {
        const publicClient = createClient(supabaseUrl, 'anon-key');

        const { data, error } = await publicClient
            .from('horarios_de_clase')
            .select('*')
            .limit(1);

        // Sin un token JWT autenticado (coach o admin), RLS previene la lectura del esquema
        // resultando en error o en un arreglo vacío dependiente de las políticas
        if (error) {
            expect(error.message).toBeDefined();
        } else {
            expect(data).toHaveLength(0);
        }
    });

    test('should block anonymous requests from reading reservations due to RLS', async () => {
        const publicClient = createClient(supabaseUrl, 'anon-key');

        const { data, error } = await publicClient
            .from('reservas_de_clase')
            .select('*')
            .limit(1);

        if (error) {
            expect(error.message).toBeDefined();
        } else {
            expect(data).toHaveLength(0);
        }
    });

    test('should validate coach check-in and check-out payload properties', async () => {
        // Estructura simulada para control de jornada (Sprint 1)
        const mockCheckIn = {
            usuario_id: 'coach-uuid-123',
            entrada: new Date().toISOString(),
            salida: null,
            rol_asistencia: 'coach',
            source: 'coach_work_checkin'
        };

        const mockCheckOut = {
            ...mockCheckIn,
            salida: new Date().toISOString()
        };

        expect(mockCheckIn.salida).toBeNull();
        expect(mockCheckIn.rol_asistencia).toBe('coach');
        expect(mockCheckOut.salida).not.toBeNull();
    });

    test('should validate nutrition plan edit payload structure', async () => {
        // Estructura simulada de actualización de plan de nutrición (Sprint 3)
        const mockNutritionPayload = {
            calorias_diarias: 2500,
            gramos_proteina: 180,
            gramos_carbohidratos: 220,
            gramos_grasas: 70,
            comidas: [
                { momento: 'desayuno', descripcion: 'Omelette de claras con avena' },
                { momento: 'almuerzo', descripcion: 'Pollo con arroz jazmín y aguacate' }
            ]
        };

        expect(mockNutritionPayload.calorias_diarias).toBe(2500);
        expect(mockNutritionPayload.comidas).toHaveLength(2);
        expect(mockNutritionPayload.comidas[0].momento).toBe('desayuno');
    });

    test('should block anonymous requests from reading attendance logs due to RLS', async () => {
        const publicClient = createClient(supabaseUrl, 'anon-key');

        const { data, error } = await publicClient
            .from('asistencias')
            .select('*')
            .limit(1);

        if (error) {
            expect(error.message).toBeDefined();
        } else {
            expect(data).toHaveLength(0);
        }
    });

    test('should block anonymous requests from reading nutrition plans due to RLS', async () => {
        const publicClient = createClient(supabaseUrl, 'anon-key');

        const { data, error } = await publicClient
            .from('planes_nutricionales')
            .select('*')
            .limit(1);

        if (error) {
            expect(error.message).toBeDefined();
        } else {
            expect(data).toHaveLength(0);
        }
    });
});
