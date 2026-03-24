/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        login(email?: string, password?: string): Chainable<void>;
    }
}

Cypress.Commands.add('login', (email = 'admin@test.com', password = 'password123') => {
    cy.session([email, password], () => {
        // Opción 1: Login vía UI (más lento pero más realista)
        cy.visit('/login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').click();
        
        // No validamos estrictamente '/dashboard' aquí porque depende del ROL del usuario (SaaS).
        // Validamos que hemos salido de la página de login exitosamente.
        cy.url().should('not.include', '/login');

        // Opción 2 (Optimización futura): Login programático vía Supabase API
        // const { createClient } = require('@supabase/supabase-js');
        // const supabase = createClient(Cypress.env('SUPABASE_URL'), Cypress.env('SUPABASE_KEY'));
        // cy.wrap(supabase.auth.signInWithPassword({ email, password })).then(...)
    });
});
