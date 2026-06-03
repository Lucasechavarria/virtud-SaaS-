/// <reference types="cypress" />

describe('Student Dashboard', () => {

    beforeEach(() => {
        // Autenticar por API con credenciales de estudiante válidas
        cy.loginByAuthAPI('student@virtudgym.com', 'Password123!');
    });

    it('should display main dashboard widgets', () => {
        // Visitar el dashboard multi-tenant en localhost
        cy.visit('/virtud/member/dashboard');

        // Verificar elementos clave del dashboard de estudiante
        cy.contains(/(?:Bienvenido|Status|Campeón)/i).should('exist'); // Saludo común o premium en DashboardHeader

        // Verificar navegación lateral (Sidebar)
        cy.get('nav').should('be.visible');
        cy.contains('Mi Rutina').should('be.visible');
        cy.contains('Mi Progreso').should('be.visible');
    });

    it('should navigate to routine page', () => {
        cy.visit('/virtud/member/dashboard');
        cy.contains('Mi Rutina').click();
        
        // La URL debe cambiar a la sección de rutina multi-tenant
        cy.url().should('include', '/member/dashboard/routine');
        cy.contains(/(?:Plan de Fuerza|Plan de Entrenamiento|Tactical Plan)/i).should('exist');
    });

    it('should load progress charts', () => {
        // Visitar directamente la sección de progreso multi-tenant
        cy.visit('/virtud/member/dashboard/progress');
        
        // Verificar que los componentes de gráficas cargan (Recharts usa SVG)
        cy.get('svg').should('exist');
    });
});
