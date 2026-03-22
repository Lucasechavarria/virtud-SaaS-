'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function SignupPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // New state for toggling password visibility
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const router = useRouter();

    const handleGoogleSignup = async () => {
        setIsLoading(true);
        try {
            await authService.signInWithGoogle();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error al registrarse con Google";
            toast.error(errorMessage);
            console.error("Google signup error:", error);
            setIsLoading(false);
        }
    };

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setIsLoading(true);
        try {
            const data = await authService.signUp(formData.email, formData.password, formData.firstName, formData.lastName);

            // Check if session exists immediately (Auto Confirm enabled)
            if (data.session) {
                toast.success("¡Cuenta creada! Iniciando sesión...");
                router.push('/dashboard');
            } else if (data.user && !data.session) {
                // If no session but user exists, it MIGHT need confirmation (but user says disabled).
                // Try logging in manually just in case
                try {
                    await authService.signIn(formData.email, formData.password);
                    toast.success("¡Bienvenido!");
                    router.push('/dashboard');
                } catch (signinError) {
                    console.error("Auto-login failed:", signinError);
                    // If manual login fails, maybe it DOES need confirmation or other error
                    toast.success("Cuenta creada. Por favor inicia sesión.");
                    router.push('/login');
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error al crear cuenta";
            toast.error(errorMessage);
            console.error("Email signup error:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center">
            {/* Animated Background Gradient Orbs */}
            <motion.div
                className="absolute top-0 -left-40 w-80 h-80 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute bottom-0 right-0 w-96 h-96 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, -30, 0],
                    y: [0, -50, 0],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Main Content */}
            <motion.div
                className="relative z-10 max-w-md w-full mx-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                {/* Logo & Title */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    <motion.div className="flex justify-center mb-6">
                        <Image
                            src="/logos/Virtud_page-0003.webp"
                            alt="VIRTUD Logo"
                            width={300}
                            height={100}
                            className="w-48 h-auto object-contain"
                            priority
                        />
                    </motion.div>
                    <motion.p
                        className="text-gray-400 text-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        Centro de Entrenamiento
                    </motion.p>
                </motion.div>

                {/* Signup Card */}
                <motion.div
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                >
                    <h2 className="text-2xl font-bold mb-6 text-center">Crea tu cuenta</h2>

                    {!showEmailForm ? (
                        <>
                            {/* Google Signup Button */}
                            <motion.button
                                onClick={handleGoogleSignup}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 px-6 rounded-xl 
                         flex items-center justify-center gap-3 shadow-lg shadow-orange-900/50
                         disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mb-4"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    initial={false}
                                />
                                <span className="relative z-10 flex items-center gap-3">
                                    {isLoading ? (
                                        <>
                                            <motion.div
                                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            />
                                            Conectando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            Continuar con Google
                                        </>
                                    )}
                                </span>
                            </motion.button>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-black/50 text-gray-400">O continúa con email</span>
                                </div>
                            </div>

                            {/* Email Signup Button */}
                            <motion.button
                                onClick={() => setShowEmailForm(true)}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl 
                         border border-white/20 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Registrarse con Email
                            </motion.button>
                        </>
                    ) : (
                        <>
                            {/* Email Signup Form */}
                            <form onSubmit={handleEmailSignup} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-300">
                                            Nombre
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            required
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                                     text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 
                                     transition-all"
                                            placeholder="Juan"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-300">
                                            Apellido
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            required
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                                     text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 
                                     transition-all"
                                            placeholder="Pérez"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-300">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                             text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 
                             transition-all"
                                        placeholder="tu@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-300">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            minLength={6}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                                     text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 
                                     transition-all pr-12"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-300">
                                        Confirmar Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            required
                                            minLength={6}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                                     text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 
                                     transition-all pr-12"
                                            placeholder="Repite tu contraseña"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 px-6 rounded-xl 
                           shadow-lg shadow-orange-900/50 disabled:opacity-50 disabled:cursor-not-allowed 
                           relative overflow-hidden group"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        initial={false}
                                    />
                                    <span className="relative z-10">
                                        {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                                    </span>
                                </motion.button>

                                <button
                                    type="button"
                                    onClick={() => setShowEmailForm(false)}
                                    className="w-full text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    ← Volver a opciones de registro
                                </button>
                            </form>
                        </>
                    )}

                    <motion.p
                        className="text-center text-sm text-gray-400 mt-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" className="text-orange-500 hover:text-orange-400 font-semibold">
                            Inicia sesión
                        </Link>
                    </motion.p>

                    <motion.p
                        className="text-center text-xs text-gray-500 mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        Al continuar, aceptás nuestros términos y condiciones
                    </motion.p>
                </motion.div>

                {/* Footer Badge */}
                <motion.div
                    className="text-center mt-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2"
                        whileHover={{ scale: 1.05, borderColor: "rgba(255,87,34,0.5)" }}
                    >
                        <motion.div
                            className="w-2 h-2 bg-green-500 rounded-full"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-xs text-gray-400">Sistema Activo</span>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
}
