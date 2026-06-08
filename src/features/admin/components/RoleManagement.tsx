'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const AVAILABLE_ROLES = [
    { id: 'member', label: 'Alumno', icon: '🏃', color: 'text-blue-400' },
    { id: 'coach', label: 'Profesor', icon: '🎓', color: 'text-orange-400' },
    { id: 'recepcion', label: 'Recepcionista', icon: '📞', color: 'text-green-400' },
    { id: 'admin', label: 'Admin', icon: '⚙️', color: 'text-purple-400' },
] as const;

type RoleId = typeof AVAILABLE_ROLES[number]['id'];

interface User {
    id: string;
    nombre_completo: string;
    correo: string;
    rol: RoleId | string;
}

// Función auxiliar para normalizar los nombres de roles procedentes de la BBDD
const getNormalizedRole = (rawRole: string): RoleId => {
    const roleLower = (rawRole || '').toLowerCase();
    if (['coach', 'profesor', 'entrenador'].includes(roleLower)) return 'coach';
    if (['admin', 'administrador'].includes(roleLower)) return 'admin';
    if (['recepcion', 'recepcionista'].includes(roleLower)) return 'recepcion';
    return 'member';
};

export function RoleManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showRoleModal, setShowRoleModal] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/users/list');
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            toast.error('Error al cargar usuarios');
            // Mock data fallback
            setUsers([
                { id: '1', nombre_completo: 'Juan Pérez', correo: 'juan@demo.com', rol: 'member' },
                { id: '2', nombre_completo: 'María García', correo: 'maria@demo.com', rol: 'coach' },
                { id: '3', nombre_completo: 'Carlos López', correo: 'carlos@demo.com', rol: 'member' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (newRole: string) => {
        if (!selectedUser) return;

        const loadingToast = toast.loading('Actualizando rol del usuario...');
        try {
            const res = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al actualizar el rol');
            }

            // Actualizar localmente si la API responde éxito
            setUsers(users.map(u =>
                u.id === selectedUser.id ? { ...u, rol: newRole } : u
            ));

            toast.dismiss(loadingToast);
            toast.success(data.message || `Rol cambiado a ${AVAILABLE_ROLES.find(r => r.id === newRole)?.label}`);
            setShowRoleModal(false);
            setSelectedUser(null);
        } catch (err) {
            toast.dismiss(loadingToast);
            console.error('Error changing role:', err);
            toast.error(err instanceof Error ? err.message : 'Error al cambiar rol');
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Cargando usuarios...</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white/5 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-400">
                    💡 Haz clic en "Cambiar Rol" para asignar o modificar permisos de usuarios
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[#0a0a0a] text-gray-400 text-sm">
                        <tr>
                            <th className="p-3 text-left">Usuario</th>
                            <th className="p-3 text-left">Email</th>
                            <th className="p-3 text-left">Rol Actual</th>
                            <th className="p-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user) => {
                            const normalizedRole = getNormalizedRole(user.rol);
                            const roleInfo = AVAILABLE_ROLES.find(r => r.id === normalizedRole);
                            return (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                                {user.nombre_completo?.charAt(0) || 'U'}
                                            </div>
                                            <span className="font-medium text-white">{user.nombre_completo || 'Sin nombre'}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-gray-400">{user.correo}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{roleInfo?.icon}</span>
                                            <span className={`font-bold ${roleInfo?.color}`}>
                                                {roleInfo?.label || user.rol}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setShowRoleModal(true);
                                            }}
                                            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white rounded-lg transition-all text-sm font-medium"
                                        >
                                            Cambiar Rol
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Role Change Modal */}
            <AnimatePresence>
                {showRoleModal && selectedUser && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowRoleModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1c1c1e] rounded-2xl border border-white/10 max-w-md w-full p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-white">Cambiar Rol</h2>
                                <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
                            </div>

                            <div className="mb-6">
                                <p className="text-gray-400 mb-2">Usuario seleccionado:</p>
                                <div className="bg-white/5 rounded-lg p-3">
                                    <p className="font-bold text-white">{selectedUser.nombre_completo}</p>
                                    <p className="text-sm text-gray-400">{selectedUser.correo}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <p className="text-gray-400 font-bold text-sm">Selecciona nuevo rol:</p>
                                {AVAILABLE_ROLES.map((role) => {
                                    const userNormalizedRole = getNormalizedRole(selectedUser.rol);
                                    const isCurrentRole = role.id === userNormalizedRole;
                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => handleRoleChange(role.id)}
                                            disabled={isCurrentRole}
                                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${isCurrentRole
                                                ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-50'
                                                : 'bg-white/5 border-white/10 hover:border-purple-500 hover:bg-purple-500/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{role.icon}</span>
                                                <div>
                                                    <p className={`font-bold ${role.color}`}>{role.label}</p>
                                                    {isCurrentRole && (
                                                        <p className="text-xs text-gray-500">Rol actual</p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-yellow-400 text-xs">
                                    ⚠️ <strong>Advertencia:</strong> El cambio de rol es inmediato y afectará los permisos del usuario.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
