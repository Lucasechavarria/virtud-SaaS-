import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { error: authError, profile } = await authenticateAndRequireRole(
            req, 
            ['admin', 'recepcion', 'superadmin']
        );
        if (authError) return authError;

        const { email, socioId, amount, ticketNum, socioName } = await req.json();

        if (!ticketNum || !amount) {
            return NextResponse.json({ error: 'Ticket number and amount are required' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        let targetEmail = email;
        let targetName = socioName || 'Socio';

        if (socioId && !targetEmail) {
            const { data: userProfile, error: profileError } = await (adminClient as any)
                .from('perfiles')
                .select('correo, nombre_completo')
                .eq('id', socioId)
                .single();

            if (!profileError && userProfile) {
                targetEmail = userProfile.correo;
                targetName = userProfile.nombre_completo || targetName;
            }
        }

        if (!targetEmail) {
            return NextResponse.json({ error: 'No se pudo resolver la dirección de correo del destinatario.' }, { status: 400 });
        }

        // Enviar correo de recibo usando plantilla payment-approved de Resend
        await sendEmail({
            to: targetEmail,
            subject: `🧾 Comprobante de Pago — Ticket #${ticketNum}`,
            template: 'payment-approved',
            data: {
                name: targetName,
                amount: amount,
                transactionId: ticketNum,
                date: new Date().toISOString(),
                dashboardUrl: 'https://vitudgym.vercel.app'
            }
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Error in POST /api/admin/recepcion/pos/send-receipt:', err);
        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
    }
}
