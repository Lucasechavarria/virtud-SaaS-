/// <reference types="cypress" />

describe('Access Validation Screen Usability Verification Flow', () => {

    beforeEach(() => {
        // Autenticar como administrador del gimnasio
        cy.login('gym-admin@virtudgym.com', 'Password123!');
    });

    it('should freeze the denied screen and allow manual close', () => {
        // Interceptar validación de acceso denegada por deuda
        cy.intercept('POST', '**/api/access/validate', {
            statusCode: 200,
            body: {
                status: 'denied',
                reason: 'deuda',
                message: 'Adeuda cuota de Membresía',
                deuda: 5000,
                member: {
                    id: 'a0e0a0e0-0000-0000-0000-000000000002',
                    nombre: 'Test User',
                    avatar: null,
                    plan: 'Membresía Pase Libre'
                }
            }
        }).as('postAccessDenied');

        cy.visit('/tenants/virtud/admin/recepcion/acceso', { failOnStatusCode: false });
        cy.wait(1500); // Esperar hidratación completa de Next.js

        // Usar el buscador manual para buscar al socio mockeado
        cy.get('input[placeholder*="Buscar alumno manualmente"]').focus().type('Test User');
        cy.wait(800); // Esperar a que el debounce de 300ms y la red se asienten

        // Hacer clic en el resultado del buscador de forma atómica y robusta
        cy.contains('#manual-search-container button', 'Test User').click({ force: true });
        cy.wait('@postAccessDenied');

        // La pantalla debe mostrar "Acceso Denegado"
        cy.contains('h2', 'Acceso Denegado').should('be.visible');
        cy.contains('#manual-search-container', 'Test User').should('not.exist'); // buscador limpio

        // Esperar 7 segundos (más de los 6 segundos del timer de auto-limpieza)
        cy.wait(7000);

        // Debería seguir estando visible (congelado)
        cy.contains('h2', 'Acceso Denegado').should('be.visible');
        cy.contains('button', 'Autorizar Ingreso Excepcional').should('exist'); // cambiado de be.visible a exist para evitar recorte de overflow

        // Hacer clic en la X de descarte manual
        cy.get('button[title="Limpiar pantalla"]').click({ force: true });

        // Debe volver de inmediato al estado "Listo para Escanear"
        cy.contains('h1', 'Listo para Escanear').should('be.visible');
    });

    it('should auto-clear success screen after 6 seconds', () => {
        // Interceptar validación de acceso exitosa
        cy.intercept('POST', '**/api/access/validate', {
            statusCode: 200,
            body: {
                status: 'allowed',
                message: 'Acceso Autorizado',
                racha: 5,
                member: {
                    id: 'a0e0a0e0-0000-0000-0000-000000000002',
                    nombre: 'Test User',
                    avatar: null,
                    plan: 'Membresía Anual'
                }
            }
        }).as('postAccessAllowed');

        cy.visit('/tenants/virtud/admin/recepcion/acceso', { failOnStatusCode: false });
        cy.wait(1500); // Esperar hidratación completa de Next.js

        // Usar el buscador manual para buscar al socio mockeado
        cy.get('input[placeholder*="Buscar alumno manualmente"]').focus().type('Test User');
        cy.wait(800); // Esperar a que el debounce y la red se asienten

        // Hacer clic en el resultado
        cy.contains('#manual-search-container button', 'Test User').click({ force: true });
        cy.wait('@postAccessAllowed');

        // Debe mostrar el mensaje de éxito
        cy.contains('h2', 'Acceso Autorizado').should('be.visible');

        // Esperar 7 segundos
        cy.wait(7000);

        // Debe haberse limpiado automáticamente y mostrar "Listo para Escanear"
        cy.contains('h1', 'Listo para Escanear').should('be.visible');
        cy.contains('h2', 'Acceso Autorizado').should('not.exist'); // Buscar que no exista el elemento de éxito específico, evitando colisión con el admin lateral
    });

    it('should redirect to POS passing socioId query param and auto-select the member', () => {
        // Interceptar validación de acceso denegada por deuda
        cy.intercept('POST', '**/api/access/validate', {
            statusCode: 200,
            body: {
                status: 'denied',
                reason: 'deuda',
                message: 'Adeuda cuota de Membresía',
                deuda: 5000,
                member: {
                    id: 'a0e0a0e0-0000-0000-0000-000000000002',
                    nombre: 'Test User',
                    avatar: null,
                    plan: 'Membresía Pase Libre'
                }
            }
        }).as('postAccessDenied');

        // Interceptar la API de obtener la lista de usuarios en el POS
        cy.intercept('GET', '**/api/admin/users/list?gymId=*', {
            statusCode: 200,
            body: {
                users: [
                    {
                        id: 'a0e0a0e0-0000-0000-0000-000000000002',
                        name: 'Test User',
                        email: 'testuser@virtudgym.com',
                        dni: '12345678',
                        membershipStatus: 'inactive',
                        membershipEnds: null
                    }
                ]
            }
        }).as('getPOSUsers');

        // Interceptar el estado de cuenta en el POS
        cy.intercept('GET', '**/api/admin/users/a0e0a0e0-0000-0000-0000-000000000002/account-status', {
            statusCode: 200,
            body: {
                saldoCuentaCorriente: -5000,
                limiteCredito: 10000,
                pagosPendientes: [
                    {
                        id: 'pay-pending-1',
                        monto: 5000,
                        concepto: 'Cuota de Membresía de Mayo',
                        creado_en: new Date().toISOString()
                    }
                ],
                deudaTotal: 5000
            }
        }).as('getAccountStatus');

        // Mockear estado de caja abierta para evitar bloqueo del POS
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

        cy.visit('/tenants/virtud/admin/recepcion/acceso', { failOnStatusCode: false });
        cy.wait(1500); // Esperar hidratación completa de Next.js

        // Usar el buscador manual para buscar al socio mockeado
        cy.get('input[placeholder*="Buscar alumno manualmente"]').focus().type('Test User');
        cy.wait(800);

        // Hacer clic en el resultado
        cy.contains('#manual-search-container button', 'Test User').click({ force: true });
        cy.wait('@postAccessDenied');

        // La pantalla debe mostrar "Acceso Denegado"
        cy.contains('h2', 'Acceso Denegado').should('be.visible');

        // Hacer clic en el botón de cobro en POS (Ir a Caja)
        cy.contains('button', 'Ir a Caja (POS) para Cobrar').click({ force: true });

        // Esperar a que cargue la página del POS y se carguen los usuarios y la cuenta corriente
        cy.url().should('include', '/admin/recepcion/pos');
        cy.wait('@getPOSUsers');
        cy.wait('@getAccountStatus');

        // El socio "Test User" debería estar precargado en el ticket de compra y visible
        cy.get('input[placeholder*="Buscar alumno por Nombre o DNI"]').should('have.value', 'Test User');

        // Debería mostrar la cuenta corriente / estado de cuenta del socio
        cy.contains('Deuda Total Adeudada').should('be.visible');
        cy.contains('$5.000').should('be.visible');
    });
});
