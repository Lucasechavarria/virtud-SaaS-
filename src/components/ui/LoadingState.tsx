'use client';

import React from 'react';

type LoadingVariant = 'spinner' | 'skeleton' | 'pulse';

interface LoadingStateProps {
    /** Variante visual del estado de carga */
    variant?: LoadingVariant;
    /** Texto opcional a mostrar debajo del indicador */
    label?: string;
    /** Cantidad de líneas skeleton a renderizar */
    lines?: number;
    /** Altura completa (min-height: 300px) o compacta */
    fullHeight?: boolean;
}

/**
 * Componente estandarizado de estado de carga.
 * Soporta 3 variantes: spinner (default), skeleton y pulse.
 */
export function LoadingState({
    variant = 'spinner',
    label,
    lines = 3,
    fullHeight = false,
}: LoadingStateProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        ...(fullHeight ? { minHeight: '300px' } : {}),
    };

    if (variant === 'skeleton') {
        return (
            <div style={{ padding: '1rem', width: '100%' }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            height: i === 0 ? '1.25rem' : '0.85rem',
                            width: i === 0 ? '60%' : `${85 - i * 10}%`,
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%)',
                            backgroundSize: '200% 100%',
                            borderRadius: '6px',
                            marginBottom: '0.65rem',
                            animation: 'shimmer 1.5s ease-in-out infinite',
                        }}
                    />
                ))}
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
            </div>
        );
    }

    if (variant === 'pulse') {
        return (
            <div style={containerStyle}>
                <div style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    background: 'rgba(249, 115, 22, 0.25)',
                    animation: 'loadingPulse 1.4s ease-in-out infinite',
                }} />
                {label && (
                    <p style={{
                        marginTop: '1rem',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.85rem',
                    }}>
                        {label}
                    </p>
                )}
                <style>{`
                    @keyframes loadingPulse {
                        0%, 100% { transform: scale(0.8); opacity: 0.5; }
                        50% { transform: scale(1.2); opacity: 1; }
                    }
                `}</style>
            </div>
        );
    }

    // Default: spinner
    return (
        <div style={containerStyle}>
            <div style={{
                width: '2.5rem',
                height: '2.5rem',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#f97316',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            {label && (
                <p style={{
                    marginTop: '1rem',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.85rem',
                }}>
                    {label}
                </p>
            )}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
