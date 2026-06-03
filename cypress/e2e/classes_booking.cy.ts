/// <reference types="cypress" />

describe('Student Classes Booking Flow', () => {

    describe('Waiver Restricton (Ficha Médica Incompleta)', () => {
        beforeEach(() => {
            // alumno-nuevo@test.com tiene onboarding_completado: false y waiver_accepted: false
            cy.loginByAuthAPI('alumno-nuevo@test.com', 'Password123!');
        });

        it('should show locking medical waiver modal and disable booking buttons', () => {
            cy.visit('/virtud/member/booking');

            // 1. Verificar presencia de modal bloqueante
            cy.contains('¡Atención, Campeón!').should('be.visible');
            cy.contains(/es necesario que completes tu.*Ficha Médica/i).should('be.visible');

            // 2. Verificar que los botones de reserva tienen la clase disabled u opaca y están inactivos
            cy.contains('button', 'Reservar').should('be.disabled');
            
            // 3. Verificar enlace para completar la ficha
            cy.contains('a', 'Completar Ficha Ahora')
                .should('have.attr', 'href', '/dashboard/profile/complete');
        });
    });

    describe('Happy Path & Edge Cases (Ficha Médica al Día)', () => {
        beforeEach(() => {
            // student@virtudgym.com tiene onboarding_completado: true y waiver_accepted: true
            cy.loginByAuthAPI('student@virtudgym.com', 'Password123!');
        });

        it('should allow booking a class with available spots', () => {
            cy.visit('/virtud/member/booking');

            // 1. El modal de advertencia de deslinde médico NO debe existir en el DOM
            cy.contains('¡Atención, Campeón!').should('not.exist');

            // 2. El botón de reservar debe estar activo para CrossFit WOD
            cy.contains('h3', 'CrossFit WOD')
                .parents('.bg-\\[\\#1c1c1e\\]')
                .contains('button', 'Reservar')
                .should('not.be.disabled')
                .click();

            // 3. Verificar toast de confirmación exitosa
            cy.contains('Reserva para CrossFit WOD enviada.').should('be.visible');
        });

        it('should display "Lleno" and disable button for classes with 0 spots', () => {
            cy.visit('/virtud/member/booking');

            // 1. Ubicar la clase "Funcional" que tiene 0 spots (definido en mockClasses)
            cy.contains('h3', 'Funcional')
                .parents('.bg-\\[\\#1c1c1e\\]')
                .within(() => {
                    cy.contains('Lista de espera').should('be.visible');
                    cy.contains('button', 'Lleno')
                        .should('be.disabled');
                });
        });
    });
});
