import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/payments
 * 
 * Obtiene lista de todos los pagos (solo admin)
 */
export async function GET(request: Request) {
    try {
        const { supabase, error, profile } = await authenticateAndRequireRole(
            request,
            ['admin', 'superadmin']
        );

        if (error || !supabase) return error || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // Blindaje contra gimnasio_id NULL para admin
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        // Obtener pagos con información del usuario - Usar nombres reales detectados
        let query = supabase
            .from('pagos')
            .select(`
                *,
                perfiles!usuario_id (
                    *
                )
            `);

        if (profile?.role !== 'superadmin') {
            query = query.eq('gimnasio_id', profile.gimnasio_id);
        }

        const { data, error: paymentsError } = await query
            .order('creado_en' as any, { ascending: false });

        if (paymentsError) {
            console.error('❌ Error loading payments:', paymentsError);
            // Fallback sin join si el join falla
            let fallbackQuery = supabase.from('pagos').select('*');
            if (profile?.role !== 'superadmin') {
                fallbackQuery = fallbackQuery.eq('gimnasio_id', profile.gimnasio_id);
            }
            const fallback = await fallbackQuery.order('creado_en' as any, { ascending: false });
            if (fallback.error) throw fallback.error;
            return NextResponse.json({ success: true, payments: fallback.data.map((p: any) => normalizePayment(p)) });
        }

        const payments = (data || []).map((payment: any) => normalizePayment(payment));

        return NextResponse.json({
            success: true,
            payments: payments
        });

    } catch (_error) {
        const err = _error as Error;
        console.error('Error loading payments:', err);
        return NextResponse.json({
            error: err.message || 'Error loading payments'
        }, { status: 500 });
    }
}

function normalizePayment(payment: any) {
    const user = payment.perfiles || {};
    return {
        id: payment.id,
        amount: payment.monto,
        status: payment.estado,
        created_at: payment.created_at || payment.creado_en,
        concept: payment.concepto,
        payment_method: payment.metodo_pago,
        metadata: payment.metadatos,
        user_name: user.nombre_completo || `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Sin nombre',
        user_email: user.correo || user.email || ''
    };
}

/**
 * POST /api/admin/payments
 * 
 * Registra un nuevo pago o gasto (solo admin)
 */
export async function POST(request: Request) {
    try {
        const { supabase, error, profile } = await authenticateAndRequireRole(
            request,
            ['admin', 'superadmin']
        );

        if (error || !supabase) return error || NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const { concept, amount, status, payment_method, payment_provider, notes, metadata, user_id, gymId } = body;

        // Resolver gimnasio del admin
        let targetGymId = profile?.gimnasio_id;
        if (profile?.role === 'superadmin' && gymId) {
            targetGymId = gymId;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Forbidden: No tienes un gimnasio asignado o especificado' }, { status: 403 });
        }

        // Validar pertenencia del socio al gimnasio si se especifica user_id
        if (user_id && profile?.role !== 'superadmin') {
            const { data: userProfile, error: profileError } = await supabase
                .from('perfiles')
                .select('gimnasio_id')
                .eq('id', user_id)
                .single();

            if (profileError || !userProfile) {
                return NextResponse.json({ error: 'Socio no encontrado' }, { status: 400 });
            }

            if (userProfile.gimnasio_id !== targetGymId) {
                return NextResponse.json({ error: 'Forbidden: El socio especificado no pertenece a tu gimnasio' }, { status: 400 });
            }
        }

        // Normalizar el estado de pago recibido (soporta traducciones en español)
        let safeStatus = 'pending';
        if (status) {
            const statusStr = String(status).toLowerCase().trim();
            if (statusStr === 'aprobado' || statusStr === 'completado' || statusStr === 'approved') {
                safeStatus = 'approved';
            } else if (statusStr === 'pendiente' || statusStr === 'pending') {
                safeStatus = 'pending';
            } else if (statusStr === 'rechazado' || statusStr === 'cancelado' || statusStr === 'rejected') {
                safeStatus = 'rejected';
            } else if (statusStr === 'vencido' || statusStr === 'overdue') {
                safeStatus = 'overdue';
            } else if (statusStr === 'prorrogado' || statusStr === 'extended') {
                safeStatus = 'extended';
            } else if (statusStr === 'reembolsado' || statusStr === 'refunded') {
                safeStatus = 'refunded';
            }
        }

        const { data, error: insertError } = await supabase
            .from('pagos')
            .insert({
                gimnasio_id: targetGymId, // Inyección del gimnasio_id
                concepto: concept,
                monto: amount,
                estado: safeStatus,
                metodo_pago: payment_method || 'manual',
                proveedor_pago: payment_provider || 'internal',
                notas: notes,
                metadatos: metadata,
                usuario_id: user_id || null // Expenses might not have a usuario_id
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            payment: data
        });

    } catch (_error) {
        const err = _error as Error;
        console.error('Error saving payment:', err);
        return NextResponse.json({
            error: err.message || 'Error saving payment'
        }, { status: 500 });
    }
}
