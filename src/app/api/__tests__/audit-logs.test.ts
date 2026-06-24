import { NextRequest, NextResponse } from 'next/server';

import { GET } from '../admin/audit-logs/route';

import { authenticateAndRequireRole, resolveGymIdForAdmin } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Mock de api-auth
jest.mock('@/lib/auth/api-auth', () => ({
    authenticateAndRequireRole: jest.fn(),
    resolveGymIdForAdmin: jest.fn()
}));

// Mock de Supabase Admin
jest.mock('@/lib/supabase/admin', () => ({
    createAdminClient: jest.fn()
}));

describe('Audit Logs API Route', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Cliente mock de Supabase
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            then: jest.fn()
        };

        (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
    });



    it('should return system logs and impersonation logs for superadmin', async () => {
        // Configurar mocks
        (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
            supabase: mockSupabase,
            profile: { role: 'superadmin', gimnasio_id: null },
            error: null
        });

        (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
            targetGymId: null
        });

        // Configurar respuestas de base de datos
        const mockSystemLogs = [{ id: '1', tabla: 'perfiles', operacion: 'UPDATE', creado_en: '2026-06-23T20:00:00Z' }];
        const mockImpersonationLogs = [{ id: '1', superadmin_id: 'sa123', gimnasio_id: 'gym123', fecha: '2026-06-23T20:00:00Z', motivo: 'Soporte' }];

        // Mocking the promise chain for audit_logs
        mockSupabase.then.mockImplementationOnce((callback: any) => {
            callback({ data: mockSystemLogs, error: null });
        });

        // Mocking the promise chain for logs_acceso_remoto
        mockSupabase.then.mockImplementationOnce((callback: any) => {
            callback({ data: mockImpersonationLogs, error: null });
        });

        const request = new NextRequest('http://localhost:3000/api/admin/audit-logs?type=all');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.systemLogs).toEqual(mockSystemLogs);
        expect(data.impersonationLogs).toHaveLength(1);
        expect(data.impersonationLogs[0].creado_en).toBe(mockImpersonationLogs[0].fecha);
        expect(data.impersonationLogs[0].duracion_minutos).toBe(15);
    });

    it('should return system logs and empty impersonation logs for normal admin', async () => {
        // Configurar mocks
        (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
            supabase: mockSupabase,
            profile: { role: 'admin', gimnasio_id: 'gym123' },
            error: null
        });

        (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
            targetGymId: 'gym123'
        });

        const mockSystemLogs = [{ id: '1', tabla: 'pagos', operacion: 'INSERT', creado_en: '2026-06-23T20:00:00Z', gimnasio_id: 'gym123' }];

        mockSupabase.then.mockImplementationOnce((callback: any) => {
            callback({ data: mockSystemLogs, error: null });
        });

        const request = new NextRequest('http://localhost:3000/api/admin/audit-logs?type=all');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.systemLogs).toEqual(mockSystemLogs);
        // Debe estar vacío porque los admins locales no pueden ver impersonaciones globales
        expect(data.impersonationLogs).toEqual([]);
        // Debe haber filtrado por gimnasio_id en la base de datos
    });

    it('should filter system logs by operation if operation query parameter is provided', async () => {
        (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
            supabase: mockSupabase,
            profile: { role: 'admin', gimnasio_id: 'gym123' },
            error: null
        });

        (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
            targetGymId: 'gym123'
        });

        const mockSystemLogs = [{ id: '1', tabla: 'pagos', operacion: 'UPDATE', creado_en: '2026-06-23T20:00:00Z', gimnasio_id: 'gym123' }];

        mockSupabase.then.mockImplementationOnce((callback: any) => {
            callback({ data: mockSystemLogs, error: null });
        });

        const request = new NextRequest('http://localhost:3000/api/admin/audit-logs?type=system&operation=UPDATE');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.systemLogs).toEqual(mockSystemLogs);
        expect(mockSupabase.eq).toHaveBeenCalledWith('operacion', 'UPDATE');
        expect(mockSupabase.eq).toHaveBeenCalledWith('gimnasio_id', 'gym123');
    });


    it('should filter system logs by date range if startDate and endDate query parameters are provided', async () => {
        (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
            supabase: mockSupabase,
            profile: { role: 'admin', gimnasio_id: 'gym123' },
            error: null
        });

        (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
            targetGymId: 'gym123'
        });

        const mockSystemLogs = [{ id: '1', tabla: 'pagos', operacion: 'UPDATE', creado_en: '2026-06-23T20:00:00Z', gimnasio_id: 'gym123' }];

        mockSupabase.then.mockImplementationOnce((callback: any) => {
            callback({ data: mockSystemLogs, error: null });
        });

        const request = new NextRequest('http://localhost:3000/api/admin/audit-logs?type=system&startDate=2026-06-20T00:00:00.000Z&endDate=2026-06-24T23:59:59.999Z');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.systemLogs).toEqual(mockSystemLogs);
        expect(mockSupabase.gte).toHaveBeenCalledWith('creado_en', '2026-06-20T00:00:00.000Z');
        expect(mockSupabase.lte).toHaveBeenCalledWith('creado_en', '2026-06-24T23:59:59.999Z');
    });

    it('should fail if authenticateAndRequireRole returns auth error', async () => {
        const authErrorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
            supabase: null,
            profile: null,
            error: authErrorResponse
        });

        const request = new NextRequest('http://localhost:3000/api/admin/audit-logs');
        const response = await GET(request);

        expect(response.status).toBe(401);
    });

    it('should fail if resolveGymIdForAdmin returns forbidden error', async () => {
        (authenticateAndRequireRole as jest.Mock).mockResolvedValue({
            supabase: mockSupabase,
            profile: { role: 'admin', gimnasio_id: null }, // Admin sin gimnasio
            error: null
        });

        const forbiddenErrorResponse = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        (resolveGymIdForAdmin as jest.Mock).mockResolvedValue({
            targetGymId: null,
            errorResponse: forbiddenErrorResponse
        });

        const request = new NextRequest('http://localhost:3000/api/admin/audit-logs');
        const response = await GET(request);

        expect(response.status).toBe(403);
    });
});
