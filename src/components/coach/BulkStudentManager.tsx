'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square, Send, Download, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Student {
    id: string;
    nombre_completo: string;
    email: string;
}

export function BulkStudentManager({ students }: { students: Student[] }) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        if (selectedIds.size === students.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(students.map(s => s.id)));
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedIds.size === 0) {
            toast.error('Selecciona al menos un alumno');
            return;
        }

        setLoading(true);
        try {
            let body: any = {
                action,
                studentIds: Array.from(selectedIds),
            };

            // Si es notificación, pedir título y mensaje
            if (action === 'send_notification') {
                const title = prompt('Título de la notificación:');
                const message = prompt('Mensaje:');

                if (!title || !message) {
                    toast.error('Título y mensaje son requeridos');
                    setLoading(false);
                    return;
                }

                body.title = title;
                body.message = message;
            }

            const res = await fetch('/api/coach/students/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error('Error en acción masiva');

            const result = await res.json();
            toast.success(result.message || `Acción completada para ${selectedIds.size} alumnos`);
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al realizar acción');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // Abrir en nueva ventana para descargar CSV
        window.open('/api/coach/export?type=students&format=csv', '_blank');
        toast.success('Descargando datos...');
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30"
                    >
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="text-sm font-bold text-white">
                                {selectedIds.size} alumno(s) seleccionado(s)
                            </span>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleBulkAction('send_notification')}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Notificar
                                </button>

                                <button
                                    onClick={handleExport}
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={16} />
                                    Exportar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lista de alumnos */}
            <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl">
                    <button
                        onClick={selectAll}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        {selectedIds.size === students.length ? (
                            <CheckSquare size={20} />
                        ) : (
                            <Square size={20} />
                        )}
                    </button>
                    <span className="text-xs font-bold text-zinc-500 uppercase">
                        Seleccionar Todos ({students.length})
                    </span>
                </div>

                {students.map((student) => (
                    <motion.div
                        key={student.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${selectedIds.has(student.id)
                                ? 'bg-purple-500/10 border-purple-500/50'
                                : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                            }`}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => toggleSelect(student.id)}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(student.id);
                            }}
                            className="text-purple-400"
                        >
                            {selectedIds.has(student.id) ? (
                                <CheckSquare size={20} />
                            ) : (
                                <Square size={20} />
                            )}
                        </button>

                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white">{student.nombre_completo}</h4>
                            <p className="text-xs text-zinc-500">{student.email}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
