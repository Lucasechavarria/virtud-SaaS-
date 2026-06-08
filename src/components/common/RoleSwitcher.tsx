'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

interface Role {
    id: string;
    name: string;
    icon: string;
    path: string;
}

const ROLE_THEMES: Record<string, { activeClass: string; textClass: string; glowClass: string }> = {
    superadmin: { activeClass: 'bg-red-500/10 text-red-400 border-red-500/20', textClass: 'text-red-400', glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' },
    admin: { activeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20', textClass: 'text-purple-400', glowClass: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]' },
    coach: { activeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20', textClass: 'text-orange-400', glowClass: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]' },
    recepcion: { activeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', textClass: 'text-emerald-400', glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
    member: { activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', textClass: 'text-cyan-400', glowClass: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]' },
};

export default function RoleSwitcher({ currentRole: propCurrentRole, profileRole }: { currentRole: string; profileRole?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [userGymPrefix, setUserGymPrefix] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                const gymSlug = user.app_metadata?.gimnasio_slug;
                const initialSlug = gymSlug || user.user_metadata?.gimnasio_slug;
                if (initialSlug) {
                    setUserGymPrefix(initialSlug);
                }

                // Cargar perfil desde DB para resolver slug exacto de forma reactiva
                supabase.from('perfiles').select('gimnasio_id, gimnasios(slug)').eq('id', user.id).single().then(({ data }: any) => {
                    if (data) {
                        const dbSlug = data.gimnasios?.slug || data.gimnasio_id;
                        if (dbSlug) {
                            setUserGymPrefix(dbSlug);
                        }
                    }
                });
            }
        });
    }, []);

    // Si profileRole es admin/coach/superadmin/recepcion, can always switch
    const effectiveRole = profileRole || propCurrentRole;
    const canSwitchRoles = ['admin', 'coach', 'superadmin', 'recepcion'].includes(effectiveRole);

    if (!canSwitchRoles) return null;

    // Calcular el rol activo de la vista actual basándonos en la ruta
    let currentActiveRole = propCurrentRole;
    if (effectiveRole === 'superadmin' || effectiveRole === 'admin') {
        if (pathname.startsWith('/saas-admin')) {
            currentActiveRole = 'superadmin';
        } else if (pathname.includes('/admin/recepcion')) {
            currentActiveRole = 'recepcion';
        } else if (pathname.includes('/admin')) {
            currentActiveRole = 'admin';
        } else if (pathname.includes('/coach')) {
            currentActiveRole = 'coach';
        } else if (pathname.includes('/member') || pathname.includes('/dashboard')) {
            currentActiveRole = 'member';
        }
    }

    const roles: Role[] = [
        { id: 'superadmin', name: 'Super Admin', icon: '⚡', path: '/saas-admin' },
        { id: 'admin', name: 'Gimnasio Admin', icon: '⚙️', path: '/admin' },
        { id: 'coach', name: 'Profesor', icon: '🏋️', path: '/coach' },
        { id: 'recepcion', name: 'Recepcionista', icon: '🔑', path: '/admin/recepcion/pos' },
        { id: 'member', name: 'Alumno', icon: '🎯', path: '/member/dashboard' },
    ];

    // Si no es superadmin, restringir los roles que puede ver/cambiar
    const filteredRoles = roles.filter(role => {
        if (effectiveRole === 'superadmin') return true;
        if (effectiveRole === 'admin') {
            // El admin del gym puede ver todo excepto el superadmin global
            return role.id !== 'superadmin';
        }
        return false;
    });

    const currentRoleData = roles.find(r => r.id === currentActiveRole) || roles.find(r => r.id === effectiveRole);
    const theme = ROLE_THEMES[currentActiveRole] || ROLE_THEMES.member;

    // Obtener el tenant (gymId) si existe en el path actual
    const segments = pathname.split('/').filter(Boolean);
    const isTenantsPath = segments[0] === 'tenants';
    const gymId = isTenantsPath ? segments[1] : (segments[0] !== 'admin' && segments[0] !== 'saas-admin' && segments[0] !== 'member' && segments[0] !== 'coach' ? segments[0] : null);

    const switchRole = (role: Role) => {
        setIsOpen(false);
        let targetPath = role.path;

        const activeGym = gymId || userGymPrefix;

        // Si tenemos un gym activo y no es el superadmin global, mantengamos el contexto de ese gimnasio
        if (activeGym && role.id !== 'superadmin') {
            targetPath = `/${activeGym}${role.path}`;
        }
        
        router.push(targetPath);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2.5 px-4 py-2.5 bg-black/40 hover:bg-white/5 rounded-xl transition-all border border-white/10 ${theme.glowClass}`}
            >
                <span className="text-lg leading-none">{currentRoleData?.icon}</span>
                <div className="text-left">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Vista Activa</p>
                    <p className={`text-xs font-bold uppercase tracking-wider ${theme.textClass} leading-none`}>
                        {currentRoleData?.name}
                    </p>
                </div>
                <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ml-1 ${isOpen ? 'rotate-180 text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-3.5 w-60 bg-[#0d0d0e]/95 border border-white/10 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-xl"
                        >
                            <div className="p-2 space-y-1">
                                <div className="px-3.5 py-2">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">Cambiar de Vista</p>
                                </div>
                                {filteredRoles.map(role => {
                                    const isSelected = role.id === currentActiveRole;
                                    const roleTheme = ROLE_THEMES[role.id] || ROLE_THEMES.member;
                                    
                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => switchRole(role)}
                                            className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 border ${
                                                isSelected
                                                    ? `${roleTheme.activeClass}`
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                                            }`}
                                        >
                                            <span className="text-lg leading-none">{role.icon}</span>
                                            <span className="text-[11px] font-black uppercase tracking-wider">{role.name}</span>
                                            {isSelected && (
                                                <span className="ml-auto text-xs font-bold">✓</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

