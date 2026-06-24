import { POST } from '../../src/app/api/admin/gyms/onboard/route';
import { authenticateAndRequireRole } from '../../src/lib/auth/api-auth';
import { createAdminClient } from '../../src/lib/supabase/admin';

// 1. Mockear la autenticación para simular un rol de superadmin sin requerir tokens JWT reales
jest.mock('../../src/lib/auth/api-auth', () => ({
    authenticateAndRequireRole: jest.fn()
}));

// 2. Mockear el conector de Supabase Admin Client
const mockGymsInsert = jest.fn();
const mockBranchesInsert = jest.fn();
const mockProfilesInsert = jest.fn();
const mockAuditLogsInsert = jest.fn();
const mockSelectSingle = jest.fn();
const mockAuthCreateUser = jest.fn();
const mockAuthDeleteUser = jest.fn();
const mockGymsDelete = jest.fn();
const mockBranchesDelete = jest.fn();

const mockSupabaseClient = {
    from: jest.fn((table: string) => {
        return {
            select: jest.fn((fields?: string) => {
                return {
                    eq: jest.fn((column: string, value: any) => {
                        const chain = {
                            is: jest.fn(() => chain),
                            single: jest.fn(() => {
                                // Para simular la búsqueda de slug de gimnasio existente
                                if (table === 'gimnasios' && column === 'slug') {
                                    return Promise.resolve(mockSelectSingle());
                                }
                                return Promise.resolve({ data: null, error: null });
                            })
                        };
                        return chain;
                    })
                };
            }),
            insert: jest.fn((data: any) => {
                let insertResult;
                if (table === 'gimnasios') {
                    insertResult = mockGymsInsert(data);
                } else if (table === 'sucursales') {
                    insertResult = mockBranchesInsert(data);
                } else if (table === 'perfiles') {
                    insertResult = mockProfilesInsert(data);
                } else if (table === 'audit_logs') {
                    insertResult = mockAuditLogsInsert(data);
                }

                const result = insertResult || { data: null, error: null };

                // Retornar un objeto Thenable que a la vez tiene select() para soportar encadenamientos
                return {
                    ...result,
                    select: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve(result)),
                        maybeSingle: jest.fn(() => Promise.resolve(result))
                    })),
                    then: (onfulfilled?: any) => Promise.resolve(result).then(onfulfilled)
                };
            }),
            delete: jest.fn(() => {
                return {
                    eq: jest.fn((column: string, value: any) => {
                        if (table === 'gimnasios') {
                            mockGymsDelete(column, value);
                        } else if (table === 'sucursales') {
                            mockBranchesDelete(column, value);
                        }
                        return Promise.resolve({ error: null });
                    })
                };
            })
        };
    }),
    auth: {
        admin: {
            createUser: jest.fn((params) => mockAuthCreateUser(params)),
            deleteUser: jest.fn((id) => mockAuthDeleteUser(id))
        }
    }
};

jest.mock('../../src/lib/supabase/admin', () => ({
    createAdminClient: jest.fn(() => mockSupabaseClient)
}));

describe('Onboarding de Gimnasio API - Tests de Integración', () => {
    const validPayload = {
        nombre: 'Virtud Palermo',
        slug: 'virtud-palermo-test',
        plan_id: 'plan-pro',
        modulos: ['attendance', 'routines', 'nutrition'],
        admin_nombre: 'Esteban Martinez',
        admin_email: 'esteban@virtudpalermo.com',
        admin_password: 'SecurePassword123!',
        sucursal_nombre: 'Sede Palermo Central',
        direccion: 'Av. Santa Fe 3400'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Autenticación por defecto exitosa como superadmin para las pruebas
        (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
            user: { id: 'requester-superadmin-id', email: 'superadmin@virtud.com' },
            profile: { role: 'superadmin', gimnasio_id: null },
            error: null
        });
    });

    /**
     * TC-ONB-001: Caso Feliz de Onboarding
     * Valida que se creen secuencialmente el gimnasio, sucursal, auth user, perfil y se registre el audit log.
     */
    test('TC-ONB-001: Debe realizar el onboarding completo de manera exitosa', async () => {
        // GIVEN: Un slug no registrado
        mockSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } }); // Código de no rows en Supabase

        // Inserciones exitosas simuladas
        mockGymsInsert.mockReturnValue({
            data: { id: 'gym-uuid-1111', nombre: validPayload.nombre, slug: validPayload.slug },
            error: null
        });
        mockBranchesInsert.mockReturnValue({
            data: { id: 'branch-uuid-2222', nombre: validPayload.sucursal_nombre },
            error: null
        });
        mockAuthCreateUser.mockResolvedValue({
            data: { user: { id: 'admin-auth-uuid-3333', email: validPayload.admin_email } },
            error: null
        });
        mockProfilesInsert.mockReturnValue({
            data: { id: 'admin-auth-uuid-3333', nombre_completo: validPayload.admin_nombre },
            error: null
        });
        mockAuditLogsInsert.mockReturnValue({
            data: { id: 'audit-log-uuid-4444' },
            error: null
        });

        // WHEN: Se realiza la petición POST con el payload
        const request = new Request('http://localhost/api/admin/gyms/onboard', {
            method: 'POST',
            body: JSON.stringify(validPayload)
        });

        const response = await POST(request);
        const data = await response.json();

        // THEN: Devuelve HTTP 200 y los IDs del gimnasio y administrador creados
        expect(response.status).toBe(200);
        expect(data).toEqual({
            success: true,
            gym_id: 'gym-uuid-1111',
            admin_id: 'admin-auth-uuid-3333'
        });

        // Verificar llamados atómicos y secuenciales
        expect(mockGymsInsert).toHaveBeenCalledWith({
            nombre: validPayload.nombre,
            slug: validPayload.slug,
            plan_id: validPayload.plan_id,
            modulos_activos: validPayload.modulos,
            estado_pago_saas: 'active',
            configuracion: {}
        });

        expect(mockBranchesInsert).toHaveBeenCalledWith({
            gimnasio_id: 'gym-uuid-1111',
            nombre: validPayload.sucursal_nombre,
            direccion: validPayload.direccion
        });

        expect(mockAuthCreateUser).toHaveBeenCalledWith({
            email: validPayload.admin_email,
            password: validPayload.admin_password,
            email_confirm: true,
            user_metadata: {
                nombre_completo: validPayload.admin_nombre,
                rol: 'admin'
            },
            app_metadata: {
                rol: 'admin',
                gimnasio_id: 'gym-uuid-1111'
            }
        });

        expect(mockProfilesInsert).toHaveBeenCalledWith({
            id: 'admin-auth-uuid-3333',
            correo: validPayload.admin_email,
            nombre_completo: validPayload.admin_nombre,
            rol: 'admin',
            gimnasio_id: 'gym-uuid-1111',
            onboarding_completado: true
        });

        expect(mockAuditLogsInsert).toHaveBeenCalledWith({
            usuario_id: 'requester-superadmin-id',
            tabla: 'gimnasios',
            operacion: 'INSERT',
            registro_id: 'gym-uuid-1111',
            datos_nuevos: expect.any(Object)
        });
    });

    /**
     * TC-ONB-002: Caso Negativo por Slug Duplicado
     * Valida que se rechace la creación y no se realicen inserciones adicionales.
     */
    test('TC-ONB-002: Debe fallar con HTTP 400 si el slug del gimnasio ya existe en base de datos', async () => {
        // GIVEN: El gimnasio con el mismo slug ya existe en base de datos
        mockSelectSingle.mockResolvedValue({
            data: { id: 'existing-gym-uuid', slug: validPayload.slug },
            error: null
        });

        // WHEN: Hacemos la petición POST
        const request = new Request('http://localhost/api/admin/gyms/onboard', {
            method: 'POST',
            body: JSON.stringify(validPayload)
        });

        const response = await POST(request);
        const data = await response.json();

        // THEN: Devuelve error 400 y mensaje aclaratorio
        expect(response.status).toBe(400);
        expect(data).toEqual({
            error: 'El slug ya está en uso por otro gimnasio'
        });

        // Y: Ninguna inserción de creación debe haber sido disparada
        expect(mockGymsInsert).not.toHaveBeenCalled();
        expect(mockBranchesInsert).not.toHaveBeenCalled();
        expect(mockAuthCreateUser).not.toHaveBeenCalled();
        expect(mockProfilesInsert).not.toHaveBeenCalled();
    });

    /**
     * TC-ONB-003: Edge Case de Fallo en Cascada (Rollback)
     * Valida que si falla la creación del perfil, se ejecute la purga atómica
     * del usuario de Auth, la sucursal y el gimnasio de prueba en base de datos.
     */
    test('TC-ONB-003: Debe revertir y purgar recursos (rollback) si la inserción del perfil falla', async () => {
        // GIVEN: El slug no está registrado
        mockSelectSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

        // Inserciones iniciales exitosas
        mockGymsInsert.mockReturnValue({
            data: { id: 'gym-uuid-1111', nombre: validPayload.nombre, slug: validPayload.slug },
            error: null
        });
        mockBranchesInsert.mockReturnValue({
            data: { id: 'branch-uuid-2222', nombre: validPayload.sucursal_nombre },
            error: null
        });
        mockAuthCreateUser.mockResolvedValue({
            data: { user: { id: 'admin-auth-uuid-3333', email: validPayload.admin_email } },
            error: null
        });

        // PERO: La inserción del perfil falla con un error simulado de base de datos
        mockProfilesInsert.mockReturnValue({
            data: null,
            error: new Error('Database constraint violation on profiles table')
        });

        // WHEN: Realizamos la petición POST
        const request = new Request('http://localhost/api/admin/gyms/onboard', {
            method: 'POST',
            body: JSON.stringify(validPayload)
        });

        const response = await POST(request);
        const data = await response.json();

        // THEN: Devuelve error HTTP 500 y el mensaje de error correspondiente
        expect(response.status).toBe(500);
        expect(data).toEqual({
            error: 'Database constraint violation on profiles table'
        });

        // Y: Debe haberse disparado el rollback en cascada completo
        // 1. Eliminar el usuario de Auth por su ID
        expect(mockAuthDeleteUser).toHaveBeenCalledWith('admin-auth-uuid-3333');
        // 2. Eliminar la sucursal por el gimnasio_id
        expect(mockBranchesDelete).toHaveBeenCalledWith('gimnasio_id', 'gym-uuid-1111');
        // 3. Eliminar el gimnasio por su ID
        expect(mockGymsDelete).toHaveBeenCalledWith('id', 'gym-uuid-1111');
    });

    /**
     * TC-ONB-004: Security - Validación de Roles RBAC
     * Valida que usuarios con roles insuficientes (como 'coach' o 'alumno') sean bloqueados de forma segura.
     */
    test('TC-ONB-004: Debe rechazar la creación con HTTP 403 si el usuario no tiene rol de superadmin', async () => {
        // GIVEN: El usuario solicitante tiene rol de 'coach' y no 'superadmin'
        const mockResponseError = {
            status: 403,
            json: () => Promise.resolve({ error: 'Forbidden', message: 'No tienes permisos para acceder a este recurso.' })
        };

        (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
            user: { id: 'requester-coach-id', email: 'coach@virtud.com' },
            profile: null,
            error: mockResponseError
        });

        // WHEN: Intentamos hacer la petición POST
        const request = new Request('http://localhost/api/admin/gyms/onboard', {
            method: 'POST',
            body: JSON.stringify(validPayload)
        });

        const response = await POST(request);
        const data = await response.json();

        // THEN: Devuelve HTTP 403 y mensaje de acceso prohibido
        expect(response.status).toBe(403);
        expect(data.error).toBe('Forbidden');

        // Y: El flujo de creación de base de datos nunca debe haber iniciado
        expect(mockGymsInsert).not.toHaveBeenCalled();
    });

    /**
     * TC-ONB-005: Edge Case - Robustez ante entradas inválidas o incompletas
     * Valida cómo reacciona la API ante la ausencia de datos requeridos en el payload.
     */
    test('TC-ONB-005: Debe reaccionar de forma controlada devolviendo HTTP 400 si faltan campos obligatorios', async () => {
        // GIVEN: El payload carece de campos obligatorios para la DB (ej: 'nombre' es null)
        const dirtyPayload = { ...validPayload, nombre: null };

        // WHEN: Enviamos la petición POST
        const request = new Request('http://localhost/api/admin/gyms/onboard', {
            method: 'POST',
            body: JSON.stringify(dirtyPayload)
        });

        const response = await POST(request);
        const data = await response.json();

        // THEN: Devuelve error de validación (400)
        expect(response.status).toBe(400);
        expect(data.error).toContain('El nombre del gimnasio debe tener al menos 3 caracteres.');
    });
});
