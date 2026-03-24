'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, Activity, Target, ShieldCheck, AlertCircle, _Play, _Pause, RotateCcw, ChevronDown, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';

interface VisionAnalysis {
    postura?: string[];
    tecnica?: string[];
    recomendaciones?: string[];
    puntos_fuertes?: string[];
    puntaje_general?: number;
    timestamp_correcciones?: { segundo: number; correccion: string }[];
}

interface Exercise {
    id: string;
    nombre: string;
    grupo_muscular: string;
}

export default function VisionLab() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
    const [exerciseName, setExerciseName] = useState('');
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [showExercises, setShowExercises] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchExercises();
    }, []);

    const fetchExercises = async () => {
        try {
            const { data, error } = await supabase
                .from('ejercicios')
                .select('id, nombre, grupo_muscular')
                .order('nombre');

            if (error) throw error;
            setExercises(data as Exercise[] || []);
        } catch (_error) {
            console.error('Error fetching exercises:', _error);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 20 * 1024 * 1024) {
                toast.error('El video es demasiado grande (Máximo 20MB)');
                return;
            }
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            setAnalysis(null);
        }
    };

    const runAnalysis = async () => {
        if (!videoFile || !exerciseName) {
            toast.error('Selecciona un video e indica el ejercicio');
            return;
        }

        setAnalyzing(true);
        try {
            // Convert file to base64 for API
            const reader = new FileReader();
            reader.readAsDataURL(videoFile);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];

                const response = await fetch('/api/ai/vision/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filePart: base64,
                        mimeType: videoFile.type,
                        exerciseName
                    })
                });

                const data = await response.json();
                if (data.success) {
                    setAnalysis(data.analysis);
                    toast.success('Análisis Biomecánico Completado');
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

    const saveAnalysis = async () => {
        if (!videoFile || !analysis) return;

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            // 1. Upload video to Storage
            const fileExt = videoFile.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('videos-entrenamiento')
                .upload(fileName, videoFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('videos-entrenamiento')
                .getPublicUrl(fileName);

            // 2. Save record to DB
            const { error: dbError } = await supabase
                .from('videos_ejercicio')
                .insert({
                    usuario_id: user.id,
                    subido_por: user.id,
                    ejercicio_id: selectedExerciseId,
                    url_video: publicUrl,
                    estado: 'analizado',
                    correcciones_ia: analysis as any,
                    puntaje_confianza: analysis.puntaje_general
                });

            if (dbError) throw dbError;

            toast.success('Análisis guardado permanentemente');
            // Podríamos redirigir o limpiar
        } catch (_error) {
            const err = _error as Error;
            console.error('Error saving analysis:', err);
            toast.error('Error al guardar el análisis');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const seekTo = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            videoRef.current.play();
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header Táctico */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-orange-500 rounded-full" />
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">AI Biomechanical Lab</p>
                    </div>
                    <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Vision <span className="text-orange-500">Form</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-60">
                        Análisis Progresivo de Técnica de Élite
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Panel de Grabación/Carga */}
                <div className="space-y-6">
                    <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16" />

                        {!videoUrl ? (
                            <label className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:border-orange-500/30 transition-all bg-white/5">
                                <Video className="w-16 h-16 text-gray-700 mb-4" />
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Subir Video Operativo</span>
                                <span className="text-[9px] text-gray-600 mt-2 uppercase tracking-widest">MP4 / Quicktime • Max 20MB</span>
                                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-black aspect-video shadow-2xl">
                                    <video
                                        ref={videoRef}
                                        src={videoUrl}
                                        onTimeUpdate={handleTimeUpdate}
                                        className="w-full h-full object-contain"
                                        controls={false}
                                    />
                                    {analyzing && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                            <div className="w-20 h-20 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4" />
                                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] animate-pulse">Escaneando Biometría...</p>
                                        </div>
                                    )}

                                    {/* HUD Táctico Overlay */}
                                    <div className="absolute top-4 left-4 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                                            <span className="text-[8px] font-black text-white uppercase italic tracking-widest">V-SCAN ACTIVO</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter">
                                            T: {currentTime.toFixed(2)}s
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowExercises(!showExercises)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between text-left group hover:border-orange-500/30 transition-all"
                                        >
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                                {exerciseName || 'Seleccionar Ejercicio'}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showExercises ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {showExercises && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute bottom-full mb-2 left-0 w-full bg-zinc-900 border border-white/10 rounded-2xl p-2 max-h-60 overflow-y-auto z-50 custom-scrollbar shadow-2xl"
                                                >
                                                    {exercises.map(ex => (
                                                        <button
                                                            key={ex.id}
                                                            onClick={() => {
                                                                setExerciseName(ex.nombre);
                                                                setSelectedExerciseId(ex.id);
                                                                setShowExercises(false);
                                                            }}
                                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-orange-500/10 text-left group"
                                                        >
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-300 group-hover:text-white uppercase">{ex.nombre}</p>
                                                                <p className="text-[8px] text-gray-600 uppercase tracking-tighter">{ex.grupo_muscular}</p>
                                                            </div>
                                                            {exerciseName === ex.nombre && <Check className="w-3 h-3 text-orange-500" />}
                                                        </button>
                                                    ))}
                                                    <div className="p-2 pt-4 border-t border-white/5">
                                                        <input
                                                            type="text"
                                                            placeholder="Otro ejercicio..."
                                                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-orange-500/30 uppercase font-bold"
                                                            value={exerciseName}
                                                            onChange={(e) => {
                                                                setExerciseName(e.target.value);
                                                                setSelectedExerciseId(null);
                                                            }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <button
                                        onClick={runAnalysis}
                                        disabled={analyzing || !exerciseName}
                                        className="w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black uppercase italic tracking-[0.2em] text-xs hover:bg-orange-400 transition-all shadow-2xl shadow-orange-500/20 disabled:opacity-50"
                                    >
                                        {analyzing ? 'Procesando Biometría...' : 'Ejecutar Análisis de IA'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {videoUrl && (
                        <button
                            onClick={() => { setVideoUrl(null); setVideoFile(null); setAnalysis(null); setExerciseName(''); setSelectedExerciseId(null); }}
                            className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-3 h-3" /> Reiniciar Laboratorio
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
                                    <Target className="w-8 h-8 text-gray-700" />
                                </div>
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-2">Esperando Datos de Imagen</h3>
                                <p className="text-[10px] text-gray-600 uppercase max-w-[200px] leading-relaxed tracking-widest">
                                    Sube un video para que la IA escanee tu trayectoria biomecánica.
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Score Card */}
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-[3rem] p-10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">Elite Blueprint Score</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-7xl font-black text-white italic tracking-tighter leading-none group-hover:scale-110 transition-transform">
                                            {analysis.puntaje_general}
                                        </span>
                                        <span className="text-lg font-black text-orange-500 uppercase italic">/100</span>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-orange-500" />
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Verificación Biomecánica Completada</p>
                                    </div>
                                </div>

                                {/* Guardar Historial */}
                                <button
                                    onClick={saveAnalysis}
                                    disabled={isSaving}
                                    className="w-full bg-white/5 border border-white/10 p-5 rounded-[2rem] flex items-center justify-between group hover:bg-orange-500 transition-all transition-duration-500"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-orange-500 group-hover:bg-white/20">
                                            {isSaving ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Upload className="w-4 h-4 text-white" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Guardar en Historial Operativo</p>
                                            <p className="text-[8px] text-gray-500 uppercase group-hover:text-white/70">Archivar para seguimiento táctico</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/20">
                                        <Target className="w-3 h-3 text-white" />
                                    </div>
                                </button>

                                {/* Puntos de Interés / Timeline */}
                                <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8 space-y-6">
                                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                        <AlertCircle className="w-4 h-4 text-orange-500" />
                                        Cronología de Ajustes
                                    </h4>
                                    <div className="space-y-4">
                                        {analysis.timestamp_correcciones?.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => seekTo(item.segundo)}
                                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all group text-left"
                                            >
                                                <div className="bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10 group-hover:border-orange-500/50">
                                                    <span className="text-[10px] font-mono font-black text-orange-500 leading-none">{item.segundo.toFixed(1)}s</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors uppercase italic">{item.correccion}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Recomendaciones */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8">
                                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                            <Activity className="w-4 h-4 text-orange-500" />
                                            Dossier Técnico
                                        </h4>
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Análisis de Estructura</p>
                                            {analysis.tecnica?.map((t, i) => (
                                                <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed italic">{t}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
