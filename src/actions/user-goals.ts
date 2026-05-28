'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Database } from '../types/supabase';

type UserGoalInsert = Database['public']['Tables']['objetivos_del_usuario']['Insert'];

/**
 * Create a new user goal (Server Action)
 */
export async function createUserGoal(goalData: Omit<UserGoalInsert, 'usuario_id' | 'actualizado_en'>) {
    const supabase = await createClient();

    // Ensure the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    // Set user_id from the session to ensure security (trust the session, not the client input for user_id)
    const dataToInsert = {
        ...goalData,
        usuario_id: user.id,
        actualizado_en: new Date().toISOString() // Ensure updated_at is set
    };

    // If active, deactivate others (logic from service)
    const dataTyped = dataToInsert as UserGoalInsert;
    if (dataTyped.esta_activo) {
        await (supabase
            .from('objetivos_del_usuario') as any)
            .update({ esta_activo: false })
            .eq('usuario_id', user.id)
            .eq('esta_activo', true);
    }

    const { data, error } = await (supabase
        .from('objetivos_del_usuario') as any)
        .insert(dataToInsert)
        .select()
        .single();

    if (error) {
        console.error('Error creating goal:', error);
        throw new Error('Failed to create goal');
    }

    // Revalidate relevant paths if needed
    revalidatePath('/onboarding');
    revalidatePath('/dashboard');

    return data;
}
