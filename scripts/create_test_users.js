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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const usersToCreate = [
    {
        email: 'admin_local@virtudgym.com',
        role: 'admin',
        name: 'Administrador Local Virtud'
    },
    {
        email: 'receptionist@virtudgym.com',
        role: 'recepcion',
        name: 'Recepcionista Virtud'
    },
    {
        email: 'coach@virtudgym.com',
        role: 'coach',
        name: 'Entrenador Virtud'
    },
    {
        email: 'student@virtudgym.com',
        role: 'member',
        name: 'Alumno Virtud'
    }
];

async function run() {
    try {
        // Find the gym ID for 'virtud-gym'
        const { data: gym, error: gymError } = await supabase
            .from('gimnasios')
            .select('id, nombre, slug')
            .eq('slug', 'virtud-gym')
            .single();

        if (gymError || !gym) {
            console.error('Error finding gym "virtud-gym":', gymError);
            process.exit(1);
        }

        console.log(`Found Gym: ${gym.nombre} (ID: ${gym.id}, Slug: ${gym.slug})`);

        // Get list of existing users to avoid re-creation errors
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        for (const spec of usersToCreate) {
            console.log(`\nProcessing user: ${spec.email} (${spec.role})`);
            const existingUser = users.find(u => u.email === spec.email);
            let userId;

            const appMetadata = {
                rol: spec.role,
                role: spec.role,
                gimnasio_id: gym.id,
                gimnasio_slug: gym.slug
            };

            const userMetadata = {
                nombre_completo: spec.name,
                rol: spec.role
            };

            if (existingUser) {
                userId = existingUser.id;
                console.log(`- User exists (ID: ${userId}). Updating auth meta and password...`);
                
                const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                    password: 'Password123!',
                    app_metadata: appMetadata,
                    user_metadata: userMetadata
                });

                if (updateError) {
                    console.error(`- Error updating auth user:`, updateError);
                } else {
                    console.log(`- Auth user updated successfully.`);
                }
            } else {
                console.log(`- Creating new user...`);
                const { data: createData, error: createError } = await supabase.auth.admin.createUser({
                    email: spec.email,
                    password: 'Password123!',
                    email_confirm: true,
                    app_metadata: appMetadata,
                    user_metadata: userMetadata
                });

                if (createError) {
                    console.error(`- Error creating user:`, createError);
                    continue;
                }

                userId = createData.user.id;
                console.log(`- User created successfully (ID: ${userId})`);
            }

            // Sync database profile
            console.log(`- Sincronizando perfil en la base de datos...`);
            const { error: profileError } = await supabase.from('perfiles').upsert({
                id: userId,
                correo: spec.email,
                nombre_completo: spec.name,
                gimnasio_id: gym.id,
                rol: spec.role,
                estado_membresia: 'active',
                onboarding_completado: true,
                actualizado_en: new Date().toISOString()
            });

            if (profileError) {
                console.error(`- Error upserting profile:`, profileError);
            } else {
                console.log(`- Profile synchronized in database.`);
            }
        }

        console.log('\n=======================================');
        console.log('🎉 Seed process finished successfully! ');
        console.log('=======================================');

    } catch (e) {
        console.error('Fatal Error:', e);
    }
}

run();
