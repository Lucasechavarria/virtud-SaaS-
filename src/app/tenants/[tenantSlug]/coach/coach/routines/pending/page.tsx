'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface PendingRoutine {
    id: string;
    name: string;
    user_id: string;
    student_name: string;
    student_email: string;
    created_at: string;
    exercises_count: number;
    duration_weeks: number;
    difficulty: string;
    nutrition_plan_id?: string;
}

export default function PendingRoutinesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [routines, setRoutines] = useState<PendingRoutine[]>([]);
    const [selectedRoutine, setSelectedRoutine] = useState<PendingRoutine | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadPendingRoutines();
    }, []);

    const loadPendingRoutines = async () => {
        try {
            const response = await fetch('/api/coach/routines/pending');
            const data = await response.json();

            if (data.success) {
                setRoutines(data.routines);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar rutinas');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedRoutine || !actionType) return;

        setProcessing(true);
        try {
            const endpoint = actionType === 'approve' ? 'approve' : 'reject';
            const response = await fetch(`/api/coach/routines/${selectedRoutine.id}/${endpoint}`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                toast.success(actionType === 'approve' ? 'Rutina aprobada' : 'Rutina rechazada');
                setShowModal(false);
                setSelectedRoutine(null);
                setActionType(null);
                loadPendingRoutines();
            } else {
                toast.error(data.error || 'Error al procesar rutina');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al procesar rutina');
        } finally {
            setProcessing(false);
        }
    };

    const openModal = (routine: PendingRoutine, action: 'approve' | 'reject') => {
        setSelectedRoutine(routine);
        setActionType(action);
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">Cargando rutinas pendientes...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/coach/routines')}
                        className="text-gray-400 hover:text-white mb-2 flex items-center gap-2"
                    >
                        ← Volver a rutinas
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2">⏳ Rutinas Pendientes de Aprobación</h1>
                    <p className="text-gray-400">Revisa y aprueba las rutinas generadas por IA</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-6 border border-yellow-500/30">
                        <div className="text-gray-400 text-sm mb-1">Pendientes</div>
                        <div className="text-3xl font-bold text-yellow-400">{routines.length}</div>
                        <div className="text-gray-500 text-xs">Rutinas esperando aprobación</div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="text-gray-400 text-sm mb-1">Generadas Hoy</div>
                        <div className="text-3xl font-bold text-white">
                            {routines.filter(r => {
                                const today = new Date().toDateString();
                                return new Date(r.created_at).toDateString() === today;
                            }).length}
                        </div>
                        <div className="text-gray-500 text-xs">En las últimas 24 horas</div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="text-gray-400 text-sm mb-1">Alumnos Únicos</div>
                        <div className="text-3xl font-bold text-white">
                            {new Set(routines.map(r => r.user_id)).size}
                        </div>
                        <div className="text-gray-500 text-xs">Con rutinas pendientes</div>
                    </div>
                </div>

                {/* Routines List */}
                {routines.length > 0 ? (
                    <div className="space-y-4">
                        {routines.map((routine) => (
                            <div key={routine.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500/50 transition-colors">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{routine.name}</h3>
                                            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold">
                                                ⏳ Pendiente
                                            </span>
                                        </div>
                                        <div className="text-gray-400 text-sm mb-3">
                                            👤 {routine.student_name} ({routine.student_email})
                                        </div>
                                        <div className="flex items-center gap-6 text-sm">
                                            <span className="text-gray-400">
                                                💪 {routine.exercises_count} ejercicios
                                            </span>
                                            <span className="text-gray-400">
                                                📅 {routine.duration_weeks} semanas
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${routine.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                                                routine.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {routine.difficulty === 'beginner' ? '🟢 Principiante' :
                                                    routine.difficulty === 'intermediate' ? '🟡 Intermedio' :
                                                        '🔴 Avanzado'}
                                            </span>
                                            {routine.nutrition_plan_id && (
                                                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold">
                                                    🍎 Incluye Nutrición
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-gray-500">
                                        {new Date(routine.created_at).toLocaleDateString('es-AR', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => router.push(`/coach/students/${routine.user_id}`)}
                                        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                                    >
                                        Ver Alumno
                                    </button>
                                    <button
                                        onClick={() => openModal(routine, 'reject')}
                                        className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors font-semibold"
                                    >
                                        ✕ Rechazar
                                    </button>
                                    <button
                                        onClick={() => openModal(routine, 'approve')}
                                        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                                    >
                                        ✓ Aprobar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-2xl font-bold text-white mb-4">¡Todo al día!</h2>
                        <p className="text-gray-400 mb-6">
                            No hay rutinas pendientes de aprobación en este momento.
                        </p>
                        <button
                            onClick={() => router.push('/coach/students')}
                            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                        >
                            Ver Alumnos
                        </button>
                    </div>
                )}

                {/* Confirmation Modal */}
                {showModal && selectedRoutine && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
                            <h2 className="text-2xl font-bold text-white mb-4">
                                {actionType === 'approve' ? '✓ Aprobar Rutina' : '✕ Rechazar Rutina'}
                            </h2>

                            <div className="mb-6">
                                <div className="text-gray-400 text-sm mb-2">Rutina:</div>
                                <div className="text-white font-semibold mb-4">{selectedRoutine.name}</div>

                                <div className="text-gray-400 text-sm mb-2">Alumno:</div>
                                <div className="text-white">{selectedRoutine.student_name}</div>
                            </div>

                            {actionType === 'approve' ? (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                                    <p className="text-green-300 text-sm">
                                        ✓ La rutina será activada y el alumno podrá comenzar a entrenar.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                                    <p className="text-red-300 text-sm">
                                        ⚠️ La rutina será marcada como rechazada. Podrás generar una nueva más adelante.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedRoutine(null);
                                        setActionType(null);
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAction}
                                    disabled={processing}
                                    className={`flex-1 px-4 py-3 rounded-lg transition-colors font-semibold disabled:opacity-50 ${actionType === 'approve'
                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                        }`}
                                >
                                    {processing ? 'Procesando...' : actionType === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
