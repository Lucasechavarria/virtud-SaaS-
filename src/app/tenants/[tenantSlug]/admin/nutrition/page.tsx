
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';

interface NutritionPlan {
    id: string;
    usuario_id: string;
    entrenador_id: string | null;
    calorias_diarias: number;
    gramos_proteina: number;
    gramos_carbos: number;
    gramos_grasas: number;
    creado_en: string;
    esta_activo: boolean;
    user: {
        nombre_completo: string | null;
        email: string;
    };
    coach: {
        nombre_completo: string | null;
    } | null;
}

export default function AdminNutritionPage() {
    const [plans, setPlans] = useState<NutritionPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/nutrition');
            const data = await res.json();
            if (res.ok) {
                setPlans(data);
            } else {
                toast.error('Error al cargar planes nutricionales');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 bg-[#0a0a0a] min-h-screen text-white">
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                }}
            />

            <header className="flex justify-between items-center border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
                        Nutrición
                    </h1>
                    <p className="text-gray-400 mt-2">Gestión de planes alimenticios generados por IA</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchPlans}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold transition-colors border border-white/10"
                    >
                        🔄 Recargar
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                </div>
            ) : (
                <div className="bg-[#1c1c1e] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Alumno</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Coach</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Calorías</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Macros (P/C/G)</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {plans.map((plan) => (
                                    <motion.tr
                                        key={plan.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-white/5 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-xs font-black">
                                                    {(plan.user.nombre_completo || '?')[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{plan.user.nombre_completo || 'Sin Nombre'}</p>
                                                    <p className="text-xs text-gray-500">{plan.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10">
                                                {plan.coach?.nombre_completo || 'IA Generativa'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-green-400">{plan.calorias_diarias} kcal</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 text-xs font-bold">
                                                <span className="text-blue-400">{plan.gramos_proteina}g P</span>
                                                <span className="text-gray-600">/</span>
                                                <span className="text-yellow-400">{plan.gramos_carbos}g C</span>
                                                <span className="text-gray-600">/</span>
                                                <span className="text-red-400">{plan.gramos_grasas}g G</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {new Date(plan.creado_en).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${plan.esta_activo
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {plan.esta_activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {plans.length === 0 && (
                        <div className="p-12 text-center text-gray-500 italic">
                            No hay planes nutricionales registrados.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
