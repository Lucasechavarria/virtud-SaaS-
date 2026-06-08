const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function test() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: profiles } = await supabase.from('perfiles').select('id, nombre_completo, correo, rol');

    console.log('--- SUPERADMINS CORREOS ---');
    console.log(profiles.filter(p => p.rol === 'superadmin'));
}

test();
