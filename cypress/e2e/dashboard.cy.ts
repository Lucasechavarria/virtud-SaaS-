
/// <reference types="cypress" />

describe.skip('Student Dashboard', () => {

    beforeEach(() => {
        cy.session('student-session', () => {
            cy.clearCookies();
            cy.clearLocalStorage();
            // Login as Student
            cy.visit('/login');
            cy.get('input[name="email"]').type('student@test.com');
            cy.get('input[name="password"]').type('password123');
            cy.get('button[type="submit"]').click();
            cy.url().should('include', '/dashboard');
        });
    });

    it('should display main dashboard widgets', () => {
        cy.visit('/dashboard');

        // Verificar elementos clave del dashboard de estudiante
        cy.contains('Bienvenido').should('exist'); // Saludo común

        // Verificar navegación
        cy.get('nav').should('be.visible');
        cy.contains('Mi Rutina').should('be.visible');
        cy.contains('Mi Progreso').should('be.visible');
    });

    it('should navigate to routine page', () => {
        cy.visit('/dashboard');
        cy.contains('Mi Rutina').click();
        cy.url().should('include', '/dashboard/routine');
        cy.contains('Tu Plan de Entrenamiento').should('exist');
    });

    it('should load progress charts', () => {
        cy.visit('/dashboard/progress');
        // Verificar que los componentes de gráficas cargan (aunque estén vacíos)
        cy.get('canvas').should('exist'); // Chart.js usa canvas
    });
});
