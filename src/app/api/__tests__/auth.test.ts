import { NextRequest } from 'next/server';
import { POST } from '../auth/set-role/route';

// Mock de Supabase Admin
jest.mock('@/lib/supabase/admin', () => ({
    createAdminClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                        data: { id: '123', rol: 'coach', gimnasio_id: 'gym123', permisos: {} },
                        error: null
                    }))
                }))
            })),
            update: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                    error: null
                }))
            })),
            insert: jest.fn(() => Promise.resolve({
                data: null,
                error: null
            }))
        }))
    }))
}));

// Mock de Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => ({
        auth: {
            getUser: jest.fn(() => Promise.resolve({
                data: { user: { id: '123' } },
                error: null
            }))
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                        data: { id: '123', rol: 'admin', gimnasio_id: 'gym123' },
                        error: null
                    }))
                }))
            })),
            update: jest.fn(() => ({
                eq: jest.fn(() => ({
                    select: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                            data: { id: '123', rol: 'coach' },
                            error: null
                        }))
                    }))
                }))
            })),
            insert: jest.fn(() => Promise.resolve({
                data: null,
                error: null
            }))
        }))
    }))
}));

describe('Auth API Routes', () => {
    describe('POST /api/auth/set-role', () => {
        it('should set user role successfully', async () => {
            const request = new NextRequest('http://localhost:3000/api/auth/set-role', {
                method: 'POST',
                body: JSON.stringify({
                    uid: '123',
                    role: 'coach'
                })
            });

            const response = await POST(request);
            const bodyText = await response.text();

            if (response.status !== 200) {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const logPath = path.resolve(process.cwd(), 'test_debug_auth.txt');
                    fs.writeFileSync(logPath, `Status: ${response.status}\nBody: ${bodyText}\n`);
                } catch (e) {
                    console.error('Failed to write log file:', e);
                }
            }

            const data = JSON.parse(bodyText);

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should return 400 for missing userId', async () => {
            const request = new NextRequest('http://localhost:3000/api/auth/set-role', {
                method: 'POST',
                body: JSON.stringify({
                    role: 'coach'
                })
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });

        it('should return 400 for missing role', async () => {
            const request = new NextRequest('http://localhost:3000/api/auth/set-role', {
                method: 'POST',
                body: JSON.stringify({
                    uid: '123'
                })
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });

        it('should return 400 for invalid role', async () => {
            const request = new NextRequest('http://localhost:3000/api/auth/set-role', {
                method: 'POST',
                body: JSON.stringify({
                    uid: '123',
                    role: 'invalid_role'
                })
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });
});
