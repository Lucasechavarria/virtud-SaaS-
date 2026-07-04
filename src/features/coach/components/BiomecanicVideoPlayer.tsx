'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, AlertTriangle, ChevronRight, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface ArticulacionTelemetria {
    x: number;
    y: number;
    z: number;
    visibility: number;
    angulo?: number;
}

interface FrameTelemetria {
    timestamp_seg: number;
    articulaciones: {
        [nombre: string]: ArticulacionTelemetria;
    };
}

interface CorreccionVisual {
    segundo_inicio: number;
    segundo_fin: number;
    articulacion_foco: string;
    tipo_error: string;
    color_overlay: string;
    mensaje_tooltip: string;
}

interface BiomecanicVideoPlayerProps {
    url_video: string;
    telemetria?: FrameTelemetria[];
    correcciones_visuales?: CorreccionVisual[];
}

export const BiomecanicVideoPlayer: React.FC<BiomecanicVideoPlayerProps> = ({
    url_video,
    telemetria = [],
    correcciones_visuales = []
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [activeCorrections, setActiveCorrections] = useState<CorreccionVisual[]>([]);
    const [isMuted, setIsMuted] = useState(true);
    const [videoLoaded, setVideoLoaded] = useState(false);

    // Redibujar reactivamente cuando cambia la telemetria o las correcciones (útil si el video está en pausa)
    useEffect(() => {
        if (videoLoaded && videoRef.current) {
            drawSkeleton(videoRef.current.currentTime);
        }
    }, [telemetria, correcciones_visuales, videoLoaded]);

    // Ajustar dimensiones del canvas para que coincida con el video físico
    const handleVideoLoad = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setDuration(video.duration);
        setVideoLoaded(true);
        drawSkeleton(0);
    };

    // Dibuja el esqueleto de articulaciones sobre el canvas
    const drawSkeleton = (time: number) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || telemetria.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Limpiar el canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Buscar el frame de telemetría más cercano al tiempo actual
        const closestFrame = telemetria.reduce((prev, curr) => {
            return Math.abs(curr.timestamp_seg - time) < Math.abs(prev.timestamp_seg - time) ? curr : prev;
        });

        // Solo dibujar si la diferencia de tiempo es razonable (menos de 0.4s)
        if (Math.abs(closestFrame.timestamp_seg - time) > 0.4) return;

        const arts = closestFrame.articulaciones;
        const w = canvas.width;
        const h = canvas.height;

        // Identificar si alguna articulación está en falla en el tiempo actual
        const currentCorrections = correcciones_visuales.filter(
            c => time >= c.segundo_inicio && time <= c.segundo_fin
        );

        // Conexiones del esqueleto (huesos)
        const conexiones = [
            // Torso
            ['hombro_izq', 'hombro_der'],
            ['hombro_izq', 'cadera_izq'],
            ['hombro_der', 'cadera_der'],
            ['cadera_izq', 'cadera_der'],
            // Brazos
            ['hombro_izq', 'codo_izq'],
            ['codo_izq', 'muñeca_izq'],
            ['hombro_der', 'codo_der'],
            ['codo_der', 'muñeca_der'],
            // Piernas
            ['cadera_izq', 'rodilla_izq'],
            ['rodilla_izq', 'tobillo_izq'],
            ['cadera_der', 'rodilla_der'],
            ['rodilla_der', 'tobillo_der'],
        ];

        // Función helper para comprobar si una conexión involucra una articulación en falla
        const conexionTieneFalla = (part1: string, part2: string) => {
            return currentCorrections.some(c => 
                c.articulacion_foco === part1 || c.articulacion_foco === part2
            );
        };

        // Dibujar huesos
        conexiones.forEach(([p1, p2]) => {
            const pt1 = arts[p1];
            const pt2 = arts[p2];

            if (pt1 && pt2 && pt1.visibility > 0.4 && pt2.visibility > 0.4) {
                const enFalla = conexionTieneFalla(p1, p2);

                ctx.beginPath();
                ctx.moveTo(pt1.x * w, pt1.y * h);
                ctx.lineTo(pt2.x * w, pt2.y * h);

                // Look premium: neón brillante para fallas y verde translúcido para correcto
                if (enFalla) {
                    ctx.strokeStyle = '#FF3333';
                    ctx.lineWidth = Math.max(4, w * 0.008);
                    ctx.shadowColor = '#FF0000';
                    ctx.shadowBlur = 15;
                } else {
                    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)'; // Cian neón translúcido
                    ctx.lineWidth = Math.max(2, w * 0.004);
                    ctx.shadowBlur = 0;
                }

                ctx.stroke();
            }
        });

        // Dibujar articulaciones (nodos)
        Object.entries(arts).forEach(([nombre, pt]) => {
            if (pt.visibility > 0.4) {
                const enFalla = currentCorrections.some(c => c.articulacion_foco === nombre);

                ctx.beginPath();
                const radius = enFalla ? Math.max(8, w * 0.015) : Math.max(5, w * 0.009);
                ctx.arc(pt.x * w, pt.y * h, radius, 0, 2 * Math.PI);

                if (enFalla) {
                    ctx.fillStyle = '#FF3333';
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#FF0000';
                    ctx.shadowBlur = 20;
                } else {
                    ctx.fillStyle = '#00F0FF';
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = 1.5;
                    ctx.shadowBlur = 0;
                }

                ctx.fill();
                ctx.stroke();

                // Mostrar el ángulo si corresponde en la rodilla o cadera
                if ((nombre.includes('rodilla') || nombre.includes('cadera')) && pt.angulo !== undefined) {
                    ctx.font = `bold ${Math.max(10, w * 0.02)}px sans-serif`;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 3;
                    ctx.strokeText(`${pt.angulo}°`, pt.x * w + 12, pt.y * h - 5);
                    ctx.fillText(`${pt.angulo}°`, pt.x * w + 12, pt.y * h - 5);
                }
            }
        });

        // Limpiar blur de sombras para futuras llamadas
        ctx.shadowBlur = 0;
    };

    // Escuchar cambios de tiempo del video
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;

        const time = video.currentTime;
        setCurrentTime(time);

        // Actualizar esqueleto
        drawSkeleton(time);

        // Identificar correcciones activas
        const current = correcciones_visuales.filter(
            c => time >= c.segundo_inicio && time <= c.segundo_fin
        );
        setActiveCorrections(current);
    };

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            video.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleRestart = () => {
        const video = videoRef.current;
        if (!video) return;

        video.currentTime = 0;
        video.play();
        setIsPlaying(true);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const newPercentage = clickX / width;
        const video = videoRef.current;
        if (video) {
            video.currentTime = newPercentage * video.duration;
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (video) {
            video.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-3xl bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col group/player">
            {/* Reproductor de Video y Canvas */}
            <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
                <video
                    ref={videoRef}
                    src={url_video}
                    onLoadedMetadata={handleVideoLoad}
                    onTimeUpdate={handleTimeUpdate}
                    onClick={togglePlay}
                    className="w-full h-full object-contain"
                    playsInline
                    muted={isMuted}
                    loop
                />

                <canvas
                    ref={canvasRef}
                    onClick={togglePlay}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-auto cursor-pointer"
                />

                {/* Overlay oscuro si el video no ha cargado */}
                {!videoLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 z-20">
                        <Loader2 className="animate-spin text-indigo-400 mb-3" size={36} />
                        <p className="text-zinc-400 text-sm">Cargando reproductor biomecánico...</p>
                    </div>
                )}

                {/* Tooltips flotantes de fallas en pantalla */}
                <div className="absolute bottom-6 left-6 right-6 pointer-events-none z-10 flex flex-col gap-3">
                    <AnimatePresence>
                        {activeCorrections.map((corr, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="bg-red-500/90 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl border border-red-400/30 flex items-start gap-3 shadow-xl max-w-lg pointer-events-auto"
                            >
                                <AlertTriangle className="text-white shrink-0 mt-0.5" size={20} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-sm uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded text-[10px]">
                                            {corr.tipo_error}
                                        </span>
                                        <span className="text-xs text-red-200 font-bold">
                                            {corr.segundo_inicio.toFixed(1)}s - {corr.segundo_fin.toFixed(1)}s
                                        </span>
                                    </div>
                                    <p className="text-xs mt-1.5 leading-relaxed text-red-50 font-medium">
                                        {corr.mensaje_tooltip}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Controles del reproductor */}
            <div className="bg-zinc-900/90 border-t border-zinc-800 p-4 flex flex-col gap-3 z-10">
                {/* Barra de progreso interactiva con marcas de errores */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold">
                        {Math.floor(currentTime / 60)}:{( '0' + Math.floor(currentTime % 60) ).slice(-2)}
                    </span>

                    <div
                        onClick={handleProgressClick}
                        className="relative flex-1 h-3 bg-zinc-800 rounded-full cursor-pointer overflow-hidden group/bar transition-all"
                    >
                        {/* Indicador de progreso actual */}
                        <div
                            className="absolute top-0 left-0 h-full bg-indigo-500 z-10 rounded-full transition-all duration-75"
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />

                        {/* Dibujar marcas de error sobre la barra de progreso */}
                        {duration > 0 &&
                            (correcciones_visuales || []).map((corr, idx) => {
                                const left = (corr.segundo_inicio / duration) * 100;
                                const width = ((corr.segundo_fin - corr.segundo_inicio) / duration) * 100;
                                return (
                                    <div
                                        key={idx}
                                        className="absolute top-0 h-full bg-red-600/40 border-x border-red-500/20 z-0"
                                        style={{ left: `${left}%`, width: `${width}%` }}
                                        title={`${corr.tipo_error}: ${corr.segundo_inicio.toFixed(1)}s - ${corr.segundo_fin.toFixed(1)}s`}
                                    />
                                );
                            })}
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500 font-bold">
                        {Math.floor(duration / 60)}:{( '0' + Math.floor(duration % 60) ).slice(-2)}
                    </span>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full bg-white text-black hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                            title={isPlaying ? 'Pausa' : 'Reproducir'}
                        >
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                        </button>

                        <button
                            onClick={handleRestart}
                            className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex items-center justify-center transition-all active:scale-95"
                            title="Reiniciar"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Silencio/Sonido */}
                        <button
                            onClick={toggleMute}
                            className="text-zinc-500 hover:text-white transition-colors"
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>

                        {/* Indicador de esqueleto */}
                        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                            <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider">
                                Overlay Biomecánico
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
