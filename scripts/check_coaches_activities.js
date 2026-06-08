const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function test() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: activities } = await supabase.from('actividades').select('id, nombre');
    const { data: profiles } = await supabase.from('perfiles').select('id, nombre_completo, rol');
    const { data: gyms } = await supabase.from('gimnasios').select('id, nombre, slug');

    console.log('--- GIMNASIOS ---');
    console.log(gyms);
    console.log('--- ACTIVIDADES ---');
    console.log(activities);
    console.log('--- PERFILES ---');
    console.log(profiles.filter(p => ['admin', 'coach', 'superadmin'].includes(p.rol)));
}

test();
