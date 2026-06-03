import { createAdminClient } from '../../src/lib/supabase/admin';

/**
 * Limpia de forma segura y estructurada todos los datos creados para un gimnasio de pruebas específico.
 * Para evitar accidentes catastróficos en producción o desarrollo, se limita estrictamente a
 * slugs que inicien con prefijos de prueba como 'test-' o contengan palabras seguras de test.
 * 
 * @param slug - El slug del gimnasio a limpiar
 */
export async function clearTestGymBySlug(slug: string): Promise<void> {
    // Salvaguarda crítica para evitar purgar datos reales
    const isTestSlug = slug.startsWith('test-') || 
                       slug.includes('mock') || 
                       slug.includes('fallido') || 
                       slug.includes('palermo-test');

    if (!isTestSlug) {
        console.warn(`[DB-Reset Guard] Abortando borrado. El slug "${slug}" no cumple con el prefijo de pruebas seguro.`);
        return;
    }

    const supabase = createAdminClient();

    try {
        // 1. Buscar el gimnasio por su slug
        const { data: gym, error: findError } = await supabase
            .from('gimnasios')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (findError) {
            console.error(`[DB-Reset] Error al buscar gimnasio de prueba con slug "${slug}":`, findError.message);
            return;
        }

        if (!gym) {
            // El gimnasio ya está limpio o no fue creado
            return;
        }

        const gymId = gym.id;

        // 2. Eliminar logs de auditoría vinculados al gimnasio de pruebas (si existen)
        const { error: auditError } = await supabase
            .from('audit_logs')
            .delete()
            .eq('registro_id', gymId);
        if (auditError) {
            console.warn(`[DB-Reset] Advertencia al limpiar logs de auditoría para el gimnasio ${gymId}:`, auditError.message);
        }

        // 3. Eliminar perfiles asociados (los administradores creados para la prueba)
        const { error: profilesError } = await supabase
            .from('perfiles')
            .delete()
            .eq('gimnasio_id', gymId);
        if (profilesError) {
            console.error(`[DB-Reset] Error al limpiar perfiles asociados al gimnasio ${gymId}:`, profilesError.message);
        }

        // 4. Eliminar sucursales asociadas (Sede Casa Central, etc.)
        const { error: branchesError } = await supabase
            .from('sucursales')
            .delete()
            .eq('gimnasio_id', gymId);
        if (branchesError) {
            console.error(`[DB-Reset] Error al limpiar sucursales asociadas al gimnasio ${gymId}:`, branchesError.message);
        }

        // 5. Por último, eliminar el gimnasio principal
        const { error: gymDeleteError } = await supabase
            .from('gimnasios')
            .delete()
            .eq('id', gymId);

        if (gymDeleteError) {
            console.error(`[DB-Reset] Error final al eliminar el gimnasio ${gymId}:`, gymDeleteError.message);
        } else {
            console.log(`[DB-Reset] DB saneada exitosamente para el gimnasio de pruebas con slug: "${slug}"`);
        }

    } catch (err) {
        console.error(`[DB-Reset] Error inesperado durante la limpieza del gimnasio de pruebas "${slug}":`, err);
    }
}
