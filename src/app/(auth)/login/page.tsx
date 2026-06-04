'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Intentar obtener redirectTo de la URL
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(params.get('redirectTo'));
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await authService.signInWithGoogle();
      const destination = redirectTo || '/';
      window.location.href = destination;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al iniciar sesión";
      toast.error(errorMessage);
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Image */}
      <motion.div
        className="absolute inset-0 z-0 select-none"
        animate={{
          filter: ["blur(0px)", "blur(5px)", "blur(0px)"],
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Image
          src="/logos/Virtud_page-0003.webp"
          alt="Background"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-black/50" /> {/* Overlay */}
      </motion.div>

      {/* Animated Background Gradient Orbs */}
      <motion.div
        className="absolute top-0 -left-40 w-80 h-80 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 z-0"
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
        className="absolute bottom-0 right-0 w-96 h-96 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 z-0"
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


        {/* Login Card */}
        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-center">Ingresa a tu cuenta</h2>

          {/* Google Login */}
          <motion.button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-white text-black font-bold py-3 px-6 rounded-xl 
                     flex items-center justify-center gap-3 shadow-lg 
                     disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </motion.button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-gray-400">O continúa con email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            setIsLoading(true);
            try {
              await authService.signIn(
                formData.get('email') as string,
                formData.get('password') as string
              );
              
              // Forzar navegación de página completa para que el middleware (proxy) detecte la sesión
              const destination = redirectTo || '/';
              // Dar un respiro al navegador para persistir las cookies antes de navegar
              setTimeout(() => {
                window.location.href = destination;
              }, 250);
            } catch (_error) {
              toast.error("Credenciales inválidas");
              setIsLoading(false);
            }
          }} className="space-y-4">
            <div>
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="Correo electrónico"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                required
              />
            </div>
            <div>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Contraseña"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                required
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 px-6 rounded-xl 
                       shadow-lg shadow-orange-900/50 disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? 'Conectando...' : 'Iniciar Sesión'}
            </motion.button>
          </form>

          <motion.p
            className="text-center text-sm text-gray-400 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Al continuar, aceptás nuestros términos y condiciones
          </motion.p>

          <motion.p
            className="text-center text-sm text-gray-400 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-orange-500 hover:text-orange-400 font-semibold">
              Regístrate aquí
            </Link>
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