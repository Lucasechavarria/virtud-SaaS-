'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    History,
    Search,
    ChevronLeft,
    ChevronRight,
    Clock,
    Database,
    Eye,
    Download,
    Calendar,
    UserCheck,
    Filter
} from 'lucide-react';

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

export default function AdminAuditLogsPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params?.tenantSlug as string | undefined;

    const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [operationFilter, setOperationFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
    const limit = 20;

    useEffect(() => {
        if (page !== 1) {
            setPage(1);
        } else {
            fetchLogs();
        }
    }, [startDate, endDate, operationFilter]);

    useEffect(() => {
        fetchLogs();
    }, [page]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedLog(null);
            }
        };

        if (selectedLog) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedLog]);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
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

            const queryParams = new URLSearchParams({
                type: 'system',
                limit: limit.toString(),
                offset: offset.toString(),
                ...(tenantSlug && { gymId: tenantSlug }),
                ...(startISO && { startDate: startISO }),
                ...(endISO && { endDate: endISO }),
                ...(operationFilter !== 'all' && { operation: operationFilter })
            });
            const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`);

            const data = await res.json();
            if (res.ok) {
                setSystemLogs(data.systemLogs || []);
            } else {
                setError(data.error || 'Error al cargar los logs de auditoría.');
            }
        } catch (err) {
            console.error('Error fetching admin logs:', err);
            setError('Error de red. Verifique su conexión.');
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
                type: 'system',
                limit: '1000',
                offset: '0',
                ...(tenantSlug && { gymId: tenantSlug }),
                ...(startISO && { startDate: startISO }),
                ...(endISO && { endDate: endISO }),
                ...(operationFilter !== 'all' && { operation: operationFilter })
            });

            const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al exportar');
            }

            const logsToExport = data.systemLogs || [];
            if (logsToExport.length === 0) {
                toast.error('No hay registros para exportar con los filtros seleccionados', { id: 'csv-export' });
                return;
            }

            let finalLogs = logsToExport;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                finalLogs = logsToExport.filter((log: any) =>
                    log.id.toLowerCase().includes(term) ||
                    log.operacion.toLowerCase().includes(term) ||
                    log.tabla.toLowerCase().includes(term) ||
                    (log.registro_id?.toLowerCase()?.includes(term) ?? false) ||
                    (log.perfiles?.nombre_completo?.toLowerCase()?.includes(term) ?? false) ||
                    (log.perfiles?.email?.toLowerCase()?.includes(term) ?? false)
                );
            }

            if (finalLogs.length === 0) {
                toast.error('Ningún registro coincide con el término de búsqueda', { id: 'csv-export' });
                return;
            }

            const headers = ['ID', 'Fecha', 'Operacion', 'Tabla', 'ID Registro', 'Usuario', 'Email'];
            const rows = finalLogs.map((log: any) => [
                log.id,
                log.creado_en,
                log.operacion,
                log.tabla,
                log.registro_id || '',
                log.perfiles?.nombre_completo || 'Sistema Automatico',
                log.perfiles?.email || 'N/A'
            ]);

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
            link.setAttribute("download", `reporte_auditoria_${tenantSlug || 'admin'}_${new Date().toISOString().split('T')[0]}.csv`);
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
        // Filtro por operación
        if (operationFilter !== 'all' && log.operacion !== operationFilter) {
            return false;
        }

        // Filtro por búsqueda
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
                        Volver al Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/20">
                            <History size={24} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Trazabilidad de <span className="text-purple-500">Cambios</span>
                            </h1>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Historial inmutable de operaciones del gimnasio</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={exportToCSV}
                        disabled={filteredSystemLogs.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <Download size={14} />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por usuario, tabla o ID de registro..."
                        className="w-full bg-[#1c1c1e] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-all text-xs font-bold uppercase tracking-widest placeholder:text-gray-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-4">
                    {/* Operación Filter */}
                    <div className="relative flex items-center bg-[#1c1c1e] border border-white/5 rounded-2xl px-4 py-2">
                        <Filter size={14} className="text-purple-500 mr-2" />
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-gray-500 uppercase">Operación</span>
                            <select
                                value={operationFilter}
                                onChange={e => setOperationFilter(e.target.value)}
                                className="bg-transparent text-[10px] font-bold text-white uppercase focus:outline-none pr-6 cursor-pointer border-none"
                            >
                                <option value="all" className="bg-[#1c1c1e]">Todos</option>
                                <option value="INSERT" className="bg-[#1c1c1e]">Inserciones</option>
                                <option value="UPDATE" className="bg-[#1c1c1e]">Modificaciones</option>
                                <option value="DELETE" className="bg-[#1c1c1e]">Eliminaciones</option>
                            </select>
                        </div>
                    </div>

                    {/* Date Filters */}
                    <div className="relative flex items-center bg-[#1c1c1e] border border-white/5 rounded-2xl px-4 py-2">
                        <Calendar size={14} className="text-purple-500 mr-2" />
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
                        <Calendar size={14} className="text-purple-500 mr-2" />
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

                    {(startDate || endDate || operationFilter !== 'all') && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); setOperationFilter('all'); }}
                            className="px-4 text-[8px] font-black uppercase text-purple-500 hover:text-white transition-colors"
                        >
                            Limpiar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Content Table/List */}
            <AnimatePresence mode="wait">
                {error ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-24 bg-[#1c1c1e] border border-red-500/20 rounded-[3rem]"
                    >
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center border border-red-500/20 mb-6">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-xl font-black text-red-400 italic uppercase">Error de Auditoría</h3>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">{error}</p>
                        <button
                            onClick={fetchLogs}
                            className="mt-6 px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            Reintentar Carga
                        </button>
                    </motion.div>
                ) : loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {[...Array(5)].map((_, idx) => (
                            <div key={idx} className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-pulse">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/5 shrink-0" />
                                    <div className="space-y-2">
                                        <div className="h-4 bg-white/5 rounded w-32" />
                                        <div className="h-3 bg-white/5 rounded w-48" />
                                    </div>
                                </div>
                                <div className="h-8 bg-white/5 rounded w-full md:w-16 mt-2 md:mt-0" />
                            </div>
                        ))}
                    </motion.div>
                ) : filteredSystemLogs.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-32 bg-[#1c1c1e] border border-dashed border-white/5 rounded-[3rem]"
                    >
                        <History size={48} className="text-gray-800 mb-6" />
                        <h3 className="text-xl font-black text-gray-700 italic uppercase">No se encontraron registros</h3>
                        <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-2">La sede no registra cambios para este filtro</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        {filteredSystemLogs.map((log, idx) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                                className="group bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-purple-500/30 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.05)]"
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border font-black text-[10px] uppercase leading-none text-center p-2 transition-transform group-hover:scale-105 shrink-0 ${
                                        log.operacion === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        log.operacion === 'DELETE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                        <span>{log.operacion}</span>
                                    </div>

                                    <div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                                            <span className="text-xs font-black text-white italic uppercase tracking-tight">{log.tabla}</span>
                                            <div className="w-1 h-1 rounded-full bg-gray-700 hidden sm:block" />
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ID Registro: {log.registro_id ? (log.registro_id.length > 8 ? `${log.registro_id.substring(0, 8)}...` : log.registro_id) : 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium text-gray-400">
                                            <UserCheck size={12} className="text-purple-400" />
                                            <span className="font-bold text-gray-300">{log.perfiles?.nombre_completo || 'Sistema Automático'}</span>
                                            <span className="opacity-40">{log.perfiles?.email}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                                    <div className="text-left md:text-right">
                                        <p className="text-[10px] font-black text-white uppercase tracking-tighter mb-1">
                                            {new Date(log.creado_en).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <div className="flex items-center justify-start md:justify-end gap-1.5 text-gray-600">
                                            <Clock size={10} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Audit Log</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLog(log)}
                                        className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all group-hover:bg-purple-600 group-hover:text-white hover:scale-105 active:scale-95 shrink-0"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )
}
            </AnimatePresence>

            {/* Controles de Paginación */}
            <div className="flex justify-between items-center bg-[#1c1c1e] border border-white/5 p-4 rounded-2xl mt-6">
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
                    disabled={loading || systemLogs.length < limit}
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
                            className="bg-[#1c1c1e] border border-purple-500/20 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative z-50"
                        >
                            {/* Cabecera del Modal */}
                            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-purple-500/10 via-purple-600/5 to-transparent flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center border border-purple-500/30">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                        Detalle de Cambios en Sistema
                                    </h3>
                                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mt-1">
                                        Tabla: {selectedLog.tabla} | Operación: {selectedLog.operacion}
                                    </p>
                                </div>
                            </div>

                            {/* Contenido del Modal */}
                            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Usuario Responsable</p>
                                        <p className="text-white font-bold mt-1">{selectedLog.perfiles?.nombre_completo || 'Sistema Automático'}</p>
                                        <p className="text-gray-500 text-[10px]">{selectedLog.perfiles?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Fecha y Hora</p>
                                        <p className="text-white font-bold mt-1">
                                            {new Date(selectedLog.creado_en).toLocaleString('es-AR')}
                                        </p>
                                        <p className="text-gray-500 text-[10px]">ID: {selectedLog.id}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Comparativa de Payload (Git Diff)</label>
                                    <RenderDiff oldData={selectedLog.datos_anteriores} newData={selectedLog.datos_nuevos} />
                                </div>
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
                        <div key={key} className="text-gray-500 py-1.5 border-b border-white/[0.02] flex items-start justify-between gap-4">
                            <span className="text-gray-600 shrink-0">{key}:</span>
                            <span className="text-gray-400 break-all text-right max-w-md whitespace-pre-wrap font-mono leading-relaxed">
                                {typeof newVal === 'object' ? JSON.stringify(newVal, null, 2) : String(newVal)}
                            </span>
                        </div>
                    );
                }

                return (
                    <div key={key} className="space-y-1.5 py-2 border-b border-white/5">
                        <div className="text-gray-400 font-bold">{key}:</div>
                        {oldVal !== undefined && (
                            <div className="bg-red-500/10 text-red-400 px-3 py-2 rounded-lg border border-red-500/20 flex items-start gap-2">
                                <span className="text-red-500 font-black shrink-0">-</span>
                                <span className="break-all whitespace-pre-wrap font-mono leading-relaxed">
                                    {typeof oldVal === 'object' ? JSON.stringify(oldVal, null, 2) : String(oldVal)}
                                </span>
                            </div>
                        )}
                        {newVal !== undefined && (
                            <div className="bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg border border-emerald-500/20 flex items-start gap-2">
                                <span className="text-emerald-500 font-black shrink-0">+</span>
                                <span className="break-all whitespace-pre-wrap font-mono leading-relaxed">
                                    {typeof newVal === 'object' ? JSON.stringify(newVal, null, 2) : String(newVal)}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
