/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        login(email?: string, password?: string): Chainable<void>;
    }
}

Cypress.Commands.add('login', (email = 'admin@test.com', password = 'password123') => {
    cy.session([email, password], () => {
        // Interceptar la llamada a Supabase Auth
        cy.intercept('POST', '**/auth/v1/token*').as('loginRequest');

        cy.visit('/login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').click();
        
        // Esperar a que la autenticación ocurra físicamente
        cy.wait('@loginRequest', { timeout: 15000 }).then((interception) => {
            expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
        });
        
        // Dar un pequeño respiro extra para la escritura de cookies en disco
        cy.wait(500);

        // No validamos estrictamente '/dashboard' aquí porque depende del ROL del usuario (SaaS).
        // Validamos que hemos salido de la página de login exitosamente.
        cy.url({ timeout: 15000 }).should('not.include', '/login');
    });
});
