'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    // const router = useRouter(); // Eliminado ya que no se utiliza en esta página
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await authService.resetPassword(email);
            setEmailSent(true);
            toast.success('Email de recuperación enviado');
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al enviar email de recuperación';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">✓</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Email Enviado</h1>
                        <p className="text-gray-400">
                            Hemos enviado un enlace de recuperación a <strong className="text-white">{email}</strong>
                        </p>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-300">
                            📧 Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => setEmailSent(false)}
                            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Enviar nuevamente
                        </button>
                        <Link
                            href="/login"
                            className="block w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-center font-semibold"
                        >
                            Volver al Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">¿Olvidaste tu contraseña?</h1>
                    <p className="text-gray-400">
                        Ingresa tu email y te enviaremos un enlace para restablecerla
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="text-sm text-gray-400 hover:text-orange-500 transition-colors"
                    >
                        ← Volver al login
                    </Link>
                </div>
            </div>
        </div>
    );
}
