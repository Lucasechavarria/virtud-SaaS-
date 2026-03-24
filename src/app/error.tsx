'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 border border-red-500/30">
                <div className="text-6xl text-center mb-4">💥</div>
                <h1 className="text-3xl font-bold text-white text-center mb-4">
                    Error del Servidor
                </h1>
                <p className="text-gray-400 text-center mb-6">
                    Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                    >
                        Ir al Dashboard
                    </button>
                    <button
                        onClick={() => reset()}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-semibold shadow-lg shadow-red-500/20"
                    >
                        Reintentar
                    </button>
                </div>
                {error.digest && (
                    <p className="mt-4 text-xs text-gray-500 text-center font-mono">
                        ID: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}
