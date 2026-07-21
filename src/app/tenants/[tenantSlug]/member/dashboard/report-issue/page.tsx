'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';

const REPORT_TYPES = [
    { id: 'pain', label: 'Dolor/Molestia', icon: '🔴', description: 'Siento dolor o molestia física' },
    { id: 'injury', label: 'Lesión', icon: '🏥', description: 'Tengo una lesión que requiere atención' },
    { id: 'question', label: 'Consulta', icon: '❓', description: 'Tengo una pregunta o duda' },
    { id: 'concern', label: 'Preocupación', icon: '⚠️', description: 'Algo general que me preocupa' },
];

export default function ReportIssuePage({ _params }: { _params: { gymId: string } }) {
    const { tenantPush } = useTenantNavigation();
    const router = useRouter();
    const [formData, setFormData] = useState({
        tipo: '',
        titulo: '',
        descripcion: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.tipo || !formData.titulo || !formData.descripcion) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/student/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al enviar reporte');
            }



            toast.success('Tu reporte ha sido enviado al coach exitosamente');
            tenantPush('/member/dashboard');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al enviar el reporte. Intenta nuevamente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
        >
            {/* Header */}
            <div>
                <button
                    onClick={() => router.back()}
                    className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block"
                >
                    ← Volver
                </button>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-400 mb-2">
                    🔔 Reportar Problema
                </h1>
                <p className="text-gray-400">Tu coach recibirá esta notificación y te responderá pronto</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Selection */}
                <div>
                    <label className="block text-white font-bold mb-4">Tipo de Reporte</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {REPORT_TYPES.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, tipo: type.id })}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${formData.tipo === type.id
                                    ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-white/5 border-white/10 hover:border-blue-500/50'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl">{type.icon}</span>
                                    <h3 className="font-bold text-white">{type.label}</h3>
                                </div>
                                <p className="text-xs text-gray-400">{type.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Title */}
                <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                    <label className="block text-white font-bold mb-3">Asunto</label>
                    <input
                        type="text"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Ej: Dolor en la rodilla derecha"
                        maxLength={100}
                    />
                    <p className="text-xs text-gray-500 mt-2">{formData.titulo.length}/100 caracteres</p>
                </div>

                {/* Description */}
                <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                    <label className="block text-white font-bold mb-3">Descripción Detallada</label>
                    <textarea
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 h-40 resize-none focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Describe con detalle tu problema, consulta o preocupación..."
                        maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-2">{formData.descripcion.length}/500 caracteres</p>
                </div>

                {/* Info Alert */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-400 text-sm">
                        💡 <strong>Consejo:</strong> Cuanto más detalle proporciones, mejor podrá ayudarte tu coach.
                        Si es una lesión o dolor, menciona cuándo comenzó y qué actividades lo desencadenan.
                    </p>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting || !formData.tipo || !formData.titulo || !formData.descripcion}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
                >
                    {submitting ? 'Enviando...' : 'Enviar Reporte'}
                </button>
            </form>
        </motion.div>
    );
}
