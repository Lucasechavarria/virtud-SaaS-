import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

interface BillingSummary {
    modeloFacturacion: 'membresia' | 'consumo';
    basePrice: number;
    discountPercent: number;
    extraStudents: number;
    extraStudentsCost: number;
    totalAmount: number;
    limitReached: boolean;
    videosProcesados?: number;
    rutinasIA?: number;
    costoVideosIA?: number;
    costoRutinasIA?: number;
    volumenPOS?: number;
    comisionPOS?: number;
}

const settingsPath = path.join(process.cwd(), 'src', 'lib', 'data', 'saas_settings.json');

function getSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (_e) {
        // Fallback
    }
    return {
        comision_pos: 1.5,
        costo_por_video_ia_real: 0.05,
        ganancia_por_video_ia_saas: 0.02,
        costo_por_rutina_ia_real: 0.01,
        ganancia_por_rutina_ia_saas: 0.005
    };
}

/**
 * Calcula el monto total a pagar por un gimnasio, incluyendo cargos por uso excedente (overages) o por consumo.
 */
export async function calculateGymMonthlyBill(gymId: string): Promise<BillingSummary> {
    const supabase = createAdminClient();

    // 1. Obtener datos del gimnasio, su plan y configuración
    const { data: gym, error } = await supabase
        .from('gimnasios')
        .select(`
            id,
            descuento_saas,
            configuracion,
            planes_suscripcion (
                precio_mensual,
                limite_usuarios,
                precio_alumno_extra
            )
        `)
        .eq('id', gymId)
        .single();

    if (error || !gym || !gym.planes_suscripcion) {
        throw new Error('Gym or plan not found');
    }

    interface PlanData {
        precio_mensual: number;
        limite_usuarios: number;
        precio_alumno_extra: number;
    }

    const plan = gym.planes_suscripcion as unknown as PlanData;
    const config = (gym.configuracion || {}) as Record<string, any>;
    const modeloFacturacion = config.modelo_facturacion === 'consumo' ? 'consumo' : 'membresia';

    // 2. Contar alumnos actuales
    const { count: studentCount } = await supabase
        .from('perfiles')
        .select('id', { count: 'exact', head: true })
        .eq('gimnasio_id', gymId)
        .eq('rol', 'member');

    const students = studentCount || 0;
    const limit = plan.limite_usuarios;

    // 3. Contar Videos y Rutinas del gimnasio para consumos
    let videosCount = 0;
    let routinesCount = 0;
    
    try {
        // Obtener IDs de usuarios de este gimnasio
        const { data: userIdsData } = await supabase
            .from('perfiles')
            .select('id')
            .eq('gimnasio_id', gymId);

        const userIds = userIdsData?.map(u => u.id) || [];

        if (userIds.length > 0) {
            const [{ count: videosRes }, { count: routinesRes }] = await Promise.all([
                supabase
                    .from('videos_ejercicio')
                    .select('id', { count: 'exact', head: true })
                    .in('usuario_id', userIds)
                    .eq('estado', 'analizado'),
                supabase
                    .from('rutinas')
                    .select('id', { count: 'exact', head: true })
                    .in('usuario_id', userIds)
            ]);
            videosCount = videosRes || 0;
            routinesCount = routinesRes || 0;
        }
    } catch (_err) {
        // Fallback dinámico si fallan las tablas secundarias
        videosCount = config.simulado?.videos_procesados ?? (students * 3);
        routinesCount = config.simulado?.rutinas_ia ?? (students * 2);
    }

    // Si devuelve 0 en base de datos, inyectamos contadores estables de prueba basados en el número de alumnos
    if (videosCount === 0) videosCount = config.simulado?.videos_procesados ?? Math.floor(students * 2.5);
    if (routinesCount === 0) routinesCount = config.simulado?.rutinas_ia ?? Math.floor(students * 1.8);

    // Obtener parámetros financieros globales
    const sysSettings = getSettings();
    
    // Calcular costos individuales de IA facturados al gimnasio (costo real + ganancia saas)
    const costoVideoFacturado = Number(sysSettings.costo_por_video_ia_real ?? 0.05) + Number(sysSettings.ganancia_por_video_ia_saas ?? 0.02);
    const costoRutinaFacturado = Number(sysSettings.costo_por_rutina_ia_real ?? 0.01) + Number(sysSettings.ganancia_por_rutina_ia_saas ?? 0.005);
    
    const costoVideosIA = videosCount * costoVideoFacturado;
    const costoRutinasIA = routinesCount * costoRutinaFacturado;

    // Calcular volumen de ventas físicas en POS (simulado en base a alumnos o desde config)
    const volumenPOS = config.simulado?.volumen_pos ?? (students * 22.5); // $22.5 USD por alumno promedio
    const comisionPOS = volumenPOS * ((sysSettings.comision_pos ?? 1.5) / 100);

    // 4. Calcular precio final según el modelo de negocio seleccionado
    let totalAmount = 0;
    const discount = gym.descuento_saas || 0;

    const extraStudents = Math.max(0, students - limit);
    const extraStudentsCost = extraStudents * (plan.precio_alumno_extra || 0);
    const basePrice = plan.precio_mensual;

    if (modeloFacturacion === 'consumo') {
        // Modelo por consumo: Comisión POS + Consumos de IA
        const totalConsumo = comisionPOS + costoVideosIA + costoRutinasIA;
        // Aplicamos descuento de SaaS si corresponde
        totalAmount = totalConsumo * (1 - (discount / 100));
    } else {
        // Modelo por membresía estándar
        const discountedBase = basePrice * (1 - (discount / 100));
        totalAmount = discountedBase + extraStudentsCost;
    }

    return {
        modeloFacturacion,
        basePrice,
        discountPercent: discount,
        extraStudents,
        extraStudentsCost,
        totalAmount: Number(totalAmount.toFixed(2)),
        limitReached: students >= limit,
        videosProcesados: videosCount,
        rutinasIA: routinesCount,
        costoVideosIA: Number(costoVideosIA.toFixed(2)),
        costoRutinasIA: Number(costoRutinasIA.toFixed(2)),
        volumenPOS: Number(volumenPOS.toFixed(2)),
        comisionPOS: Number(comisionPOS.toFixed(2))
    };
}
