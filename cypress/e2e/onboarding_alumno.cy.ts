/// <reference types="cypress" />

describe('Ficha Técnica de Onboarding del Alumno (RegistrationForm E2E)', () => {
    const testUserPassword = 'Password123!';

    beforeEach(() => {
        // Interceptar la llamada de actualización de perfil para verificar payloads en red (PATCH)
        cy.intercept('PATCH', '**/rest/v1/perfiles*', {
            statusCode: 200,
            body: { success: true }
        }).as('updateProfileRequest');
    });

    /**
     * TC-REG-001: Caso Feliz E2E - Flujo de 4 Pasos Completado Exitosamente
     */
    it('TC-REG-001: Debe pasar por los 4 pasos, rellenar datos válidos y redirigir a dashboard', () => {
        cy.loginByAuthAPI('alumno-nuevo-1@test.com', testUserPassword);
        cy.visit('/virtud/member/dashboard/profile/complete');

        // --- STEP 1: DATOS PERSONALES ---
        cy.contains('h3', 'Datos Personales').should('be.visible');

        // Completar campos del Step 1
        cy.get('input[name="dni"]').type('42998877');
        cy.get('select[name="genero"]').select('male');
        cy.get('input[name="birth_date"]').type('1995-10-15');
        cy.get('input[name="phone"]').type('+54911223344');
        cy.get('input[name="city"]').type('Palermo');
        cy.get('input[name="address"]').type('Av. Santa Fe 1234');

        // Avanzar
        cy.contains('button', 'Siguiente').click();

        // --- STEP 2: FICHA MÉDICA ---
        cy.contains('h3', 'Ficha Médica').should('be.visible');

        // Probar lógica condicional: seleccionar "Si" realiza actividad física
        cy.contains('¿Realiza actividad física?').parent().contains('Si').click();
        cy.get('input[placeholder*="Running"]').should('be.visible').type('Running y Natación');

        // Completar otros datos médicos
        cy.get('input[name*="medical.peso"]').type('78');
        cy.get('input[name*="medical.grupo_sanguineo"]').type('O+');
        cy.get('input[name*="medical.presion_arterial"]').type('Normal');
        cy.contains('¿Fuma?').click();
        cy.get('textarea[name*="medical.lesiones"]').type('Ninguna lesión reciente');
        cy.get('textarea[name*="medical.alergias"]').type('Ninguna alergia declarada');
        cy.get('textarea[name*="medical.enfermedades_cronicas"]').type('Ninguna');
        cy.get('textarea[name*="medical.patologias"]').type('Ninguna');
        cy.get('textarea[name*="medical.antecedentes"]').type('Sin antecedentes familiares graves');

        // Avanzar
        cy.contains('button', 'Siguiente').click();

        // --- STEP 3: CONTACTO DE EMERGENCIA ---
        cy.contains('h3', 'Contacto de Emergencia').should('be.visible');

        // Completar datos
        cy.get('input[name*="emergency.nombre_completo"]').type('María Pérez');
        cy.get('input[name*="emergency.relacion"]').type('Madre');
        cy.get('input[name*="emergency.telefono"]').type('+54911998877');
        cy.get('input[name*="emergency.direccion"]').type('Palermo, CABA');

        // Avanzar
        cy.contains('button', 'Siguiente').click();

        // --- STEP 4: LEGAL (DESLINDE) ---
        cy.contains('h3', 'Deslinde de Responsabilidad').should('be.visible');

        // Marcar aceptación legal (checkbox)
        cy.get('input[type="checkbox"]').check();

        // Finalizar y enviar formulario
        cy.contains('button', 'Finalizar Ficha').click();

        // Validar interceptación de red de Supabase
        cy.wait('@updateProfileRequest', { timeout: 15000 }).then((interception) => {
            expect(interception.response?.statusCode).to.eq(200);
            
            // Validar que el payload contenga la estructura JSONB esperada
            const body = interception.request.body;
            expect(body.dni).to.eq('42998877');
            expect(body.onboarding_completado).to.eq(true);
            expect(body.informacion_medica.fuma).to.eq(true);
            expect(body.contacto_emergencia.relacion).to.eq('Madre');
        });

        // Validar redirección a Dashboard
        cy.url({ timeout: 15000 }).should('include', '/dashboard');
        cy.contains('Ficha completada exitosamente').should('be.visible');
    });

    /**
     * TC-REG-002: Edge Case - Validación de DNI Obligatorio e Impedimento de Avance
     */
    it('TC-REG-002: Debe obligar al llenado de DNI y mostrar mensaje de error en pantalla al intentar avanzar', () => {
        cy.loginByAuthAPI('alumno-nuevo-2@test.com', testUserPassword);
        cy.visit('/virtud/member/dashboard/profile/complete');

        cy.contains('h3', 'Datos Personales').should('be.visible');

        // Dejar DNI vacío e intentar avanzar
        cy.contains('button', 'Siguiente').click();

        // Validar que se active el validador en la UI
        cy.contains('El DNI es obligatorio').should('be.visible');
        
        // Comprobar que seguimos en el Step 1 y no avanzamos de paso
        cy.contains('h3', 'Datos Personales').should('be.visible');
        cy.contains('h3', 'Ficha Médica').should('not.exist');
    });

    /**
     * TC-REG-003: Edge Case - Visibilidad Condicional Dinámica y Limpieza de Ficha Médica
     */
    it('TC-REG-003: Debe ocultar dinámicamente el campo de actividad al desmarcar la opción', () => {
        cy.loginByAuthAPI('alumno-nuevo-3@test.com', testUserPassword);
        cy.visit('/virtud/member/dashboard/profile/complete');

        // Completar Step 1 de forma básica para avanzar a Ficha Médica
        cy.get('input[name="dni"]').type('42998877');
        cy.get('select[name="genero"]').select('female');
        cy.get('input[name="birth_date"]').type('1998-05-20');
        cy.get('input[name="phone"]').type('1133445566');
        cy.get('input[name="city"]').type('Recoleta');
        cy.get('input[name="address"]').type('Av. Callao 1500');
        cy.contains('button', 'Siguiente').click();

        // --- STEP 2: FICHA MÉDICA ---
        cy.contains('h3', 'Ficha Médica').should('be.visible');

        // Seleccionar que SÍ hace actividad
        cy.contains('¿Realiza actividad física?').parent().contains('Si').click();
        cy.get('input[placeholder*="Running"]').should('be.visible').type('Running');

        // Cambiar selección a NO hace actividad
        cy.contains('¿Realiza actividad física?').parent().contains('No').click();

        // Validar que la caja condicional dinámica y el input de detalles ya no estén visibles en el DOM
        cy.get('input[placeholder*="Running"]').should('not.exist');
    });

    /**
     * TC-REG-004: Edge Case - Rechazo de Envío sin Firma Legal
     */
    it('TC-REG-004: Debe rechazar el submit final y mostrar alerta si no se aceptan los términos de deslinde legal', () => {
        cy.loginByAuthAPI('alumno-nuevo-4@test.com', testUserPassword);
        cy.visit('/virtud/member/dashboard/profile/complete');

        // Completar Step 1
        cy.get('input[name="dni"]').type('42998877');
        cy.get('select[name="genero"]').select('other');
        cy.get('input[name="birth_date"]').type('1990-12-01');
        cy.get('input[name="phone"]').type('1122339900');
        cy.get('input[name="city"]').type('Belgrano');
        cy.get('input[name="address"]').type('Cabildo 2000');
        cy.contains('button', 'Siguiente').click();

        // Completar Step 2
        cy.contains('¿Realiza actividad física?').parent().contains('No').click();
        cy.contains('button', 'Siguiente').click();

        // Completar Step 3
        cy.get('input[name*="emergency.nombre_completo"]').type('Juan Gomez');
        cy.get('input[name*="emergency.relacion"]').type('Amigo');
        cy.get('input[name*="emergency.telefono"]').type('1199884433');
        cy.contains('button', 'Siguiente').click();

        // --- STEP 4: LEGAL (DESLINDE) ---
        cy.contains('h3', 'Deslinde de Responsabilidad').should('be.visible');

        // Intentar dar submit sin aceptar los términos (checkbox desmarcado)
        // El botón "Finalizar Ficha" debe estar deshabilitado
        cy.contains('button', 'Finalizar Ficha').should('be.disabled');
        cy.url().should('include', '/profile/complete'); // Validar que seguimos retenidos en el onboarding
    });
});
