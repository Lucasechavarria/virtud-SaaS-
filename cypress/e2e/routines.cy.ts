describe.skip('Routine Management Flow', () => {
    beforeEach(() => {
        // Mock login as Coach
        cy.login('coach@virtudgym.com', 'password123');

        // Mock API responses if backend is not running fully
        cy.intercept('GET', '/api/coach/students*', { fixture: 'students.json' }).as('getStudents');
        cy.intercept('POST', '/api/routines', { statusCode: 200, body: { success: true, routineId: '123' } }).as('createRoutine');
    });

    it('should allow a coach to create a new routine', () => {
        cy.visit('/dashboard/routines/new');

        // 1. Select Student
        cy.get('select[name="studentId"]').select('student-1-id');

        // 2. Fill Routine Details
        cy.get('input[name="name"]').type('Rutina de Fuerza Hipertrofia');
        cy.get('textarea[name="description"]').type('Rutina enfocada en ganancia muscular');
        cy.get('select[name="objective"]').select('ganar_musculo');

        // 3. Add Exercise
        cy.contains('button', 'Agregar Ejercicio').click();

        cy.get('.exercise-card').first().within(() => {
            cy.get('input[name="exerciseName"]').type('Press de Banca');
            cy.get('input[name="sets"]').type('4');
            cy.get('input[name="reps"]').type('10');
            cy.get('select[name="equipment"]').select('Barra Olímpica'); // Nuevo campo normalizado
        });

        // 4. Submit
        cy.contains('button', 'Guardar Rutina').click();

        // 5. Verification
        cy.wait('@createRoutine');
        cy.contains('Rutina creada exitosamente').should('be.visible');
        cy.url().should('include', '/dashboard/routines');
    });
});
