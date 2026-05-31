'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const MOCK_CLASSES = [
    {
        id: 1, day: 'Lunes', time: '08:00', name: 'CrossFit Beginners', attendees: 12, capacity: 15, status: 'upcoming', students: [
            { id: '1', name: 'Juan Pérez', present: null },
            { id: '2', name: 'María García', present: null },
            { id: '3', name: 'Carlos López', present: null },
        ]
    },
    {
        id: 2, day: 'Lunes', time: '18:00', name: 'HIIT Advanced', attendees: 18, capacity: 20, status: 'upcoming', students: [
            { id: '4', name: 'Ana Martínez', present: null },
            { id: '5', name: 'Pedro Sánchez', present: null },
        ]
    },
    {
        id: 3, day: 'Martes', time: '07:00', name: 'Yoga Flow', attendees: 10, capacity: 12, status: 'completed', students: [
            { id: '6', name: 'Laura Torres', present: true },
            { id: '7', name: 'Diego Ruiz', present: true },
            { id: '8', name: 'Sofia Morales', present: false },
        ]
    },
    { id: 4, day: 'Martes', time: '19:00', name: 'Strength Training', attendees: 15, capacity: 15, status: 'full', students: [] },
    { id: 5, day: 'Miércoles', time: '09:00', name: 'Pilates Core', attendees: 8, capacity: 10, status: 'upcoming', students: [] },
    { id: 6, day: 'Miércoles', time: '17:00', name: 'CrossFit WOD', attendees: 22, capacity: 25, status: 'upcoming', students: [] },
    { id: 7, day: 'Jueves', time: '08:00', name: 'Functional Training', attendees: 14, capacity: 16, status: 'upcoming', students: [] },
    { id: 8, day: 'Viernes', time: '18:00', name: 'Friday Burn', attendees: 20, capacity: 20, status: 'full', students: [] },
];

export default function CoachClassesPage() {
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [modalType, setModalType] = useState<'list' | 'attendance' | 'history' | null>(null);
    const [attendance, setAttendance] = useState<Record<string, boolean>>({});

    const filteredClasses = filter === 'all'
        ? MOCK_CLASSES
        : MOCK_CLASSES.filter(c => c.status === filter);

    const openModal = (classData: any, type: 'list' | 'attendance' | 'history') => {
        setSelectedClass(classData);
        setModalType(type);
        // Initialize attendance state
        if (type === 'attendance') {
            const initial: Record<string, boolean> = {};
            classData.students.forEach((s: any) => {
                initial[s.id] = s.present ?? true;
            });
            setAttendance(initial);
        }
    };

    const closeModal = () => {
        setSelectedClass(null);
        setModalType(null);
        setAttendance({});
    };

    const handleSaveAttendance = () => {
        // Aquí se haría el submit a la API

        toast.success('Asistencia guardada exitosamente');
        closeModal();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-400 mb-2">
                        📅 Mis Clases
                    </h1>
                    <p className="text-gray-400">Calendario semanal y asistencias.</p>
                </div>

                <div className="flex gap-2">
                    {(['all', 'upcoming', 'completed'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === f
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {f === 'all' ? 'Todas' : f === 'upcoming' ? 'Próximas' : 'Completadas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Clases Hoy', value: '3', icon: '📅', color: 'text-blue-400' },
                    { label: 'Asistencia Promedio', value: '87%', icon: '✅', color: 'text-green-400' },
                    { label: 'Clases Esta Semana', value: '18', icon: '📊', color: 'text-purple-400' },
                    { label: 'Total Alumnos', value: '124', icon: '👥', color: 'text-orange-400' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{stat.icon}</span>
                            <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                        </div>
                        <p className="text-sm text-gray-400">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Calendar/List View */}
            <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="space-y-4">
                    {filteredClasses.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <span className="text-4xl block mb-2">📭</span>
                            No hay clases en esta categoría
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredClasses.map((cls, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group gap-3"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="text-center min-w-[80px]">
                                            <p className="text-xs text-gray-400 uppercase font-bold">{cls.day}</p>
                                            <p className="text-2xl font-black text-white">{cls.time}</p>
                                        </div>
                                        <div className="border-l border-white/10 pl-4 flex-1">
                                            <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">
                                                {cls.name}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-sm text-gray-400">
                                                    👥 {cls.attendees}/{cls.capacity} alumnos
                                                </span>
                                                {cls.status === 'full' && (
                                                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                                                        LLENO
                                                    </span>
                                                )}
                                                {cls.status === 'completed' && (
                                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">
                                                        ✓ COMPLETADA
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => openModal(cls, 'list')}
                                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white rounded-lg transition-all font-medium text-sm"
                                        >
                                            Ver Lista
                                        </button>
                                        {cls.status === 'upcoming' && (
                                            <button
                                                onClick={() => openModal(cls, 'attendance')}
                                                className="px-4 py-2 bg-green-500/20 hover:bg-green-500 text-green-300 hover:text-white rounded-lg transition-all font-medium text-sm"
                                            >
                                                ✓ Pasar Lista
                                            </button>
                                        )}
                                        {cls.status === 'completed' && (
                                            <button
                                                onClick={() => openModal(cls, 'history')}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-all font-medium text-sm"
                                            >
                                                Ver Asistencia
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {modalType && selectedClass && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1c1c1e] rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                        >
                            {modalType === 'list' && (
                                <StudentListModal classData={selectedClass} onClose={closeModal} />
                            )}
                            {modalType === 'attendance' && (
                                <AttendanceModal
                                    classData={selectedClass}
                                    attendance={attendance}
                                    setAttendance={setAttendance}
                                    onSave={handleSaveAttendance}
                                    onClose={closeModal}
                                />
                            )}
                            {modalType === 'history' && (
                                <AttendanceHistoryModal classData={selectedClass} onClose={closeModal} />
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Student List Modal
function StudentListModal({ classData, onClose }: any) {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">👥 Lista de Alumnos</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                    <h3 className="font-bold text-blue-400">{classData.name}</h3>
                    <p className="text-sm text-gray-400">{classData.day} - {classData.time}</p>
                </div>
                {classData.students.length > 0 ? (
                    classData.students.map((student: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                    {student.name.charAt(0)}
                                </div>
                                <span className="text-white font-medium">{student.name}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">No hay alumnos inscritos aún</p>
                )}
            </div>
        </div>
    );
}

// Attendance Modal
function AttendanceModal({ classData, attendance, setAttendance, onSave, onClose }: any) {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">✓ Pasar Lista</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                    <h3 className="font-bold text-green-400">{classData.name}</h3>
                    <p className="text-sm text-gray-400">{classData.day} - {classData.time}</p>
                </div>
                {classData.students.length > 0 ? (
                    <>
                        {classData.students.map((student: any) => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                        {student.name.charAt(0)}
                                    </div>
                                    <span className="text-white font-medium">{student.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAttendance({ ...attendance, [student.id]: true })}
                                        className={`px-4 py-2 rounded-lg font-bold transition-all ${attendance[student.id] === true
                                            ? 'bg-green-500 text-white'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Presente
                                    </button>
                                    <button
                                        onClick={() => setAttendance({ ...attendance, [student.id]: false })}
                                        className={`px-4 py-2 rounded-lg font-bold transition-all ${attendance[student.id] === false
                                            ? 'bg-red-500 text-white'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Ausente
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={onSave}
                            className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            Guardar Asistencia
                        </button>
                    </>
                ) : (
                    <p className="text-center text-gray-500 py-8">No hay alumnos para pasar lista</p>
                )}
            </div>
        </div>
    );
}

// Attendance History Modal
function AttendanceHistoryModal({ classData, onClose }: any) {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">📊 Historial de Asistencia</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="space-y-3">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
                    <h3 className="font-bold text-purple-400">{classData.name}</h3>
                    <p className="text-sm text-gray-400">{classData.day} - {classData.time}</p>
                </div>
                {classData.students.length > 0 ? (
                    classData.students.map((student: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                    {student.name.charAt(0)}
                                </div>
                                <span className="text-white font-medium">{student.name}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-lg font-bold ${student.present
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                {student.present ? '✓ Presente' : '✗ Ausente'}
                            </span>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">No hay historial de asistencia</p>
                )}
            </div>
        </div>
    );
}
