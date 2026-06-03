'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface Role {
    id: string;
    name: string;
    icon: string;
    path: string;
}

export default function RoleSwitcher({ currentRole, profileRole }: { currentRole: string; profileRole?: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    // If profileRole is admin/coach/superadmin, can always switch
    const effectiveRole = profileRole || currentRole;
    const canSwitchRoles = ['admin', 'coach', 'superadmin'].includes(effectiveRole);

    if (!canSwitchRoles) return null;

    const roles: Role[] = [
        { id: 'superadmin', name: 'Super Admin', icon: '⚡', path: '/saas-admin' },
        { id: 'admin', name: 'Admin', icon: '⚙️', path: '/admin' },
        { id: 'coach', name: 'Profesor', icon: '🏋️', path: '/coach' },
        { id: 'member', name: 'Alumno', icon: '🎯', path: '/dashboard' },
    ];

    const currentRoleData = roles.find(r => r.id === currentRole);

    const switchRole = (role: Role) => {
        setIsOpen(false);
        router.push(role.path);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
            >
                <span className="text-xl">{currentRoleData?.icon}</span>
                <div className="text-left">
                    <p className="text-xs text-gray-400">Vista como</p>
                    <p className="text-sm font-bold text-white">{currentRoleData?.name}</p>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute right-0 mt-2 w-56 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden"
                    >
                        <div className="p-2">
                            <p className="text-xs text-gray-400 px-3 py-2 font-bold uppercase">Cambiar Vista</p>
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => switchRole(role)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${role.id === currentRole
                                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                        : 'text-gray-300 hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-xl">{role.icon}</span>
                                    <span className="font-medium">{role.name}</span>
                                    {role.id === currentRole && (
                                        <span className="ml-auto text-xs">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </div>
    );
}
