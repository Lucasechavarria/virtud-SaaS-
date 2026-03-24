'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, _AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, _AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CoachVideoUploadProps {
    usuarioId: string;
    ejercicioId?: string;
    exerciseName?: string;
    onUploadSuccess?: (videoId: string) => void;
}

export const CoachVideoUpload: React.FC<CoachVideoUploadProps> = ({
    usuarioId,
    ejercicioId,
    exerciseName,
    onUploadSuccess
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const selectedFile = acceptedFiles[0];
            if (selectedFile.size > 50 * 1024 * 1024) {
                toast.error('El video es demasiado grande. Máximo 50MB.');
                return;
            }
            setFile(selectedFile);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': [] },
        multiple: false,
        disabled: uploading
    });

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('video', file);
        formData.append('usuarioId', usuarioId);
        if (ejercicioId) formData.append('ejercicioId', ejercicioId);
        if (exerciseName) formData.append('exerciseName', exerciseName);

        try {
            const response = await fetch('/api/coach/videos/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Error al subir video');

            toast.success('Video subido correctamente. La IA comenzará el análisis.');
            setFile(null);
            if (onUploadSuccess) onUploadSuccess(result.videoId);

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Error en la subida');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Subir Video de Técnica</h3>

            {!file ? (
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
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl p-4"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 truncate">
                            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                                <CheckCircle size={20} />
                            </div>
                            <div className="truncate">
                                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                <p className="text-xs text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                        </div>
                        {!uploading && (
                            <button
                                onClick={() => setFile(null)}
                                className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-md transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className={`
                w-full py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all
                ${uploading
                                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95'}
              `}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Subiendo...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={20} />
                                    <span>Iniciar Análisis IA</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
