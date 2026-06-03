/// <reference types="cypress" />

describe('Admin Payments & SaaS Billing Flow (MercadoPago Hub)', () => {

    beforeEach(() => {
        // Autenticar por UI usando el rol de administrador local específico para el tenant
        cy.login('gym-admin@virtudgym.com', 'Password123!');
    });

    it('should navigate to MercadoPago Hub and display correct branding', () => {
        cy.visit('/tenants/virtud/admin/finance', { failOnStatusCode: false });
        cy.contains('h1', /MercadoPago/i).should('be.visible');
        cy.contains('h1', /Hub/i).should('be.visible');
        cy.contains('p', /Control Financiero y Facturación SaaS/i).should('be.visible');
    });

    it('should display correct revenue statistics cards based on mock ledger', () => {
        cy.visit('/tenants/virtud/admin/finance', { failOnStatusCode: false });
        
        // Validar tarjetas de estadísticas rápidas
        cy.contains('h3', 'Recaudación Red').should('be.visible');
        cy.contains('p', '$5,000').should('be.visible'); // Suma de pagos aprobados en mock ($5,000)
        
        cy.contains('h3', 'Total Transacciones').should('be.visible');
        cy.contains('p', '2').should('be.visible'); // 2 transacciones en el mock global
    });

    it('should allow filtering payments by Gym', () => {
        cy.visit('/tenants/virtud/admin/finance', { failOnStatusCode: false });

        // Seleccionar gimnasio específico
        cy.get('select').first().select('virtud', { force: true });
        
        // Validar que se liste la transacción del alumno mockeado
        cy.contains('Test Student').should('be.visible');
        cy.contains('Pending Student').should('be.visible');
    });

    it('should switch tabs to SaaS Subscription and display AI Wallet details', () => {
        cy.visit('/tenants/virtud/admin/finance', { failOnStatusCode: false });
        cy.wait(1000); // Esperar a la hidratación y estabilización de los componentes de React

        // Hacer clic en la pestaña "Mi Suscripción SaaS"
        cy.contains('button', 'Mi Suscripción SaaS')
            .should('be.visible')
            .click({ force: true });

        // Validar que se muestre el portal de consumo y el AI Wallet
        cy.contains('h3', 'Portal Transparente de Consumo SaaS').should('be.visible');
        cy.contains('h4', 'Monedero Virtual de IA (AI Wallet)').should('be.visible');
        
        // Validar saldo del AI Wallet del mock ($50.00 USD)
        cy.contains('$50.00 USD').should('be.visible');
        
        // Validar la previsualización detallada de la factura mensual
        cy.contains('Previsualización de Facturación Mensual Detallada').should('be.visible');
        cy.contains('Total Estimado Próxima Factura:').should('be.visible');
        cy.contains('$174.00 USD').should('be.visible'); // Total Amount del mock global
    });
});
