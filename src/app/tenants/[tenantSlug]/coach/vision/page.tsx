'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { CoachVideoUpload } from '@/components/coach/CoachVideoUpload';
import { Loader2, CheckCircle2, AlertCircle, Share2, ClipboardList, Zap } from 'lucide-react';
import { CorreccionesIA } from '@/lib/validations/videos';
import { BiomecanicVideoPlayer } from '@/features/coach/components/BiomecanicVideoPlayer';

export default function VisionLabPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const [videoStatus, setVideoStatus] = useState<any>(null);
    const [exerciseName, setExerciseName] = useState('');
    const [polling, setPolling] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data: coachProfile } = await supabase
                    .from('perfiles')
                    .select('gimnasio_id')
                    .eq('id', session.user.id)
                    .single();

                if (!coachProfile?.gimnasio_id) return;

                const { data } = await supabase
                    .from('perfiles')
                    .select('id, nombre_completo, email:correo')
                    .eq('rol', 'member')
                    .eq('gimnasio_id', coachProfile.gimnasio_id)
                    .order('nombre_completo', { ascending: true });

                if (data) setStudents(data);
            } catch (err) {
                console.error('Error fetching students for vision lab:', err);
            }
        };
        fetchStudents();
    }, []);

    // Polling logic
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (currentVideoId && (videoStatus?.estado === 'subido' || videoStatus?.estado === 'procesando')) {
            setPolling(true);
            interval = setInterval(async () => {
                const res = await fetch(`/api/coach/videos/status/${currentVideoId}`);
                if (res.ok) {
                    const data = await res.json();
                    setVideoStatus(data);
                    if (data.estado === 'analizado' || data.estado === 'error') {
                        setPolling(false);
                        clearInterval(interval);
                        if (data.estado === 'analizado') toast.success('¡Análisis completado!');
                    }
                }
            }, 3000);
        }

        return () => clearInterval(interval);
    }, [currentVideoId, videoStatus?.estado]);

    // Autoseleccionar alumno del video cuando este disponible
    useEffect(() => {
        if (videoStatus?.usuario_id) {
            setSelectedStudent(videoStatus.usuario_id);
        }
    }, [videoStatus?.usuario_id]);

    const handleUploadSuccess = (videoId: string) => {
        setCurrentVideoId(videoId);
        setVideoStatus({ estado: 'subido' });
    };

    const handleShare = async () => {
        if (!selectedStudent || !currentVideoId) {
            toast.error('Selecciona un alumno');
            return;
        }

        try {
            const res = await fetch('/api/coach/videos/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: currentVideoId,
                    studentId: selectedStudent
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al compartir');
            
            toast.success('¡Análisis compartido con el alumno!');
            setVideoStatus((prev: any) => ({ ...prev, compartido: true }));
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al compartir');
        }
    };

    const renderAnalysis = (data: any) => (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                    <Zap className="text-indigo-400" />
                    <span className="font-bold text-lg">Puntaje Biomecánico</span>
                </div>
                <span className="text-3xl font-black text-indigo-400">{data.puntaje_general || 0}%</span>
            </div>

            {data.feedback_texto && (
                <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-850">
                    <h4 className="text-zinc-400 text-xs font-black uppercase tracking-wider mb-2">Evaluación del Especialista</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">{data.feedback_texto}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-xl">
                    <h4 className="flex items-center gap-2 text-green-400 font-bold mb-3">
                        <CheckCircle2 size={18} /> Puntos Fuertes
                    </h4>
                    <ul className="space-y-2">
                        {data.puntos_fuertes?.map((item: string, i: number) => (
                            <li key={i} className="text-sm text-zinc-300">• {item}</li>
                        ))}
                    </ul>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
                    <h4 className="flex items-center gap-2 text-red-400 font-bold mb-3">
                        <AlertCircle size={18} /> Correcciones Detectadas
                    </h4>
                    <ul className="space-y-2">
                        {data.tecnica?.map((item: string, i: number) => (
                            <li key={i} className="text-sm text-zinc-300">• {item}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                <h4 className="flex items-center gap-2 text-indigo-400 font-bold mb-3">
                    <ClipboardList size={18} /> Recomendaciones Técnicas
                </h4>
                <ul className="space-y-2">
                    {data.recomendaciones?.map((item: string, i: number) => (
                        <li key={i} className="text-sm text-zinc-300">• {item}</li>
                    ))}
                </ul>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto py-8 px-4">
            {/* Header del Vision Lab */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-400 to-purple-500">
                            Vision Lab
                        </h1>
                        <span className="text-4xl animate-pulse">👁️</span>
                    </div>
                    <p className="text-zinc-400 text-lg">Análisis de técnica de élite potenciado por Inteligencia Artificial y Esqueleto Biomecánico.</p>
                </div>

                <div className="bg-zinc-800/80 backdrop-blur-md border border-zinc-700/50 px-6 py-3 rounded-2xl flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Estado Sistema</p>
                        <p className="text-sm font-bold text-green-400 flex items-center gap-2 justify-end">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                            Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Layout dinámico de dos columnas según si ya hay un video analizado */}
            {videoStatus?.correcciones_ia && videoStatus?.url_video ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Lado izquierdo: Reproductor y carga de nuevos videos */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-white px-1">Visualización Biomecánica Activa</h3>
                            <BiomecanicVideoPlayer
                                url_video={videoStatus.url_video}
                                telemetria={videoStatus.telemetria}
                                correcciones_visuales={videoStatus.correcciones_ia.correcciones_visuales}
                            />
                        </div>

                        {/* Colapsable de carga para subir otro video */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4 mt-8">
                            <h4 className="text-sm font-bold text-zinc-400">¿Subir otro análisis?</h4>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nombre del Ejercicio (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Sentadilla con barra, Deadlift..."
                                    value={exerciseName}
                                    onChange={(e) => setExerciseName(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-sm outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <CoachVideoUpload
                                usuarioId={selectedStudent}
                                exerciseName={exerciseName}
                                onUploadSuccess={handleUploadSuccess}
                            />
                        </div>
                    </div>

                    {/* Lado derecho: Informe de IA estructurado */}
                    <div className="lg:col-span-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <ClipboardList className="text-indigo-400" />
                                    Informe de IA
                                </h2>
                                <div className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                    Tecnología Gemini 3.5
                                </div>
                            </div>

                            {renderAnalysis(videoStatus.correcciones_ia)}

                            <div className="pt-6 border-t border-zinc-800 flex flex-col gap-4">
                                <button
                                    onClick={handleShare}
                                    disabled={videoStatus.compartido || !selectedStudent}
                                    className={`
                                        w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all
                                        ${videoStatus.compartido
                                            ? 'bg-zinc-850 text-zinc-500 cursor-not-allowed border border-zinc-800'
                                            : 'bg-white text-black hover:bg-indigo-400 hover:text-white shadow-xl shadow-white/5 active:scale-95'}
                                    `}
                                >
                                    {videoStatus.compartido ? (
                                        <><CheckCircle2 size={18} /> Informe Compartido</>
                                    ) : (
                                        <><Share2 size={18} /> Publicar para el Alumno</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Vista inicial: Sin video analizado, mostrar configuración y subida principal
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Area de Subida y Configuración */}
                    <div className="space-y-6">
                        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl">
                            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">
                                1. Seleccionar Atleta para el Informe
                            </label>
                            <select
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-xl p-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Buscar alumno...</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre_completo || s.email}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">2. Nombre del Ejercicio (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Sentadilla con barra, Deadlift..."
                                    value={exerciseName}
                                    onChange={(e) => setExerciseName(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-sm outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <CoachVideoUpload
                                usuarioId={selectedStudent}
                                exerciseName={exerciseName}
                                onUploadSuccess={handleUploadSuccess}
                            />
                        </div>

                        <AnimatePresence>
                            {polling && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
                                >
                                    <Loader2 className="animate-spin text-indigo-400" size={32} />
                                    <div>
                                        <p className="text-white font-bold text-lg">Procesando Análisis...</p>
                                        <p className="text-indigo-300/70 text-sm mt-1">Nuestra IA está evaluando los ángulos y la biomecánica del movimiento.</p>
                                    </div>
                                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-indigo-500"
                                            animate={{ x: [-100, 400] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Area de Resultados Vacía o con Error */}
                    <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-8 min-h-[500px] flex flex-col shadow-2xl justify-center items-center">
                        {videoStatus?.estado === 'error' ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-red-400 max-w-xs">
                                <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-500">
                                    <AlertCircle size={32} />
                                </div>
                                <p className="font-extrabold text-white text-lg text-center">Fallo en el Análisis de IA</p>
                                <p className="text-zinc-500 text-xs mt-3 text-center leading-relaxed">
                                    No pudimos completar el escaneo biomecánico. Asegúrate de que el video tenga buena iluminación y que el atleta esté visible por completo en el encuadre.
                                </p>
                                <button
                                    onClick={() => setVideoStatus(null)}
                                    className="mt-8 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors border border-zinc-700 active:scale-95"
                                >
                                    Intentar de Nuevo
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-650">
                                <div className="w-24 h-24 bg-zinc-850/50 rounded-full flex items-center justify-center mb-6">
                                    <Zap size={40} className="text-indigo-500/30" />
                                </div>
                                <p className="font-extrabold text-white text-lg">Esperando escaneo biomecánico...</p>
                                <p className="text-zinc-500 text-sm mt-2 text-center max-w-xs">
                                    Selecciona un alumno y sube un video para iniciar el tracking esquelético e informe de IA.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
