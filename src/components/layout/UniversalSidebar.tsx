'use client';

import React, { useState, useEffect } from 'react';
import { motion, _AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface NavItem {
    href: string;
    label: string;
    icon: string;
    module?: string;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
    admin: [
        { href: '/admin', label: 'Panel de Control', icon: '📊' },
        { href: '/admin/crm', label: 'CRM Ventas', icon: '🎯', module: 'crm' },
        { href: '/admin/shop', label: 'Tienda POS', icon: '🛒', module: 'inventario' },
        { href: '/admin/users', label: 'Usuarios', icon: '👥' },
        { href: '/admin/challenges', label: 'Desafíos', icon: '⚔️', module: 'gamificacion' },
        { href: '/admin/activities', label: 'Actividades', icon: '🏅', module: 'clases_reserva' },
        { href: '/admin/equipment', label: 'Equipamiento', icon: '🔧' },
        { href: '/coach/routines', label: 'Rutinas', icon: '💪', module: 'rutinas_ia' },
        { href: '/admin/nutrition', label: 'Nutrición', icon: '🥗', module: 'nutricion_ia' },
        { href: '/coach/vision', label: 'Vision Lab', icon: '🎥', module: 'vision_ia' },
        { href: '/admin/finance', label: 'Finanzas', icon: '💰', module: 'pagos_online' },
        { href: '/admin/settings/payments', label: 'Configuración Cobros', icon: '💳' },
        { href: '/admin/settings/branding', label: 'Personalización', icon: '🎨' },
        { href: '/admin/settings/landing', label: 'Marketing', icon: '🚀' },
        { href: '/admin/settings/support', label: 'Soporte Técnico', icon: '🎧' },
        { href: '/admin/settings', label: 'Configuración', icon: '⚙️' },
    ],
    superadmin: [
        { href: '/saas-admin', label: 'Super Control', icon: '⚡' },
        { href: '/saas-admin/gyms', label: 'Gimnasios', icon: '🏢' },
        { href: '/saas-admin/billing', label: 'Cobros SaaS', icon: '💰' },
        { href: '/saas-admin/metrics', label: 'Métricas Globales', icon: '📊' },
        { href: '/saas-admin/audit', label: 'Auditoría', icon: '🎫' },
    ],
    coach: [
        { href: '/coach', label: 'Dashboard', icon: '🏠' },
        { href: '/coach/messages', label: 'Mensajes', icon: '💬' },
        { href: '/schedule', label: 'Cronograma', icon: '🗓️', module: 'clases_reserva' },
        { href: '/coach/students', label: 'Alumnos', icon: '👥' },
        { href: '/coach/equipment', label: 'Equipamiento', icon: '🔧' },
        { href: '/coach/classes', label: 'Clases', icon: '📅', module: 'clases_reserva' },
        { href: '/coach/routines', label: 'Rutinas', icon: '💪', module: 'rutinas_ia' },
        { href: '/coach/metrics', label: 'Métricas', icon: '📊' },
        { href: '/coach/vision', label: 'Vision Lab', icon: '🎥', module: 'vision_ia' },
        { href: '/dashboard/settings', label: 'Configuración', icon: '⚙️' },
    ],
    member: [
        { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
        { href: '/dashboard/qr', label: 'Mi Carnet', icon: '📱' },
        { href: '/dashboard/messages', label: 'Mensajes', icon: '💬' },
        { href: '/dashboard/membership', label: 'Mi Membresía', icon: '💳' },
        { href: '/schedule', label: 'Cronograma', icon: '🗓️', module: 'clases_reserva' },
        { href: '/dashboard/routine', label: 'Mi Rutina', icon: '💪', module: 'rutinas_ia' },
        { href: '/dashboard/progress', label: 'Mi Progreso', icon: '📈', module: 'gamificacion' },
        { href: '/dashboard/classes', label: 'Mis Clases', icon: '📅', module: 'clases_reserva' },
        { href: '/dashboard/nutrition', label: 'Nutrición', icon: '🥗', module: 'nutricion_ia' },
        { href: '/dashboard/vision', label: 'Visión Lab', icon: '🎥', module: 'vision_ia' },
        { href: '/dashboard/settings', label: 'Configuración', icon: '⚙️' },
    ],
    recepcion: [
        { href: '/admin/recepcion/pos', label: 'Caja POS', icon: '🛒' },
        { href: '/admin/recepcion/acceso', label: 'Control Accesos', icon: '📷' },
    ],
};

const ROLE_COLORS: Record<string, string> = {
    superadmin: 'red',
    admin: 'purple',
    coach: 'orange',
    member: 'blue',
    recepcion: 'emerald'
};

export function UniversalSidebar({
    role,
    profileName,
    isOpen,
    setIsOpen,
    isMobile
}: {
    role: string;
    profileName: string;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    isMobile: boolean;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [visionBadgeCount, setVisionBadgeCount] = useState(0);
    const [loggingOut, setLoggingOut] = useState(false);
    const [gymInfo, setGymInfo] = useState<{ nombre?: string, logo_url?: string, modulos_activos?: string[] }>({});

    // Extract gymId safely from pathname since it's an app dir segment
    const gymIdMatch = pathname.match(/^\/([^/]+)/);
    const gymId = gymIdMatch ? gymIdMatch[1] : null;

    useEffect(() => {
        if (gymId && gymId !== 'admin') { // Avoid fetching 'admin' as gymId if we are in superadmin
            supabase.from('gimnasios').select('nombre, logo_url, modulos_activos').eq('id', gymId).single().then(({ data }) => {
                if (data) {
                    setGymInfo({
                        nombre: data.nombre || undefined,
                        logo_url: data.logo_url || undefined,
                        modulos_activos: (data.modulos_activos as string[]) || []
                    });
                }
            });
        }
    }, [gymId]);

    const handleLogout = async () => {
        setLoggingOut(true);
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    // Fetch unread vision analyses
    useEffect(() => {
        if (role !== 'member') return;

        const fetchBadgeCount = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { count } = await supabase
                .from('videos_ejercicio')
                .select('*', { count: 'exact', head: true })
                .eq('usuario_id', user.id)
                .eq('estado', 'analizado')
                .eq('visto_por_alumno', false);

            setVisionBadgeCount(count || 0);
        };

        fetchBadgeCount();

        // Realtime updates for badge
        const channel = supabase
            .channel('sidebar_vision_badges')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'videos_ejercicio' },
                () => fetchBadgeCount()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [role]);

    // Determine nav items based on path first, then fallback to role
    let viewRole = role;

    if (role === 'superadmin') {
        if (!pathname.startsWith('/saas-admin')) {
            if (pathname.includes('/admin/recepcion')) viewRole = 'recepcion';
            else if (pathname.includes('/admin')) viewRole = 'admin';
            else if (pathname.includes('/coach')) viewRole = 'coach';
            else if (pathname.includes('/member/dashboard') || pathname.includes('/dashboard')) viewRole = 'member';
            else viewRole = 'superadmin';
        } else {
            viewRole = 'superadmin';
        }
    } else if (role === 'admin') {
        viewRole = 'admin';
    } else if (role === 'recepcion') {
        viewRole = 'recepcion';
    } else {
        if (pathname.includes('/coach')) viewRole = 'coach';
        else if (pathname.includes('/dashboard') || pathname.includes('/member')) viewRole = 'member';
        else if (pathname.includes('/admin/recepcion')) viewRole = 'recepcion';
        else if (pathname.includes('/admin')) viewRole = 'admin';
    }

    const navItemsRaw = (NAV_BY_ROLE[viewRole] || NAV_BY_ROLE.member).filter(item => {
        if (!item.module) return true;
        // Always show all modules to superadmin
        if (role === 'superadmin') return true;
        const activeModules = gymInfo.modulos_activos || [];
        return activeModules.includes(item.module);
    });

    const navItems = navItemsRaw.map(item => {
        let finalHref = item.href;

        // Members paths were originally '/dashboard' here, but need to be '/member/dashboard' in dynamic route paths
        if (viewRole === 'member' && finalHref.startsWith('/dashboard')) {
            finalHref = finalHref.replace('/dashboard', '/member/dashboard');
        } else if (viewRole === 'member' && finalHref === '/schedule') {
            finalHref = '/member/schedule';
        }

        if (finalHref.startsWith('/saas-admin')) return { ...item, href: finalHref };
        if (finalHref.startsWith('http')) return item; // internal edge case logic

        if (gymId && gymId !== 'admin') {
            return { ...item, href: `/${gymId}${finalHref}` };
        }
        return { ...item, href: finalHref };
    });

    const color = ROLE_COLORS[viewRole] || 'blue'; 

    return (
        <aside
            className={`
                ${isMobile ? 'fixed' : 'sticky'} 
                top-0 left-0 h-screen w-64 
                bg-tactical-black/80 backdrop-blur-[40px] border-r border-white/5 
                flex flex-col z-40 font-rajdhani
                transition-transform duration-500 ease-in-out
                ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
            `}
        >
            {/* Tactical Glow Effect */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-tactical-cyan/5 to-transparent pointer-events-none" />

            {/* Logo & Close Button */}
            <div className="p-8 shrink-0 flex justify-between items-center relative z-10">
                <Link href={navItems[0]?.href || '/'} className="block relative h-12 w-32 filter drop-shadow-[0_0_8px_rgba(0,245,255,0.2)]">
                    <Image
                        src={gymInfo.logo_url || "/logos/Logo-Fondo-Negro.png"}
                        alt={gymInfo.nombre || "VIRTUD"}
                        fill
                        className="object-contain"
                        sizes="128px"
                    />
                </Link>

                {/* Mobile Close Button */}
                {isMobile && (
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Cerrar menú"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 overflow-y-auto">
                <div className="space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all font-bold relative group ${isActive
                                    ? `bg-tactical-cyan text-black shadow-[0_0_20px_rgba(0,245,255,0.3)]`
                                    : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span className={`text-xl shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'filter drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]' : ''}`} role="img" aria-label={item.label}>{item.icon}</span>
                                <span className="truncate flex-1 tracking-wider uppercase text-[10px]">{item.label}</span>
                                {isActive && (
                                    <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-1/2 bg-black rounded-r-full" />
                                )}
                                {item.label === 'Visión Lab' && visionBadgeCount > 0 && (
                                    <span className="absolute right-3 top-3 min-w-[18px] h-[18px] bg-tactical-magenta text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border border-black shadow-[0_0_10px_rgba(255,0,255,0.5)]">
                                        {visionBadgeCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                </div>
            </nav>

            {/* Profile + Logout */}
            <div className="p-4 border-t border-white/5 shrink-0 space-y-3">
                {/* User info */}
                <div className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-tactical-cyan/10 text-tactical-cyan flex items-center justify-center font-black text-sm border border-tactical-cyan/20 shrink-0 shadow-inner">
                        {profileName?.charAt(0).toUpperCase() || 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white uppercase tracking-wider truncate">{profileName || 'Miembro'}</p>
                        <p className="text-[9px] text-tactical-cyan/60 font-black uppercase tracking-[0.3em] truncate">{role}</p>
                    </div>
                </div>


                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-600/20 border border-white/5 hover:border-red-500/30 text-gray-500 hover:text-red-400 transition-all duration-200 group disabled:opacity-50"
                >
                    {loggingOut ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    )}
                    <span className="text-xs font-black uppercase tracking-widest">
                        {loggingOut ? 'Cerrando...' : 'Cerrar Sesión'}
                    </span>
                </button>
            </div>
        </aside>
    );
}
