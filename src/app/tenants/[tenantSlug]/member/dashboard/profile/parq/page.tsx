'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Check, ArrowRight, HeartPulse, FileText } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const QUESTIONS = [
    { id: 1, text: '¿Le ha dicho alguna vez un médico que tiene una enfermedad cardíaca y que solo debe realizar actividad física recomendada por un médico?' },
    { id: 2, text: '¿Siente dolor en el pecho cuando realiza actividad física?' },
    { id: 3, text: 'En el último mes, ¿ha tenido dolor en el pecho cuando no estaba realizando actividad física?' },
    { id: 4, text: '¿Pierde el equilibrio debido a mareos o se desmaya alguna vez?' },
    { id: 5, text: '¿Tiene algún problema en los huesos o en las articulaciones (por ejemplo, espalda, rodilla, cadera) que podría empeorar por un cambio en su actividad física?' },
    { id: 6, text: '¿Le receta actualmente un médico medicamentos para la presión arterial o una afección cardíaca?' },
    { id: 7, text: '¿Sabe de alguna otra razón por la que no deba realizar actividad física?' }
];

export default function ParqPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.tenantSlug as string;
    const [isSubdomain, setIsSubdomain] = useState(false);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const host = window.location.host.split(':')[0];
            const isLocalhost = host.endsWith('localhost') || host === '127.0.0.1';
            const baseDomain = isLocalhost ? 'localhost' : (host.endsWith('vercel.app') ? host : 'virtud.fit');
            setIsSubdomain(host !== baseDomain && host !== `www.${baseDomain}`);
        }
    }, []);

    const [answers, setAnswers] = useState<Record<number, boolean>>({});
    const [acceptedConsent, setAcceptedConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleAnswer = (id: number, value: boolean) => {
        setAnswers(prev => ({ ...prev, [id]: value }));
    };

    const isComplete = QUESTIONS.every(q => answers[q.id] !== undefined) && acceptedConsent;
    const hasAnyYes = QUESTIONS.some(q => answers[q.id] === true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isComplete) return;

        setSubmitting(true);
        try {
            // Si tiene algún 'Sí', advertir al socio que requiere visto bueno médico físico además
            if (hasAnyYes) {
                toast((t) => (
                    <span className="flex flex-col gap-2">
                        <span className="font-bold text-red-500">Aviso Importante</span>
                        <span>Has respondido &quot;Sí&quot; a una o más preguntas de salud. Te recomendamos consultar con un médico antes de iniciar.</span>
                        <button 
                            onClick={() => {
                                toast.dismiss(t.id);
                                saveParq();
                            }} 
                            className="bg-red-500 text-white text-xs py-1.5 px-3 rounded-lg font-bold uppercase mt-1 self-end"
                        >
                            Entendido, Continuar
                        </button>
                    </span>
                ), { duration: 6000 });
                setSubmitting(false);
                return;
            }

            await saveParq();
        } catch (_err) {
            toast.error('Error al registrar apto médico');
            setSubmitting(false);
        }
    };

    const saveParq = async () => {
        const res = await fetch('/api/student/profile/parq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error();

        toast.success('Deslinde médico firmado. ¡Acceso QR desbloqueado!');
        const destination = isSubdomain ? '/member/dashboard/qr' : `/${tenantSlug}/member/dashboard/qr`;
        router.push(destination);
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-500">
                    <HeartPulse size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Apto Médico y PAR-Q</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">Declaración Jurada de Salud Obligatoria</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-2xl">
                    <div className="flex items-start gap-4 p-4 bg-orange-500/5 border border-orange-500/15 rounded-2xl text-xs text-orange-400 font-medium leading-relaxed">
                        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                        <p>
                            El cuestionario de aptitud para la actividad física (PAR-Q) está diseñado para identificar si debes consultar con tu médico antes de comenzar a ejercitarte de forma más intensa.
                        </p>
                    </div>

                    <div className="space-y-6 divide-y divide-white/5">
                        {QUESTIONS.map((q) => (
                            <div key={q.id} className="pt-6 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <p className="text-sm font-bold text-gray-300 max-w-lg leading-relaxed">
                                    <span className="text-orange-500 font-black mr-2">{q.id}.</span>
                                    {q.text}
                                </p>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleAnswer(q.id, true)}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                                            answers[q.id] === true
                                                ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                                                : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        Sí
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAnswer(q.id, false)}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                                            answers[q.id] === false
                                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                                                : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Consent checkbox */}
                    <div className="pt-6 border-t border-white/5 flex items-start gap-4">
                        <div className="relative flex items-center mt-1">
                            <input
                                id="consent"
                                type="checkbox"
                                checked={acceptedConsent}
                                onChange={(e) => setAcceptedConsent(e.target.checked)}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/10 bg-white/5 transition-all checked:bg-orange-600 checked:border-orange-500 focus:outline-none"
                            />
                            <Check className="absolute left-1 top-1.5 h-3 w-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" size={12} />
                        </div>
                        <label htmlFor="consent" className="text-xs text-gray-400 leading-relaxed font-medium cursor-pointer">
                            Declaro bajo juramento que he leído este cuestionario y he contestado honestamente a todas las preguntas. Autorizo el uso de estos datos con carácter confidencial y acepto deslindar a la administración de cualquier incidente derivado de condiciones médicas preexistentes no declaradas.
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <button
                        type="submit"
                        disabled={!isComplete || submitting}
                        className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${
                            isComplete && !submitting
                                ? 'bg-orange-600 text-white hover:scale-[1.02] shadow-xl shadow-orange-600/20 active:scale-95 cursor-pointer'
                                : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                        }`}
                    >
                        {submitting ? 'Firmando...' : 'Firmar Deslinde y Finalizar'}
                        <ArrowRight size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
}
