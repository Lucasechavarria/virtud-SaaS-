'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface StudentReport {
    id: string;
    studentId: string;
    studentName: string;
    type: 'injury' | 'pain' | 'question' | 'concern';
    title: string;
    description: string;
    status: 'pending' | 'resolved';
    createdAt: string;
    resolvedAt?: string;
}

const TYPE_ICONS = {
    injury: '🏥',
    pain: '🔴',
    question: '❓',
    concern: '⚠️',
};

const TYPE_LABELS = {
    injury: 'Lesión',
    pain: 'Dolor',
    question: 'Consulta',
    concern: 'Preocupación',
};

export function ReportsPanel() {
    const [reports, setReports] = useState<StudentReport[]>([]);
    const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const pendingReports = reports.filter(r => r.status === 'pending');

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/coach/reports');
            const data = await res.json();
            if (data.success) {
                setReports(data.reports || []);
            } else {
                toast.error('Error al cargar reportes');
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Error al cargar reportes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleResolve = async (reportId: string) => {
        const toastId = toast.loading('Actualizando reporte...');
        try {
            const res = await fetch('/api/coach/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportId, status: 'resolved' })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success('Reporte marcado como resuelto', { id: toastId });
            setSelectedReport(null);
            fetchReports();
        } catch (error: any) {
            toast.error(error.message || 'Error al resolver reporte', { id: toastId });
        }
    };

    return (
        <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    🔔 Reportes de Alumnos
                    {pendingReports.length > 0 && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                            {pendingReports.length}
                        </span>
                    )}
                </h3>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all text-sm"
                >
                    + Crear Reporte
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500 animate-pulse">
                    Cargando reportes...
                </div>
            ) : pendingReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl block mb-2">✅</span>
                    No hay reportes pendientes
                </div>
            ) : (
                <div className="space-y-3">
                    {pendingReports.map((report) => (
                        <div
                            key={report.id}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold shrink-0">
                                    {report.studentName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{TYPE_ICONS[report.type]}</span>
                                        <p className="font-bold text-white truncate">{report.studentName}</p>
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">{report.title}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedReport(report)}
                                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white rounded-lg transition-all font-medium text-sm shrink-0"
                            >
                                Ver
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* View Report Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1c1c1e] rounded-2xl border border-white/10 max-w-md w-full p-6"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-black text-white">Detalle del Reporte</h2>
                                <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white/5 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 mb-1">Alumno</p>
                                    <p className="text-white font-bold">{selectedReport.studentName}</p>
                                </div>

                                <div className="bg-white/5 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 mb-1">Tipo</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{TYPE_ICONS[selectedReport.type]}</span>
                                        <span className="text-white font-bold">{TYPE_LABELS[selectedReport.type]}</span>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 mb-1">Asunto</p>
                                    <p className="text-white font-bold">{selectedReport.title}</p>
                                </div>

                                <div className="bg-white/5 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 mb-1">Descripción</p>
                                    <p className="text-white">{selectedReport.description}</p>
                                </div>

                                <button
                                    onClick={() => handleResolve(selectedReport.id)}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    ✓ Marcar como Resuelto
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Report Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateReportModal
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            setShowCreateModal(false);
                            fetchReports();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

interface StudentOption {
    id: string;
    full_name: string;
}

function CreateReportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [students, setStudents] = useState<StudentOption[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [formData, setFormData] = useState({
        studentId: '',
        type: 'question' as 'injury' | 'pain' | 'question' | 'concern',
        title: '',
        description: '',
    });

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await fetch('/api/coach/students');
                const data = await res.json();
                if (data.success && data.students) {
                    setStudents(data.students);
                    if (data.students.length > 0) {
                        setFormData(prev => ({ ...prev, studentId: data.students[0].id }));
                    }
                }
            } catch (err) {
                console.error('Error fetching students for reports modal:', err);
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchStudents();
    }, []);

    const handleSubmit = async () => {
        if (!formData.studentId || !formData.title || !formData.description) {
            toast.error('Completa todos los campos');
            return;
        }

        const toastId = toast.loading('Creando reporte...');
        try {
            const res = await fetch('/api/coach/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success('Reporte creado exitosamente', { id: toastId });
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Error al crear reporte', { id: toastId });
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1c1c1e] rounded-2xl border border-white/10 max-w-md w-full p-6"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-white">Crear Reporte</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-300 mb-2 font-bold text-sm">Alumno</label>
                        {loadingStudents ? (
                            <div className="text-gray-500 text-xs">Cargando lista de alumnos...</div>
                        ) : (
                            <select
                                value={formData.studentId}
                                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:outline-none"
                            >
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.full_name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-gray-300 mb-2 font-bold text-sm">Tipo</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'injury' | 'pain' | 'question' | 'concern' })}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white focus:outline-none"
                        >
                            <option value="question">Consulta</option>
                            <option value="pain">Dolor</option>
                            <option value="injury">Lesión</option>
                            <option value="concern">Preocupación</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-300 mb-2 font-bold text-sm">Asunto</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none"
                            placeholder="Título breve"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-300 mb-2 font-bold text-sm">Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white h-32 resize-none focus:outline-none"
                            placeholder="Describe el problema o consulta..."
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loadingStudents || !formData.studentId}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                    >
                        Crear Reporte
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
