/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        login(email?: string, password?: string): Chainable<void>;
        loginByAuthAPI(email?: string, password?: string): Chainable<void>;
    }
}

Cypress.Commands.add('login', (email = 'admin@virtudgym.com', password = 'Password123!') => {
    cy.session([email, password], () => {
        cy.visit('/login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').click();

        // Esperar la interceptación global de autenticación mockeada para asegurar sincronía
        cy.wait('@supabaseAuthGlobal', { timeout: 15000 });

        // Esperar a que la redirección ocurra fuera de la página de login
        cy.url({ timeout: 15000 }).should('not.include', '/login');
    });
});

Cypress.Commands.add('loginByAuthAPI', (email = 'alumno-nuevo@test.com', password = 'Password123!') => {
    cy.session([email, password], () => {
        const supabaseAnonKey = Cypress.env('SUPABASE_ANON_KEY') || 'mock-anon-key-for-testing-purposes-only-12345';
        const projectRef = 'emjaqsvsazandttrmhol'; // ID de referencia de Supabase obtenido de la URL del proyecto

        let rol = 'member';
        let gymId: string | null = 'virtud';
        let token = 'mock-access-token-student';

        if (email.includes('gym-admin')) {
            rol = 'admin';
            gymId = 'virtud';
            token = 'mock-access-token-gym-admin';
        } else if (email.includes('admin')) {
            rol = 'superadmin';
            gymId = null;
            token = 'mock-access-token-admin';
        } else if (email.includes('coach')) {
            rol = 'coach';
            gymId = 'virtud';
            token = 'mock-access-token-coach';
        } else if (email.includes('nuevo')) {
            rol = 'member';
            gymId = 'virtud';
            token = 'mock-access-token-new-student';
        }

        const sessionData = {
            access_token: token,
            refresh_token: 'mock-refresh-token-jwt-67890',
            user: {
                id: 'a0e0a0e0-0000-0000-0000-000000000002',
                email: email,
                app_metadata: { rol: rol, gimnasio_id: gymId },
                user_metadata: { nombre_completo: 'Test User' }
            },
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600
        };

        // Establecer la sesión en localStorage en múltiples posibles claves por compatibilidad
        const sessionKey1 = `sb-${supabaseAnonKey}-auth-token`;
        const sessionKey2 = `sb-${projectRef}-auth-token`;
        window.localStorage.setItem(sessionKey1, JSON.stringify(sessionData));
        window.localStorage.setItem(sessionKey2, JSON.stringify(sessionData));

        // Establecer cookies correspondientes para Next.js SSR middleware
        cy.setCookie(sessionKey1, JSON.stringify(sessionData), { path: '/', sameSite: 'lax', secure: false });
        cy.setCookie(sessionKey2, JSON.stringify(sessionData), { path: '/', sameSite: 'lax', secure: false });
    });
});


