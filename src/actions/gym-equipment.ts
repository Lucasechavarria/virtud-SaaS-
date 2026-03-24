'use server';

import { gymEquipmentService, type GymEquipmentInsert, type GymEquipmentUpdate } from '@/services/gym-equipment.service';
import { revalidatePath } from 'next/cache';

export async function getEquipment() {
    return await gymEquipmentService.getAll();
}

export async function createEquipment(data: GymEquipmentInsert) {
    const result = await gymEquipmentService.create(data);
    revalidatePath('/admin/equipment');
    return result;
}

export async function updateEquipment(id: string, data: GymEquipmentUpdate) {
    const result = await gymEquipmentService.update(id, data);
    revalidatePath('/admin/equipment');
    return result;
}

export async function deleteEquipment(id: string) {
    const result = await gymEquipmentService.delete(id);
    revalidatePath('/admin/equipment');
    return result;
}
