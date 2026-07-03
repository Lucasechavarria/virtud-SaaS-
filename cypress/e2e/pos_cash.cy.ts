/// <reference types="cypress" />

describe('POS Cash Register and Shift Verification Flow', () => {

    beforeEach(() => {
        // Autenticar como administrador del gimnasio
        cy.login('gym-admin@virtudgym.com', 'Password123!');
    });

    it('should show the opening cash register modal when cash register is closed', () => {
        // Mockear que la caja está cerrada
        cy.intercept('GET', '**/api/admin/reception/cash-status*', {
            statusCode: 200,
            body: {
                isOpen: false,
                montoInicial: 0,
                fechaApertura: null,
                egresos: [],
                ventasEfectivo: 0,
                ventasTarjeta: 0,
                ventasQR: 0
            }
        }).as('getCashStatusClosed');

        cy.intercept('POST', '**/api/admin/reception/cash-open', {
            statusCode: 200,
            body: {
                success: true,
                message: 'Apertura de caja registrada exitosamente'
            }
        }).as('postCashOpen');

        cy.visit('/tenants/virtud/admin/recepcion/pos', { failOnStatusCode: false });
        cy.wait('@getCashStatusClosed');

        // Verificar que el modal de apertura esté visible y bloquee la interfaz
        cy.contains('h2', /Apertura de Caja/i).should('be.visible');
        cy.contains('button', /Iniciar Caja y Turno/i).should('be.disabled');

        // Ingresar un monto inicial y hacer clic en Iniciar
        cy.get('input[placeholder="Ej: 5000"]').type('5000');
        cy.contains('button', /Iniciar Caja y Turno/i).should('not.be.disabled').click();

        cy.wait('@postCashOpen').then((interception) => {
            expect(interception.request.body).to.deep.equal({ montoInicial: 5000, gymId: 'virtud' });
        });
    });

    it('should allow adding egresos and closing the cash register when it is open', () => {
        // Mockear que la caja está abierta
        cy.intercept('GET', '**/api/admin/reception/cash-status*', {
            statusCode: 200,
            body: {
                isOpen: true,
                montoInicial: 8000,
                fechaApertura: new Date().toISOString(),
                egresos: [
                    { id: '1', concepto: 'Café', monto: 120, fecha: new Date().toISOString() }
                ],
                ventasEfectivo: 4500,
                ventasTarjeta: 3200,
                ventasQR: 1500,
                aperturaId: 'mock-apertura-uuid'
            }
        }).as('getCashStatusOpen');

        cy.intercept('POST', '**/api/admin/reception/cash-egreso', {
            statusCode: 200,
            body: {
                success: true,
                egreso: { id: '2', concepto: 'Papelería', monto: 350, fecha: new Date().toISOString() }
            }
        }).as('postCashEgreso');

        cy.intercept('POST', '**/api/admin/reception/cash-close', {
            statusCode: 200,
            body: {
                success: true,
                message: 'Arqueo de caja y cierre de turno registrado exitosamente'
            }
        }).as('postCashClose');

        cy.intercept('GET', '**/api/admin/reception/cash-history*', {
            statusCode: 200,
            body: {
                success: true,
                history: []
            }
        }).as('getCashHistory');

        cy.visit('/tenants/virtud/admin/recepcion/pos', { failOnStatusCode: false });
        cy.wait('@getCashStatusOpen');
        cy.wait(1000); // Dar tiempo para la hidratación y re-renders iniciales de React

        // No debería mostrar el modal de apertura
        cy.contains('h2', /Apertura de Caja/i).should('not.exist');

        // Ir a la pestaña de Caja
        cy.contains('button', 'Caja').click({ force: true });
        cy.wait(500); // Esperar a que la transición del tab se estabilice

        // Verificar montos esperados usando regex para adaptarnos a comas o puntos del locale
        cy.contains('Turno de Caja Activo').should('be.visible');
        cy.contains(/8[.,]000/).should('be.visible'); // Monto inicial
        cy.contains(/4[.,]500/).should('be.visible'); // Ventas efectivo
        cy.contains(/3[.,]200/).should('be.visible'); // Ventas tarjeta
        cy.contains(/1[.,]500/).should('be.visible'); // Ventas QR / MP

        // Verificar egresos
        cy.contains('Café').should('be.visible');
        cy.contains('120').should('be.visible');

        // Registrar un nuevo egreso menor
        cy.get('button').contains(/Registrar Egreso/i).click({ force: true });
        cy.get('input[placeholder="Ej: Artículos de limpieza"]').type('Papelería');
        cy.get('input[placeholder="Ej: 500"]').type('350');
        cy.contains('button', /Guardar Egreso/i).click();

        cy.wait('@postCashEgreso').then((interception) => {
            expect(interception.request.body).to.deep.equal({
                concepto: 'Papelería',
                monto: 350,
                gymId: 'virtud'
            });
        });

        // Abrir arqueo y cierre
        cy.contains('button', /Realizar Arqueo y Cierre/i).click();
        cy.contains('h3', /Arqueo y Cierre de Caja/i).should('be.visible');

        // Ingresar los montos declarados
        cy.get('input[placeholder="0"]').eq(0).type('12380'); // Efectivo Real (8000 + 4500 - 120 = 12380)
        cy.get('input[placeholder="0"]').eq(1).type('1500'); // QR Real
        cy.get('input[placeholder="0"]').eq(2).type('3200'); // Tarjeta Real

        cy.contains('button', /Confirmar Cierre/i).click();
        cy.wait('@postCashClose');
    });
});
