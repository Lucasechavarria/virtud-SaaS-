'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'card' | 'circle' | 'rect';
}

/**
 * Componente de Carga Esquelética Reusable (Skeleton Loader) con visuales premium.
 * Consume de forma dinámica la variable CSS --primary del gimnasio e incorpora
 * un shimmer swipe con aceleración por hardware por GPU para un rendimiento óptimo.
 */
export function SkeletonLoader({ className = '', variant = 'rect' }: SkeletonProps) {
    const baseStyle = "bg-white/5 relative overflow-hidden border border-white/5";
    
    let variantStyle = "rounded-2xl";
    if (variant === 'text') variantStyle = "h-4 w-3/4 rounded-lg";
    else if (variant === 'circle') variantStyle = "rounded-full aspect-square";
    else if (variant === 'card') variantStyle = "rounded-[2.5rem] p-10";

    return (
        <div className={`${baseStyle} ${variantStyle} ${className}`}>
            {/* Animación Shimmer con GPU Acceleration (will-change) */}
            <motion.div
                animate={{
                    x: ['-100%', '100%']
                }}
                transition={{
                    repeat: Infinity,
                    duration: 1.8,
                    ease: 'linear'
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent will-change-transform"
            />
        </div>
    );
}

export default SkeletonLoader;
