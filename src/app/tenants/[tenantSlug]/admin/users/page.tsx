'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';

import ProfileViewerModal from '@/features/admin/components/ProfileViewerModal';
import { SupabaseUserProfile, UserRole } from '@/types/user';

// Extend the shared type to include any frontend-specific fields if needed, 
// or just use it directly. The API returns 'name' as a convenience alias for 'full_name'.
interface User extends SupabaseUserProfile {
    name: string; // API sends this
    membershipStatus: string;
    membershipEnds: string | null;
    assigned_coach_id?: string | null;
    role: UserRole; // Make it explicit and non-unknown
    gym?: string;
    items?: unknown[]; // For older types compatibility if needed
}

interface Coach {
    id: string;
    nombre_completo: string;
    email: string;
}

interface GymLimits {
    canAddUser: boolean;
    currentUsers: number;
    limitUsers: number;
}

export default function UsersPage() {
    const _supabase = createClient();
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;

    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [limits, setLimits] = useState<GymLimits | null>(null);

    useEffect(() => {
        if (tenantSlug) {
            fetchUsers();
            fetchCoaches();
            fetchLimits();
        }
    }, [tenantSlug]);

    const fetchLimits = async () => {
        try {
            const res = await fetch('/api/admin/gym/info');
            const data = await res.json();
            if (res.ok) setLimits(data.limits);
        } catch (error) {
            console.error('Error fetching limits:', error);
        }
    };

    const fetchCoaches = async () => {
        try {
            const url = tenantSlug 
                ? `/api/admin/coaches/list?gymId=${tenantSlug}` 
                : '/api/admin/coaches/list';
            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al obtener lista de coaches');
            }

            if (data.coaches) {
                setCoaches(data.coaches);
            }
        } catch (_error) {
            // Silencio intencional — toast ya notifica al usuario
            toast.error('No se pudo cargar la lista de profesores');
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const url = tenantSlug 
                ? `/api/admin/users/list?gymId=${tenantSlug}` 
                : '/api/admin/users/list';
            const response = await fetch(url, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al obtener lista de usuarios');
            }

            setUsers(data.users || []);
        } catch (_error) {
            const err = _error as Error;
            toast.error('Error cargando usuarios: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // La normalización ahora la hace el backend en /api/admin/users/list
    // Mantenemos la función por si se necesita alguna transformación extra en el futuro
    // pero por ahora los datos vienen listos de la API.

    const handleRoleUpdate = async (uid: string, newRole: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/set-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, role: newRole }), // API auth/set-role likely expects 'role'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            toast.success(`Rol actualizado a ${newRole}`);
            // Cast newRole to specific UserRole via any to avoid complex TS validation here
            setUsers(users.map(u => u.id === uid ? { ...u, role: newRole as SupabaseUserProfile['role'] } : u));
        } catch (_error) {
            const err = _error as Error;
            toast.error('Error al actualizar rol: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignCoach = async (studentId: string, coachId: string | null) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${studentId}/assign-coach`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coachId: coachId === "" ? null : coachId }),
            });

            const data = await response.json();
            if (!response.ok) {
                const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
                throw new Error(errorMessage);
            }

            toast.success('Coach asignado correctamente');
            await fetchUsers(); // Await the refresh from DB
            // Optional: update local state if fetch takes long, but awaiting is safer for consistency
            setUsers(prev => prev.map(u => u.id === studentId ? { ...u, assigned_coach_id: coachId === "" ? null : coachId } : u));
        } catch (_error) {
            const err = _error as Error;
            toast.error('Error asignando coach: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleActivateMembership = async (userId: string) => {
        if (!confirm('¿Estás seguro de que deseas activar la membresía de este usuario por 30 días?')) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 30 }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            toast.success('Membresía activada correctamente');
            setUsers(users.map(u => u.id === userId ? {
                ...u,
                membershipStatus: 'active',
                membershipEnds: data.newEndDate
            } : u));
        } catch (_error) {
            const err = _error as Error;
            toast.error('Error activando membresía: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivateMembership = async (userId: string) => {
        if (!confirm('¿Estás seguro de que deseas DESACTIVAR la membresía de este usuario? Esta acción revertirá el acceso activo.')) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            toast.success('Membresía desactivada correctamente');
            setUsers(users.map(u => u.id === userId ? {
                ...u,
                membershipStatus: 'inactive',
                membershipEnds: null
            } : u));
        } catch (_error) {
            const err = _error as Error;
            toast.error('Error al desactivar membresía: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFromStaff = async (userId: string) => {
        if (!confirm('¿Estás seguro de que deseas quitar a este usuario del staff? Pasará a ser un Miembro normal.')) return;
        handleRoleUpdate(userId, 'member');
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">
                        👥 Gestión de Usuarios
                    </h1>
                    <p className="text-gray-400 mt-1">{users.length} usuarios totales</p>
                </div>

                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 bg-[#1c1c1e] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 bg-[#1c1c1e] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                        <option value="all">Todos los roles</option>
                        <option value="member">Miembros</option>
                        <option value="coach">Profesores</option>
                        <option value="admin">Admins</option>
                        <option value="superadmin">Super Admins</option>
                    </select>
                </div>
            </div>

            {limits && (
                <div className={`p-4 rounded-2xl flex items-center justify-between border ${!limits.canAddUser ? 'bg-red-500/10 border-red-500/20' : 'bg-purple-500/5 border-purple-500/10'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${!limits.canAddUser ? 'bg-red-500/20' : 'bg-purple-500/20'}`}>
                            {!limits.canAddUser ? '⚠️' : '📊'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white uppercase tracking-tight">Capacidad de Socios</p>
                            <p className="text-[10px] text-gray-500">
                                Has registrado <span className="text-white font-bold">{limits.currentUsers}</span> de <span className="text-white font-bold">{limits.limitUsers}</span> alumnos permitidos en tu plan.
                            </p>
                        </div>
                    </div>
                    {!limits.canAddUser && (
                        <button
                            onClick={() => window.location.href = '/admin/settings'}
                            className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-red-700 transition-all"
                        >
                            Subir de Plan
                        </button>
                    )}
                </div>
            )}

            <div className="bg-[#2c2c2e] rounded-2xl border border-[#3a3a3c] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#1c1c1e] text-gray-400 text-sm uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Gimnasio</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Membresía</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Coach Asignado</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3a3a3c]">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                                {user.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            className="bg-[#1c1c1e] border border-[#3a3a3c] rounded px-3 py-1.5 text-xs text-gray-300 focus:border-purple-500 outline-none hover:bg-[#2c2c2e] transition-colors"
                                            value={user.role}
                                            onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                            disabled={loading}
                                        >
                                            <option value="member">Miembro</option>
                                            <option value="coach">Profesor</option>
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Super Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-gray-400 font-medium">
                                            {user.gym || 'Virtud Gym'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {['admin', 'coach', 'superadmin'].includes(user.role?.toLowerCase()) ? (
                                            <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                🛡️ Staff
                                            </span>
                                        ) : (
                                            <div className="space-y-1">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.membershipStatus === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                    'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    {user.membershipStatus === 'active' ? '✓ Activo' : '✗ Inactivo'}
                                                </span>
                                                {user.membershipEnds && (
                                                    <div className="text-[9px] text-gray-500 font-mono">
                                                        Vence: {new Date(user.membershipEnds).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {!['admin', 'coach', 'superadmin'].includes(user.role?.toLowerCase()) ? (
                                            <select
                                                className="bg-[#1c1c1e] border border-[#3a3a3c] rounded px-3 py-1.5 text-xs text-gray-400 focus:border-purple-500 outline-none hover:bg-[#2c2c2e] transition-colors max-w-[150px]"
                                                value={user.assigned_coach_id || ""}
                                                onChange={(e) => handleAssignCoach(user.id, e.target.value)}
                                                disabled={loading}
                                            >
                                                <option value="">Sin Asignar</option>
                                                {coaches.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nombre_completo || 'Coach'}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-[10px] text-gray-600 italic">No aplica</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}
                                                className="px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold border border-purple-600/30 transition-all"
                                                title="Ver Ficha"
                                            >
                                                📄
                                            </button>

                                            {/* Acciones para miembros del staff */}
                                            {['admin', 'coach', 'superadmin'].includes(user.role?.toLowerCase()) && (
                                                <button
                                                    onClick={() => handleRemoveFromStaff(user.id)}
                                                    className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold border border-red-600/30 transition-all"
                                                    title="Quitar del Staff"
                                                >
                                                    🚪
                                                </button>
                                            )}

                                            {/* Acciones para miembros normales */}
                                            {!['admin', 'coach'].includes(user.role?.toLowerCase()) && (
                                                <>
                                                    {user.membershipStatus === 'active' ? (
                                                        <button
                                                            onClick={() => handleDeactivateMembership(user.id)}
                                                            className="px-3 py-1.5 bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white rounded-lg text-xs font-bold border border-orange-600/30 transition-all"
                                                            title="Desactivar Membresía (Revertir)"
                                                        >
                                                            ↩️
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleActivateMembership(user.id)}
                                                            className="px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold border border-green-600/30 transition-all"
                                                            title="Activar Membresía"
                                                        >
                                                            💳
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="text-gray-500">
                                            <p className="text-4xl mb-2">🔍</p>
                                            <p>No se encontraron usuarios con esos criterios.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProfileViewerModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedUser(null); }}
                user={selectedUser}
            />
        </div >
    );
}
