'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Flame,
    Droplets,
    Zap,
    Beef,
    Clock,
    ChevronRight,
    _Info,
    _ChevronLeft,
    _PieChart,
    Apple,
    Camera,
    ClipboardList,
    _LayoutDashboard
} from 'lucide-react';
import toast from 'react-hot-toast';
import MacroSnap from '@/features/ai/components/MacroSnap';

interface NutritionPlan {
    id: string;
    usuario_id: string;
    calorias_diarias: number;
    gramos_proteina: number;
    gramos_carbohidratos: number;
    gramos_grasas: number;
    comidas: Meal[];
    notas: string;
    creado_en: string;
}

interface Meal {
    nombre: string;
    horario: string;
    alimentos: Food[];
    calorias: number;
    proteina: number;
    carbohidratos: number;
    grasas: number;
}

interface Food {
    nombre: string;
    cantidad: string;
    calorias: number;
    proteina: number;
    carbohidratos: number;
    grasas: number;
}

export default function StudentNutritionPage() {
    const [loading, setLoading] = useState(true);
    const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<number>(0);
    const [viewMode, setViewMode] = useState<'plan' | 'snap'>('plan');

    useEffect(() => {
        loadNutritionPlan();
    }, []);

    const loadNutritionPlan = async () => {
        try {
            const response = await fetch('/api/student/nutrition');
            const data = await response.json();

            if (data.success && data.plan) {
                setNutritionPlan(data.plan);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar plan nutricional');
        } finally {
            setLoading(false);
        }
    };

    const getMacroPercentage = (grams: number, totalCalories: number, caloriesPerGram: number) => {
        return ((grams * caloriesPerGram) / totalCalories * 100).toFixed(1);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full"
                    />
                    <p className="text-zinc-500 font-bold animate-pulse text-sm uppercase tracking-widest">Cargando Plan Bio-Nutricional...</p>
                </div>
            </div>
        );
    }

    const proteinPercentage = nutritionPlan ? getMacroPercentage(nutritionPlan.gramos_proteina, nutritionPlan.calorias_diarias, 4) : '0';
    const carbsPercentage = nutritionPlan ? getMacroPercentage(nutritionPlan.gramos_carbohidratos, nutritionPlan.calorias_diarias, 4) : '0';
    const fatsPercentage = nutritionPlan ? getMacroPercentage(nutritionPlan.gramos_grasas, nutritionPlan.calorias_diarias, 9) : '0';

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-4 lg:p-8 text-white">
            <div className="max-w-[1400px] mx-auto space-y-10">

                {/* Switch Táctico de Modo */}
                <div className="flex justify-center">
                    <div className="bg-zinc-900/50 backdrop-blur-3xl p-1.5 rounded-[2rem] border border-white/5 flex gap-1">
                        <button
                            onClick={() => setViewMode('plan')}
                            className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'plan' ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <ClipboardList size={14} /> Plan Maestro
                        </button>
                        <button
                            onClick={() => setViewMode('snap')}
                            className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'snap' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Camera size={14} /> MacroSnap IA
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {viewMode === 'plan' ? (
                        <motion.div
                            key="plan"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-10"
                        >
                            {!nutritionPlan ? (
                                <div className="bg-[#1c1c1e]/50 backdrop-blur-2xl rounded-[3rem] p-16 text-center border border-white/5 shadow-2xl">
                                    <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-orange-500/20">
                                        <Apple size={48} className="text-orange-500" />
                                    </div>
                                    <h2 className="text-4xl font-black text-white mb-6 tracking-tight">Tu Plan está siendo Cultivado</h2>
                                    <p className="text-zinc-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                                        Tu coach está diseñando la estrategia nutricional perfecta para tus objetivos actuales.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Header Premium */}
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="bg-orange-500/20 p-2 rounded-lg border border-orange-500/30">
                                                    <Apple size={18} className="text-orange-500" />
                                                </div>
                                                <span className="text-xs font-black text-orange-500 uppercase tracking-[0.3em]">Plan Nutricional v3.0</span>
                                            </div>
                                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Bio-Alimentación <span className="text-zinc-600">Inteligente</span></h1>
                                        </div>

                                        <div className="flex items-center gap-4 bg-zinc-900/50 backdrop-blur-md px-6 py-4 rounded-3xl border border-zinc-800">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Meta Diaria</p>
                                                <p className="text-2xl font-black text-white tracking-tight">{nutritionPlan.calorias_diarias} <span className="text-xs text-zinc-600">KCAL</span></p>
                                            </div>
                                            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                                <Flame size={24} className="text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Macros Elite Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { label: 'Proteínas', value: nutritionPlan.gramos_proteina, pct: proteinPercentage, color: 'from-indigo-500 to-blue-600', icon: Beef, sub: 'Recuperación Muscular' },
                                            { label: 'Carbohidratos', value: nutritionPlan.gramos_carbohidratos, pct: carbsPercentage, color: 'from-emerald-500 to-teal-600', icon: Zap, sub: 'Energía de Alto Rendimiento' },
                                            { label: 'Grasas', value: nutritionPlan.gramos_grasas, pct: fatsPercentage, color: 'from-amber-500 to-orange-600', icon: Droplets, sub: 'Optimización Hormonal' },
                                        ].map((macro, _idx) => (
                                            <motion.div
                                                key={macro.label}
                                                whileHover={{ y: -5 }}
                                                className="relative group p-8 rounded-[2rem] bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden"
                                            >
                                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${macro.color} opacity-5 blur-3xl group-hover:opacity-10 transition-opacity`} />
                                                <div className="flex items-start justify-between mb-8 relative z-10">
                                                    <div>
                                                        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">{macro.label}</p>
                                                        <h3 className="text-4xl font-black text-white tracking-tighter">{macro.value}g</h3>
                                                    </div>
                                                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${macro.color} shadow-lg shadow-black/20`}>
                                                        <macro.icon size={24} className="text-white" />
                                                    </div>
                                                </div>
                                                <div className="space-y-4 relative z-10">
                                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${macro.pct}%` }}
                                                            className={`h-full bg-gradient-to-r ${macro.color}`}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                        <span className="text-zinc-500">{macro.sub}</span>
                                                        <span className="text-white">{macro.pct}%</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Strategy Section */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                        <div className="lg:col-span-4 space-y-4">
                                            <div className="flex items-center gap-3 mb-6 px-4">
                                                <Clock size={16} className="text-zinc-500" />
                                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Cronograma</h3>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                {nutritionPlan.comidas.map((meal, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => setSelectedMeal(index)}
                                                        className={`p-6 rounded-[2rem] text-left transition-all border flex items-center justify-between group ${selectedMeal === index ? 'bg-white text-black border-transparent' : 'bg-zinc-900/40 text-zinc-400 border-zinc-800'}`}
                                                    >
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">{meal.horario}</p>
                                                            <p className="font-black text-lg tracking-tight uppercase">{meal.nombre}</p>
                                                        </div>
                                                        <ChevronRight size={18} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="lg:col-span-8">
                                            <div className="bg-zinc-900/60 backdrop-blur-3xl border border-zinc-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                                                {nutritionPlan.comidas[selectedMeal] && (
                                                    <>
                                                        <div className="flex justify-between items-center mb-12">
                                                            <h2 className="text-5xl font-black text-white tracking-tighter uppercase">{nutritionPlan.comidas[selectedMeal].nombre}</h2>
                                                            <div className="bg-white text-black p-6 rounded-[2rem] text-center min-w-[140px]">
                                                                <p className="text-4xl font-black tracking-tighter">{nutritionPlan.comidas[selectedMeal].calorias}</p>
                                                                <p className="text-[10px] font-black uppercase opacity-40">KCAL</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {nutritionPlan.comidas[selectedMeal].alimentos.map((food, i) => (
                                                                <div key={i} className="bg-black/20 p-6 rounded-3xl border border-white/5">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <p className="text-white font-bold">{food.nombre}</p>
                                                                        <span className="text-[10px] font-black text-zinc-500">{food.cantidad}</span>
                                                                    </div>
                                                                    <div className="flex gap-4 opacity-40 text-[9px] font-black uppercase">
                                                                        <span>P: {food.proteina}g</span>
                                                                        <span>C: {food.carbohidratos}g</span>
                                                                        <span>G: {food.grasas}g</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="snap"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <MacroSnap />
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
