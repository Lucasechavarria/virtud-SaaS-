const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
    console.error('.env.local not found at', envPath);
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[match[1]] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

// 2. Init Supabase Admin Client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    try {
        console.log('--- FETCHING USERS FROM auth.users ---');
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        console.log('--- FETCHING PROFILES FROM public.perfiles ---');
        const { data: perfiles, error: dbError } = await supabase
            .from('perfiles')
            .select('id, correo, rol, nombre_completo, gimnasio_id');
        if (dbError) throw dbError;

        console.log('\n--- SYSTEM USERS AND ROLES ---');
        users.forEach(u => {
            const profile = perfiles.find(p => p.id === u.id);
            console.log(`Email: ${u.email}`);
            console.log(`  User ID: ${u.id}`);
            console.log(`  Auth metadata role: ${u.app_metadata?.rol || u.app_metadata?.role}`);
            console.log(`  DB profile role: ${profile?.rol || 'No DB Profile'}`);
            console.log(`  Name: ${profile?.nombre_completo || 'N/A'}`);
            console.log(`  Gym ID: ${profile?.gimnasio_id || 'N/A'}`);
            console.log('-----------------------------');
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
