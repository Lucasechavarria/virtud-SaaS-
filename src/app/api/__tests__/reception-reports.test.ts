import { NextRequest } from 'next/server';
import { GET as getAttendance } from '../admin/reports/reception/attendance/route';
import { GET as getCashSessions } from '../admin/reports/reception/cash-sessions/route';
import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Mock api-auth
jest.mock('@/lib/auth/api-auth', () => ({
    authenticateAndRequireRole: jest.fn(),
    resolveGymIdForAdmin: jest.fn()
}));

// Mock Supabase Admin
jest.mock('@/lib/supabase/admin', () => ({
    createAdminClient: jest.fn()
}));

describe('Reception Reports APIs', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock Supabase client
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            then: jest.fn()
        };

        (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    describe('Attendance Report Endpoint', () => {
        it('should fail with 401 if user is not authorized', async () => {
            (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
                supabase: null,
                profile: null,
                error: { status: 401, error: 'Unauthorized' }
            });

            const request = new NextRequest('http://localhost:3000/api/admin/reports/reception/attendance');
            const response = await getAttendance(request);
            expect(response.status).toBe(401);
        });

        it('should fail with 403 if normal admin has no gym assigned', async () => {
            (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
                supabase: mockSupabase,
                profile: { role: 'admin', gimnasio_id: null },
                error: null
            });

            const request = new NextRequest('http://localhost:3000/api/admin/reports/reception/attendance');
            const response = await getAttendance(request);
            expect(response.status).toBe(403);
        });

        it('should return metrics, charts, and bypass list correctly without receptionist filter', async () => {
            (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
                supabase: mockSupabase,
                profile: { role: 'admin', gimnasio_id: 'gym123' },
                error: null
            });

            (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
                targetGymId: 'gym123'
            });

            const mockAsistencias = [
                { id: '1', creado_en: '2026-07-01T12:00:00Z', source: 'qr', entrada: '2026-07-01T12:00:00Z', usuario_id: 'alumno1' },
                { id: '2', creado_en: '2026-07-02T14:30:00Z', source: 'reception_bypass', entrada: '2026-07-02T14:30:00Z', usuario_id: 'alumno2' },
                { id: '3', creado_en: '2026-07-03T10:00:00Z', source: 'reception_manual', entrada: '2026-07-03T10:00:00Z', usuario_id: 'alumno3' }
            ];

            const mockBypasses = [
                {
                    id: 'b1',
                    creado_en: '2026-07-02T14:30:00Z',
                    entidad_id: 'alumno2',
                    usuario_id: 'recepcionista123',
                    detalles: { socio_nombre: 'Diego Maradona', motivo: 'Se olvidó el celular', autorizado_by: 'Admin' },
                    perfiles: { nombre_completo: 'Recepcionista Juan' }
                }
            ];

            const mockStudentProfiles = [
                { id: 'alumno2', nombre_completo: 'Diego Maradona', url_avatar: 'http://example.com/avatar.jpg' }
            ];

            // Mock call chain for asistencias
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockAsistencias, error: null });
            });

            // Mock call chain for auditoria_global (bypasses)
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockBypasses, error: null });
            });

            // Mock call chain for perfiles (student profiles)
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockStudentProfiles, error: null });
            });

            const request = new NextRequest('http://localhost:3000/api/admin/reports/reception/attendance?range=week');
            const response = await getAttendance(request);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.metrics.totalAsistencias).toBe(3);
            expect(body.metrics.qr).toBe(1);
            expect(body.metrics.bypass).toBe(1);
            expect(body.metrics.manual).toBe(1);
            expect(body.bypasses).toHaveLength(1);
            expect(body.bypasses[0].socioNombre).toBe('Diego Maradona');
            expect(body.bypasses[0].urlAvatar).toBe('http://example.com/avatar.jpg');
            expect(body.bypasses[0].autorizadoPor).toBe('Recepcionista Juan');
        });

        it('should filter metrics and bypass list if receptionist usuario_id is provided', async () => {
            (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
                supabase: mockSupabase,
                profile: { role: 'admin', gimnasio_id: 'gym123' },
                error: null
            });

            (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
                targetGymId: 'gym123'
            });

            const mockAsistencias = [
                { id: '1', creado_en: '2026-07-01T12:00:00Z', source: 'qr', entrada: '2026-07-01T12:00:00Z', usuario_id: 'alumno1' },
                { id: '2', creado_en: '2026-07-02T14:30:00Z', source: 'reception_bypass', entrada: '2026-07-02T14:30:00Z', usuario_id: 'alumno2' }
            ];

            const mockBypassesFiltered = [
                {
                    id: 'b1',
                    creado_en: '2026-07-02T14:30:00Z',
                    entidad_id: 'alumno2',
                    usuario_id: 'recepcionista123',
                    detalles: { socio_nombre: 'Diego Maradona', motivo: 'Se olvidó el celular' },
                    perfiles: { nombre_completo: 'Recepcionista Juan' }
                }
            ];

            const mockStudentProfilesFiltered = [
                { id: 'alumno2', nombre_completo: 'Diego Maradona', url_avatar: 'http://example.com/avatar.jpg' }
            ];

            // Mock call chain for asistencias
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockAsistencias, error: null });
            });

            // Mock call chain for auditoria_global (bypasses)
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockBypassesFiltered, error: null });
            });

            // Mock call chain for perfiles (student profiles)
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockStudentProfilesFiltered, error: null });
            });

            const request = new NextRequest('http://localhost:3000/api/admin/reports/reception/attendance?range=week&usuario_id=recepcionista123');
            const response = await getAttendance(request);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            // Since we filtered by receptionist123, QR is 0, manual is 0, and only the bypass of 'alumno2' is counted
            expect(body.metrics.totalAsistencias).toBe(1);
            expect(body.metrics.qr).toBe(0);
            expect(body.metrics.bypass).toBe(1);
            expect(body.metrics.manual).toBe(0);
            expect(body.bypasses).toHaveLength(1);
        });
    });

    describe('Cash Sessions Report Endpoint', () => {
        it('should fail with 401 if user is not authorized', async () => {
            (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
                supabase: null,
                profile: null,
                error: { status: 401, error: 'Unauthorized' }
            });

            const request = new NextRequest('http://localhost:3000/api/admin/reports/reception/cash-sessions');
            const response = await getCashSessions(request);
            expect(response.status).toBe(401);
        });

        it('should return closures and open sessions correctly without receptionist filter', async () => {
            (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
                supabase: mockSupabase,
                profile: { role: 'admin', gimnasio_id: 'gym123' },
                error: null
            });

            (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
                targetGymId: 'gym123'
            });

            const mockClosures = [
                {
                    id: 'c1',
                    creado_en: '2026-07-02T22:00:00Z',
                    usuario_id: 'cajero1',
                    detalles: {
                        monto_inicial: 1000,
                        ventas_efectivo: 500,
                        ventas_tarjeta: 300,
                        ventas_qr: 200,
                        efectivo_declarado: 480,
                        tarjeta_declarado: 300,
                        qr_declarado: 200,
                        diferencia_efectivo: -20,
                        diferencia_tarjeta: 0,
                        diferencia_qr: 0,
                        egresos: [{ motivo: 'articulos limpieza', monto: 50 }],
                        fecha_apertura: '2026-07-02T14:00:00Z'
                    },
                    perfiles: { nombre_completo: 'Cajero Pepe' }
                }
            ];

            const mockLatestEvents = [
                {
                    id: 'e1',
                    accion: 'apertura_caja_recepcion',
                    creado_en: '2026-07-03T08:00:00Z',
                    usuario_id: 'cajero2',
                    detalles: { monto_inicial: 1500, egresos: [] },
                    perfiles: { nombre_completo: 'Cajero Maria' }
                }
            ];

            // Mock closures query response
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockClosures, error: null });
            });

            // Mock latestEvents query response (detects open session)
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockLatestEvents, error: null });
            });

            const request = new NextRequest('http://localhost:3000/api/admin/reports/reception/cash-sessions?range=week');
            const response = await getCashSessions(request);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.metrics.totalDiferencias).toBe(-20);
            expect(body.metrics.totalEgresos).toBe(50);
            expect(body.metrics.totalCierres).toBe(1);
            expect(body.history).toHaveLength(1);
            expect(body.history[0].usuarioNombre).toBe('Cajero Pepe');
            expect(body.openSessions).toHaveLength(1);
            expect(body.openSessions[0].usuarioNombre).toBe('Cajero Maria');
        });

        it('should filter closures and open sessions if receptionist usuario_id is provided', async () => {
            (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
                supabase: mockSupabase,
                profile: { role: 'admin', gimnasio_id: 'gym123' },
                error: null
            });

            (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
                targetGymId: 'gym123'
            });

            const mockClosuresFiltered = [
                {
                    id: 'c1',
                    creado_en: '2026-07-02T22:00:00Z',
                    usuario_id: 'cajero1',
                    detalles: {
                        monto_inicial: 1000,
                        ventas_efectivo: 500,
                        ventas_tarjeta: 300,
                        ventas_qr: 200,
                        efectivo_declarado: 500,
                        tarjeta_declarado: 300,
                        qr_declarado: 200,
                        diferencia_efectivo: 0,
                        diferencia_tarjeta: 0,
                        diferencia_qr: 0,
                        egresos: []
                    },
                    perfiles: { nombre_completo: 'Cajero Pepe' }
                }
            ];

            const mockLatestEventsFiltered = [
                {
                    id: 'e1',
                    accion: 'cierre_caja_recepcion',
                    creado_en: '2026-07-02T22:00:00Z',
                    usuario_id: 'cajero1',
                    detalles: {},
                    perfiles: { nombre_completo: 'Cajero Pepe' }
                }
            ];

            // Mock closures query response
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockClosuresFiltered, error: null });
            });

            // Mock latestEvents query response
            mockSupabase.then.mockImplementationOnce((callback: any) => {
                callback({ data: mockLatestEventsFiltered, error: null });
            });

            const request = new NextRequest('http://localhost:3000/api/admin/reports/reception/cash-sessions?range=week&usuario_id=cajero1');
            const response = await getCashSessions(request);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.metrics.totalCierres).toBe(1);
            expect(body.history[0].usuarioId).toBe('cajero1');
            // Cajero Pepe's last event was a cash closure, so he shouldn't have an open session
            expect(body.openSessions).toHaveLength(0);
        });
    });
});
