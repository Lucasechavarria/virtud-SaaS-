import { createAdminClient } from '../supabase/admin';

export async function checkGymLimits(gymId: string) {
    const supabase = createAdminClient();

    // 1. Obtener el gimnasio y su plan
    const { data: gym, error: gymError } = await supabase
        .from('gimnasios')
        .select(`
            id,
            plan_id,
            estado_pago_saas,
            configuracion,
            planes_suscripcion (
                limite_usuarios,
                limite_sucursales
            )
        `)
        .eq('id', gymId)
        .single();

    if (gymError || !gym) {
        throw new Error('No se pudo verificar el gimnasio');
    }

    const plan = gym.planes_suscripcion;
    const estadoPago = gym.estado_pago_saas;
    const config = (gym.configuracion || {}) as Record<string, any>;

    // Si el pago está impago, bloqueamos todo
    if (estadoPago === 'unpaid') {
        return {
            canAddUser: false,
            canAddBranch: false,
            canProcessVideo: false,
            canGenerateRoutine: false,
            reason: 'Suscripción suspendida por falta de pago'
        };
    }

    // 2. Contar usuarios actuales (excluyendo admins/superadmins si se desea, pero usualmente son todos los miembros)
    const { count: userCount } = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .eq('gimnasio_id', gymId);

    // 3. Contar sucursales actuales
    const { count: branchCount } = await supabase
        .from('sucursales')
        .select('*', { count: 'exact', head: true })
        .eq('gimnasio_id', gymId);

    const currentUsers = userCount || 0;
    const currentBranches = branchCount || 0;

    const canAddUser = plan ? (currentUsers < (plan.limite_usuarios || 999999)) : true;
    const canAddBranch = plan ? (currentBranches < (plan.limite_sucursales || 999999)) : true;

    // 4. Validar créditos prepago de IA (AI Wallet) con tarifas precisas y control de sobregiros
    const modeloFacturacion = config.modelo_facturacion || 'membresia';
    const metodoCobro = config.metodo_cobro_excedentes || 'postpago';
    const saldo = Number(config.saldo_creditos ?? 0.0);

    let canProcessVideo = true;
    let canGenerateRoutine = true;
    let iaBlockReason = null;

    // Costo proyectado por acción
    const costoVideo = 0.07;
    const costoRutina = 0.015;

    // Contar Videos y Rutinas procesados para verificar límites incluidos en híbrido
    let videosCount = 0;
    let routinesCount = 0;
    
    if ((modeloFacturacion === 'consumo' || modeloFacturacion === 'hibrido') && metodoCobro === 'prepago') {
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
            videosCount = config.simulado?.videos_procesados ?? (currentUsers * 3);
            routinesCount = config.simulado?.rutinas_ia ?? (currentUsers * 2);
        }

        const limiteVideosHibrido = config.limite_videos_hibrido ?? 50;
        const limiteRutinasHibrido = config.limite_rutinas_hibrido ?? 100;

        const nextVideoIsOverage = (modeloFacturacion === 'consumo') || (modeloFacturacion === 'hibrido' && videosCount >= limiteVideosHibrido);
        const nextRoutineIsOverage = (modeloFacturacion === 'consumo') || (modeloFacturacion === 'hibrido' && routinesCount >= limiteRutinasHibrido);

        if (nextVideoIsOverage && saldo < costoVideo) {
            canProcessVideo = false;
            iaBlockReason = modeloFacturacion === 'consumo'
                ? `Saldo prepago insuficiente en tu AI Wallet ($${saldo.toFixed(2)} USD). Requiere al menos $${costoVideo.toFixed(2)} USD para procesar el análisis de video.`
                : `Límite híbrido de videos alcanzado (${limiteVideosHibrido}) y saldo prepago insuficiente ($${saldo.toFixed(2)} USD). Requiere al menos $${costoVideo.toFixed(2)} USD para excedente.`;
        }
        if (nextRoutineIsOverage && saldo < costoRutina) {
            canGenerateRoutine = false;
            if (!iaBlockReason) {
                iaBlockReason = modeloFacturacion === 'consumo'
                    ? `Saldo prepago insuficiente en tu AI Wallet ($${saldo.toFixed(2)} USD). Requiere al menos $${costoRutina.toFixed(3)} USD para generar la rutina.`
                    : `Límite híbrido de rutinas alcanzado (${limiteRutinasHibrido}) y saldo prepago insuficiente ($${saldo.toFixed(2)} USD). Requiere al menos $${costoRutina.toFixed(3)} USD para excedente.`;
            }
        }

        // 5. Gestión proactiva de alertas por saldo bajo en la base de datos
        const limiteAlertaSaldo = Number(config.limite_alerta_saldo ?? 10.0);
        if (saldo < limiteAlertaSaldo) {
            const alertas = config.alertas_sistema || [];
            const tieneAlertaSaldoBajo = alertas.some((a: any) => a.tipo === 'saldo_bajo' && a.activo !== false);
            if (!tieneAlertaSaldoBajo) {
                const nuevaAlerta = {
                    id: Math.random().toString(36).substring(2, 11),
                    tipo: 'saldo_bajo',
                    prioridad: 'alta',
                    mensaje: `¡Alerta de AI Wallet! Tu saldo prepago de créditos de IA ($${saldo.toFixed(2)} USD) es menor al límite configurado de $${limiteAlertaSaldo.toFixed(2)} USD.`,
                    fecha: new Date().toISOString(),
                    activo: true
                };
                const updatedConfig = {
                    ...config,
                    alertas_sistema: [...alertas, nuevaAlerta]
                };
                await supabase
                    .from('gimnasios')
                    .update({ configuracion: updatedConfig } as any)
                    .eq('id', gymId);
                
                config.alertas_sistema = updatedConfig.alertas_sistema;
            }
        } else {
            // Limpiar alertas de saldo bajo si ya se cargó saldo
            const alertas = config.alertas_sistema || [];
            const tieneAlertaSaldoBajo = alertas.some((a: any) => a.tipo === 'saldo_bajo' && a.activo !== false);
            if (tieneAlertaSaldoBajo) {
                const updatedConfig = {
                    ...config,
                    alertas_sistema: alertas.map((a: any) => 
                        a.tipo === 'saldo_bajo' ? { ...a, activo: false, resuelta_en: new Date().toISOString() } : a
                    )
                };
                await supabase
                    .from('gimnasios')
                    .update({ configuracion: updatedConfig } as any)
                    .eq('id', gymId);
                
                config.alertas_sistema = updatedConfig.alertas_sistema;
            }
        }
    }

    // Calcular valores predictivos por defecto si no aplica el bloque anterior
    const nextVideoIsOverage = (modeloFacturacion === 'consumo') || (modeloFacturacion === 'hibrido' && videosCount >= (config.limite_videos_hibrido ?? 50));
    const nextRoutineIsOverage = (modeloFacturacion === 'consumo') || (modeloFacturacion === 'hibrido' && routinesCount >= (config.limite_rutinas_hibrido ?? 100));

    return {
        canAddUser,
        canAddBranch,
        canProcessVideo,
        canGenerateRoutine,
        currentUsers,
        currentBranches,
        limitUsers: plan?.limite_usuarios || '∞',
        limitBranches: plan?.limite_sucursales || '∞',
        saldoWallet: saldo,
        nextVideoIsOverage,
        nextRoutineIsOverage,
        reason: (!canAddUser || !canAddBranch) ? 'Límite de plan alcanzado' : iaBlockReason
    };
}

export async function deductPrepagoQuota(gymId: string, actionType: 'video' | 'routine') {
    const supabase = createAdminClient();

    // 1. Obtener el gimnasio y su configuración
    const { data: gym, error: gymError } = await supabase
        .from('gimnasios')
        .select('id, configuracion')
        .eq('id', gymId)
        .single();

    if (gymError || !gym) {
        console.error('Error fetching gym for quota deduction:', gymError);
        return;
    }

    const config = (gym.configuracion || {}) as Record<string, any>;
    const modeloFacturacion = config.modelo_facturacion || 'membresia';
    const metodoCobro = config.metodo_cobro_excedentes || 'postpago';
    const saldo = Number(config.saldo_creditos ?? 0.0);

    if ((modeloFacturacion === 'consumo' || modeloFacturacion === 'hibrido') && metodoCobro === 'prepago') {
        const costo = actionType === 'video' ? 0.07 : 0.015;

        if (saldo >= costo) {
            const nuevoSaldo = Number((saldo - costo).toFixed(3));
            const historial = config.historial_recargas || [];
            
            const nuevoRegistro = {
                fecha: new Date().toISOString(),
                monto: -costo,
                metodo: actionType === 'video' 
                    ? 'Débito automático (Análisis biomecánico de video)' 
                    : 'Débito automático (Generación de rutina LLM)'
            };

            const updatedConfig = {
                ...config,
                saldo_creditos: nuevoSaldo,
                historial_recargas: [...historial, nuevoRegistro]
            };

            const { error: updateError } = await supabase
                .from('gimnasios')
                .update({ configuracion: updatedConfig } as any)
                .eq('id', gymId);

            if (updateError) {
                console.error('Error updating gym balance after deduction:', updateError);
            }
        }
    }
}
