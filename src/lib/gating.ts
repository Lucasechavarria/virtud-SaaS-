import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasModuleAccess } from './saas/modules';

/**
 * Valida de forma asíncrona en el Servidor (RSC) si el gimnasio tiene activo un módulo específico.
 * Si el módulo está inactivo, redirige automáticamente al portal de Módulo Bloqueado.
 * 
 * Implementa un esquema de "Fail Open" con registro de errores en consola para asegurar
 * resiliencia operativa ante caídas temporales de red, delegando la seguridad de los datos a RLS.
 * 
 * @param requiredModule - Nombre del módulo a verificar (ej. 'Finanzas', 'Nutricion', 'Crm', 'Clases', 'Pos')
 * @param tenantSlug - Slug del gimnasio correspondiente al subdominio
 */
export async function checkModuleAccess(requiredModule: string, tenantSlug: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[RSC Gating Helper] Error: Missing Supabase environment variables');
        return; // Fail Open: Permitir acceso
    }

    try {
        // 1. Inicializar cliente Supabase compatible con Server Components
        const supabase = await createClient();

        // 2. Obtener metadatos del usuario logueado (Claims del JWT)
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.warn('[RSC Gating Helper] Auth error, checking public bypass:', authError.message);
        }

        let activeModules: string[] | Record<string, boolean> = [];
        let isSuperAdmin = false;

        if (user) {
            const userRole = (user.app_metadata?.rol || user.app_metadata?.role)?.toLowerCase();
            isSuperAdmin = userRole === 'superadmin';
            activeModules = user.app_metadata?.modulos_activos || [];
        }

        // El superadministrador global evade los gates de módulos contratados
        if (isSuperAdmin) {
            return;
        }

        // 3. Evaluar de forma local si el módulo está contratado (Bitmask e Híbrido)
        const isEnabled = hasModuleAccess(activeModules, requiredModule);

        // 4. Redirección si el módulo no está activo en este gimnasio
        if (!isEnabled) {
            console.warn(`[RSC Gate] Módulo ${requiredModule} inactivo para ${tenantSlug}. Redirigiendo...`);
            redirect(`/tenants/${tenantSlug}/modulo-bloqueado?modulo=${encodeURIComponent(requiredModule)}`);
        }
        
    } catch (error: any) {
        // Manejar de forma robusta la redirección de Next.js (ya que Next.js implementa redirect() arrojando un error interno de control)
        if (error && error.digest && error.digest.startsWith('NEXT_REDIRECT')) {
            throw error; // Re-arrojar la redirección de Next.js para que el framework complete la redirección
        }
        
        // Fail Open Seguro con Registro de Error en Consola
        console.error(`[RSC Gating Helper] Critical Exception in gating for module ${requiredModule}:`, error);
        return; // Fail Open: Permitir acceso ante caídas de red o fallas en el servidor
    }
}
