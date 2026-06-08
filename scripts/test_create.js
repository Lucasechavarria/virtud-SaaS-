const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Testing minimal createUser...');
    const { data, error } = await supabase.auth.admin.createUser({
        email: 'test_minimal@virtudgym.com',
        password: 'Password123!',
        email_confirm: true
    });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success!', data.user.id);
        // Clean up
        await supabase.auth.admin.deleteUser(data.user.id);
    }
}
run();
