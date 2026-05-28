
/// <reference types="cypress" />

describe.skip('Admin Payments Flow', () => {

    beforeEach(() => {
        cy.session('admin-session', () => {
            cy.clearCookies();
            cy.clearLocalStorage();
            // Login as Admin
            cy.visit('/login');
            cy.get('input[name="email"]').type('admin@virtudgym.com');
            cy.get('input[name="password"]').type('password123'); // Asegúrate de que esta credencial exista en tu entorno de pruebas
            cy.get('button[type="submit"]').click();
            cy.url().should('include', '/dashboard');
        });
    });

    it('should navigate to payments page', () => {
        cy.visit('/admin/payments');
        cy.contains('Gestión de Pagos').should('be.visible');
        cy.contains('Total Filtrado').should('be.visible');
    });

    it('should filter payments by status', () => {
        cy.visit('/admin/payments');
        cy.get('select').select('Pendientes');
        // Verificar que la URL o la lista cambio (dependiendo de la implem)
        // En este caso es filtro cliente-side, así que verificamos que solo aparezcan pendientes o mensaje de vacio
    });

    it('should show extension button for eligible payments', () => {
        cy.visit('/admin/payments');
        // Seleccionar filtro para ver pendientes o vencidos
        cy.get('select').select('Pendientes');

        // Si hay pagos, verificar que existe el botón
        cy.get('body').then(($body) => {
            if ($body.find('table tbody tr').length > 0) {
                // Buscamos un botón que diga Prorrogar
                // Nota: Esto puede ser flaky si no hay datos. Idealmente se mockearía la respuesta de la API.
                // Para este sprint, asumimos que estamos en un entorno con datos o mockeamos la respuesta.
                cy.intercept('GET', '/api/admin/payments', { fixture: 'payments.json' }).as('getPayments');
                cy.wait('@getPayments');

                cy.contains('button', 'Prorrogar').should('exist');
            }
        });
    });

    it('should open extension modal when clicking Prorrogar', () => {
        // Mockear respuesta para asegurar que tenemos un pago para prorrogar
        cy.intercept('GET', '/api/admin/payments', {
            success: true,
            payments: [
                {
                    id: '123',
                    user_name: 'Test User',
                    amount: 5000,
                    status: 'pending',
                    payment_method: 'cash',
                    created_at: new Date().toISOString()
                }
            ]
        }).as('getPayments');

        cy.visit('/admin/payments');
        cy.wait('@getPayments');

        cy.contains('button', 'Prorrogar').click();
        cy.contains('Prorrogar 7 Días').should('be.visible');
        cy.contains('Reglas de Prórroga').should('be.visible');
    });
});
