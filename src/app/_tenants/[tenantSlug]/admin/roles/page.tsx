'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'member' | 'coach' | 'admin' | 'superadmin';
    created_at: string;
    onboarding_completed: boolean;
}

const ROLES = [
    { value: 'member', label: 'Alumno', color: 'bg-blue-500', icon: '👤' },
    { value: 'coach', label: 'Coach', color: 'bg-green-500', icon: '👨‍🏫' },
    { value: 'admin', label: 'Admin', color: 'bg-orange-500', icon: '⚙️' },
    { value: 'superadmin', label: 'Super Admin', color: 'bg-red-500', icon: '👑' },
];

export default function RolesManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState<string>('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();

            if (data.success) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeRole = async () => {
        if (!selectedUser || !newRole) return;

        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Rol actualizado a ${ROLES.find(r => r.value === newRole)?.label}`);
                setShowModal(false);
                loadUsers();
            } else {
                toast.error(data.error || 'Error al cambiar rol');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cambiar rol');
        }
    };

    const openChangeRoleModal = (user: User) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setShowModal(true);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !filterRole || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const getRoleInfo = (role: string) => {
        return ROLES.find(r => r.value === role) || ROLES[0];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">Cargando usuarios...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">👥 Gestión de Roles</h1>
                        <p className="text-gray-400">Administra los roles y permisos de usuarios</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {ROLES.map(role => {
                        const count = users.filter(u => u.role === role.value).length;
                        return (
                            <div key={role.value} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl">{role.icon}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${role.color} text-white`}>
                                        {count}
                                    </span>
                                </div>
                                <div className="text-white font-semibold">{role.label}</div>
                                <div className="text-xs text-gray-400">{count} usuario{count !== 1 ? 's' : ''}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">Todos los roles</option>
                            {ROLES.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Rol Actual
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredUsers.map(user => {
                                const roleInfo = getRoleInfo(user.role);
                                return (
                                    <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full ${roleInfo.color} flex items-center justify-center text-white font-bold`}>
                                                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{user.full_name || 'Sin nombre'}</div>
                                                    <div className="text-xs text-gray-400">
                                                        Registrado: {new Date(user.created_at).toLocaleDateString('es-AR')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleInfo.color} text-white flex items-center gap-1 w-fit`}>
                                                <span>{roleInfo.icon}</span>
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.onboarding_completed ? (
                                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                                                    ✓ Completo
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                                    ⏳ Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => openChangeRoleModal(user)}
                                                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
                                            >
                                                Cambiar Rol
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            No se encontraron usuarios
                        </div>
                    )}
                </div>

                {/* Change Role Modal */}
                {showModal && selectedUser && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
                            <h2 className="text-2xl font-bold text-white mb-6">Cambiar Rol de Usuario</h2>

                            <div className="mb-6">
                                <div className="text-gray-400 text-sm mb-2">Usuario:</div>
                                <div className="text-white font-semibold">{selectedUser.full_name}</div>
                                <div className="text-gray-400 text-sm">{selectedUser.email}</div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    Nuevo Rol
                                </label>
                                <div className="space-y-2">
                                    {ROLES.map(role => (
                                        <button
                                            key={role.value}
                                            onClick={() => setNewRole(role.value)}
                                            className={`w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${newRole === role.value
                                                    ? `${role.color} border-transparent text-white`
                                                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                                                }`}
                                        >
                                            <span className="text-2xl">{role.icon}</span>
                                            <div className="flex-1 text-left">
                                                <div className="font-semibold">{role.label}</div>
                                                <div className="text-xs opacity-80">
                                                    {role.value === 'member' && 'Acceso básico de alumno'}
                                                    {role.value === 'coach' && 'Gestión de alumnos y rutinas'}
                                                    {role.value === 'admin' && 'Gestión completa del sistema'}
                                                    {role.value === 'superadmin' && 'Acceso total sin restricciones'}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleChangeRole}
                                    disabled={newRole === selectedUser.role}
                                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                >
                                    Confirmar Cambio
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
