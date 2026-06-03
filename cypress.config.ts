import { defineConfig } from "cypress";
import * as fs from "fs";
import * as path from "path";

// Leer variables de .env.local de forma atómica para que Cypress use las mismas credenciales
const envPath = path.resolve(__dirname, ".env.local");
const envVars: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
            const [key, ...valueParts] = trimmedLine.split("=");
            const value = valueParts.join("=");
            if (key && value) {
                // Limpiar comillas iniciales y finales si existen
                envVars[key.trim()] = value.trim().replace(/^['"]|['"]$/g, "");
            }
        }
    });
}

export default defineConfig({
    e2e: {
        baseUrl: "http://localhost:3000",
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        defaultCommandTimeout: 10000,
        env: {
            SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_ANON_KEY: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
    },
    viewportWidth: 1280,
    viewportHeight: 720,
});
