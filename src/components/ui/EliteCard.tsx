'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EliteCardProps extends HTMLMotionProps<'div'> {
    variant?: 'default' | 'cyan' | 'magenta' | 'danger';
    blur?: 'sm' | 'md' | 'lg' | 'xl';
    accent?: 'left' | 'top' | 'none';
    children?: React.ReactNode;
    particles?: boolean;
}

export function EliteCard({
    variant = 'default',
    blur = 'xl',
    accent = 'left',
    className,
    children,
    particles = false,
    ...props
}: EliteCardProps) {
    const accentVariants = {
        left: 'before:absolute before:left-0 before:top-1/4 before:h-1/2 before:w-1 before:rounded-r-full',
        top: 'before:absolute before:top-0 before:left-1/4 before:w-1/2 before:h-1 before:rounded-b-full',
        none: '',
    };

    const accentColors = {
        default: 'before:bg-white/20',
        cyan: 'before:bg-tactical-cyan shadow-neon-cyan/10',
        magenta: 'before:bg-tactical-magenta shadow-neon-magenta/10',
        danger: 'before:bg-red-500',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ 
                rotateX: 2, 
                rotateY: 2, 
                scale: 1.01,
                transition: { duration: 0.2 } 
            }}
            style={{ 
                transformStyle: 'preserve-3d',
                perspective: '1000px'
            }}
            className={cn(

                'relative bg-[#111111]/40 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-3xl shadow-2xl',
                accent !== 'none' && accentVariants[accent],
                accent !== 'none' && accentColors[variant],
                className
            )}
            {...props}
        >
            {/* Tactical Grid Overlay (Subtle) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            
            {/* Particles System */}
            {particles && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden motion-reduce:hidden">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ 
                                x: Math.random() * 100 + "%", 
                                y: Math.random() * 100 + "%",
                                opacity: 0 
                            }}
                            animate={{ 
                                y: ["0%", "100%"],
                                opacity: [0, 0.2, 0]
                            }}
                            transition={{ 
                                duration: Math.random() * 5 + 5, 
                                repeat: Infinity, 
                                ease: "linear",
                                delay: Math.random() * 5
                            }}
                            className="absolute w-1 h-1 bg-tactical-cyan rounded-full blur-[1px]"
                        />
                    ))}
                </div>
            )}

            
            {/* Glow Source */}
            {variant !== 'default' && (
                <div className={cn(
                    "absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none",
                    variant === 'cyan' ? 'bg-tactical-cyan' : 'bg-tactical-magenta'
                )} />
            )}

            <div className="relative z-10 p-8 h-full">
                {children}
            </div>
        </motion.div>
    );
}
