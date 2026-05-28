import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const filePath = path.join(process.cwd(), 'src', 'lib', 'data', 'saas_settings.json');

const DEFAULT_SETTINGS = {
    modo_mantenimiento: false,
    mantenimiento_mensaje: 'Ecosistema VIRTUD en mantenimiento programado. Los entrenamientos en vivo y la carga básica continúan funcionando. Las rutinas avanzadas pueden demorar.'
};

/**
 * GET /api/saas-admin/settings/public
 * Retorna únicamente el estado del modo mantenimiento y su mensaje informativo.
 * Seguro para consumirse de forma anónima o por cualquier rol de usuario.
 */
export async function GET() {
    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({
                modo_mantenimiento: DEFAULT_SETTINGS.modo_mantenimiento,
                mantenimiento_mensaje: DEFAULT_SETTINGS.mantenimiento_mensaje
            });
        }
        const data = fs.readFileSync(filePath, 'utf-8');
        const settings = JSON.parse(data);

        return NextResponse.json({
            modo_mantenimiento: !!settings.modo_mantenimiento,
            mantenimiento_mensaje: settings.mantenimiento_mensaje || DEFAULT_SETTINGS.mantenimiento_mensaje
        });
    } catch (err) {
        console.error('Error reading public settings:', err);
        return NextResponse.json({
            modo_mantenimiento: DEFAULT_SETTINGS.modo_mantenimiento,
            mantenimiento_mensaje: DEFAULT_SETTINGS.mantenimiento_mensaje
        });
    }
}
