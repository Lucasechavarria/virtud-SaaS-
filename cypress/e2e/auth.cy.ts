
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
        // [Requiere Seed de Base de Datos para CI/CD]
        const email = 'admin@virtudgym.com'; // Credencial de prueba
        const password = 'Password123!';

        cy.login(email, password);
        // El Superadmin (definido en el seed para este correo) redirige a /saas-admin
        cy.url().should('include', '/saas-admin');
        // Verificar que el sidebar muestra opciones de admin si es posible
        // cy.contains('Panel de Control').should('be.visible');
    });

    it('should allow Student to login', () => {
        // [Requiere Seed de Base de Datos para CI/CD]
        const password = 'Password123!';
        const email = 'student@virtudgym.com'; // Definimos email antes del llamado
        cy.login(email, password);
        // El Alumno (definido en el seed para este correo) redirige a /[gymId]/member/dashboard
        cy.url().should('include', '/dashboard');
        cy.contains('Mis Pagos').should('exist'); // Elemento típico de estudiante
    });
});
