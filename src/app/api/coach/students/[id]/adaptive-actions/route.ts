import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const studentId = params.id;
        const { suggestionId, action, suggestionData } = await req.json();

        // 1. Verificar sesión
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // 2. Lógica de Negocio según acción
        if (action === 'apply') {
            console.log(`Aplicando sugerencia ${suggestionId} para alumno ${studentId}`);

            // Log action in audit table
            await (supabase as any)
                .from('audit_log_coach')
                .insert({
                    entrenador_id: session.user.id,
                    operacion: 'ia_suggestion_apply',
                    usuario_id: studentId,
                    datos_nuevos: { suggestion: suggestionData }
                });

        } else if (action === 'discard') {
            console.log(`Descartando sugerencia ${suggestionId} para alumno ${studentId}`);

            await (supabase as any)
                .from('audit_log_coach')
                .insert({
                    entrenador_id: session.user.id,
                    operacion: 'ia_suggestion_discard',
                    usuario_id: studentId,
                    datos_nuevos: { suggestionId }
                });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in adaptive-actions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
