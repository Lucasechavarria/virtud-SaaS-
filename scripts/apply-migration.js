const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function applyMigration() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ Error: DIRECT_URL or DATABASE_URL not found in .env.local');
        process.exit(1);
    }

    // Remover pgbouncer=true si existe para evitar problemas con comandos DDL
    const cleanConnectionString = connectionString.replace('?pgbouncer=true', '');

    const migrationFile = path.join(__dirname, '../supabase/migrations/20260622110000_add_deleted_at_to_gimnasios.sql');
    if (!fs.existsSync(migrationFile)) {
        console.error(`❌ Error: Migration file not found at ${migrationFile}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log(`Applying migration:\n${sql}`);

    const client = new Client({
        connectionString: cleanConnectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('⚡ Connected to PostgreSQL database...');
        await client.query(sql);
        console.log('✅ Migration applied successfully!');
    } catch (err) {
        console.error('❌ Error applying migration:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
