'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function SettingsPage({ params }: { params: { gymId: string } }) {
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [profile, setProfile] = useState<any>(null);

    // Form States
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data } = await supabase.from('perfiles').select('*').eq('id', user.id).single() as { data: any; error: any };
                if (data) {
                    setProfile(data);
                    setFullName(data.nombre_completo || '');
                    setPhone(data.telefono || '');
                }
            }
        };
        getProfile();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updates = {
                id: user.id,
                nombre_completo: fullName,
                telefono: phone,
                actualizado_en: new Date().toISOString(),
            };

            const { error } = await (supabase.from('perfiles') as any).upsert(updates);

            if (error) throw error;
            toast.success('Perfil actualizado correctamente');
        } catch (error) {
            toast.error('Error al actualizar perfil');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            toast.success('Contraseña actualizada');
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error('Error al actualizar contraseña');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!profile) return <div className="p-8 text-white">Cargando perfil...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            <h1 className="text-3xl font-black text-white mb-6">⚙️ Configuración de Cuenta</h1>

            {/* Profile Info Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/10"
            >
                <h2 className="text-xl font-bold text-white mb-4">Información Personal</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Nombre Completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Teléfono</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Rol</label>
                            <div className="w-full p-3 text-orange-500 font-bold uppercase text-sm">
                                {profile.rol}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Medical Profile Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6"
            >
                <div>
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        🩺 Ficha Médica y Deslinde
                    </h2>
                    <p className="text-gray-400 text-sm">
                        Mantén actualizada tu información de salud y contacto de emergencia.
                        Es vital para tu seguridad.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <Link
                        href={`/${params.gymId}/member/dashboard/profile/complete`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/30 rounded-xl font-bold transition-all"
                    >
                        📝 Actualizar Ficha
                    </Link>
                </div>
            </motion.div>

            {/* Password Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/10"
            >
                <h2 className="text-xl font-bold text-white mb-4">Seguridad</h2>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="px-6 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
