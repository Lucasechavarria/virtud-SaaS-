'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Zap, Beef, Droplets, Target, ShieldCheck, AlertCircle, RotateCcw, Loader2, Apple, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';

interface NutritionAnalysis {
    comida_nombre: string;
    ingredientes_detectados: string[];
    calorias_estimadas: number;
    macros: {
        proteinas: number;
        carbohidratos: number;
        grasas: number;
    };
    puntuacion_salud: number;
    recomendacion_tactica: string;
}

export default function MacroSnap() {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('La imagen es demasiado grande (Máximo 5MB)');
                return;
            }
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setAnalysis(null);
        }
    };

    const runAnalysis = async () => {
        if (!imageFile) {
            toast.error('Selecciona una imagen de tu plato');
            return;
        }

        setAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];

                const response = await fetch('/api/ai/nutrition/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filePart: base64,
                        mimeType: imageFile.type
                    })
                });

                const data = await response.json();
                if (data.success) {
                    setAnalysis(data.analysis);
                    toast.success('Escaneo Nutricional Completado');
                } else {
                    throw new Error(data.error || 'Error en el análisis');
                }
            };
        } catch (_error) {
            const err = _error as Error;
            toast.error(err.message || 'Error al conectar con la IA');
        } finally {
            setAnalyzing(false);
        }
    };

    const saveRecord = async () => {
        if (!imageFile || !analysis) return;

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            // 1. Upload to Storage
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('nutrition-logs')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('nutrition-logs')
                .getPublicUrl(fileName);

            // 2. Save to DB
            const { error: dbError } = await supabase
                .from('registros_nutricion')
                .insert({
                    usuario_id: user.id,
                    nombre_comida: analysis.comida_nombre,
                    url_imagen: publicUrl,
                    calorias_estimadas: analysis.calorias_estimadas,
                    macros: analysis.macros,
                    ingredientes_detectasdos: analysis.ingredientes_detectados, // Corregido typo si existía o mantenido coherencia
                    puntuacion_salud: analysis.puntuacion_salud,
                    recomendacion_tactica: analysis.recomendacion_tactica
                });

            if (dbError) {
                // Si la tabla no existe, al menos informamos al usuario
                console.error('DB Error:', dbError);
                throw new Error('Error al guardar en la base de datos. Asegúrate de que la tabla registros_nutricion esté creada.');
            }

            toast.success('Registro nutricional guardado');
        } catch (_error) {
            const err = _error as Error;
            console.error('Error saving:', err);
            toast.error(err.message || 'Error al guardar el registro');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header Táctico */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">AI Nutritional Scanner</p>
                    </div>
                    <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Macro <span className="text-emerald-500">Snap</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-60">
                        Visión Computacional Aplicada a Nutrición
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Panel de Captura */}
                <div className="space-y-6">
                    <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />

                        {!imageUrl ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/30 transition-all bg-white/5 group"
                            >
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Camera className="w-10 h-10 text-gray-700" />
                                </div>
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Capturar Fotografía de Plato</span>
                                <span className="text-[9px] text-gray-600 mt-2 uppercase tracking-widest">JPG / PNG • Max 5MB</span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-black aspect-square shadow-2xl">
                                    <Image src={imageUrl} alt="Plato a analizar" fill className="object-cover" unoptimized />
                                    {analyzing && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                            <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] animate-pulse">Escaneando Nutrientes...</p>
                                        </div>
                                    )}

                                    {/* Scan Lines Animation */}
                                    {analyzing && (
                                        <motion.div
                                            initial={{ top: 0 }}
                                            animate={{ top: '100%' }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute left-0 w-full h-1 bg-emerald-500/50 blur-sm z-20"
                                        />
                                    )}
                                </div>

                                <button
                                    onClick={runAnalysis}
                                    disabled={analyzing}
                                    className="w-full bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase italic tracking-[0.2em] text-xs hover:bg-emerald-400 transition-all shadow-2xl shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {analyzing ? 'Procesando Imagen...' : 'Ejecutar Análisis de Macros'}
                                </button>
                            </div>
                        )}
                    </div>

                    {imageUrl && (
                        <button
                            onClick={() => { setImageUrl(null); setImageFile(null); setAnalysis(null); }}
                            className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-3 h-3" /> Reiniciar Escáner
                        </button>
                    )}
                </div>

                {/* Panel de Resultados */}
                <div className="space-y-8">
                    <AnimatePresence mode="wait">
                        {!analysis ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center p-12 bg-zinc-950/20 rounded-[3rem] border border-dashed border-white/5 text-center min-h-[500px]"
                            >
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <Apple className="w-8 h-8 text-gray-700" />
                                </div>
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-2">Esperando Scan-Data</h3>
                                <p className="text-[10px] text-gray-600 uppercase max-w-[200px] leading-relaxed tracking-widest">
                                    Sube una foto de tu comida para desglosar sus componentes biológicos.
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Puntuación de Salud */}
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[3rem] p-10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">Biological Quality Score</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-7xl font-black text-white italic tracking-tighter leading-none group-hover:scale-110 transition-transform">
                                            {analysis.puntuacion_salud}
                                        </span>
                                        <span className="text-lg font-black text-emerald-500 uppercase italic">/10</span>
                                    </div>
                                    <p className="mt-4 text-[11px] font-bold text-white uppercase tracking-wider">{analysis.comida_nombre}</p>
                                </div>

                                {/* Macros Grid */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Proteína', val: analysis.macros.proteinas, icon: Beef, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                                        { label: 'Carbos', val: analysis.macros.carbohidratos, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                        { label: 'Grasas', val: analysis.macros.grasas, icon: Droplets, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                                    ].map(m => (
                                        <div key={m.label} className={`${m.bg} border border-white/5 rounded-[2rem] p-6 text-center group hover:border-white/10 transition-all`}>
                                            <m.icon className={`w-5 h-5 mx-auto mb-3 ${m.color}`} />
                                            <p className="text-2xl font-black text-white">{m.val}g</p>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">{m.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Recomendación Táctica */}
                                <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Dossier Nutricional</p>
                                            <p className="text-[8px] text-gray-500 uppercase">Input detectado por Gemini Engine</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Ingredientes Detectados</p>
                                            <div className="flex flex-wrap gap-2">
                                                {analysis.ingredientes_detectados.map((ing, i) => (
                                                    <span key={i} className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                        {ing}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem]">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                <Target className="w-3 h-3" /> Recomendación Táctica
                                            </p>
                                            <p className="text-xs font-bold text-gray-300 italic leading-relaxed">
                                                "{analysis.recomendacion_tactica}"
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Guardar Historial */}
                                <button
                                    onClick={saveRecord}
                                    disabled={isSaving}
                                    className="w-full bg-white/5 border border-white/10 p-5 rounded-[2rem] flex items-center justify-between group hover:bg-emerald-500 transition-all transition-duration-500"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-emerald-500 group-hover:bg-white/20">
                                            {isSaving ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Upload className="w-4 h-4 text-white" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Registrar en Bitácora Bio</p>
                                            <p className="text-[8px] text-gray-500 uppercase group-hover:text-white/70">Almacenar datos para analítica pro</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/20">
                                        <ChevronRight className="w-3 h-3 text-white" />
                                    </div>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
