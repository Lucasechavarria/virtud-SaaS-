'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    Shield,
    Smartphone,
    BarChart3,
    Users,
    Globe,
    ArrowRight,
    Play,
    CheckCircle2,
    Palette
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SaasCommercialLanding() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-red-600 selection:text-white">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-black/50 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-black italic">V</div>
                    <span className="text-xl font-black italic uppercase tracking-tighter">Virtud<span className="text-red-600 font-bold">SaaS</span></span>
                </div>
                <div className="hidden md:flex gap-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <a href="#features" className="hover:text-white transition-colors">Funciones</a>
                    <a href="#solutions" className="hover:text-white transition-colors">Soluciones</a>
                    <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
                </div>
                <Link
                    href="/login"
                    className="px-6 py-2 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                >
                    Demo en Vivo
                </Link>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-32 px-6 overflow-hidden">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest mb-10"
                    >
                        <Zap size={14} className="fill-red-500" /> El Futuro de los Gimnasios ya está aquí
                    </motion.div>

                    <motion.h1
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-6xl md:text-9xl font-black italic uppercase tracking-tighter mb-8 leading-[0.9]"
                    >
                        Escalá tu Gimnasio <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">Sin Límites</span>
                    </motion.h1>

                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed"
                    >
                        La plataforma multi-tenant más potente para centros fitness.
                        Gestión total, IA aplicada a rutinas, visión biomecánica y White-Labeling para potenciar tu propia marca.
                    </motion.p>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col md:flex-row justify-center gap-6"
                    >
                        <button className="px-12 py-6 bg-red-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-2xl shadow-red-900/30">
                            Digitalizar Mi Gimnasio
                        </button>
                        <button className="px-12 py-6 bg-white/5 border border-white/10 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                            <Play size={18} fill="white" /> Ver Video de 2 Min
                        </button>
                    </motion.div>
                </div>

                {/* Dashboard Preview */}
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="mt-32 max-w-6xl mx-auto relative group"
                >
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black z-20" />
                    <div className="bg-[#1c1c1e] rounded-[3rem] border border-white/10 p-4 shadow-[0_0_100px_rgba(255,255,255,0.05)] overflow-hidden">
                        <Image
                            src="https://images.unsplash.com/photo-1593642532842-98d0fd5ebc1a?auto=format&fit=crop&q=80"
                            alt="Dashboard Preview"
                            width={1200}
                            height={800}
                            className="w-full h-auto rounded-[2rem] opacity-80 group-hover:scale-[1.01] transition-all duration-700"
                        />
                    </div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl font-black italic uppercase italic tracking-tight mb-4">Todo lo que necesitás <br /> para dominar el mercado</h2>
                        <div className="w-20 h-1 bg-red-600 mx-auto" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <FeatureCard
                            icon={<Smartphone className="text-red-500" />}
                            title="Multi-Tenant Real"
                            description="Gestioná múltiples sedes y gimnasios bajo una sola arquitectura en la nube. Seguro, rápido e independiente."
                        />
                        <FeatureCard
                            icon={<Palette className="text-red-500" />}
                            title="White Labeling"
                            description="Tus clientes ven TU marca. Logos, colores y landing pages personalizadas con un solo click."
                        />
                        <FeatureCard
                            icon={<Zap className="text-red-500" />}
                            title="IA Biomecánica"
                            description="Tecnología de visión líder para corregir posturas y generar rutinas inteligentes automáticamente."
                        />
                        <FeatureCard
                            icon={<BarChart3 className="text-red-500" />}
                            title="Analytics Pro"
                            description="Ingresos, retención y actividad de alumnos. Reportes financieros detallados para directivos."
                        />
                        <FeatureCard
                            icon={<Users className="text-red-500" />}
                            title="Soporte Directo"
                            description="Sistema de tickets integrado para que tus administradores nunca se sientan solos."
                        />
                        <FeatureCard
                            icon={<Shield className="text-red-500" />}
                            title="Pagos B2B"
                            description="Gestión automatizada de suscripciones de tus clientes con alertas de cobro integradas."
                        />
                    </div>
                </div>
            </section>

            {/* Pricing SaaS */}
            <section id="pricing" className="py-32 px-6 bg-[#050505]">
                <div className="max-w-7xl mx-auto text-center mb-20">
                    <h2 className="text-5xl font-black italic uppercase tracking-tighter">Planes para cada <span className="text-red-600">Ambición</span></h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <SaaSPricingCard
                        name="Básico"
                        price="99"
                        features={["1 Sede", "Hasta 50 Alumnos", "Estandar Branding", "Soporte vía Ticket"]}
                    />
                    <SaaSPricingCard
                        name="Pro"
                        price="199"
                        featured
                        features={["Hasta 3 Sedes", "Hasta 500 Alumnos", "White Label Completo", "IA Vision Lab", "Gestión de Finanzas"]}
                    />
                    <SaaSPricingCard
                        name="Elite"
                        price="399"
                        features={["Sedes Ilimitadas", "Alumnos Ilimitados", "API Access", "Consultoría Mensual", "Account Manager Dedicado"]}
                    />
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-40 px-6 text-center">
                <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter mb-10">¿Listo para transformar el fitness?</h2>
                <button className="px-16 py-8 bg-white text-black rounded-full font-black text-xs uppercase tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all shadow-2xl">
                    Agendar Demo Gratuita
                </button>
            </section>

            <footer className="py-20 border-t border-white/5 bg-black px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center font-black text-[10px] italic">V</div>
                        <span className="text-sm font-black italic uppercase tracking-tighter text-gray-400">Virtud SaaS &copy; 2026</span>
                    </div>
                    <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-gray-600">
                        <a href="#" className="hover:text-white">Legal</a>
                        <a href="#" className="hover:text-white">Privacidad</a>
                        <a href="#" className="hover:text-white">Security</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="p-10 bg-[#1c1c1e] rounded-[3rem] border border-white/5 hover:border-red-500/20 transition-all group">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h4 className="text-xl font-black italic uppercase italic tracking-tight mb-4">{title}</h4>
            <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
        </div>
    );
}

function SaaSPricingCard({ name, price, features, featured }: { name: string, price: string, features: string[], featured?: boolean }) {
    return (
        <div className={`p-12 rounded-[4rem] border ${featured ? 'bg-red-600 border-red-500 scale-105' : 'bg-[#1c1c1e] border-white/10'} shadow-2xl relative overflow-hidden`}>
            {featured && (
                <div className="absolute top-0 right-0 bg-white text-black text-[9px] font-black px-6 py-2 rounded-bl-3xl uppercase tracking-widest">Recomendado</div>
            )}
            <h3 className="text-2xl font-black italic uppercase tracking-tight mb-6">{name}</h3>
            <div className="flex items-baseline gap-1 mb-10">
                <span className="text-6xl font-black italic tracking-tighter">${price}</span>
                <span className={`${featured ? 'text-red-200' : 'text-gray-500'} text-sm font-bold`}>/mes</span>
            </div>
            <ul className="space-y-4 mb-12">
                {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 size={16} className={featured ? 'text-white' : 'text-red-500'} />
                        <span className={featured ? 'text-white' : 'text-gray-400'}>{f}</span>
                    </li>
                ))}
            </ul>
            <button className={`w-full py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all ${featured ? 'bg-white text-black hover:bg-black hover:text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                Elegir Plan {name}
            </button>
        </div>
    );
}
