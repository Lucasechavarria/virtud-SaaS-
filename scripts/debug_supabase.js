const fs = require('fs');
const path = require('path');

async function testConnection() {
    console.log('🚀 Iniciando test de conexión a Supabase...');

    // Leer .env.local de forma manual para evitar dependencias
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ No se encontró .env.local');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

    if (!urlMatch || !keyMatch) {
        console.error('❌ No se pudieron extraer las variables de Supabase');
        return;
    }

    const url = urlMatch[1].trim();
    const key = keyMatch[1].trim();

    console.log(`🔗 Conectando a: ${url}`);

    try {
        const response = await fetch(`${url}/rest/v1/perfiles?select=count`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Range': '0-0'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Conexión EXITOSA');
            console.log('📊 Alumnos encontrados:', data);
        } else {
            const errorText = await response.text();
            console.error(`❌ Error de Supabase (Status ${response.status}):`, errorText);
            if (response.status === 404 || response.status === 503) {
                console.error('⚠️ El proyecto podría estar pausado o inactivo.');
            }
        }
    } catch (e) {
        console.error('❌ Error de red:', e.message);
    }
}

testConnection();
