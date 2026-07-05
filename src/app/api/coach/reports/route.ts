import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';

// GET: Listar reportes del gimnasio
export async function GET(request: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['coach', 'admin']
        );

        if (error) return error;
        if (!supabase || !user || !profile) {
            throw new Error('No se pudo inicializar la sesión o el cliente de Supabase');
        }

        const targetGymId = profile.gimnasio_id;
        if (!targetGymId && profile.role !== 'superadmin') {
            return NextResponse.json({ error: 'El usuario no tiene un gimnasio asignado.' }, { status: 400 });
        }

        let query = (supabase as any)
            .from('reportes_alumnos')
            .select(`
                id,
                usuario_id,
                tipo,
                titulo,
                descripcion,
                estado,
                creado_en,
                resuelto_en,
                perfiles:usuario_id (
                    nombre_completo
                )
            `)
            .order('creado_en', { ascending: false });

        if (profile.role !== 'superadmin') {
            query = query.eq('gimnasio_id', targetGymId);
        }

        const { data, error: dbError } = await query;

        if (dbError) throw dbError;

        const reports = (data || []).map((r: any) => ({
            id: r.id,
            studentId: r.usuario_id,
            studentName: r.perfiles?.nombre_completo || 'Alumno Desconocido',
            type: r.tipo,
            title: r.titulo,
            description: r.descripcion,
            status: r.estado,
            createdAt: r.creado_en,
            resolvedAt: r.resuelto_en
        }));

        return NextResponse.json({ success: true, reports });

    } catch (err: any) {
        console.error('Error GET /api/coach/reports:', err);
        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
    }
}

// POST: Crear reporte (Staff o Alumno)
export async function POST(request: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['coach', 'admin', 'member']
        );

        if (error) return error;
        if (!supabase || !user || !profile) {
            throw new Error('No se pudo inicializar la sesión o el cliente de Supabase');
        }

        const targetGymId = profile.gimnasio_id;
        if (!targetGymId && profile.role !== 'superadmin') {
            return NextResponse.json({ error: 'El usuario no tiene un gimnasio asignado.' }, { status: 400 });
        }

        const body = await request.json();
        const { studentId, type, title, description } = body;

        // Si es miembro, solo puede crear reportes para sí mismo
        const finalStudentId = profile.role === 'member' ? user.id : studentId;

        if (!finalStudentId || !type || !title || !description) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const { data, error: dbError } = await (supabase as any)
            .from('reportes_alumnos')
            .insert({
                usuario_id: finalStudentId,
                gimnasio_id: targetGymId || body.gymId,
                tipo: type,
                titulo: title,
                descripcion: description,
                estado: 'pending'
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, report: data });

    } catch (err: any) {
        console.error('Error POST /api/coach/reports:', err);
        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
    }
}

// PATCH: Resolver reporte (solo Staff)
export async function PATCH(request: Request) {
    try {
        const { user, profile, supabase, error } = await authenticateAndRequireRole(
            request,
            ['coach', 'admin']
        );

        if (error) return error;
        if (!supabase || !user || !profile) {
            throw new Error('No se pudo inicializar la sesión o el cliente de Supabase');
        }

        const body = await request.json();
        const { reportId, status } = body;

        if (!reportId || !status) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const { data, error: dbError } = await (supabase as any)
            .from('reportes_alumnos')
            .update({
                estado: status,
                actualizado_en: new Date().toISOString(),
                resuelto_en: status === 'resolved' ? new Date().toISOString() : null
            })
            .eq('id', reportId)
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, report: data });

    } catch (err: any) {
        console.error('Error PATCH /api/coach/reports:', err);
        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
    }
}
