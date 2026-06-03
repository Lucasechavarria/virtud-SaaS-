'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const mockClasses = [
    { id: 1, name: 'CrossFit WOD', time: '06:00', coach: 'Pablo', spots: 3, total: 15 },
    { id: 2, name: 'Yoga Flow', time: '08:00', coach: 'María', spots: 8, total: 12 },
    { id: 3, name: 'Funcional', time: '18:00', coach: 'Carlos', spots: 0, total: 20 },
    { id: 4, name: 'Boxing', time: '19:30', coach: 'Ana', spots: 5, total: 10 },
];

export default function BookingPage({ _params }: { _params: { gymId: string } }) {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase
                        .from('perfiles')
                        .select('waiver_accepted')
                        .eq('id', user.id)
                        .single();
                    setProfile(data);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleBookingClick = (clase: any) => {
        if (!profile?.waiver_accepted) {
            toast.error('Debes completar tu ficha médica antes de reservar.');
            return;
        }
        // Logic for booking would go here
        toast.success(`Reserva para ${clase.name} enviada.`);
    };
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
            <motion.div
                className="max-w-6xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
            >
                {/* Header */}
                <motion.header
                    className="mb-8"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-4xl font-black mb-2">Reservá tu Clase</h1>
                    <p className="text-gray-400">Elegí tu horario y asegurá tu lugar</p>
                </motion.header>

                {/* Day Selector */}
                <motion.div
                    className="flex gap-3 mb-8 overflow-x-auto pb-2"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {['Hoy', 'Mañana', 'Miércoles', 'Jueves', 'Viernes'].map((day, idx) => (
                        <motion.button
                            key={day}
                            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap ${idx === 1
                                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                                : 'bg-[#1c1c1e] text-gray-400 border border-[#3a3a3c]'
                                }`}
                            whileHover={{ scale: 1.05, borderColor: '#FF5722' }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {day}
                        </motion.button>
                    ))}
                </motion.div>

                {/* Classes Grid */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {mockClasses.map((clase) => (
                        <motion.div
                            key={clase.id}
                            className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-6 relative overflow-hidden group"
                            variants={cardVariants}
                            whileHover={{ scale: 1.03, borderColor: '#FF5722' }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity"
                            />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">{clase.name}</h3>
                                        <p className="text-sm text-gray-400">Coach {clase.coach}</p>
                                    </div>
                                    <motion.div
                                        className="text-3xl font-black text-orange-500"
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        {clase.time}
                                    </motion.div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <motion.div
                                            className={`w-3 h-3 rounded-full ${clase.spots > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                        <span className="text-sm text-gray-400">
                                            {clase.spots > 0 ? `${clase.spots} lugares` : 'Lista de espera'}
                                        </span>
                                    </div>

                                    <motion.button
                                        onClick={() => handleBookingClick(clase)}
                                        className={`px-6 py-2 rounded-xl font-bold ${clase.spots > 0
                                            ? profile?.waiver_accepted
                                                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                                                : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                                            : 'bg-gray-700 text-gray-400'
                                            }`}
                                        whileHover={{ scale: (clase.spots > 0 && profile?.waiver_accepted) ? 1.1 : 1 }}
                                        whileTap={{ scale: (clase.spots > 0 && profile?.waiver_accepted) ? 0.95 : 1 }}
                                        disabled={clase.spots === 0 || !profile?.waiver_accepted}
                                    >
                                        {clase.spots > 0 ? 'Reservar' : 'Lleno'}
                                    </motion.button>
                                </div>

                                <div className="mt-4 pt-4 border-t border-[#3a3a3c]">
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Capacidad</span>
                                        <span>{clase.total - clase.spots}/{clase.total}</span>
                                    </div>
                                    <motion.div
                                        className="w-full bg-[#2c2c2e] rounded-full h-2 mt-2 overflow-hidden"
                                    >
                                        <motion.div
                                            className="bg-gradient-to-r from-orange-600 to-red-600 h-full rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${((clase.total - clase.spots) / clase.total) * 100}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Waiver Warning Modal */}
            <AnimatePresence>
                {!loading && !profile?.waiver_accepted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-[#1c1c1e] border border-orange-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
                        >
                            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">⚠️</span>
                            </div>
                            <h2 className="text-2xl font-black mb-4">¡Atención, Campeón!</h2>
                            <p className="text-gray-400 mb-8">
                                Para tu seguridad y la de todos, es necesario que completes tu <strong>Ficha Médica</strong> antes de comenzar a entrenar.
                            </p>
                            <Link
                                href="/dashboard/profile/complete"
                                className="block w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-600/30 mb-4"
                            >
                                Completar Ficha Ahora
                            </Link>
                            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-white transition-colors">
                                Volver al Dashboard
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
