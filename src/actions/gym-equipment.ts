'use server';

import { gymEquipmentService, type GymEquipmentInsert, type GymEquipmentUpdate } from '@/services/gym-equipment.service';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Auxiliar para verificar rol y gimnasio de un usuario en el servidor
 */
async function checkAuthAndGetGym(allowedRoles: string[]) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('No autorizado: Sesión no válida');
    }

    const { data: profile, error: dbError } = await supabase
        .from('perfiles')
        .select('rol, gimnasio_id')
        .eq('id', user.id)
        .single();

    if (dbError || !profile || !allowedRoles.includes(profile.rol)) {
        throw new Error('No autorizado: Permisos insuficientes');
    }

    return profile;
}

export async function getEquipment() {
    // Validar que el usuario esté autenticado
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        throw new Error('No autorizado');
    }

    return await gymEquipmentService.getAll();
}

export async function createEquipment(data: GymEquipmentInsert) {
    const profile = await checkAuthAndGetGym(['admin', 'superadmin', 'coach']);

    // Forzar multi-tenancy: inyectar el gimnasio_id de la sesión del usuario
    const dataToInsert = {
        ...data,
        gimnasio_id: profile.gimnasio_id
    } as GymEquipmentInsert;

    const result = await gymEquipmentService.create(dataToInsert);
    revalidatePath('/admin/equipment');
    return result;
}

export async function updateEquipment(id: string, data: GymEquipmentUpdate) {
    const profile = await checkAuthAndGetGym(['admin', 'superadmin', 'coach']);

    // Validar IDOR: verificar que el equipamiento pertenezca al mismo gimnasio que el usuario
    const equipment = await gymEquipmentService.getById(id);
    if (!equipment || (equipment as any).gimnasio_id !== profile.gimnasio_id) {
        throw new Error('No autorizado: El recurso no pertenece a tu gimnasio');
    }

    const result = await gymEquipmentService.update(id, data);
    revalidatePath('/admin/equipment');
    return result;
}

export async function deleteEquipment(id: string) {
    const profile = await checkAuthAndGetGym(['admin', 'superadmin']);

    // Validar IDOR: verificar que el equipamiento pertenezca al mismo gimnasio que el usuario
    const equipment = await gymEquipmentService.getById(id);
    if (!equipment || (equipment as any).gimnasio_id !== profile.gimnasio_id) {
        throw new Error('No autorizado: El recurso no pertenece a tu gimnasio');
    }

    const result = await gymEquipmentService.delete(id);
    revalidatePath('/admin/equipment');
    return result;
}
