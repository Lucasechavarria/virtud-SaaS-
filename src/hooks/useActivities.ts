'use client';

import { useEffect, useState } from 'react';
import { activitiesService } from '@/services/activities.service';
import { Database } from '../types/supabase';

type Activity = Database['public']['Tables']['actividades']['Row'];

/**
 * Hook para obtener actividades por tipo
 * Ejemplo de migración de Firebase a Supabase
 */
export function useActivities(type?: 'gym' | 'martial_arts' | 'tcm' | 'wellness') {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        loadActivities();
    }, [type]);

    const loadActivities = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = type
                ? await activitiesService.getByType(type)
                : await activitiesService.getAll();

            setActivities(data);
        } catch (err) {
            setError(err as Error);
            console.error('Error loading activities:', err);
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => {
        loadActivities();
    };

    return {
        activities,
        loading,
        error,
        refresh,
    };
}

/**
 * ANTES (Firebase):
 * 
 * const [activities, setActivities] = useState([]);
 * 
 * useEffect(() => {
 *   const unsubscribe = db
 *     .collection('actividades')
 *     .where('tipo', '==', type)
 *     .onSnapshot(snapshot => {
 *       const data = snapshot.docs.map(doc => ({
 *         id: doc.id,
 *         ...doc.data()
 *       }));
 *       setActivities(data);
 *     });
 *   
 *   return () => unsubscribe();
 * }, [type]);
 * 
 * DESPUÉS (Supabase):
 * 
 * const { activities, loading } = useActivities(type);
 * 
 * ✅ Más simple
 * ✅ TypeScript completo
 * ✅ Manejo de errores incluido
 * ✅ Función refresh incluida
 */
