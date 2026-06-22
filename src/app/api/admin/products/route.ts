import { NextResponse } from 'next/server';
import { authenticateAndRequireRole } from '@/lib/auth/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/products
 * Lista los productos del inventario de la sucursal actual.
 */
export async function GET(request: Request) {
    try {
        const { error: authError, profile, supabase } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion', 'coach']);
        if (authError) return authError;

        const { searchParams } = new URL(request.url);
        const urlGym = searchParams.get('gymId');
        let targetGymId = profile?.gimnasio_id;

        // Si es Superadmin, puede filtrar por cualquier gymId recibido
        if (profile?.role === 'superadmin' && urlGym) {
            targetGymId = urlGym;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Forbidden: No tienes un gimnasio asignado' }, { status: 403 });
        }

        // Consultamos productos asociados al gimnasio
        const { data: products, error: dbError } = await supabase!
            .from('inventario_productos')
            .select('*')
            .eq('gimnasio_id', targetGymId)
            .order('nombre', { ascending: true });

        if (dbError) {
            console.error('Error fetching inventory products:', dbError);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ products });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in GET products:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/admin/products
 * Crea un nuevo producto en el inventario.
 */
export async function POST(request: Request) {
    try {
        const { error: authError, profile, user, supabase } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion', 'coach']);
        if (authError) return authError;

        // Verificar permisos detallados
        let hasPermission = false;
        if (profile?.role === 'admin' || profile?.role === 'superadmin') {
            hasPermission = true;
        } else {
            // Consultar permisos en la base de datos para recepcionistas o profesores
            const { data: dbProfile } = await supabase!
                .from('perfiles')
                .select('permisos')
                .eq('id', user!.id)
                .single();
            
            const permisos = dbProfile?.permisos as any;
            if (permisos?.gestionar_inventario === true) {
                hasPermission = true;
            }
        }

        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden: No tienes permisos para gestionar el inventario' }, { status: 403 });
        }

        const body = await request.json();
        const { nombre, descripcion, precio_venta, stock_actual, categoria, url_imagen, gymId } = body;

        if (!nombre || precio_venta === undefined || stock_actual === undefined || !categoria) {
            return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, precio_venta, stock_actual, categoria)' }, { status: 400 });
        }

        // Blindaje contra gimnasio_id NULL para admin locales / recepcion / coach
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        let targetGymId = profile?.gimnasio_id;
        if (profile?.role === 'superadmin' && gymId) {
            targetGymId = gymId;
        }

        if (!targetGymId) {
            return NextResponse.json({ error: 'Gimnasio no especificado' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const { data: newProduct, error: insertError } = await adminClient
            .from('inventario_productos')
            .insert({
                gimnasio_id: targetGymId,
                nombre,
                descripcion,
                precio_venta: Number(precio_venta),
                stock_actual: Number(stock_actual),
                categoria,
                url_imagen
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting product:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Producto creado exitosamente', product: newProduct }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in POST products:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * PUT /api/admin/products
 * Actualiza un producto existente en el inventario.
 */
export async function PUT(request: Request) {
    try {
        const { error: authError, profile, user, supabase } = await authenticateAndRequireRole(request, ['admin', 'superadmin', 'recepcion', 'coach']);
        if (authError) return authError;

        // Verificar permisos detallados
        let hasPermission = false;
        if (profile?.role === 'admin' || profile?.role === 'superadmin') {
            hasPermission = true;
        } else {
            // Consultar permisos en la base de datos para recepcionistas o profesores
            const { data: dbProfile } = await supabase!
                .from('perfiles')
                .select('permisos')
                .eq('id', user!.id)
                .single();
            
            const permisos = dbProfile?.permisos as any;
            if (permisos?.gestionar_inventario === true) {
                hasPermission = true;
            }
        }

        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden: No tienes permisos para gestionar el inventario' }, { status: 403 });
        }

        const body = await request.json();
        const { id, nombre, descripcion, precio_venta, stock_actual, categoria, url_imagen } = body;

        if (!id) {
            return NextResponse.json({ error: 'El ID del producto es obligatorio para actualizar' }, { status: 400 });
        }

        // Blindaje contra gimnasio_id NULL para admin locales / recepcion / coach
        if (profile?.role !== 'superadmin' && !profile?.gimnasio_id) {
            return NextResponse.json({ error: 'Forbidden: Administrador sin gimnasio asignado' }, { status: 403 });
        }

        let targetGymId = profile?.gimnasio_id;

        // Obtener el producto actual para verificar pertenencia
        const adminClient = createAdminClient();
        const { data: existingProduct, error: findError } = await adminClient
            .from('inventario_productos')
            .select('gimnasio_id')
            .eq('id', id)
            .single();

        if (findError || !existingProduct) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        // Control Multi-tenant
        if (profile?.role !== 'superadmin' && existingProduct.gimnasio_id !== targetGymId) {
            return NextResponse.json({ error: 'Forbidden: No tienes acceso a este producto' }, { status: 403 });
        }

        // Realizar actualización
        const { data: updatedProduct, error: updateError } = await adminClient
            .from('inventario_productos')
            .update({
                nombre,
                descripcion,
                precio_venta: precio_venta !== undefined ? Number(precio_venta) : undefined,
                stock_actual: stock_actual !== undefined ? Number(stock_actual) : undefined,
                categoria,
                url_imagen,
                actualizado_en: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating product:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Producto actualizado exitosamente', product: updatedProduct });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error in PUT products:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
