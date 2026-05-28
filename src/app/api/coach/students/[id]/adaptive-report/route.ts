import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiService } from '@/services/ai.service';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const studentId = params.id;

        // 1. Verificar sesión y rol de coach
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', session.user.id)
            .single();

        if (profile?.rol !== 'coach' && profile?.rol !== 'admin') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        // 2. Obtener datos del alumno para el contexto
        const { data: student, error: studentError } = await (supabase as any)
            .from('perfiles')
            .select('*, informacion_medica, metas_fitness(*)')
            .eq('id', studentId)
            .single();

        if (studentError || !student) throw new Error('Alumno no encontrado');

        // 3. Obtener logs recientes (últimos 14 días para mayor contexto)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const [visionResponse, nutritionResponse, measurementsResponse, recoveryResponse] = await Promise.all([
            (supabase as any)
                .from('videos_ejercicio')
                .select('*')
                .eq('usuario_id', studentId)
                .gte('creado_en', fourteenDaysAgo.toISOString())
                .order('creado_en', { ascending: false }),
            (supabase as any)
                .from('registros_nutricion')
                .select('*')
                .eq('usuario_id', studentId)
                .gte('creado_en', fourteenDaysAgo.toISOString())
                .order('creado_en', { ascending: false }),
            (supabase as any)
                .from('mediciones')
                .select('*')
                .eq('usuario_id', studentId)
                .gte('registrado_en', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
                .order('registrado_en', { ascending: true }),
            (supabase as any)
                .from('registros_recuperacion')
                .select('*')
                .eq('usuario_id', studentId)
                .gte('fecha', fourteenDaysAgo.toISOString().split('T')[0])
                .order('fecha', { ascending: false })
        ]);

        // 4. Generar reporte adaptativo con IA
        const report = await aiService.generateAdaptiveReport(
            student as any,
            visionResponse.data || [],
            nutritionResponse.data || [],
            measurementsResponse.data || [],
            recoveryResponse.data || []
        );

        return NextResponse.json({ success: true, report });
    } catch (error: any) {
        console.error('Error generating student adaptive report:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
