import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Handles Supabase authentication and session logic in the middleware
 */
export async function handleAuth(request: NextRequest, response: NextResponse) {
    const supabase = createMiddlewareClient(request, response);
    
    // 1. Bypass seguro de sesión mockeada para entorno Cypress / Testing
    const userAgent = request.headers.get('user-agent') || '';
    const isCypress = userAgent.toLowerCase().includes('cypress');

    if (isCypress) {
        // Intentar obtener la cookie de Supabase para extraer el usuario simulado de forma atómica en Edge
        const cookieNames = request.cookies.getAll().map(c => c.name);
        const authCookieName = cookieNames.find(name => name.startsWith('sb-') && name.endsWith('-auth-token'));
        const authCookie = authCookieName ? request.cookies.get(authCookieName)?.value : null;

        if (authCookie) {
            try {
                // Decodificar y parsear con soporte para base64- (Supabase/SSR en Edge/Next.js)
                let sessionData: any = null;
                try {
                    const decoded = decodeURIComponent(authCookie);
                    if (decoded.startsWith('base64-')) {
                        const base64Str = decoded.substring(7);
                        let jsonStr = '';
                        try {
                            jsonStr = atob(base64Str);
                        } catch (_) {
                            jsonStr = Buffer.from(base64Str, 'base64').toString('utf-8');
                        }
                        sessionData = JSON.parse(jsonStr);
                    } else {
                        sessionData = JSON.parse(decoded);
                    }
                } catch (_) {
                    try {
                        sessionData = JSON.parse(authCookie);
                    } catch (__) {
                        sessionData = authCookie;
                    }
                }

                let token = '';
                let userEmail = '';
                let userRole = '';
                let userGymId = '';

                if (Array.isArray(sessionData)) {
                    token = sessionData[0] || '';
                } else if (sessionData && typeof sessionData === 'object') {
                    token = sessionData.access_token || '';
                    userEmail = sessionData.user?.email || '';
                    userRole = sessionData.user?.app_metadata?.rol || sessionData.user?.app_metadata?.role || '';
                    userGymId = sessionData.user?.app_metadata?.gimnasio_id || '';
                } else if (typeof sessionData === 'string') {
                    token = sessionData;
                }

                let rol = 'member';
                let gymId: string | null = 'virtud';
                let email = 'student@virtudgym.com';

                if (userEmail) {
                    email = userEmail;
                    rol = userRole || 'member';
                    gymId = userGymId || null;
                } else if (token) {
                    if (token.includes('gym-admin')) {
                        rol = 'admin';
                        gymId = 'virtud';
                        email = 'gym-admin@virtudgym.com';
                    } else if (token.includes('admin')) {
                        rol = 'superadmin';
                        gymId = null;
                        email = 'admin@virtudgym.com';
                    } else if (token.includes('coach')) {
                        rol = 'coach';
                        gymId = 'virtud';
                        email = 'coach@virtudgym.com';
                    } else if (token.includes('new-student') || token.includes('nuevo')) {
                        rol = 'member';
                        gymId = 'virtud';
                        email = 'alumno-nuevo@test.com';
                    }
                }

                const mockUser = {
                    id: 'a0e0a0e0-0000-0000-0000-000000000002',
                    email: email,
                    app_metadata: { 
                        rol: rol, 
                        gimnasio_id: gymId,
                        modulos_activos: {
                            rutinas_ia: true,
                            gamificacion: true,
                            nutricion_ia: true,
                            pagos_online: true,
                            clases_reserva: true,
                            Nutricion: true,
                            Clases: true,
                            VisionLab: true,
                            Pos: true,
                            Crm: true,
                            Finanzas: true
                        }
                    },
                    user_metadata: { nombre_completo: 'Test User' },
                    aud: 'authenticated',
                    role: 'authenticated'
                };

                console.warn(`[DEBUG_AUTH][Cypress Bypass] Autenticando usuario mock via token "${token || 'session-direct'}": ${email} (Rol: ${rol}, GymId: ${gymId})`);
                return { user: mockUser as any, supabase };
            } catch (e) {
                console.error('[Cypress Bypass] Error parsing mock session cookie:', e);
            }
        }
    }


    // Debug: Ver exactamente qué cookies están llegando al servidor
    const cookieNames = request.cookies.getAll().map(c => c.name).join(', ');
    const rawCookie = request.headers.get('cookie') || 'REALLY_EMPTY';
    console.warn(`[DEBUG_AUTH] Path: ${request.nextUrl.pathname} | Cookies: [${cookieNames}] | Raw: ${rawCookie}`);

    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.warn('[Middleware Auth] Error getting user:', error.message);
        }

        return { user, supabase };
    } catch (e) {
        console.error('[Middleware Auth] Critical exception:', e);
        return { user: null, supabase };
    }
}

