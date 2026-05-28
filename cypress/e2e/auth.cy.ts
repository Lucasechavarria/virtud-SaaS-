
/// <reference types="cypress" />

describe('Authentication Flow', () => {

    // Reset session before each test to ensure clean state
    beforeEach(() => {
        cy.session('clear', () => {
            cy.clearCookies();
            cy.clearLocalStorage();
        });
    });

    it('should redirect to login page when accessing protected route', () => {
        cy.visit('/dashboard');
        cy.url().should('include', '/login');
    });

    it('should display error for invalid credentials', () => {
        cy.visit('/login');
        cy.get('input[name="email"]').type('invalid@user.com');
        cy.get('input[name="password"]').type('wrongpassword');
        cy.get('button[type="submit"]').click();

        // Asumiendo que Toaster muestra un mensaje de error
        cy.contains('Credenciales inválidas').should('be.visible');
        // O alternativamente verificar que seguimos en /login
        cy.url().should('include', '/login');
    });

    it('should allow Admin to login and redirect to dashboard', () => {
        const email = 'admin@virtudgym.com';
        const password = 'Password123!';

        cy.visit('/login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').click();

        // El Superadmin redirige a /saas-admin
        cy.url({ timeout: 15000 }).should('include', '/saas-admin');
    });

    it('should allow Student to login', () => {
        const email = 'student@virtudgym.com';
        const password = 'Password123!';

        cy.visit('/login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').click();

        // El Alumno redirige a /dashboard o /[gymId]/member/dashboard
        cy.url({ timeout: 15000 }).should('include', '/dashboard');
        cy.contains('Mis Pagos', { timeout: 15000 }).should('exist');
    });
});
