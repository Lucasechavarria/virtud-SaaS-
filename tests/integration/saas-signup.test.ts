import { POST } from '../../src/app/api/saas/signup/route';
import { createAdminClient } from '../../src/lib/supabase/admin';

// 1. Mock de Supabase Admin Client con lógica de unicidad en memoria
const mockGymsInsert = jest.fn();
const mockProfilesInsert = jest.fn();
const mockAuthCreateUser = jest.fn();
const mockAuthDeleteUser = jest.fn();
const mockGymsDelete = jest.fn();

// Utilizaremos un Set en memoria para trackear correos y simular la unicidad de Supabase Auth de forma atómica y concurrente
const registeredEmails = new Set<string>();

const mockSupabaseClient = {
    auth: {
        admin: {
            createUser: jest.fn((params: any) => {
                mockAuthCreateUser(params);
                const email = params.email;

                // Si el correo ya fue registrado en el Set en memoria durante esta suite
                if (registeredEmails.has(email)) {
                    return Promise.resolve({
                        data: { user: null },
                        error: new Error('A user with this email already exists')
                    });
                }

                // Si es el primer intento con este correo, registrarlo con éxito
                registeredEmails.add(email);
                return Promise.resolve({
                    data: { user: { id: `admin-auth-uuid-${email}` } },
                    error: null
                });
            }),
            deleteUser: jest.fn((id: string) => {
                mockAuthDeleteUser(id);
                return Promise.resolve({ error: null });
            })
        }
    },
    from: jest.fn((table: string) => {
        return {
            insert: jest.fn((data: any) => {
                let insertResult;
                if (table === 'gimnasios') {
                    insertResult = mockGymsInsert(data);
                } else if (table === 'perfiles') {
                    insertResult = mockProfilesInsert(data);
                }

                const result = insertResult || { data: { id: 'mock-uuid-123' }, error: null };

                return {
                    select: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve(result)),
                        maybeSingle: jest.fn(() => Promise.resolve(result))
                    })),
                    then: (onfulfilled?: any) => Promise.resolve(result).then(onfulfilled)
                };
            }),
            delete: jest.fn(() => ({
                eq: jest.fn((column: string, value: any) => {
                    if (table === 'gimnasios') {
                        mockGymsDelete(column, value);
                    }
                    return Promise.resolve({ error: null });
                })
            }))
        };
    })
};

jest.mock('../../src/lib/supabase/admin', () => ({
    createAdminClient: jest.fn(() => mockSupabaseClient)
}));

describe('API SaaS Signup - Tests de Concurrencia', () => {
    const validSaaSPayload = {
        email: 'concurrente-test@virtud.com',
        password: 'SecurePassword123!',
        firstName: 'Federico',
        lastName: 'Gomez',
        gymName: 'Virtud Belgrano',
        gymSlug: 'virtud-belgrano-test',
        planId: 'plan-premium-trial'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        registeredEmails.clear();

        // Configuración de inserciones de base de datos exitosas por defecto
        mockGymsInsert.mockReturnValue({
            data: { id: 'gym-uuid-federico', nombre: validSaaSPayload.gymName, slug: validSaaSPayload.gymSlug },
            error: null
        });
        mockProfilesInsert.mockReturnValue({
            data: { id: 'admin-auth-uuid-concurrente-test@virtud.com', nombre_completo: 'Federico Gomez' },
            error: null
        });
    });

    /**
     * TC-SAA-001: Pruebas de Concurrencia y Carreras en Registro SaaS
     * Valida que si ingresan 5 peticiones asíncronas concurrentes de forma simultánea con el mismo correo,
     * el backend responda exitosamente únicamente a 1 solicitud, y deniegue con error de duplicidad a las otras 4.
     */
    test('TC-SAA-001: Debe permitir únicamente una creación de gimnasio exitosa cuando entran solicitudes de registro duplicadas simultáneamente', async () => {
        // GIVEN: 5 solicitudes asíncronas concurrentes preparadas
        const requests = Array.from({ length: 5 }).map(() => {
            return new Request('http://localhost/api/saas/signup', {
                method: 'POST',
                body: JSON.stringify(validSaaSPayload)
            });
        });

        // WHEN: Ejecutamos las 5 solicitudes asíncronamente de forma paralela (concurrencia de carrera)
        const responses = await Promise.all(requests.map(req => POST(req)));
        const results = await Promise.all(responses.map(res => res.json()));

        // THEN: Validar los resultados de las respuestas
        const successCount = results.filter(res => res.success === true).length;
        const failureCount = results.filter(res => res.error).length;

        // Aserciones de atomicidad de concurrencia
        expect(successCount).toBe(1);  // Exactamente 1 solicitud tuvo éxito
        expect(failureCount).toBe(4);  // Exactamente 4 solicitudes fallaron de forma controlada

        // Verificar el mensaje de error de las peticiones fallidas (error de auth de email ya registrado)
        const failureResponses = results.filter(res => res.error);
        failureResponses.forEach(res => {
            expect(res.error).toContain('A user with this email already exists');
        });

        // Y: Supabase Auth createUser debió haber sido llamado las 5 veces, pero solo 1 perfil y 1 gimnasio debieron crearse
        expect(mockAuthCreateUser).toHaveBeenCalledTimes(5);
        expect(mockGymsInsert).toHaveBeenCalledTimes(1);
        expect(mockProfilesInsert).toHaveBeenCalledTimes(1);
    });
});
