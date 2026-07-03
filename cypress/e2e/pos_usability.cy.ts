/// <reference types="cypress" />

describe('POS Shortcuts and Mobile Responsiveness Usability Flow', () => {

    beforeEach(() => {
        // Autenticar como administrador del gimnasio
        cy.login('gym-admin@virtudgym.com', 'Password123!');

        // Mockear estado de caja abierta
        cy.intercept('GET', '**/api/admin/reception/cash-status*', {
            statusCode: 200,
            body: {
                isOpen: true,
                montoInicial: 5000,
                fechaApertura: new Date().toISOString(),
                egresos: [],
                ventasEfectivo: 0,
                ventasTarjeta: 0,
                ventasQR: 0
            }
        }).as('getCashStatus');

        // Mockear lista de productos
        cy.intercept('GET', '**/api/admin/products*', {
            statusCode: 200,
            body: {
                products: [
                    {
                        id: 'prod-123',
                        nombre: 'Bebida Isotónica',
                        precio_venta: 150,
                        stock_actual: 10,
                        categoria: 'Suplementos'
                    }
                ]
            }
        }).as('getProducts');

        // Mockear planes
        cy.intercept('GET', '**/api/admin/gym-plans*', {
            statusCode: 200,
            body: {
                plans: []
            }
        }).as('getPlans');

        // Mockear lista de usuarios
        cy.intercept('GET', '**/api/admin/users/list*', {
            statusCode: 200,
            body: {
                users: []
            }
        }).as('getUsers');
    });

    it('should navigate tabs using Alt + 1, Alt + 2 and Alt + 3 on desktop view', () => {
        // Establecer viewport de escritorio
        cy.viewport(1280, 800);

        cy.visit('/tenants/virtud/admin/recepcion/pos', { failOnStatusCode: false });
        cy.wait('@getCashStatus');
        cy.wait('@getProducts');
        cy.wait(1000);

        // La pestaña activa por defecto debe ser "tienda"
        cy.contains('button', 'Tienda').should('have.class', 'bg-emerald-500');

        // Presionar Alt + 2 para cambiar a "Membresías"
        cy.get('body').trigger('keydown', { key: '2', altKey: true });
        cy.contains('button', 'Membresías').should('have.class', 'bg-emerald-500');
        cy.contains('button', 'Tienda').should('not.have.class', 'bg-emerald-500');

        // Presionar Alt + 3 para cambiar a "Caja"
        cy.get('body').trigger('keydown', { key: '3', altKey: true });
        cy.contains('button', 'Caja').should('have.class', 'bg-emerald-500');

        // Presionar Alt + 1 para volver a "Tienda"
        cy.get('body').trigger('keydown', { key: '1', altKey: true });
        cy.contains('button', 'Tienda').should('have.class', 'bg-emerald-500');
    });

    it('should show the mobile floating cart button and handle scroll in mobile viewport', () => {
        // Establecer viewport de celular (iPhone 6)
        cy.viewport('iphone-6');

        cy.visit('/tenants/virtud/admin/recepcion/pos', { failOnStatusCode: false });
        cy.wait('@getCashStatus');
        cy.wait('@getProducts');
        cy.wait(1000);

        // No debería mostrarse el botón flotante ya que el carrito está vacío
        cy.contains('button', 'Ver Ticket').should('not.exist');

        // Hacer clic en un producto para agregarlo al carrito
        cy.contains('h3', 'Bebida Isotónica').click({ force: true });

        // Debería aparecer el botón flotante con el total
        cy.contains('button', 'Ver Ticket ($150)').should('be.visible');

        // Hacer clic en el botón flotante para ir al ticket
        cy.contains('button', 'Ver Ticket ($150)').click({ force: true });

        // El ticket virtual debería estar visible
        cy.get('#ticket-virtual-container').should('be.visible');
    });

    it('should NOT trigger keyboard shortcuts in mobile viewport', () => {
        // Establecer viewport de celular (iPhone 6)
        cy.viewport('iphone-6');

        cy.visit('/tenants/virtud/admin/recepcion/pos', { failOnStatusCode: false });
        cy.wait('@getCashStatus');
        cy.wait('@getProducts');
        cy.wait(1000);

        // La pestaña activa debe ser "tienda"
        cy.contains('button', 'Tienda').should('have.class', 'bg-emerald-500');

        // Intentar cambiar con Alt + 2
        cy.get('body').trigger('keydown', { key: '2', altKey: true });

        // Debe seguir en Tienda (los atajos están bloqueados en resoluciones móviles)
        cy.contains('button', 'Tienda').should('have.class', 'bg-emerald-500');
        cy.contains('button', 'Membresías').should('not.have.class', 'bg-emerald-500');
    });
});
