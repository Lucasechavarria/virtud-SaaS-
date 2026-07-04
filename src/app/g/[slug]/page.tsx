'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    MessageCircle,
    ChevronDown,
    Activity,
    Shield,
    CheckCircle2,
    MapPin
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Plan {
    id: string;
    nombre: string;
    descripcion: string;
    precio: number;
    duracion_meses: number;
    beneficios: string[];
}

interface Gym {
    nombre: string;
    slug: string;
    logo_url?: string;
    color_primario?: string;
    planes?: Plan[];
    config_landing?: {
        hero_titulo?: string;
        hero_subtitulo?: string;
        hero_imagen?: string;
        carrusel_imagenes?: string[];
        secciones?: {
            nosotros?: boolean;
            actividades?: boolean;
            planes?: boolean;
            contacto?: boolean;
        };
    };
}


export default function GymPublicLanding({ params }: { params: { slug: string } }) {
    const [gym, setGym] = useState<Gym | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGym();
    }, [params.slug]);

    const fetchGym = async () => {
        try {
            // Un API para datos públicos del gym
            const res = await fetch(`/api/public/gyms/${params.slug}`);
            const data = await res.json();
            if (res.ok) setGym(data.gym);
        } catch (error) {
            console.error('Error loading gym:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-black italic uppercase tracking-widest text-[10px]">Cargando experiencia...</p>
        </div>
    );

    if (!gym) return <div className="min-h-screen bg-black flex items-center justify-center text-white">404 - Gimnasio no encontrado</div>;

    const config = gym.config_landing || {};
    const primaryColor = gym.color_primario || '#ef4444';

    return (
        <div className="min-h-screen bg-black text-white selection:bg-red-500 selection:text-white overflow-x-hidden">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    {gym.logo_url ? (
                        <div className="relative h-10 w-10">
                            <Image src={gym.logo_url} alt={gym.nombre} fill className="object-contain" unoptimized />
                        </div>
                    ) : (
                        <span className="text-2xl font-black italic tracking-tighter uppercase">{gym.nombre}</span>
                    )}
                </div>
                <div className="hidden md:flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    {config.secciones?.nosotros && <a href="#nosotros" className="hover:text-white transition-colors">Nosotros</a>}
                    {config.secciones?.actividades && <a href="#actividades" className="hover:text-white transition-colors">Clases</a>}
                    {config.secciones?.planes !== false && <a href="#planes" className="hover:text-white transition-colors">Membresías</a>}
                    {config.secciones?.contacto && <a href="#contacto" className="hover:text-white transition-colors">Ubicación</a>}
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="px-6 py-2 border border-white/10 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all"
                    >
                        Login
                    </Link>
                    <a
                        href="#planes"
                        className="px-6 py-2 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Unirme Ahora
                    </a>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src={config.hero_imagen || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80"}
                        alt="Hero"
                        fill
                        className="object-cover opacity-60"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </div>

                <div className="relative z-10 text-center max-w-4xl px-6">
                    <motion.h1
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter mb-6 leading-tight"
                    >
                        {config.hero_titulo || "Entrena al Siguiente Nivel"}
                    </motion.h1>
                    <motion.p
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl mx-auto mb-10"
                    >
                        {config.hero_subtitulo || "Descubre una experiencia de entrenamiento única con tecnología de punta."}
                    </motion.p>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col md:flex-row gap-4 justify-center"
                    >
                        <a
                            href="#planes"
                            className="px-10 py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-2xl shadow-red-900/20"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Ver Planes
                        </a>
                        <a
                            href="#nosotros"
                            className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all text-center flex items-center justify-center"
                        >
                            Conocer Más
                        </a>
                    </motion.div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-500">
                    <ChevronDown size={32} />
                </div>
            </section>

            {/* Info Cards */}
            <section id="nosotros" className="py-32 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="p-10 bg-[#111] rounded-[3rem] border border-white/5 space-y-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                            <Activity size={24} />
                        </div>
                        <h4 className="text-xl font-black italic uppercase tracking-tight">Equipamiento Top</h4>
                        <p className="text-gray-500 text-sm leading-relaxed">Contamos con máquinas de última generación y software de seguimiento biomecánico exclusivo.</p>
                    </div>
                    <div className="p-10 bg-[#111] rounded-[3rem] border border-white/5 space-y-4">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4">
                            <CheckCircle2 size={24} />
                        </div>
                        <h4 className="text-xl font-black italic uppercase tracking-tight">Staff de Élite</h4>
                        <p className="text-gray-500 text-sm leading-relaxed">Entrenadores certificados y expertos en nutrición para lograr tu mejor versión física.</p>
                    </div>
                    <div className="p-10 bg-[#111] rounded-[3rem] border border-white/5 space-y-4">
                        <div className="w-12 h-12 bg-green-600/10 rounded-2xl flex items-center justify-center text-green-500 mb-4">
                            <Shield size={24} />
                        </div>
                        <h4 className="text-xl font-black italic uppercase tracking-tight">Tecnología Virtud</h4>
                        <p className="text-gray-500 text-sm leading-relaxed">Accede a tus planes, progresos y análisis de visión desde nuestra app dedicada.</p>
                    </div>
                </div>
            </section>

            {/* Carousel / Features Section */}
            {(config.carrusel_imagenes?.length ?? 0) > 0 && (
                <section className="py-32 px-6 bg-[#050505]">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {config.carrusel_imagenes.map((img: string, i: number) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -10 }}
                                className="aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl"
                            >
                                <div className="relative w-full h-full">
                                    <Image src={img} alt={`Slide ${i}`} fill className="object-cover" unoptimized />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Pricing / Planes Section */}
            <section id="planes" className="py-40 px-6 bg-gradient-to-b from-black to-[#0a0a0a]">
                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="text-center space-y-4">
                        <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">Membresías</h2>
                        <p className="text-gray-500 font-bold uppercase tracking-widest">Elige el plan que mejor se adapte a tus objetivos</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {gym.planes?.map((plan) => (
                            <motion.div
                                key={plan.id}
                                whileHover={{ scale: 1.02 }}
                                className="bg-[#111] border border-white/5 rounded-[3rem] p-12 flex flex-col justify-between hover:border-primary/20 transition-all group"
                            >
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">{plan.nombre}</h3>
                                        <p className="text-gray-500 text-xs font-medium">{plan.descripcion}</p>
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black italic tracking-tighter">${plan.precio}</span>
                                        <span className="text-gray-600 font-bold uppercase text-[10px] tracking-widest">/ {plan.duracion_meses > 1 ? `${plan.duracion_meses} Meses` : 'Mes'}</span>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        {plan.beneficios?.map((b, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-sm text-gray-400">
                                                <CheckCircle2 size={16} style={{ color: primaryColor }} />
                                                <span>{b}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Link
                                    href={`/inscripcion?plan=${plan.id}&gym=${gym.slug}`}
                                    className="mt-12 w-full py-5 rounded-2xl text-center font-black uppercase italic tracking-widest text-[10px] bg-white text-black group-hover:bg-primary group-hover:text-white transition-all shadow-xl"
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    style={{ '--tw-bg-opacity': '1' } as any}
                                >
                                    Elegir Plan
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black py-20 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="space-y-4 text-center md:text-left">
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase">{gym.nombre}</h3>
                        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest leading-loose">
                            &copy; 2026 {gym.nombre}. Potenciado por Virtud SaaS.
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <MessageCircle size={24} className="text-gray-500 hover:text-white transition-colors cursor-pointer" />
                        <MapPin size={24} className="text-gray-500 hover:text-white transition-colors cursor-pointer" />
                    </div>
                </div>
            </footer>
        </div>
    );
}
