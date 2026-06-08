const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const gymId = '0a4b21c5-8269-4fbb-ae0a-1b3c98ad5bf7'; // virtud-gym
    const coachId = 'a47a5e8d-2032-425a-89a0-7ab5f8dd8d34'; // Entrenador Virtud
    const adminId = 'dca78921-5bf0-48c6-b1e5-5cb7631ccda5'; // Administrador Local Virtud

    const classes = [
        {
            gimnasio_id: gymId,
            actividad_id: '05dfb730-5068-43ab-82ff-1c29ee52f5cc', // Yoga
            entrenador_id: coachId,
            dia_de_la_semana: 1, // Lunes
            hora_inicio: '08:00:00',
            hora_fin: '09:00:00',
            esta_activa: true,
            notas_entrenador: 'Yoga suave para comenzar la semana'
        },
        {
            gimnasio_id: gymId,
            actividad_id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', // CrossFit Intensivo
            entrenador_id: coachId,
            dia_de_la_semana: 2, // Martes
            hora_inicio: '19:00:00',
            hora_fin: '20:00:00',
            esta_activa: true,
            notas_entrenador: 'Entrenamiento de alta intensidad'
        },
        {
            gimnasio_id: gymId,
            actividad_id: '84d57ccf-62ba-43bb-a021-19a6e1a92768', // Boxeo
            entrenador_id: adminId,
            dia_de_la_semana: 3, // Miércoles
            hora_inicio: '18:00:00',
            hora_fin: '19:30:00',
            esta_activa: true,
            notas_entrenador: 'Traer vendaje y guantes'
        },
        {
            gimnasio_id: gymId,
            actividad_id: '848a8ba3-e9da-410f-a3ae-920efa05cff7', // Funcional
            entrenador_id: coachId,
            dia_de_la_semana: 4, // Jueves
            hora_inicio: '10:00:00',
            hora_fin: '11:00:00',
            esta_activa: true,
            notas_entrenador: 'Circuitos metabólicos'
        },
        {
            gimnasio_id: gymId,
            actividad_id: 'b74eb71d-188e-470f-8adb-af38424513cb', // Musculación
            entrenador_id: coachId,
            dia_de_la_semana: 5, // Viernes
            hora_inicio: '16:00:00',
            hora_fin: '17:00:00',
            esta_activa: true,
            notas_entrenador: 'Rutina de tren superior enfocado a fuerza'
        }
    ];

    console.log('Insertando clases de prueba...');
    
    const { data, error } = await supabase
        .from('horarios_de_clase')
        .insert(classes)
        .select();

    if (error) {
        console.error('Error insertando clases:', error);
    } else {
        console.log('Clases insertadas exitosamente:', data.length);
        console.log(data);
    }
}

main();
