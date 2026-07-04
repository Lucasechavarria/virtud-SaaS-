'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    Video,
    X,
    CheckCircle2,
    AlertCircle,
    Play,
    Trash2,
    Plus,
    Loader2,
    Cpu
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MediaPipeLoader, MediaPipePoseResults } from '@/lib/utils/MediaPipeLoader';

interface CoachVideoUploadProps {
    usuarioId: string;
    ejercicioId?: string;
    exerciseName?: string;
    onUploadSuccess?: (videoId: string) => void;
}

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

export const CoachVideoUpload: React.FC<CoachVideoUploadProps> = ({
    usuarioId,
    ejercicioId,
    exerciseName,
    onUploadSuccess
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading_pose' | 'extracting' | 'uploading'>('idle');
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const selectedFile = acceptedFiles[0];
            if (selectedFile.size > 50 * 1024 * 1024) {
                toast.error('El video es demasiado grande. Máximo 50MB.');
                return;
            }

            // Validar duración del video (máximo 15 segundos)
            const video = document.createElement('video');
            video.src = URL.createObjectURL(selectedFile);
            video.onloadedmetadata = () => {
                const duration = video.duration;
                URL.revokeObjectURL(video.src);
                if (duration > 15) {
                    toast.error('El video supera el límite de 15 segundos. Corta el video antes de subirlo.');
                } else {
                    setFile(selectedFile);
                }
            };
            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                toast.error('Error al leer los metadatos del video.');
            };
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': [] },
        multiple: false,
        disabled: status !== 'idle'
    });

    // Función auxiliar para calcular ángulo entre 3 puntos
    const calcularAngulo = (
        p1: { x: number; y: number },
        p2: { x: number; y: number },
        p3: { x: number; y: number }
    ) => {
        const d12 = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        const d23 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));
        const d13 = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));

        let cos = (Math.pow(d12, 2) + Math.pow(d23, 2) - Math.pow(d13, 2)) / (2 * d12 * d23);
        cos = Math.max(-1, Math.min(1, cos)); // clamping

        return Math.round(Math.acos(cos) * (180 / Math.PI));
    };

    // Extrae la telemetría biomecánica frame por frame del video
    const extractVideoTelemetry = (videoFile: File): Promise<FrameTelemetria[]> => {
        return new Promise(async (resolve, reject) => {
            try {
                setStatus('loading_pose');
                setStatusText('Iniciando motor biomecánico (Cargando MediaPipe Pose)...');
                setProgress(0);

                // Cargar e inicializar MediaPipe Pose
                let currentFrameLandmarks: any = null;
                const pose = await MediaPipeLoader.createPoseInstance((results: MediaPipePoseResults) => {
                    currentFrameLandmarks = results.poseLandmarks;
                });

                setStatusText('Preparando decodificador de video local...');
                setStatus('extracting');

                // Crear elementos DOM temporales para procesar el video
                const video = document.createElement('video');
                video.src = URL.createObjectURL(videoFile);
                video.muted = true;
                video.playsInline = true;

                // Canvas en baja resolución (480x360) para procesar velozmente
                const canvas = document.createElement('canvas');
                canvas.width = 480;
                canvas.height = 360;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    throw new Error('No se pudo inicializar el contexto 2D del Canvas.');
                }

                video.onloadedmetadata = async () => {
                    try {
                        const duration = video.duration;
                        const frameInterval = 0.2; // Extraer un frame cada 200ms (5 FPS)
                        const telemetry: FrameTelemetria[] = [];
                        let currentTime = 0;

                        const processFrame = async (): Promise<void> => {
                            return new Promise((resolveFrame) => {
                                video.currentTime = currentTime;

                                let resolved = false;
                                const timeoutId = setTimeout(() => {
                                    if (!resolved) {
                                        resolved = true;
                                        video.removeEventListener('seeked', onSeeked);
                                        console.warn(`[Biomecánico] Timeout de frame alcanzado en timestamp: ${currentTime}s`);
                                        resolveFrame();
                                    }
                                }, 1500); // Timeout de 1.5s de resguardo

                                const onSeeked = async () => {
                                    if (resolved) return;
                                    resolved = true;
                                    clearTimeout(timeoutId);
                                    video.removeEventListener('seeked', onSeeked);

                                    // Dibujar frame actual en el canvas
                                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                                    // Reiniciar landmark del frame anterior
                                    currentFrameLandmarks = null;

                                    // Procesar frame con MediaPipe
                                    try {
                                        await pose.send({ image: canvas });
                                    } catch (err) {
                                        console.error('Error enviando frame a MediaPipe:', err);
                                    }

                                    // Si detectó articulaciones, registrar telemetría estructurada
                                    if (currentFrameLandmarks) {
                                        const l = currentFrameLandmarks;
                                        
                                        // Mapear landmarks clave
                                        const articulaciones: { [key: string]: ArticulacionTelemetria } = {
                                            hombro_izq: { x: l[11].x, y: l[11].y, z: l[11].z, visibility: l[11].visibility },
                                            hombro_der: { x: l[12].x, y: l[12].y, z: l[12].z, visibility: l[12].visibility },
                                            codo_izq: { x: l[13].x, y: l[13].y, z: l[13].z, visibility: l[13].visibility },
                                            codo_der: { x: l[14].x, y: l[14].y, z: l[14].z, visibility: l[14].visibility },
                                            muñeca_izq: { x: l[15].x, y: l[15].y, z: l[15].z, visibility: l[15].visibility },
                                            muñeca_der: { x: l[16].x, y: l[16].y, z: l[16].z, visibility: l[16].visibility },
                                            cadera_izq: { x: l[23].x, y: l[23].y, z: l[23].z, visibility: l[23].visibility },
                                            cadera_der: { x: l[24].x, y: l[24].y, z: l[24].z, visibility: l[24].visibility },
                                            rodilla_izq: { x: l[25].x, y: l[25].y, z: l[25].z, visibility: l[25].visibility },
                                            rodilla_der: { x: l[26].x, y: l[26].y, z: l[26].z, visibility: l[26].visibility },
                                            tobillo_izq: { x: l[27].x, y: l[27].y, z: l[27].z, visibility: l[27].visibility },
                                            tobillo_der: { x: l[28].x, y: l[28].y, z: l[28].z, visibility: l[28].visibility },
                                        };

                                        // Calcular ángulos críticos
                                        articulaciones.rodilla_izq.angulo = calcularAngulo(articulaciones.cadera_izq, articulaciones.rodilla_izq, articulaciones.tobillo_izq);
                                        articulaciones.rodilla_der.angulo = calcularAngulo(articulaciones.cadera_der, articulaciones.rodilla_der, articulaciones.tobillo_der);
                                        articulaciones.cadera_izq.angulo = calcularAngulo(articulaciones.hombro_izq, articulaciones.cadera_izq, articulaciones.rodilla_izq);
                                        articulaciones.cadera_der.angulo = calcularAngulo(articulaciones.hombro_der, articulaciones.cadera_der, articulaciones.rodilla_der);

                                        telemetry.push({
                                            timestamp_seg: Math.round(currentTime * 100) / 100,
                                            articulaciones
                                        });
                                    }

                                    // Actualizar progreso
                                    const pct = Math.min(100, Math.round((currentTime / duration) * 100));
                                    setProgress(pct);
                                    setStatusText(`Mapeando esqueleto biomecánico: ${pct}% (${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s)`);

                                    resolveFrame();
                                };

                                video.addEventListener('seeked', onSeeked);
                            });
                        };

                        // Recorrer el video frame a frame de forma secuencial
                        while (currentTime < duration) {
                            await processFrame();
                            currentTime += frameInterval;
                        }

                        // Limpieza y cierre
                        try {
                            pose.close();
                        } catch (e) {
                            console.error('Error cerrando pose instance:', e);
                        }
                        URL.revokeObjectURL(video.src);
                        resolve(telemetry);
                    } catch (err) {
                        reject(err);
                    }
                };

                video.onerror = (e) => {
                    reject(new Error('Error al decodificar el video: ' + e));
                };

            } catch (err) {
                reject(err);
            }
        });
    };

    const handleUpload = async () => {
        if (!file) return;

        let telemetriaData: FrameTelemetria[] = [];
        try {
            // Fase 1: Extracción local con MediaPipe
            telemetriaData = await extractVideoTelemetry(file);
        } catch (error: any) {
            console.warn('MediaPipe extraction failed, falling back to server vision analysis:', error);
            toast.error('Dispositivo incompatible con tracking de esqueleto. Se usará análisis visual en el servidor.');
        }

        try {
            // Fase 2: Subida al backend
            setStatus('uploading');
            setStatusText('Enviando video y telemetría al servidor...');
            setProgress(0);

            const formData = new FormData();
            formData.append('video', file);
            formData.append('usuarioId', usuarioId);
            formData.append('telemetria', JSON.stringify(telemetriaData));
            if (ejercicioId) formData.append('ejercicioId', ejercicioId);
            if (exerciseName) formData.append('exerciseName', exerciseName);

            const response = await fetch('/api/coach/videos/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Error al subir video');

            toast.success('Video subido correctamente.');
            setFile(null);
            if (onUploadSuccess) onUploadSuccess(result.videoId);

        } catch (error: any) {
            console.error('Upload process error:', error);
            toast.error(error.message || 'Error en el procesamiento del video');
        } finally {
            setStatus('idle');
            setProgress(0);
            setStatusText('');
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Subir Video de Técnica</h3>

            {status === 'idle' && !file && (
                <div
                    {...getRootProps()}
                    className={`
                        relative group cursor-pointer border-2 border-dashed rounded-xl p-10 
                        transition-all duration-300 flex flex-col items-center justify-center
                        ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50'}
                    `}
                >
                    <input {...getInputProps()} />
                    <motion.div
                        animate={{ y: isDragActive ? -10 : 0 }}
                        className={`p-4 rounded-full ${isDragActive ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400 group-hover:text-zinc-200'} transition-colors`}
                    >
                        <Upload size={32} />
                    </motion.div>
                    <p className="mt-4 text-zinc-400 text-center font-medium">
                        {isDragActive ? 'Suelta el video aquí' : 'Arrastra un video o haz clic para seleccionar'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">MP4, MOV o WebM (Max. 50MB)</p>
                </div>
            )}

            {file && status === 'idle' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl p-4"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 truncate">
                            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                                <CheckCircle2 size={20} />
                            </div>
                            <div className="truncate">
                                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                <p className="text-xs text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setFile(null)}
                            className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleUpload}
                            className="w-full py-3 rounded-lg font-bold flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
                        >
                            <Upload size={20} />
                            <span>Extraer Pose e Iniciar Análisis IA</span>
                        </button>
                    </div>
                </motion.div>
            )}

            {status !== 'idle' && (
                <div className="bg-zinc-800/80 border border-zinc-700 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                    {status === 'loading_pose' ? (
                        <Cpu className="animate-pulse text-indigo-400" size={36} />
                    ) : (
                        <Loader2 className="animate-spin text-indigo-400" size={36} />
                    )}
                    <div>
                        <p className="text-white font-bold text-lg">
                            {status === 'loading_pose' && 'Iniciando IA Biomecánica'}
                            {status === 'extracting' && 'Extrayendo Articulaciones'}
                            {status === 'uploading' && 'Subiendo Datos'}
                        </p>
                        <p className="text-zinc-400 text-xs mt-1.5 px-4 leading-relaxed">{statusText}</p>
                    </div>
                    <div className="w-full bg-zinc-700 h-2 rounded-full overflow-hidden mt-2 relative">
                        {status === 'loading_pose' ? (
                            <motion.div
                                className="h-full bg-indigo-500"
                                animate={{ x: [-100, 400] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                        ) : (
                            <motion.div
                                className="h-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
