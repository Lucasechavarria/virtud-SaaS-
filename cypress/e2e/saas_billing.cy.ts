/// <reference types="cypress" />

describe('SaaS Global Billing & Catalog Management Flow', () => {

    beforeEach(() => {
        // Autenticar por API como Superadmin (rol superadmin, gymId null)
        cy.loginByAuthAPI('admin@virtudgym.com', 'Password123!');

        // Mocks de APIs B2B específicas de SaaS Admin
        cy.intercept('GET', '**/api/admin/billing*', {
            statusCode: 200,
            body: {
                gyms: [
                    {
                        id: 'gym-virtud',
                        nombre: 'Virtud Central',
                        slug: 'virtud',
                        estado_pago_saas: 'al_dia',
                        fecha_proximo_pago: '2029-12-31T00:00:00.000Z',
                        descuento_saas: 10,
                        planes_suscripcion: { nombre: 'Plan Elite Premium' }
                    },
                    {
                        id: 'gym-impago',
                        nombre: 'Fitness Club Legacy',
                        slug: 'fitness-club',
                        estado_pago_saas: 'pendiente',
                        fecha_proximo_pago: '2026-06-15T00:00:00.000Z',
                        descuento_saas: 0,
                        planes_suscripcion: { nombre: 'Plan Starter' }
                    }
                ]
            }
        }).as('getSaaSBilling');

        cy.intercept('GET', '**/api/admin/plans*', {
            statusCode: 200,
            body: {
                plans: [
                    {
                        id: 'plan-starter',
                        nombre: 'Plan Starter',
                        precio_mensual: 29.00,
                        limite_sucursales: 1,
                        limite_usuarios: 100,
                        caracteristicas: ['Módulo: Clases & Reservas', 'Soporte Técnico por Email']
                    },
                    {
                        id: 'plan-elite',
                        nombre: 'Plan Elite Premium',
                        precio_mensual: 99.00,
                        limite_sucursales: 3,
                        limite_usuarios: 1000,
                        caracteristicas: ['Módulo: Rutinas IA', 'Módulo: Visión Lab', 'Módulo: Clases & Reservas', 'Soporte Técnico 24/7']
                    }
                ]
            }
        }).as('getSaaSPlans');

        cy.intercept('POST', '**/api/admin/billing*', {
            statusCode: 200,
            body: { success: true }
        }).as('postSaaSBilling');

        cy.intercept('POST', '**/api/admin/plans*', {
            statusCode: 200,
            body: { success: true }
        }).as('createPlanApi');
    });

    it('should display SaaS billing overview, KPIs, and search gyms', () => {
        cy.visit('/saas-admin/billing');
        
        // 1. Esperar llamada de API y validar tabulador por defecto
        cy.wait('@getSaaSBilling');
        cy.contains('Facturación & Suscripciones B2B').should('be.visible');

        // 2. Validar KPIs de facturación global
        cy.contains('Activos al Día').parent().contains('1').should('be.visible');
        cy.contains('Pendientes de Pago').parent().contains('1').should('be.visible');

        // 3. Validar contenido de la tabla de cobros
        cy.get('tbody').contains('Virtud Central').should('be.visible');
        cy.get('tbody').contains('fitness-club').should('be.visible');
        cy.get('tbody').contains('AL DIA', { matchCase: false }).should('be.visible');

        // 4. Probar buscador funcional
        cy.get('input[placeholder*="Buscar gimnasio"]').type('Virtud');
        cy.get('tbody').contains('Virtud Central').should('be.visible');
        cy.get('tbody').contains('Fitness Club Legacy').should('not.exist');
    });

    it('should allow Superadmin to manage commercial plans catalog', () => {
        cy.visit('/saas-admin/billing');
        cy.wait('@getSaaSBilling');
        cy.wait(500); // Dar tiempo a la hidratación completa de React/Next.js

        // 1. Cambiar al tab de catálogo de planes
        cy.contains('button', 'Gestor de Planes').click({ force: true });
        
        // Esperar inmediatamente la llamada de red que se dispara con el cambio de tab
        cy.wait('@getSaaSPlans');

        // Esperar a que la pestaña anterior se desmonte del DOM (animación terminada)
        cy.contains('Clientes de la Red').should('not.exist');
        
        // 2. Validar visualización de los planes de la red
        cy.contains(/Plan Starter/i, { timeout: 15000 }).should('be.visible');
        cy.contains(/Plan Elite Premium/i, { timeout: 15000 }).should('be.visible');
        cy.contains('Precio Mensual').should('not.exist'); // Rajdhani font, uppercase rules
        
        // Validar que los límites dinámicos se renderizan correctamente (ej. Sedes)
        cy.contains(/Sedes/i).should('be.visible');

        // 3. Probar apertura del modal de creación de planes
        cy.contains('button', 'Crear Nuevo Plan').click();
        cy.contains('h3', /Nuevo Plan SaaS/i).should('exist');

        // 4. Completar formulario de nuevo plan
        cy.get('input[placeholder*="Plan VIP Elite"]').type('Plan Platinum IA');
        cy.get('input[type="checkbox"]').first().check(); // Activar primer módulo

        // 5. Enviar formulario
        cy.contains('button', 'Guardar Plan').click({ force: true });
        cy.wait('@createPlanApi');
        cy.contains('Nuevo plan catalogado con éxito').should('be.visible');
    });

    it('should support updating payment states and applying discounts', () => {
        cy.visit('/saas-admin/billing');
        cy.wait('@getSaaSBilling');

        // 1. Simular cambio de descuento de un gimnasio
        cy.get('input[type="number"]').first().clear().type('15').blur();
        cy.wait('@postSaaSBilling').then((interception) => {
            expect(interception.request.body).to.have.property('discount', 15);
        });
        cy.contains('Descuento del 15% aplicado').should('be.visible');

        // 2. Simular cambio de estado de pago (marcar como suspendido)
        cy.get('button[title="Suspender acceso"]').first().click();
        cy.wait('@postSaaSBilling').then((interception) => {
            expect(interception.request.body).to.have.property('status', 'unpaid');
        });
        cy.contains('Estado de pago actualizado').should('be.visible');
    });
});
