'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import {
    _Zap,
    CheckCircle2,
    AlertCircle,
    ClipboardList,
    _Play,
    Clock,
    Star,
    MessageSquare,
    _ChevronRight,
    Loader2,
    FlaskConical,
    History,
    Search
} from 'lucide-react';
import { _CorreccionesIA } from '@/lib/validations/videos';
import toast from 'react-hot-toast';
import VisionLab from '@/features/ai/components/VisionLab';

export default function VisionPage({ _params }: { _params: { gymId: string } }) {
    const [mode, setMode] = useState<'history' | 'lab'>('lab');
    const [videos, setVideos] = useState<any[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    useEffect(() => {
        fetchVideos();

        const channel = supabase
            .channel('vision_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'videos_ejercicio'
                },
                (payload) => {
                    fetchVideos();
                    if (payload.eventType === 'UPDATE' && (payload.new as any).estado === 'analizado') {
                        toast.success('¡Análisis biomecánico completado!');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('videos_ejercicio')
                .select('*, ejercicios(nombre)')
                .eq('usuario_id', user.id)
                .order('creado_en', { ascending: false });

            if (error) throw error;
            setVideos(data || []);
        } catch (error) {
            console.error('Error fetching videos:', error);
            toast.error('No se pudieron cargar tus análisis');
        } finally {
            setLoading(false);
        }
    };

    const handleVideoSelect = (video: any) => {
        setSelectedVideo(video);
        setRating(video.calificacion_alumno || 0);
        setComment(video.feedback_alumno || '');
        setMode('history');
    };

    const handleSubmitFeedback = async () => {
        if (!selectedVideo) return;
        try {
            setSubmittingFeedback(true);
            const { error } = await supabase
                .from('videos_ejercicio')
                .update({
                    calificacion_alumno: rating,
                    feedback_alumno: comment
                })
                .eq('id', selectedVideo.id);

            if (error) throw error;
            toast.success('Dossier actualizado con éxito');
            fetchVideos();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error('Error al guardar el feedback');
        } finally {
            setSubmittingFeedback(false);
        }
    };

    return (
        <div className="min-h-screen space-y-12 relative z-10 p-4 md:p-8">
            {/* Background Elite Accent */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header Táctico */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-orange-500 rounded-full" />
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Operational Unit</p>
                    </div>
                    <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Technique <span className="text-orange-500">Vision</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-60">
                        Inteligencia Biomecánica Predictiva
                    </p>
                </div>

                {/* Toggles de Modo */}
                <div className="flex p-1 bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/5">
                    <button
                        onClick={() => setMode('lab')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'lab' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <FlaskConical className="w-4 h-4" /> Lab Activo
                    </button>
                    <button
                        onClick={() => setMode('history')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'history' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <History className="w-4 h-4" /> Historial
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {mode === 'lab' ? (
                    <motion.div
                        key="lab"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <VisionLab />
                    </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        {/* Sidebar de Historial */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 p-6 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="text"
                                        placeholder="Buscar reporte..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/30 transition-all uppercase tracking-widest shadow-inner shadow-black/20"
                                    />
                                </div>

                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {videos
                                        .filter(v => v.ejercicios?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(video => (
                                            <button
                                                key={video.id}
                                                onClick={() => setSelectedVideo(video)}
                                                className={`w-full group p-4 rounded-2xl border transition-all text-left ${selectedVideo?.id === video.id ? 'bg-orange-500/10 border-orange-500/50 shadow-lg shadow-orange-500/5' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${video.estado === 'analizado' ? 'bg-orange-500/20' : 'bg-zinc-800'}`}>
                                                        {video.estado === 'analizado' ? '🎯' : '⏳'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-xs text-white truncate group-hover:text-orange-500 transition-colors uppercase tracking-widest">
                                                            {video.ejercicios?.nombre || 'Ejercicio Tactico'}
                                                        </p>
                                                        <p className="text-[9px] font-black text-gray-500 mt-1 uppercase tracking-tighter">
                                                            {new Date(video.creado_en).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    {video.estado === 'analizado' && (
                                                        <div className="text-right">
                                                            <p className="text-white font-black text-sm italic">{(video.correcciones_ia as any)?.puntaje_general}%</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* Detalle del Historial */}
                        <div className="lg:col-span-8">
                            {selectedVideo ? (
                                <div className="bg-zinc-950/40 backdrop-blur-2xl rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                                    <div className="aspect-video bg-black relative group">
                                        <video
                                            src={selectedVideo.url_video}
                                            controls
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute top-6 left-6 scale-75 origin-top-left">
                                            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                                Reproduciendo Operación
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-10 space-y-10">
                                        {/* Score Central */}
                                        <div className="flex items-center gap-8">
                                            <div className="text-center bg-zinc-900/50 p-6 rounded-3xl border border-white/5 min-w-[120px]">
                                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Score IA</p>
                                                <p className="text-5xl font-black text-white italic tracking-tighter">
                                                    {(selectedVideo.correcciones_ia as any)?.puntaje_general || 0}
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">
                                                    {selectedVideo.ejercicios?.nombre || 'Análisis Técnico'}
                                                </h3>
                                                <div className="flex items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                    <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> {new Date(selectedVideo.creado_en).toLocaleDateString()}</span>
                                                    <span className="w-1 h-1 bg-gray-800 rounded-full" />
                                                    <span className="text-orange-500">Estado: Verificado</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contenido del Análisis */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Puntos Fuertes
                                                </h4>
                                                <div className="space-y-2">
                                                    {(selectedVideo.correcciones_ia as any)?.puntos_fuertes?.map((p: string, i: number) => (
                                                        <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-bold text-gray-400 uppercase italic">
                                                            {p}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                                    <AlertCircle className="w-4 h-4 text-orange-500" /> Ajustes Necesarios
                                                </h4>
                                                <div className="space-y-2">
                                                    {(selectedVideo.correcciones_ia as any)?.tecnica?.map((t: string, i: number) => (
                                                        <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-bold text-gray-400 uppercase italic">
                                                            {t}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recomendaciones de Élite */}
                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2.5rem] p-8">
                                            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                                <ClipboardList className="w-4 h-4" /> Recomendaciones Master
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(selectedVideo.correcciones_ia as any)?.recomendaciones?.map((r: string, i: number) => (
                                                    <div key={i} className="flex gap-4 p-4 bg-black/20 rounded-2xl">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                                        <p className="text-[10px] font-bold text-gray-300 uppercase leading-relaxed italic">{r}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Feedback del Alumno */}
                                        <div className="pt-10 border-t border-white/5 space-y-6">
                                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <Star className="w-4 h-4 text-orange-500" /> Nota de Operación
                                            </h4>
                                            <div className="flex gap-3">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setRating(i)}
                                                        className={`p-3 rounded-xl transition-all ${rating >= i ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-gray-600 hover:text-white'}`}
                                                    >
                                                        <Star size={18} fill={rating >= i ? 'currentColor' : 'none'} />
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                placeholder="Añadir comentarios sobre este análisis..."
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-xs font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/30 transition-all min-h-[120px] uppercase tracking-widest shadow-inner shadow-black/20"
                                            />
                                            <button
                                                onClick={handleSubmitFeedback}
                                                disabled={submittingFeedback || !rating}
                                                className="w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase italic tracking-[0.2em] hover:bg-orange-400 transition-all shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                                            >
                                                {submittingFeedback ? <Loader2 className="animate-spin w-5 h-5" /> : <MessageSquare size={18} />}
                                                Guardar Dossier de Sesión
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-center p-10 bg-zinc-950/20">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                        <History className="w-8 h-8 text-gray-800" />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-500 uppercase tracking-[0.3em] mb-2">Seleccionar Reporte Operativo</h4>
                                    <p className="text-[10px] text-gray-700 uppercase max-w-[250px] leading-relaxed tracking-widest">
                                        Explora tu historial de combate para refinar cada milímetro de tu trayectoria biomecánica.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
