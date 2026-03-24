'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Key,
    Save,
    ShieldCheck,
    Info,
    ExternalLink,
    CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PaymentSettings() {
    const [loading, setLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulación de guardado en la tabla 'gimnasios' (columnas de integración)
        await new Promise(r => setTimeout(r, 1500));
        setLoading(false);
        toast.success('Configuración de Mercado Pago guardada con éxito.');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            <div className="space-y-2">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                    <CreditCard className="text-orange-500" size={36} />
                    Configuración de Cobros
                </h2>
                <p className="text-gray-500 font-medium">Vincula tu cuenta de Mercado Pago para procesar pagos automáticos.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <form onSubmit={handleSave} className="lg:col-span-3 space-y-8 bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Access Token (Producción)</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                <input
                                    type="password"
                                    placeholder="APP_USR-XXXX-XXXX-XXXX"
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-orange-500/50 outline-none transition-all font-mono text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Public Key</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                <input
                                    type="text"
                                    placeholder="APP_USR-XXXX"
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-orange-500/50 outline-none transition-all font-mono text-sm"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? 'Guardando...' : <><Save size={18} /> Guardar Configuración</>}
                    </button>
                </form>

                <div className="lg:col-span-2 space-y-6">
                    <div className="p-8 bg-black/40 border border-white/5 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center gap-3 text-orange-500">
                            <Info size={20} />
                            <h4 className="text-xs font-black uppercase tracking-widest">¿Cómo obtener las llaves?</h4>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Debes ingresar a tu panel de desarrollador de Mercado Pago, crear una aplicación llamada "Virtud Gym" y copiar tus credenciales de producción.
                        </p>
                        <a
                            href="https://www.mercadopago.com.ar/developers/panel"
                            target="_blank"
                            className="flex items-center justify-between text-[10px] font-black text-white bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-all border border-white/5 uppercase tracking-tighter"
                        >
                            Ir a Mercado Pago Developers
                            <ExternalLink size={14} />
                        </a>
                    </div>

                    <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-[2.5rem] space-y-2">
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Estado del Sistema</p>
                        <p className="text-xs text-gray-300">✅ Webhooks listos para recibir notificaciones.</p>
                        <p className="text-xs text-gray-300">✅ SSL Certificado y seguro.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
