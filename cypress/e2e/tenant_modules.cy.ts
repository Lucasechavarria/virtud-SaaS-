/// <reference types="cypress" />

describe('Multi-Tenant Module Gating & Blocking Flow', () => {

    describe('As Student (Member Role)', () => {
        beforeEach(() => {
            cy.loginByAuthAPI('student@virtudgym.com', 'Password123!');
        });

        it('should allow access to active modules', () => {
            // nutrition está contratado en los mocks globales por defecto
            cy.visit('/virtud/member/dashboard/nutrition');
            cy.url().should('include', '/member/dashboard/nutrition');
            cy.contains('Módulo de Nutrición Bloqueado').should('not.exist');
        });

        it('should show user-friendly blocked message and suggest sending recommendations', () => {
            // Visitar directamente la pantalla de bloqueo simulando módulo Nutrición bloqueado
            cy.visit('/virtud/modulo-bloqueado?modulo=Nutricion');

            // 1. Validar etiquetas y títulos
            cy.contains('Servicio No Contratado').should('be.visible');
            cy.contains('h1', 'Módulo de Nutricion Bloqueado').should('be.visible');

            // 2. Validar que la explicación del bloqueo es específica para el Alumno
            cy.contains('Tu centro deportivo aún no tiene contratado este servicio').should('be.visible');

            // 3. Validar botones específicos para alumno
            cy.contains('button', 'Enviar Sugerencia a Administración').should('be.visible');
            cy.contains('button', 'Adquirir Módulo en SaaS Admin').should('not.exist');

            // 4. Validar enlace de retorno seguro
            cy.contains('button', 'Volver al Panel Seguro').should('be.visible');
        });
    });

    describe('As Gym Administrator (Admin Role)', () => {
        beforeEach(() => {
            // admin@virtudgym.com es detectado como superadmin/admin
            cy.loginByAuthAPI('admin@virtudgym.com', 'Password123!');
        });

        it('should show administrative blocked message and option to upgrade in SaaS Admin', () => {
            cy.visit('/virtud/modulo-bloqueado?modulo=Nutricion');

            // 1. Validar que la explicación es de administrador
            cy.contains('Este módulo no se encuentra activo en el plan contratado por tu gimnasio').should('be.visible');

            // 2. Validar botón de redirección de compra en SaaS Admin
            cy.contains('button', 'Adquirir Módulo en SaaS Admin')
                .should('be.visible')
                .click();

            // 3. Verificar que redirige al Superadmin Billing
            cy.url().should('include', '/saas-admin/billing');
        });
    });
});
