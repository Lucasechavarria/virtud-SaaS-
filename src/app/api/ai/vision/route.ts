import { NextResponse } from 'next/server';
import { aiService } from '@/services/ai.service';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { checkGymLimits } from '@/lib/saas/limits';

// Lazy initialization to avoid build-time errors
const getSupabaseAdmin = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error('Missing Supabase environment variables');
    }

    return createClient(url, key);
};

const FREE_TIER_LIMIT = 5; // Analisis por día

export async function POST(request: Request) {
    try {
        const { user, error } = await authenticateAndRequireRole(request, ['coach', 'admin']);
        if (error) return error;

        // 1a. Enforzar límites prepagos del monedero del gimnasio (AI Wallet)
        const supabaseAdmin = getSupabaseAdmin();
        const { data: profile } = await supabaseAdmin
            .from('perfiles')
            .select('gimnasio_id')
            .eq('id', user.id)
            .single();

        let isVideoOverage = false;
        if (profile?.gimnasio_id) {
            const limits = await checkGymLimits(profile.gimnasio_id);
            isVideoOverage = !!limits.nextVideoIsOverage;
            if (limits.canProcessVideo === false) {
                return NextResponse.json({
                    error: limits.reason || 'Saldo prepago insuficiente en tu AI Wallet. Por favor realiza una carga de créditos.',
                    limitReached: true
                }, { status: 402 }); // 402 Payment Required!
            }
        }

        // 1b. Verificar límite de uso diario estándar
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count, error: countError } = await getSupabaseAdmin()
            .from('ai_usage_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('feature', 'vision_analysis')
            .gte('created_at', today.toISOString());

        if (countError) throw countError;

        if ((count || 0) >= FREE_TIER_LIMIT) {
            return NextResponse.json({
                error: 'Has alcanzado el límite diario de análisis gratuitos. Vuelve mañana.',
                limitReached: true
            }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = file.type;

        // 2. Procesar con Gemini
        const analysis = await aiService.analyzeMovement(base64, mimeType);

        // 3. Registrar uso
        await getSupabaseAdmin().from('ai_usage_logs').insert({
            user_id: user.id,
            feature: 'vision_analysis'
        });

        // 4. Si el modelo es prepago y es excedente, deducir saldo en tiempo real
        if (profile?.gimnasio_id && isVideoOverage) {
            const { deductPrepagoQuota } = await import('@/lib/saas/limits');
            await deductPrepagoQuota(profile.gimnasio_id, 'video');
        }

        return NextResponse.json({
            success: true,
            analysis,
            usage: (count || 0) + 1,
            limit: FREE_TIER_LIMIT
        });

    } catch (error: any) {
        console.error('Vision API Error:', error);
        return NextResponse.json({
            error: error.message || 'Error processing vision request'
        }, { status: 500 });
    }
}
