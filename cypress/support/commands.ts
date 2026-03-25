/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        login(email?: string, password?: string): Chainable<void>;
    }
}

Cypress.Commands.add('login', (email = 'admin@virtudgym.com', password = 'Password123!') => {
    cy.session([email, password], () => {
        cy.intercept('POST', '**/auth/v1/token*').as('loginRequest');

        cy.visit('/login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').click();

        cy.wait('@loginRequest', { timeout: 15000 }).then((interception) => {
            const status = interception.response?.statusCode;
            const body = interception.response?.body;
            
            if (status !== 200 && status !== 201) {
                const errorMsg = body?.error_description || body?.error || 'Unknown error';
                console.error('[CYPRESS_AUTH_ERROR]', JSON.stringify(body, null, 2));
                throw new Error(`Supabase Auth Failed (${status}): ${errorMsg} | Body: ${JSON.stringify(body)}`);
            }
        });

        cy.url({ timeout: 15000 }).should('not.include', '/login');
    });
});
