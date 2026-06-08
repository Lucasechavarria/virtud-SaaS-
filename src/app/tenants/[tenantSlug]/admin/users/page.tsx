'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

import ProfileViewerModal from '@/features/admin/components/ProfileViewerModal';
import { SupabaseUserProfile, UserRole } from '@/types/user';

interface User extends SupabaseUserProfile {
    name: string; // API sends this
    membershipStatus: string;
    membershipEnds: string | null;
    assigned_coach_id?: string | null;
    role: UserRole; // Make it explicit and non-unknown
    gym?: string;
    items?: unknown[]; // For older types compatibility if needed
    plan_id?: string | null;
    permisos?: any;
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
    const supabaseClient = createClient();
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tenantSlug = params?.tenantSlug as string;

    const roleParam = searchParams.get('role');
    const membershipParam = searchParams.get('membership');

    const [loading, setLoading] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [gymPlans, setGymPlans] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [limits, setLimits] = useState<GymLimits | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>(roleParam || 'all');
    const [membershipFilter, setMembershipFilter] = useState<string>(membershipParam || 'all');

    // State for permissions modal (receptionist subadmin)
    const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
    const [permsUser, setPermsUser] = useState<User | null>(null);
    const [accesoUsuarios, setAccesoUsuarios] = useState(false);
    const [accesoPlanes, setAccesoPlanes] = useState(false);
    const [accesoFinanzas, setAccesoFinanzas] = useState(false);
    const [accesoSettings, setAccesoSettings] = useState(false);

    useEffect(() => {
        if (tenantSlug) {
            checkAccessAndLoad();
        }
    }, [tenantSlug]);

    const checkAccessAndLoad = async () => {
        try {
            const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
            if (!currentUser) {
                router.push('/login');
                return;
            }

            const { data: profile } = await (supabaseClient
                .from('perfiles') as any)
                .select('rol, permisos')
                .eq('id', currentUser.id)
                .single();

            if (profile?.rol === 'recepcion' && (profile?.permisos as any)?.acceso_usuarios !== true) {
                toast.error('Acceso denegado: No tienes permisos para gestionar usuarios');
                router.push(tenantSlug ? `/${tenantSlug}/admin/recepcion/pos` : '/admin/recepcion/pos');
                return;
            }

            setCheckingAccess(false);
            fetchUsers();
            fetchCoaches();
            fetchLimits();
            fetchGymPlans();
        } catch (error) {
            console.error('Error checking access:', error);
            setCheckingAccess(false);
            fetchUsers();
            fetchCoaches();
            fetchLimits();
            fetchGymPlans();
        }
    };

    const fetchGymPlans = async () => {
        try {
            const url = tenantSlug 
                ? `/api/admin/gym-plans?gymId=${tenantSlug}` 
                : '/api/admin/gym-plans';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.success) {
                setGymPlans(data.plans || []);
            }
        } catch (error) {
            console.error('Error fetching gym plans:', error);
        }
    };

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

    const handleRoleUpdate = async (uid: string, newRole: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/set-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, role: newRole }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            toast.success(`Rol actualizado a ${newRole}`);
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
            await fetchUsers();
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

    const openPermsModal = (user: User) => {
        setPermsUser(user);
        const p = user.permisos || {};
        setAccesoUsuarios(!!p.acceso_usuarios);
        setAccesoPlanes(!!p.acceso_planes);
        setAccesoFinanzas(!!p.acceso_finanzas);
        setAccesoSettings(!!p.acceso_settings);
        setIsPermsModalOpen(true);
    };

    const savePermissions = async () => {
        if (!permsUser) return;
        setLoading(true);
        try {
            const response = await fetch('/api/auth/set-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: permsUser.id,
                    role: 'recepcion',
                    permisos: {
                        acceso_usuarios: accesoUsuarios,
                        acceso_planes: accesoPlanes,
                        acceso_finanzas: accesoFinanzas,
                        acceso_settings: accesoSettings
                    }
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            toast.success('Permisos de recepción actualizados');
            setIsPermsModalOpen(false);
            await fetchUsers();
        } catch (error: any) {
            toast.error('Error al guardar permisos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesMembership = membershipFilter === 'all' || user.membershipStatus === membershipFilter;
        return matchesSearch && matchesRole && matchesMembership;
    });

    const isFilteredActiveMembers = roleFilter === 'member' && membershipFilter === 'active';

    if (checkingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">
                        {isFilteredActiveMembers ? '🟢 Socios Activos' : '👥 Gestión General de Usuarios'}
                    </h1>
                    <p className="text-gray-400 mt-1">
                        {isFilteredActiveMembers 
                            ? `Mostrando ${filteredUsers.length} alumnos con acceso vigente y membresía al día` 
                            : `${users.length} usuarios totales (staff, entrenadores y alumnos)`}
                    </p>
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
                        <option value="recepcion">Recepcionistas</option>
                        <option value="admin">Admins</option>
                        <option value="superadmin">Super Admins</option>
                    </select>
                    <select
                        value={membershipFilter}
                        onChange={(e) => setMembershipFilter(e.target.value)}
                        className="px-4 py-2 bg-[#1c1c1e] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                        <option value="all">Cualquier Membresía</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>
            </div>

            {/* Banner Descriptivo Contextual */}
            <div className={`p-6 rounded-[2rem] border backdrop-blur-xl relative overflow-hidden transition-all duration-300 ${
                isFilteredActiveMembers 
                    ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-transparent border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.05)]' 
                    : 'bg-gradient-to-r from-purple-500/10 via-purple-600/5 to-transparent border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.05)]'
            }`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] ${
                    isFilteredActiveMembers ? 'bg-emerald-500/10' : 'bg-purple-500/10'
                }`} />
                <div className="flex items-start gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                        isFilteredActiveMembers 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    }`}>
                        {isFilteredActiveMembers ? '🟢' : '👥'}
                    </div>
                    <div>
                        <h3 className="text-white text-base font-black uppercase tracking-tight">
                            {isFilteredActiveMembers ? 'Filtro Activo: Alumnos Autorizados' : 'Panel de Control General'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                            {isFilteredActiveMembers 
                                ? 'Estás visualizando únicamente los alumnos que cuentan con una membresía activa en este gimnasio. Estos usuarios están autorizados para reservar clases en la agenda, acceder mediante código QR en la entrada y recibir rutinas personalizadas. Utiliza los selectores de la derecha para cambiar o quitar el filtro.'
                                : 'Estás visualizando el universo completo de personas registradas en la base de datos de tu gimnasio. Desde aquí puedes gestionar los roles de todo tu staff (Admins, Profesores, Recepcionistas), asignar profesores de seguimiento a los alumnos, revocar o activar membresías manualmente, e impersonar usuarios con fines de soporte técnico.'}
                        </p>
                    </div>
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
                            onClick={() => router.push(tenantSlug ? `/${tenantSlug}/admin/settings` : '/admin/settings')}
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
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <div>Rol</div>
                                    <div className="text-[9px] text-gray-500 font-normal normal-case mt-0.5 max-w-[120px] leading-tight">
                                        Controla los permisos y accesos del sistema.
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <div>Plan de Membresía</div>
                                    <div className="text-[9px] text-gray-500 font-normal normal-case mt-0.5 max-w-[150px] leading-tight">
                                        Pase activo. Cámbialo para migrar al alumno al instante.
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <div>Estado Membresía</div>
                                    <div className="text-[9px] text-gray-500 font-normal normal-case mt-0.5 max-w-[120px] leading-tight">
                                        Vigencia del pase y fecha de vencimiento.
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <div>Coach Asignado</div>
                                    <div className="text-[9px] text-gray-500 font-normal normal-case mt-0.5 max-w-[120px] leading-tight">
                                        Profesor de seguimiento para rutinas.
                                    </div>
                                </th>
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
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="bg-[#1c1c1e] border border-[#3a3a3c] rounded px-3 py-1.5 text-xs text-gray-300 focus:border-purple-500 outline-none hover:bg-[#2c2c2e] transition-colors"
                                                value={user.role}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    handleRoleUpdate(user.id, val);
                                                    if (val === 'recepcion') {
                                                        openPermsModal({ ...user, role: 'recepcion' });
                                                    }
                                                }}
                                                disabled={loading}
                                            >
                                                <option value="member">Miembro</option>
                                                <option value="coach">Profesor</option>
                                                <option value="recepcion">Recepcionista</option>
                                                <option value="admin">Admin</option>
                                                <option value="superadmin">Super Admin</option>
                                            </select>
                                            {user.role === 'recepcion' && (
                                                <button
                                                    onClick={() => openPermsModal(user)}
                                                    className="p-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-600 hover:text-white transition-all text-xs"
                                                    title="Configurar Permisos de Subadmin"
                                                >
                                                    🔑
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.role === 'member' ? (
                                            <select
                                                className="bg-[#1c1c1e] border border-[#3a3a3c] rounded px-3 py-1.5 text-xs text-gray-300 focus:border-purple-500 outline-none hover:bg-[#2c2c2e] transition-colors max-w-[180px]"
                                                value={user.plan_id || ""}
                                                onChange={async (e) => {
                                                    const newPlanId = e.target.value || null;
                                                    setLoading(true);
                                                    try {
                                                        const res = await fetch(`/api/admin/users/${user.id}/plan`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ planId: newPlanId, activate: true })
                                                        });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data.error);
                                                        toast.success(data.message || 'Plan actualizado');
                                                        await fetchUsers();
                                                    } catch (error: any) {
                                                        toast.error('Error al migrar de plan: ' + error.message);
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                disabled={loading}
                                            >
                                                <option value="">Sin Plan asignado</option>
                                                {gymPlans.map((plan: any) => (
                                                    <option key={plan.id} value={plan.id}>
                                                        {plan.nombre} ({plan.precio} ARS)
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-[10px] text-gray-600 italic">No aplica</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {['admin', 'coach', 'superadmin', 'recepcion'].includes(user.role?.toLowerCase()) ? (
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
                                        {!['admin', 'coach', 'superadmin', 'recepcion'].includes(user.role?.toLowerCase()) ? (
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
                                            {['admin', 'coach', 'superadmin', 'recepcion'].includes(user.role?.toLowerCase()) && (
                                                <button
                                                    onClick={() => handleRemoveFromStaff(user.id)}
                                                    className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold border border-red-600/30 transition-all"
                                                    title="Quitar del Staff"
                                                >
                                                    🚪
                                                </button>
                                            )}

                                            {/* Acciones para miembros normales */}
                                            {!['admin', 'coach', 'recepcion'].includes(user.role?.toLowerCase()) && (
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
                                    <td colSpan={6} className="p-12 text-center">
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

            {/* Modal de Permisos de Recepción (Subadmin) */}
            {isPermsModalOpen && permsUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1c1c1e] w-full max-w-md rounded-3xl border border-white/10 p-6 space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Configurar Subadmin</h3>
                                <p className="text-xs text-gray-400 mt-1">Usuario: {permsUser.name}</p>
                            </div>
                            <button
                                onClick={() => setIsPermsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-[10px] text-purple-300 leading-relaxed">
                            💡 Configura a qué secciones administrativas del local tendrá acceso el recepcionista además del panel de Caja POS básico.
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={accesoUsuarios}
                                    onChange={(e) => setAccesoUsuarios(e.target.checked)}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#1c1c1e] border-white/10"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">Acceso a Usuarios</p>
                                    <p className="text-[10px] text-gray-500">Permite ver y gestionar otros alumnos/coaches.</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={accesoPlanes}
                                    onChange={(e) => setAccesoPlanes(e.target.checked)}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#1c1c1e] border-white/10"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">Acceso a Planes</p>
                                    <p className="text-[10px] text-gray-500">Permite configurar planes de membresía locales.</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={accesoFinanzas}
                                    onChange={(e) => setAccesoFinanzas(e.target.checked)}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#1c1c1e] border-white/10"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">Acceso a Finanzas</p>
                                    <p className="text-[10px] text-gray-500">Permite ver e interactuar con balances y caja del local.</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={accesoSettings}
                                    onChange={(e) => setAccesoSettings(e.target.checked)}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#1c1c1e] border-white/10"
                                />
                                <div>
                                    <p className="text-sm font-medium text-white">Acceso a Configuración</p>
                                    <p className="text-[10px] text-gray-500">Permite modificar ajustes generales del gimnasio.</p>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsPermsModalOpen(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={savePermissions}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                            >
                                Guardar Permisos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
