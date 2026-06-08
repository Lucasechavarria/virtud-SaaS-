const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function test() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // usando service role para saltar RLS o simular
    
    console.log('Connecting to:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: schedule, error } = await supabase
        .from('horarios_de_clase')
        .select(`
            id,
            dia_de_la_semana,
            hora_inicio,
            hora_fin,
            esta_activa,
            notas_entrenador,
            actividades (
              id,
              nombre,
              color,
              duracion_minutos
            ),
            perfiles (
              id,
              nombre_completo,
              email,
              rol
            )
        `)
        .eq('esta_activa', true);

    if (error) {
        console.error('ERROR EN HORARIOS DE CLASE:', error);
    } else {
        console.log('SUCCESS, fetched count:', schedule.length);
        console.log('Sample item:', JSON.stringify(schedule[0], null, 2));
    }
}

test();
