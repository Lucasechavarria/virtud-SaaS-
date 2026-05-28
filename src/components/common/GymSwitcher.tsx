'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, ChevronDown, Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface Branch {
    id: string;
    nombre: string;
}

interface Gym {
    id: string;
    nombre: string;
    sucursales: Branch[];
}

export default function GymSwitcher({ profileRole }: { profileRole?: string }) {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Solo mostramos el switcher a staff (admin, superadmin, coach)
        if (!['admin', 'superadmin', 'coach'].includes(profileRole || '')) {
            setLoading(false);
            return;
        }
        fetchContext();
    }, [profileRole]);

    const fetchContext = async () => {
        try {
            const res = await fetch('/api/saas/context');
            const data = await res.json();

            if (res.ok) {
                setGyms(data.gyms || []);

                // Set default/current selection
                if (data.gyms?.length > 0) {
                    const currentGym = data.gyms.find((g: any) => g.id === data.current.gymId) || data.gyms[0];
                    setSelectedGym(currentGym);

                    if (currentGym.sucursales?.length > 0) {
                        const currentBranch = currentGym.sucursales.find((s: any) => s.id === data.current.branchId) || currentGym.sucursales[0];
                        setSelectedBranch(currentBranch);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching gyms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = async (gym: Gym | null, branch?: Branch | null) => {
        try {
            const res = await fetch('/api/saas/set-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gymId: gym?.id || null, branchId: branch?.id || null })
            });

            if (res.ok) {
                setSelectedGym(gym);
                setSelectedBranch(branch || null);
                setIsOpen(false);
                toast.success(gym ? `Contexto cambiado a: ${gym.nombre}` : 'Contexto cambiado a Global');

                // Refresh data/page to apply new context
                window.location.reload();
            } else {
                toast.error('Error al cambiar contexto');
            }
        } catch (_error) {
            toast.error('Error de conexión');
        }
    };

    if (loading || gyms.length === 0) return null;

    return (
        <div className="relative">
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left min-w-[180px]"
            >
                <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center text-red-500">
                    <Building2 size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">
                        {profileRole === 'superadmin' ? 'Contexto SaaS' : 'Gimnasio'}
                    </p>
                    <p className="text-xs font-bold text-white truncate leading-none">
                        {selectedGym?.nombre || (profileRole === 'superadmin' ? 'Global (Red)' : 'Seleccionar...')}
                    </p>
                    {selectedBranch && (
                        <p className="text-[9px] text-red-400 font-medium truncate mt-1">
                            📍 {selectedBranch.nombre}
                        </p>
                    )}
                </div>
                <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 mt-3 w-72 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                        >
                            <div className="p-4 bg-white/5 border-b border-white/5">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contexto Global</p>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
                                {profileRole === 'superadmin' && (
                                    <div
                                        className={`px-3 py-2 rounded-lg flex items-center justify-between group cursor-pointer transition-colors ${!selectedGym ? 'bg-red-600/10 text-red-400' : 'hover:bg-white/5 text-gray-400'}`}
                                        onClick={() => handleSwitch(null, null)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className={!selectedGym ? 'animate-pulse' : ''} />
                                            <span className="text-xs font-black uppercase tracking-widest">Global (Vista SaaS)</span>
                                        </div>
                                        {!selectedGym && <Check size={12} />}
                                    </div>
                                )}
                                {gyms.map(gym => (
                                    <div key={gym.id} className="space-y-1">
                                        <div
                                            className={`px-3 py-2 rounded-lg flex items-center justify-between group cursor-pointer transition-colors ${selectedGym?.id === gym.id ? 'bg-red-600/10 text-red-400' : 'hover:bg-white/5 text-gray-400'}`}
                                            onClick={() => handleSwitch(gym, gym.sucursales?.[0])}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} />
                                                <span className="text-xs font-bold">{gym.nombre}</span>
                                            </div>
                                            {selectedGym?.id === gym.id && <Check size={12} />}
                                        </div>

                                        {/* Sucursales del gym */}
                                        <div className="ml-4 space-y-1">
                                            {gym.sucursales?.map(branch => (
                                                <button
                                                    key={branch.id}
                                                    onClick={() => handleSwitch(gym, branch)}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition-all ${selectedBranch?.id === branch.id && selectedGym?.id === gym.id ? 'text-red-400 font-bold' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <MapPin size={10} /> {branch.nombre}
                                                    </span>
                                                    {selectedBranch?.id === branch.id && selectedGym?.id === gym.id && <Check size={10} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {profileRole === 'superadmin' && (
                                <div className="p-3 bg-red-600/5 border-t border-red-500/10 text-center">
                                    <button className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors">
                                        + Agregar Nuevo Gimnasio
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
