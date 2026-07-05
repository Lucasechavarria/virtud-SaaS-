'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Etiqueta descriptiva opcional para identificar la sección que falla */
    sectionName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary premium con diseño Glassmorphism.
 * Captura errores de rendering en componentes hijos y muestra un fallback
 * con botón de "Reintentar" que vuelve a montar el componente sin recargar la app.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem 1rem',
                    minHeight: '200px',
                }}>
                    <div style={{
                        maxWidth: '380px',
                        width: '100%',
                        background: 'rgba(30, 30, 40, 0.65)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 100, 80, 0.25)',
                        padding: '2rem',
                        textAlign: 'center' as const,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}>
                        {/* Ícono animado */}
                        <div style={{
                            fontSize: '3rem',
                            marginBottom: '1rem',
                            animation: 'errorPulse 2s ease-in-out infinite',
                        }}>
                            ⚠️
                        </div>
                        <style>{`
                            @keyframes errorPulse {
                                0%, 100% { transform: scale(1); opacity: 1; }
                                50% { transform: scale(1.1); opacity: 0.8; }
                            }
                        `}</style>

                        <h3 style={{
                            color: '#fff',
                            fontSize: '1.15rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                        }}>
                            {this.props.sectionName
                                ? `Error en ${this.props.sectionName}`
                                : 'Algo salió mal'}
                        </h3>

                        <p style={{
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            marginBottom: '1.25rem',
                        }}>
                            Un error inesperado impidió cargar esta sección.
                            Puedes reintentar sin recargar toda la página.
                        </p>

                        <button
                            onClick={this.handleRetry}
                            style={{
                                width: '100%',
                                padding: '0.7rem 1.5rem',
                                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(249, 115, 22, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 14px rgba(249, 115, 22, 0.35)';
                            }}
                        >
                            🔄 Reintentar
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
