'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EliteButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    variant?: 'cyan' | 'magenta' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children: React.ReactNode;
    glow?: boolean;
}

export function EliteButton({
    variant = 'cyan',
    size = 'md',
    glow = true,
    className,
    children,
    ...props
}: EliteButtonProps) {
    const variants = {
        cyan: 'bg-tactical-cyan text-black hover:shadow-neon-cyan active:scale-95',
        magenta: 'bg-tactical-magenta text-white hover:shadow-neon-magenta active:scale-95',
        outline: 'border-2 border-tactical-cyan text-tactical-cyan bg-transparent hover:bg-tactical-cyan/10',
        ghost: 'text-zinc-400 hover:text-white hover:bg-white/5',
    };

    const sizes = {
        sm: 'px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase',
        md: 'px-6 py-2.5 text-xs font-black tracking-[0.2em] uppercase',
        lg: 'px-8 py-3.5 text-sm font-black tracking-[0.2em] uppercase',
        xl: 'px-10 py-5 text-base font-black tracking-[0.3em] uppercase',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                'relative flex items-center justify-center gap-2 rounded-xl transition-all duration-300 font-rajdhani overflow-hidden group',
                variants[variant],
                sizes[size],
                glow && variant !== 'ghost' && 'shadow-lg',
                className
            )}
            {...props}
        >
            {/* Tactical Scan Line Effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-white/20 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-700 ease-in-out pointer-events-none" />
            
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </motion.button>
    );
}
