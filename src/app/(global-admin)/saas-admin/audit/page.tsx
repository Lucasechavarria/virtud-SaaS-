'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert,
    UserCheck,
    History,
    Search,
    ChevronLeft,
    ChevronRight,
    Clock,
    Database,
    Zap,
    ArrowUpRight,
    Eye,
    Download,
    Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';


interface SystemLog {
    id: string;
    usuario_id: string;
    tabla: string;
    operacion: string;
    registro_id: string | null;
    datos_anteriores: unknown;
    datos_nuevos: unknown;
    creado_en: string;
    perfiles?: { nombre_completo: string; email: string };
}

interface ImpersonationLog {
    id: string;
    admin_id: string;
    gimnasio_id: string;
    motivo: string;
    duracion_minutos: number;
    creado_en: string;
    admin_profile?: { nombre_completo: string; email: string };
    gimnasio?: { nombre: string };
}

export default function AuditLogsPage() {
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
    const [impersonationLogs, setImpersonationLogs] = useState<ImpersonationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'system' | 'impersonation'>('system');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;
    const router = useRouter();
    const [selectedLog, setSelectedLog] = useState<SystemLog | ImpersonationLog | null>(null);

    useEffect(() => {
        if (page !== 1) {
            setPage(1);
        } else {
            fetchLogs();
        }
    }, [activeTab, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const offset = (page - 1) * limit;

            let startISO = '';
            let endISO = '';
            if (startDate) {
                startISO = new Date(`${startDate}T00:00:00`).toISOString();
            }
            if (endDate) {
                endISO = new Date(`${endDate}T23:59:59.999`).toISOString();
            }

            const params = new URLSearchParams({
                type: activeTab,
                limit: limit.toString(),
                offset: offset.toString(),
                ...(startISO && { startDate: startISO }),
                ...(endISO && { endDate: endISO })
            });
            const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
            const data = await res.json();
            if (res.ok) {
                if (activeTab === 'system') setSystemLogs(data.systemLogs || []);
                else setImpersonationLogs(data.impersonationLogs || []);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = async () => {
        try {
            toast.loading('Generando reporte completo...', { id: 'csv-export' });

            let startISO = '';
            let endISO = '';
            if (startDate) {
                startISO = new Date(`${startDate}T00:00:00`).toISOString();
            }
            if (endDate) {
                endISO = new Date(`${endDate}T23:59:59.999`).toISOString();
            }

            const queryParams = new URLSearchParams({
                type: activeTab,
                limit: '1000',
                offset: '0',
                ...(startISO && { startDate: startISO }),
                ...(endISO && { endDate: endISO })
            });

            const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al exportar');
            }

            const logsToExport = activeTab === 'system' ? (data.systemLogs || []) : (data.impersonationLogs || []);
            if (logsToExport.length === 0) {
                toast.error('No hay registros para exportar con los filtros seleccionados', { id: 'csv-export' });
                return;
            }

            let finalLogs = logsToExport;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (activeTab === 'system') {
                    finalLogs = logsToExport.filter((log: any) =>
                        log.id.toLowerCase().includes(term) ||
                        log.operacion.toLowerCase().includes(term) ||
                        log.tabla.toLowerCase().includes(term) ||
                        (log.registro_id?.toLowerCase()?.includes(term) ?? false) ||
                        (log.perfiles?.nombre_completo?.toLowerCase()?.includes(term) ?? false) ||
                        (log.perfiles?.email?.toLowerCase()?.includes(term) ?? false)
                    );
                } else {
                    finalLogs = logsToExport.filter((log: any) =>
                        log.id.toLowerCase().includes(term) ||
                        log.motivo?.toLowerCase().includes(term) ||
                        (log.admin_profile?.nombre_completo?.toLowerCase()?.includes(term) ?? false) ||
                        (log.admin_profile?.email?.toLowerCase()?.includes(term) ?? false) ||
                        (log.gimnasio?.nombre?.toLowerCase()?.includes(term) ?? false)
                    );
                }
            }

            if (finalLogs.length === 0) {
                toast.error('Ningún registro coincide con el término de búsqueda', { id: 'csv-export' });
                return;
            }

            const headers = activeTab === 'system'
                ? ['ID', 'Fecha', 'Operacion', 'Tabla', 'ID Registro', 'Usuario', 'Email']
                : ['ID', 'Fecha', 'Administrador', 'Email Administrador', 'Gimnasio Conectado', 'Motivo', 'Duracion (Minutos)'];

            const rows = finalLogs.map((log: any) => {
                if (activeTab === 'system') {
                    return [
                        log.id,
                        log.creado_en,
                        log.operacion,
                        log.tabla,
                        log.registro_id || '',
                        log.perfiles?.nombre_completo || 'Sistema Automático',
                        log.perfiles?.email || 'N/A'
                    ];
                } else {
                    return [
                        log.id,
                        log.creado_en,
                        log.admin_profile?.nombre_completo || 'N/A',
                        log.admin_profile?.email || 'N/A',
                        log.gimnasio?.nombre || 'N/A',
                        log.motivo || '',
                        log.duracion_minutos || 15
                    ];
                }
            });

            const escapeCSV = (val: any) => {
                if (val === null || val === undefined) return '""';
                const stringVal = String(val);
                const escaped = stringVal.replace(/"/g, '""');
                return `"${escaped}"`;
            };

            const csvContent = [
                headers.map(escapeCSV).join(','),
                ...rows.map(row => row.map(escapeCSV).join(','))
            ].join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `reporte_auditoria_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`Reporte exportado con éxito (${finalLogs.length} filas)`, { id: 'csv-export' });
        } catch (err) {
            console.error('Error exporting CSV:', err);
            toast.error('Error al generar el archivo CSV', { id: 'csv-export' });
        }
    };

    const filteredSystemLogs = systemLogs.filter(log => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            log.id.toLowerCase().includes(term) ||
            log.operacion.toLowerCase().includes(term) ||
            log.tabla.toLowerCase().includes(term) ||
            (log.registro_id?.toLowerCase()?.includes(term) ?? false) ||
            (log.perfiles?.nombre_completo?.toLowerCase()?.includes(term) ?? false) ||
            (log.perfiles?.email?.toLowerCase()?.includes(term) ?? false)
        );
    });

    const filteredImpersonationLogs = impersonationLogs.filter(log => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            log.id.toLowerCase().includes(term) ||
            log.motivo.toLowerCase().includes(term) ||
            log.admin_profile?.nombre_completo?.toLowerCase().includes(term) ||
            log.admin_profile?.email?.toLowerCase().includes(term) ||
            log.gimnasio?.nombre?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="space-y-8 p-6 md:p-10 max-w-7xl mx-auto pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-600/20 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <History size={24} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Centro de <span className="text-amber-500">Auditoría</span>
                            </h1>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Control y Trazabilidad de Acciones Críticas</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={exportToCSV}
                        disabled={loading || (activeTab === 'system' ? systemLogs.length === 0 : impersonationLogs.length === 0)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <Download size={14} />
                        Exportar CSV
                    </button>
                    <div className="flex bg-[#1c1c1e] p-1.5 rounded-2xl border border-white/5">
                        {[
                            { id: 'system', label: 'Sistema', icon: <Database size={14} /> },
                            { id: 'impersonation', label: 'Accesos Remotos', icon: <ShieldAlert size={14} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'system' | 'impersonation')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-amber-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por usuario, acción o ID..."
                        className="w-full bg-[#1c1c1e] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-all text-xs font-bold uppercase tracking-widest placeholder:text-gray-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-4">
                    <div className="relative flex items-center bg-[#1c1c1e] border border-white/5 rounded-2xl px-4 py-2">
                        <Calendar size={14} className="text-amber-500 mr-2" />
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-gray-500 uppercase">Desde</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-transparent text-[10px] font-bold text-white uppercase focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="relative flex items-center bg-[#1c1c1e] border border-white/5 rounded-2xl px-4 py-2">
                        <Calendar size={14} className="text-amber-500 mr-2" />
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-gray-500 uppercase">Hasta</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-transparent text-[10px] font-bold text-white uppercase focus:outline-none"
                            />
                        </div>
                    </div>
                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            className="px-4 text-[8px] font-black uppercase text-amber-500 hover:text-white transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Content Table/List */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-64 gap-4"
                    >
                        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] animate-pulse">Sincronizando Historial...</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        {activeTab === 'system' ? (
                            filteredSystemLogs.length === 0 ? <EmptyState /> : (
                                filteredSystemLogs.map((log, i) => (
                                    <SystemLogCard key={log.id} log={log} index={i} onView={setSelectedLog} />
                                ))
                            )
                        ) : (
                            filteredImpersonationLogs.length === 0 ? <EmptyState /> : (
                                filteredImpersonationLogs.map((log, i) => (
                                    <ImpersonationCard key={log.id} log={log} index={i} onView={setSelectedLog} />
                                ))
                            )
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controles de Paginación */}
            <div className="flex justify-between items-center bg-[#1c1c1e] border border-white/5 p-4 rounded-2xl mt-6 no-print">
                <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                    <ChevronLeft size={14} />
                    Anterior
                </button>
                
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Página {page}
                </span>

                <button
                    disabled={loading || (activeTab === 'system' ? systemLogs.length < limit : impersonationLogs.length < limit)}
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                    Siguiente
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Modal de Detalle de Auditoría y Diff Avanzado */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={() => setSelectedLog(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className={`bg-[#1c1c1e] border rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative z-50 ${
                                'tabla' in selectedLog ? 'border-amber-500/20' : 'border-red-500/20'
                            }`}
                        >
                            {/* Cabecera del Modal */}
                            {'tabla' in selectedLog ? (
                                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-amber-500/10 via-orange-600/5 to-transparent flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/30">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                            Detalle de Cambios en Sistema
                                        </h3>
                                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mt-1">
                                            Tabla: {selectedLog.tabla} | Operación: {selectedLog.operacion}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-red-500/10 via-orange-600/5 to-transparent flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/30 animate-pulse">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                            Auditoría de Acceso Remoto
                                        </h3>
                                        <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1">
                                            Entorno de Cliente Conectado
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Contenido del Modal */}
                            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto pr-4">
                                {'tabla' in selectedLog ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Usuario Responsable</p>
                                                <p className="text-white font-bold mt-1">{selectedLog.perfiles?.nombre_completo || 'Sistema Automático'}</p>
                                                <p className="text-gray-500 text-[10px]">{selectedLog.perfiles?.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Fecha y Hora</p>
                                                <p className="text-white font-bold mt-1">
                                                    {new Date(selectedLog.creado_en).toLocaleString('es-AR')}
                                                </p>
                                                <p className="text-gray-500 text-[10px]">Audit Log ID: {selectedLog.id.substring(0, 8)}...</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Comparativa de Payload (Git Diff)</label>
                                            <RenderDiff oldData={selectedLog.datos_anteriores} newData={selectedLog.datos_nuevos} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Gimnasio Conectado</p>
                                                <p className="text-white font-black uppercase text-sm mt-1">{selectedLog.gimnasio?.nombre || 'General'}</p>
                                                <p className="text-gray-500 text-[10px]">ID: {selectedLog.gimnasio_id}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Administrador de Enlace</p>
                                                <p className="text-white font-bold mt-1">{selectedLog.admin_profile?.nombre_completo}</p>
                                                <p className="text-gray-500 text-[10px]">{selectedLog.admin_profile?.email}</p>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-red-600/5 border border-red-500/10 rounded-3xl space-y-4">
                                            <div>
                                                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Justificación Técnica Registrada</p>
                                                <p className="text-sm font-bold text-white italic mt-1 leading-relaxed">
                                                    "{selectedLog.motivo || 'Soporte Técnico / Verificación'}"
                                                </p>
                                            </div>
                                            <div className="h-px bg-white/5" />
                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-500">
                                                <span>Duración Estimada</span>
                                                <span className="text-white">{selectedLog.duracion_minutos || 15} minutos</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-500">
                                                <span>Fecha y Hora</span>
                                                <span className="text-white">{new Date(selectedLog.creado_en).toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-wider leading-tight">
                                                ⚠️ AVISO DE CUMPLIMIENTO: Este evento de soporte técnico remoto fue autorizado y registrado de forma inalterable en el ledger de seguridad global.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Acciones de Modal */}
                            <div className="p-8 border-t border-white/5 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedLog(null)}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5"
                                >
                                    Cerrar Visualizador
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-32 bg-[#1c1c1e] border border-dashed border-white/5 rounded-[3rem]">
            <History size={48} className="text-gray-800 mb-6" />
            <h3 className="text-xl font-black text-gray-700 italic uppercase">No se encontraron registros</h3>
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-2">La red está limpia por ahora</p>
        </div>
    );
}

function SystemLogCard({ log, index, onView }: { log: SystemLog, index: number, onView: (log: SystemLog) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-amber-500/30 transition-all"
        >
            <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border font-black text-[10px] uppercase leading-none text-center p-2 ${log.operacion === 'INSERT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    log.operacion === 'DELETE' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                    <span>{log.operacion}</span>
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-white italic uppercase tracking-tight">{log.tabla}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ID: {log.registro_id ? (log.registro_id.length > 8 ? `${log.registro_id.substring(0, 8)}...` : log.registro_id) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400">
                        <UserCheck size={12} className="text-amber-500" />
                        <span className="font-bold text-gray-300">{log.perfiles?.nombre_completo || 'Sistema Automático'}</span>
                        <span className="opacity-40">{log.perfiles?.email}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                <div className="text-right">
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter mb-1">
                        {new Date(log.creado_en).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 text-gray-600">
                        <Clock size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Registro Guardado</span>
                    </div>
                </div>
                <button
                    onClick={() => onView(log)}
                    className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all group-hover:bg-amber-600 group-hover:text-white"
                >
                    <Eye size={18} />
                </button>
            </div>
        </motion.div>
    );
}

function ImpersonationCard({ log, index, onView }: { log: ImpersonationLog, index: number, onView: (log: ImpersonationLog) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-red-500/30 transition-all relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600/40" />

            <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20">
                    <ShieldAlert size={28} />
                </div>

                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-sm font-black text-white italic uppercase tracking-tight">Acceso Remoto: {log.gimnasio?.nombre}</h4>
                        <span className="px-2 py-0.5 bg-red-600/20 text-red-500 text-[8px] font-black rounded uppercase">Auditado</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Motivo: <span className="text-gray-300 italic">{log.motivo}</span></p>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400">
                        <Zap size={12} className="text-red-500" />
                        <span className="font-bold text-gray-300">ADMIN: {log.admin_profile?.nombre_completo}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-700 mx-1" />
                        <span className="font-mono text-[9px]">{log.duracion_minutos} min sesión</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                <div className="text-right">
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter mb-1">
                        {new Date(log.creado_en).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 text-red-500/60">
                        <ArrowUpRight size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Impersonación Exitosa</span>
                    </div>
                </div>
                <button
                    onClick={() => onView(log)}
                    className="p-3 bg-red-600/10 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all"
                >
                    <Eye size={18} />
                </button>
            </div>
        </motion.div>
    );
}

function RenderDiff({ oldData, newData }: { oldData: any; newData: any }) {
    const parseData = (data: any) => {
        if (!data) return {};
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch {
                return { valor: data };
            }
        }
        return data;
    };

    const oldObj = parseData(oldData);
    const newObj = parseData(newData);

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    if (allKeys.length === 0) {
        return <p className="text-[10px] text-gray-500 uppercase font-black italic">Sin detalles de datos disponibles</p>;
    }

    return (
        <div className="space-y-3 font-mono text-xs max-h-[40vh] overflow-y-auto bg-[#0a0a0a] p-6 rounded-2xl border border-white/5">
            {allKeys.map((key) => {
                const oldVal = oldObj[key];
                const newVal = newObj[key];
                const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                if (!hasChanged) {
                    return (
                        <div key={key} className="text-gray-500 py-0.5 border-b border-white/[0.02] flex items-center justify-between">
                            <span className="text-gray-600">{key}:</span>
                            <span className="text-gray-400 break-all text-right max-w-xs">{typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}</span>
                        </div>
                    );
                }

                return (
                    <div key={key} className="space-y-1 py-2 border-b border-white/5">
                        <div className="text-gray-400 font-bold">{key}:</div>
                        {oldVal !== undefined && (
                            <div className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 flex items-start gap-2">
                                <span className="text-red-500 font-black shrink-0">-</span>
                                <span className="break-all">{typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)}</span>
                            </div>
                        )}
                        {newVal !== undefined && (
                            <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-start gap-2">
                                <span className="text-emerald-500 font-black shrink-0">+</span>
                                <span className="break-all">{typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
