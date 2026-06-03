describe('Routine Management Flow', () => {
    beforeEach(() => {
        // Autenticar por API con credenciales de Coach válidas
        cy.loginByAuthAPI('coach@virtudgym.com', 'Password123!');

        // Interceptar detalle de estudiante
        cy.intercept('GET', '**/api/coach/students/student-1-id*', {
            statusCode: 200,
            body: {
                success: true,
                student: {
                    id: 'student-1-id',
                    full_name: 'Juan Pérez',
                    email: 'juan@test.com',
                    phone: '+54 11 1234-5678',
                    birth_date: '1995-05-15',
                    gender: 'male',
                    role: 'member',
                    onboarding_completed: true,
                    created_at: '2026-01-10T12:00:00.000Z',
                    medical_info: {
                        weight: '78',
                        height: '175',
                        blood_type: 'O+',
                        blood_pressure: '120/80',
                        is_smoker: false,
                        injuries: 'Ninguna',
                        allergies: 'Ninguna',
                        chronic_diseases: 'Ninguna',
                        background: 'Ninguno'
                    },
                    emergency_contact: {
                        full_name: 'Ana Pérez',
                        phone: '+54 11 8765-4321',
                        relationship: 'Madre'
                    },
                    fitness_level: 'intermedio',
                    primary_goal: 'ganar_musculo',
                    target_weight: 82,
                    weekly_training_days: 4,
                    coach_observations: 'Buen progreso en sentadillas.'
                },
                routines: [
                    {
                        id: 'routine-old',
                        name: 'Rutina Base Fuerza',
                        status: 'active',
                        created_at: '2026-02-01T10:00:00.000Z'
                    }
                ]
            }
        }).as('getStudentDetail');

        // Interceptar generación de rutina IA
        cy.intercept('POST', '**/api/ai/generate-routine*', {
            statusCode: 200,
            body: { success: true }
        }).as('generateRoutine');
    });

    it('should allow a coach to create a new routine using IA generator', () => {
        // Visitar el detalle del alumno en la ruta multi-tenant
        cy.visit('/tenants/virtud/coach/coach/students/student-1-id');

        // Esperar a que cargue la información
        cy.wait('@getStudentDetail');
        cy.contains('Juan Pérez').should('be.visible');
        cy.wait(1000); // Evitar race condition de hidratación de React/Next.js

        // Iniciar flujo de generación
        cy.contains('button', 'Generar Rutina con IA').click();
        
        // Verificar que el modal de confirmación está abierto
        cy.contains('La IA generará una rutina personalizada').should('be.visible');

        // Confirmar la generación
        cy.contains('button', /^Generar Rutina$/).click({ force: true });

        // Verificar llamada de red y mensaje de éxito
        cy.wait('@generateRoutine');
        cy.contains('Rutina generada exitosamente').should('be.visible');
    });
});
