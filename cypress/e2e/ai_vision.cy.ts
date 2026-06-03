/// <reference types="cypress" />

describe('AI Biomechanical Vision Form Pipeline', () => {

    beforeEach(() => {
        // Autenticar por API como alumno regular
        cy.loginByAuthAPI('student@virtudgym.com', 'Password123!');

        // Mockear consulta a la biblioteca de ejercicios de Supabase
        cy.intercept('GET', '**/rest/v1/ejercicios*', {
            statusCode: 200,
            body: [
                { id: 'ex-squat', nombre: 'Sentadilla Trasera', grupo_muscular: 'Piernas' },
                { id: 'ex-deadlift', nombre: 'Peso Muerto', grupo_muscular: 'Espalda/Piernas' }
            ]
        }).as('getExercises');
    });

    it('should upload video, execute biometric analysis and save to training history', () => {
        // Visitar la página del Laboratorio de IA en el tenant
        cy.visit('/virtud/member/dashboard/vision');
        cy.wait('@getExercises');

        // 1. Validar HUD inicial táctico
        cy.contains('AI Biomechanical Lab').should('be.visible');
        cy.contains('Vision Form').should('be.visible');
        cy.contains('Esperando Datos de Imagen').should('be.visible');

        // 2. Simular subida de archivo MP4 táctico
        const mockFileContent = 'mp4-video-stream-simulation-data';
        cy.get('input[type="file"]').selectFile({
            contents: Cypress.Buffer.from(mockFileContent),
            fileName: 'training_squat.mp4',
            lastModified: Date.now(),
        }, { force: true });

        // 3. Confirmar cambio en el estado del HUD (el lector de video de Cypress debe cargarse)
        cy.contains('V-SCAN ACTIVO').should('be.visible');

        // 4. Seleccionar ejercicio del buscador interactivo
        cy.contains('button', 'Seleccionar Ejercicio').click();
        cy.contains('Sentadilla Trasera').click();

        // 5. Iniciar análisis de IA
        cy.contains('button', 'Ejecutar Análisis de IA').should('not.be.disabled').click();

        // 6. Esperar la llamada API biomecánica mockeada globalmente en e2e.ts
        cy.wait('@aiVisionAnalyzeApi');
        cy.contains('Análisis Biomecánico Completado').should('be.visible');

        // 7. Validar reporte biométrico en pantalla
        cy.contains('88').should('be.visible'); // Score general
        cy.contains('Elite Blueprint Score').should('be.visible');

        // 8. Validar cronología de ajustes por timestamp
        cy.contains('Cronología de Ajustes').should('be.visible');
        cy.contains('1.5s').should('be.visible');
        cy.contains('Descenso controlado').should('be.visible');
        cy.contains('3.2s').should('be.visible');
        cy.contains('Mantener rodillas firmes').should('be.visible');

        // 9. Simular clic en un timestamp táctico para buscar segundo de reproducción
        cy.contains('1.5s').click({ force: true });

        // 10. Archivar y guardar análisis en base de datos Supabase
        cy.contains('Guardar en Historial Operativo').click();
        cy.wait('@supabaseUploadVideo');
        cy.wait('@supabaseInsertVideo');
        cy.contains('Análisis guardado permanentemente').should('be.visible');
    });
});
