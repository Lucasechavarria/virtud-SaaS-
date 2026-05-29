import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const filePath = path.join(process.cwd(), 'src', 'lib', 'data', 'saas_settings.json');

const DEFAULT_SETTINGS = {
    modo_mantenimiento: false,
    mantenimiento_mensaje: 'Ecosistema VIRTUD en mantenimiento programado. Los entrenamientos en vivo y la carga básica continúan funcionando. Las rutinas avanzadas pueden demorar.',
    correo_soporte: 'soporte@virtud-saas.com',
    gateway_sandbox: true,
    comision_pos: 1.5,
    ia_global_activa: true,
    vision_computacional_activa: true,
    limite_tokens_diarios: 500000,
    costo_alojamiento_fijo: 49.00,
    costo_por_video_ia: 0.07,
    costo_por_rutina_ia: 0.015,
    costo_por_video_ia_real: 0.05,
    ganancia_por_video_ia_saas: 0.02,
    costo_por_rutina_ia_real: 0.01,
    ganancia_por_rutina_ia_saas: 0.005
};

function getSettings() {
    try {
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(DEFAULT_SETTINGS, null, 2));
            return DEFAULT_SETTINGS;
        }
        const data = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        // Garantizar que si el archivo existe pero no tiene las nuevas propiedades, se inyecten los fallbacks por defecto
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (err) {
        console.error('Error reading settings:', err);
        return DEFAULT_SETTINGS;
    }
}

function saveSettings(settings: typeof DEFAULT_SETTINGS) {
    try {
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving settings:', err);
        return false;
    }
}

/**
 * GET /api/saas-admin/settings
 * Devuelve la configuración técnica global del sistema.
 */
export async function GET(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const settings = getSettings();
        return NextResponse.json({ settings });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/saas-admin/settings
 * Guarda la configuración global actualizada en caliente.
 */
export async function POST(request: Request) {
    try {
        const { error: authError } = await authenticateAndRequireRole(request, ['superadmin']);
        if (authError) return authError;

        const body = await request.json();
        const current = getSettings();

        const video_real = typeof body.costo_por_video_ia_real === 'number' ? body.costo_por_video_ia_real : current.costo_por_video_ia_real;
        const video_saas = typeof body.ganancia_por_video_ia_saas === 'number' ? body.ganancia_por_video_ia_saas : current.ganancia_por_video_ia_saas;
        const rutina_real = typeof body.costo_por_rutina_ia_real === 'number' ? body.costo_por_rutina_ia_real : current.costo_por_rutina_ia_real;
        const rutina_saas = typeof body.ganancia_por_rutina_ia_saas === 'number' ? body.ganancia_por_rutina_ia_saas : current.ganancia_por_rutina_ia_saas;

        const updated = {
            modo_mantenimiento: typeof body.modo_mantenimiento === 'boolean' ? body.modo_mantenimiento : current.modo_mantenimiento,
            mantenimiento_mensaje: typeof body.mantenimiento_mensaje === 'string' ? body.mantenimiento_mensaje : current.mantenimiento_mensaje,
            correo_soporte: typeof body.correo_soporte === 'string' ? body.correo_soporte : current.correo_soporte,
            gateway_sandbox: typeof body.gateway_sandbox === 'boolean' ? body.gateway_sandbox : current.gateway_sandbox,
            comision_pos: typeof body.comision_pos === 'number' ? body.comision_pos : current.comision_pos,
            ia_global_activa: typeof body.ia_global_activa === 'boolean' ? body.ia_global_activa : current.ia_global_activa,
            vision_computacional_activa: typeof body.vision_computacional_activa === 'boolean' ? body.vision_computacional_activa : current.vision_computacional_activa,
            limite_tokens_diarios: typeof body.limite_tokens_diarios === 'number' ? body.limite_tokens_diarios : current.limite_tokens_diarios,
            costo_alojamiento_fijo: typeof body.costo_alojamiento_fijo === 'number' ? body.costo_alojamiento_fijo : current.costo_alojamiento_fijo,
            // Sincronizar legacy con la suma real + ganancia
            costo_por_video_ia: video_real + video_saas,
            costo_por_rutina_ia: rutina_real + rutina_saas,
            // Nuevas variables individuales
            costo_por_video_ia_real: video_real,
            ganancia_por_video_ia_saas: video_saas,
            costo_por_rutina_ia_real: rutina_real,
            ganancia_por_rutina_ia_saas: rutina_saas
        };

        const success = saveSettings(updated);
        if (!success) {
            return NextResponse.json({ error: 'Failed to write settings file' }, { status: 500 });
        }

        return NextResponse.json({ success: true, settings: updated });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
