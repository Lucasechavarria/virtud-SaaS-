import { NextRequest } from 'next/server';
import { GET } from '../coach/students/route';

// Mock de Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => ({
        auth: {
            getUser: jest.fn(() => Promise.resolve({
                data: {
                    user: { id: 'coach123' }
                },
                error: null
            }))
        },
        from: jest.fn((table) => {
            const mockQueryChain = {
                select: jest.fn(function () { return this; }),
                eq: jest.fn(function () { return this; }),
                or: jest.fn(function () { return this; }),
                in: jest.fn(function () { return this; }),
                order: jest.fn(function () { return this; }),
                limit: jest.fn(function () { return this; }),
                gte: jest.fn(function () { return this; }),
                single: jest.fn(function () {
                    if (table === 'perfiles') {
                        return Promise.resolve({ data: { id: 'coach123', rol: 'coach' }, error: null });
                    }
                    if (table === 'objetivos_del_usuario') {
                        return Promise.resolve({ data: { id: 'goal1', primary_goal: 'Hypertrophy' }, error: null });
                    }
                    if (table === 'rutinas') {
                        return Promise.resolve({ data: { id: 'routine1', name: 'Morning Workout' }, error: null });
                    }
                    return Promise.resolve({ data: null, error: null });
                }),
                then: jest.fn(function (resolve) {
                    let data: any = [];
                    if (table === 'perfiles') {
                        data = [
                            { id: '1', full_name: 'Student 1', role: 'member' },
                            { id: '2', full_name: 'Student 2', role: 'member' }
                        ];
                    } else if (table === 'objetivos_del_usuario') {
                        data = [{ id: 'goal1', user_id: '1', primary_goal: 'Muscle Gain', is_active: true }];
                    } else if (table === 'rutinas') {
                        data = [{ id: 'routine1', user_id: '1', name: 'Push Day', is_active: true }];
                    }
                    return Promise.resolve(resolve({ data, error: null }));
                }),
                insert: jest.fn(function () {
                    return {
                        select: jest.fn(function () { return Promise.resolve({ data: null, error: null }); })
                    };
                })
            };

            // Para que await supabase.from().select().in() funcione, necesitamos que .in() devuelva el chain con .then()
            return mockQueryChain;
        })
    }))
}));

describe('Coach API Routes', () => {
    describe('GET /api/coach/students', () => {
        it('should return students list for coach', async () => {
            const request = new NextRequest('http://localhost:3000/api/coach/students');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(data.students)).toBe(true);
            expect(data.students.length).toBeGreaterThan(0);
        });

        it('should return 401 for unauthenticated user', async () => {
            const mockCreateClient = require('@/lib/supabase/server').createClient;
            mockCreateClient.mockImplementationOnce(() => ({
                auth: {
                    getUser: jest.fn(() => Promise.resolve({
                        data: { user: null },
                        error: { message: "Auth error" }
                    }))
                }
            }));

            const request = new NextRequest('http://localhost:3000/api/coach/students');
            const response = await GET(request);

            expect(response.status).toBe(401);
        });

        it('should return 403 for non-coach user', async () => {
            const mockCreateClient = require('@/lib/supabase/server').createClient;
            mockCreateClient.mockImplementationOnce(() => ({
                auth: {
                    getUser: jest.fn(() => Promise.resolve({
                        data: {
                            user: { id: 'user123' }
                        },
                        error: null
                    }))
                },
                from: jest.fn(() => ({
                    select: jest.fn(() => ({
                        eq: jest.fn(() => ({
                            single: jest.fn(() => Promise.resolve({
                                data: { id: 'user123', rol: 'member' },
                                error: null
                            }))
                        }))
                    }))
                }))
            }));

            const request = new NextRequest('http://localhost:3000/api/coach/students');
            const response = await GET(request);

            expect(response.status).toBe(403);
        });


    });
});
