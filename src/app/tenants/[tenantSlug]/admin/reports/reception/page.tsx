'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useIsSubdomain } from '@/hooks/useIsSubdomain';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    Users,
    DollarSign,
    Download,
    Filter,
    RefreshCw,
    BadgeAlert,
    UserCheck,
    CreditCard,
    TrendingUp,
    FileText,
    FileSpreadsheet,
    Activity,
    ClipboardList,
    AlertCircle,
    CheckCircle2,
    Lock,
    Eye,
    X
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';

interface BypassLog {
    id: string;
    fecha: string;
    socioId: string;
    socioNombre: string;
    urlAvatar?: string | null;
    autorizadoPor: string;
    motivo: string;
}

interface CashSession {
    id: string;
    fecha: string;
    usuarioId: string;
    usuarioNombre: string;
    montoInicial: number;
    ventasEfectivo: number;
    ventasTarjeta: number;
    ventasQR: number;
    efectivoDeclarado: number;
    tarjetaDeclarado: number;
    qrDeclarado: number;
    diferenciaEfectivo: number;
    diferenciaTarjeta: number;
    diferenciaQR: number;
    egresos: any[];
    fechaApertura: string;
    fechaCierre: string;
}

interface StaffProfile {
    id: string;
    nombre_completo: string;
    rol: string;
}

export default function ReceptionReportPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params?.tenantSlug as string | undefined;
    const { isSubdomain } = useIsSubdomain();

    const [activeTab, setActiveTab] = useState<'attendance' | 'cash'>('attendance');
    const [range, setRange] = useState('week');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    const [attendanceMetrics, setAttendanceMetrics] = useState({
        totalAsistencias: 0,
        qr: 0,
        manual: 0,
        bypass: 0
    });
    const [bypasses, setBypasses] = useState<BypassLog[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    
    const [cashMetrics, setCashMetrics] = useState({
        totalDiferencias: 0,
        totalEgresos: 0,
        totalCierres: 0
    });
    const [cashHistory, setCashHistory] = useState<CashSession[]>([]);
    const [openSessions, setOpenSessions] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<StaffProfile[]>([]);
    const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);

    // Fetch staff list for filtering (RLS handles tenant filtering)
    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const { data, error } = await supabase
                    .from('perfiles')
                    .select('id, nombre, apellido, nombre_completo, rol')
                    .in('rol', ['admin', 'recepcion'])
                    .order('nombre', { ascending: true });
                
                if (error) throw error;
                
                const formattedStaff = (data || []).map((p: any) => ({
                    id: p.id,
                    nombre_completo: p.nombre_completo || `${p.nombre || ''} ${p.apellido || ''}`.trim(),
                    rol: p.rol
                }));
                setStaffList(formattedStaff);
            } catch (err) {
                console.error('Error fetching staff list:', err);
            }
        };

        fetchStaff();
    }, []);

    useEffect(() => {
        fetchReportData();
    }, [tenantSlug, range, startDate, endDate, selectedStaffId]);

    const fetchReportData = async () => {
        if (!tenantSlug) return;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                gymId: tenantSlug,
                range,
                ...(startDate && { startDate: new Date(startDate).toISOString() }),
                ...(endDate && { endDate: new Date(endDate).toISOString() }),
                ...(selectedStaffId !== 'all' && { usuario_id: selectedStaffId })
            });

            // Fetch both endpoints in parallel
            const [attendanceRes, cashRes] = await Promise.all([
                fetch(`/api/admin/reports/reception/attendance?${queryParams}`),
                fetch(`/api/admin/reports/reception/cash-sessions?${queryParams}`)
            ]);

            if (!attendanceRes.ok || !cashRes.ok) {
                throw new Error('Error al cargar datos del reporte');
            }

            const attendanceData = await attendanceRes.json();
            const cashData = await cashRes.json();

            setAttendanceMetrics(attendanceData.metrics);
            setBypasses(attendanceData.bypasses || []);
            setChartData(attendanceData.charts?.timeline || []);
            
            setCashMetrics(cashData.metrics);
            setCashHistory(cashData.history || []);
            setOpenSessions(cashData.openSessions || []);

        } catch (error) {
            console.error('Error fetching reception report:', error);
            toast.error('Ocurrió un error al obtener la información del servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.push(isSubdomain ? '/admin/reports' : `/${tenantSlug}/admin/reports`);
    };

    const formatCurrency = (value: any) => {
        const numValue = Number(value) || 0;
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(numValue);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return d.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportToCSV = (type: 'attendance' | 'cash') => {
        let csvContent = '';
        let fileName = '';

        if (type === 'attendance') {
            csvContent = [
                ['Reporte de Asistencias e Ingresos Excepcionales'],
                [`Filtro Cajero: ${selectedStaffId === 'all' ? 'Todos' : (staffList.find(s => s.id === selectedStaffId)?.nombre_completo || 'Desconocido')}`],
                [`Rango: ${range}`],
                [''],
                ['Resumen de Metricas'],
                ['Total Asistencias', attendanceMetrics.totalAsistencias],
                ['Ingresos QR', attendanceMetrics.qr],
                ['Ingresos Manuales', attendanceMetrics.manual],
                ['Bypasses', attendanceMetrics.bypass],
                [''],
                ['Ingresos Excepcionales (Bypasses)'],
                ['Fecha', 'Socio ID', 'Socio Nombre', 'Autorizado Por', 'Motivo'],
                ...bypasses.map(b => [
                    formatDate(b.fecha),
                    b.socioId,
                    b.socioNombre,
                    b.autorizadoPor,
                    b.motivo
                ])
            ].map(e => e.join(',')).join('\n');
            fileName = `reporte_asistencia_recepcion_${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            csvContent = [
                ['Reporte de Historial de Caja y Arqueo'],
                [`Filtro Cajero: ${selectedStaffId === 'all' ? 'Todos' : (staffList.find(s => s.id === selectedStaffId)?.nombre_completo || 'Desconocido')}`],
                [`Rango: ${range}`],
                [''],
                ['Resumen Financiero'],
                ['Total Cierres', cashMetrics.totalCierres],
                ['Discrepancia Acumulada', cashMetrics.totalDiferencias],
                ['Egresos de Caja', cashMetrics.totalEgresos],
                [''],
                ['Historial de Arqueos'],
                ['Fecha Cierre', 'Cajero', 'Fecha Apertura', 'Monto Inicial', 'Ventas Efectivo', 'Ventas Tarjeta', 'Ventas QR', 'Efectivo Declarado', 'Tarjeta Declarado', 'QR Declarado', 'Diferencia Efectivo', 'Diferencia Tarjeta', 'Diferencia QR', 'Total Egresos'],
                ...cashHistory.map(c => {
                    const totalEgresos = c.egresos?.reduce((acc: number, curr: any) => acc + Number(curr.monto || 0), 0) || 0;
                    return [
                        formatDate(c.fechaCierre),
                        c.usuarioNombre,
                        formatDate(c.fechaApertura),
                        c.montoInicial,
                        c.ventasEfectivo,
                        c.ventasTarjeta,
                        c.ventasQR,
                        c.efectivoDeclarado,
                        c.tarjetaDeclarado,
                        c.qrDeclarado,
                        c.diferenciaEfectivo,
                        c.diferenciaTarjeta,
                        c.diferenciaQR,
                        totalEgresos
                    ];
                })
            ].map(e => e.join(',')).join('\n');
            fileName = `reporte_arqueos_caja_${new Date().toISOString().split('T')[0]}.csv`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Datos exportados exitosamente');
    };

    return (
        <div className="p-8 space-y-8 min-h-screen text-white w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-3 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white rounded-2xl transition-colors border border-white/5"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-white">Reporte de Recepción</h1>
                        <p className="text-gray-400">Control de accesos y auditoría financiera de arqueos</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Select Staff */}
                    <div className="flex items-center gap-2 bg-[#1c1c1e] border border-white/5 px-3 py-2 rounded-xl">
                        <Users size={16} className="text-gray-400" />
                        <select
                            value={selectedStaffId}
                            onChange={(e) => setSelectedStaffId(e.target.value)}
                            className="bg-transparent text-white outline-none cursor-pointer text-sm"
                        >
                            <option value="all">Todos los Cajeros</option>
                            {staffList.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.nombre_completo} ({s.rol === 'admin' ? 'Admin' : 'Recepcion'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-[#1c1c1e] border border-white/5 px-3 py-2 rounded-xl">
                        <Calendar size={18} className="text-gray-400" />
                        <select
                            value={range}
                            onChange={(e) => {
                                setRange(e.target.value);
                                if (e.target.value !== 'custom') {
                                    setStartDate('');
                                    setEndDate('');
                                }
                            }}
                            className="bg-transparent text-white outline-none cursor-pointer text-sm"
                        >
                            <option value="week">Esta Semana</option>
                            <option value="month">Este Mes</option>
                            <option value="quarter">Este Trimestre</option>
                            <option value="year">Este Año</option>
                            <option value="custom">Rango Personalizado</option>
                        </select>
                    </div>

                    {range === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-[#1c1c1e] border border-white/5 px-3 py-2 rounded-xl text-sm outline-none text-white focus:border-purple-500"
                            />
                            <span className="text-gray-500 text-sm">a</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-[#1c1c1e] border border-white/5 px-3 py-2 rounded-xl text-sm outline-none text-white focus:border-purple-500"
                            />
                        </div>
                    )}

                    <button
                        onClick={fetchReportData}
                        disabled={loading}
                        className="p-3 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white rounded-xl transition-colors border border-white/5 flex items-center justify-center disabled:opacity-50"
                        title="Recargar datos"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Tabs & Export */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div className="flex gap-2 p-1 bg-[#121214] rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            activeTab === 'attendance'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Activity size={18} />
                        Control de Asistencia
                    </button>
                    <button
                        onClick={() => setActiveTab('cash')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            activeTab === 'cash'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <DollarSign size={18} />
                        Auditoría de Caja
                    </button>
                </div>

                <button
                    onClick={() => exportToCSV(activeTab)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-bold text-sm shadow-md"
                >
                    <FileSpreadsheet size={18} />
                    Exportar {activeTab === 'attendance' ? 'Ingresos' : 'Arqueos'}
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="flex flex-col items-center gap-4">
                        <RefreshCw size={40} className="animate-spin text-purple-500" />
                        <p className="text-gray-400 animate-pulse text-sm">Cargando reporte de recepción...</p>
                    </div>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {activeTab === 'attendance' ? (
                        <motion.div
                            key="attendance"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            {/* Attendance KPIs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <MetricCard
                                    title="Total Asistencias"
                                    value={attendanceMetrics.totalAsistencias}
                                    desc="Ingresos totales registrados"
                                    icon={<Users size={22} className="text-purple-400" />}
                                    color="purple"
                                />
                                <MetricCard
                                    title="Ingresos QR App"
                                    value={attendanceMetrics.qr}
                                    desc={`${attendanceMetrics.totalAsistencias > 0 ? ((attendanceMetrics.qr / attendanceMetrics.totalAsistencias) * 100).toFixed(0) : 0}% del total general`}
                                    icon={<UserCheck size={22} className="text-emerald-400" />}
                                    color="emerald"
                                />
                                <MetricCard
                                    title="Ingresos Manuales"
                                    value={attendanceMetrics.manual}
                                    desc="Registros directos por cajero"
                                    icon={<ClipboardList size={22} className="text-blue-400" />}
                                    color="blue"
                                />
                                <MetricCard
                                    title="Bypasses de Acceso"
                                    value={attendanceMetrics.bypass}
                                    desc="Autorizados excepcionalmente"
                                    icon={<BadgeAlert size={22} className="text-amber-400" />}
                                    color="amber"
                                />
                            </div>

                            {/* Chart */}
                            <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl">
                                <h3 className="text-xl font-bold text-white mb-6">Histórico de Accesos por Tipo</h3>
                                <div className="h-[320px] w-full">
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} />
                                                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} allowDecimals={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                                <Bar dataKey="qr" name="QR App" stackId="a" fill="#10b981" />
                                                <Bar dataKey="manual" name="Manual Recepción" stackId="a" fill="#3b82f6" />
                                                <Bar dataKey="bypass" name="Bypass de Acceso" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">
                                            No hay datos suficientes para graficar en este rango
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bypasses Logs */}
                            <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
                                <h3 className="text-xl font-bold text-white mb-6">Detalle de Ingresos Excepcionales (Bypasses)</h3>
                                {bypasses.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 text-gray-400 text-sm font-medium">
                                                    <th className="pb-3 pr-4">Fecha y Hora</th>
                                                    <th className="pb-3 px-4">Socio</th>
                                                    <th className="pb-3 px-4">Autorizado por</th>
                                                    <th className="pb-3 pl-4">Justificación / Motivo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bypasses.map((b) => (
                                                    <tr key={b.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                        <td className="py-4 pr-4 text-sm text-gray-300 font-medium">
                                                            {formatDate(b.fecha)}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-[#121214] border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                                                                    {b.urlAvatar ? (
                                                                        <img src={b.urlAvatar} alt="" className="object-cover w-full h-full" />
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500 font-bold">
                                                                            {b.socioNombre.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="font-bold text-white">{b.socioNombre}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-sm text-purple-400 font-medium">
                                                            {b.autorizadoPor}
                                                        </td>
                                                        <td className="py-4 pl-4 text-sm text-gray-400 max-w-xs truncate" title={b.motivo}>
                                                            {b.motivo}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        No se han registrado bypasses en este rango de fechas.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="cash"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            {/* Cash KPIs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <MetricCard
                                    title="Discrepancia Acumulada"
                                    value={formatCurrency(cashMetrics.totalDiferencias)}
                                    desc="Diferencia total declarada vs esperada"
                                    icon={<AlertCircle size={22} className={cashMetrics.totalDiferencias < 0 ? "text-red-400" : (cashMetrics.totalDiferencias === 0 ? "text-emerald-400" : "text-amber-400")} />}
                                    color={cashMetrics.totalDiferencias < 0 ? "red" : (cashMetrics.totalDiferencias === 0 ? "emerald" : "amber")}
                                />
                                <MetricCard
                                    title="Egresos de Caja"
                                    value={formatCurrency(cashMetrics.totalEgresos)}
                                    desc="Retiros para gastos autorizados"
                                    icon={<CreditCard size={22} className="text-blue-400" />}
                                    color="blue"
                                />
                                <MetricCard
                                    title="Arqueos Registrados"
                                    value={cashMetrics.totalCierres}
                                    desc="Turnos cerrados en el rango"
                                    icon={<ClipboardList size={22} className="text-purple-400" />}
                                    color="purple"
                                />
                                <MetricCard
                                    title="Cajas Abiertas Hoy"
                                    value={openSessions.length}
                                    desc="Turnos activos en recepción"
                                    icon={<TrendingUp size={22} className="text-emerald-400" />}
                                    color="emerald"
                                />
                            </div>

                            {/* Open Sessions Alert */}
                            {openSessions.length > 0 && (
                                <div className="bg-[#1c1c1e]/40 border border-emerald-500/20 p-5 rounded-3xl space-y-4">
                                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                        <CheckCircle2 size={16} />
                                        Turnos de Caja Activos en Tiempo Real
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {openSessions.map((os) => (
                                            <div key={os.id} className="bg-[#121214] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                                                <div>
                                                    <p className="font-bold text-white">{os.usuarioNombre}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Apertura: {formatDate(os.fechaApertura)}</p>
                                                </div>
                                                <div className="mt-4 flex justify-between items-center">
                                                    <span className="text-xs text-gray-400">Fondo Inicial:</span>
                                                    <span className="font-bold text-sm text-emerald-400">{formatCurrency(os.montoInicial)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cash History List */}
                            <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
                                <h3 className="text-xl font-bold text-white mb-6">Historial de Cierres y Arqueos</h3>
                                {cashHistory.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 text-gray-400 text-sm font-medium">
                                                    <th className="pb-3 pr-4">Fecha Cierre</th>
                                                    <th className="pb-3 px-4">Cajero</th>
                                                    <th className="pb-3 px-4">Fondo Inicial</th>
                                                    <th className="pb-3 px-4">Total Ventas</th>
                                                    <th className="pb-3 px-4">Discrepancia</th>
                                                    <th className="pb-3 px-4 text-center">Estado</th>
                                                    <th className="pb-3 pl-4 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cashHistory.map((c) => {
                                                    const totalVentas = c.ventasEfectivo + c.ventasTarjeta + c.ventasQR;
                                                    const totalDiferencia = c.diferenciaEfectivo + c.diferenciaTarjeta + c.diferenciaQR;
                                                    let statusText = 'Exacto';
                                                    let statusColor = 'text-emerald-400 bg-emerald-500/10';
                                                    if (totalDiferencia < 0) {
                                                        statusText = 'Faltante';
                                                        statusColor = 'text-red-400 bg-red-500/10';
                                                    } else if (totalDiferencia > 0) {
                                                        statusText = 'Sobrante';
                                                        statusColor = 'text-amber-400 bg-amber-500/10';
                                                    }

                                                    return (
                                                        <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                            <td className="py-4 pr-4 text-sm text-gray-300 font-medium">
                                                                {formatDate(c.fechaCierre)}
                                                            </td>
                                                            <td className="py-4 px-4 font-bold text-white">
                                                                {c.usuarioNombre}
                                                            </td>
                                                            <td className="py-4 px-4 text-sm text-gray-300">
                                                                {formatCurrency(c.montoInicial)}
                                                            </td>
                                                            <td className="py-4 px-4 text-sm font-bold text-white">
                                                                {formatCurrency(totalVentas)}
                                                            </td>
                                                            <td className={`py-4 px-4 text-sm font-medium ${totalDiferencia < 0 ? 'text-red-400' : (totalDiferencia > 0 ? 'text-amber-400' : 'text-emerald-400')}`}>
                                                                {totalDiferencia !== 0 ? formatCurrency(totalDiferencia) : '$0'}
                                                            </td>
                                                            <td className="py-4 px-4 text-center">
                                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                                                                    {statusText}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 pl-4 text-right">
                                                                <button
                                                                    onClick={() => setSelectedSession(c)}
                                                                    className="p-2 bg-[#121214] hover:bg-purple-600 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5 flex items-center justify-center gap-1.5 text-xs font-bold float-right"
                                                                >
                                                                    <Eye size={14} />
                                                                    Ver Arqueo
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        No se han registrado cierres de caja en este rango de fechas.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedSession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Background Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedSession(null)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-md"
                        />

                        {/* Modal Box */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="bg-[#1c1c1e] border border-white/10 w-full max-w-2xl rounded-3xl p-6 relative z-10 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="absolute top-5 right-5 p-2 bg-[#121214] text-gray-400 hover:text-white rounded-full transition-colors border border-white/5"
                            >
                                <X size={18} />
                            </button>

                            {/* Title */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Detalle de Arqueo de Caja</h3>
                                    <p className="text-xs text-gray-400 mt-1">Turno cerrado por: {selectedSession.usuarioNombre}</p>
                                </div>
                            </div>

                            {/* Shift Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#121214] border border-white/5 p-4 rounded-2xl text-sm mb-6">
                                <div>
                                    <span className="text-xs text-gray-500 block">Apertura:</span>
                                    <span className="font-semibold text-gray-300">{formatDate(selectedSession.fechaApertura)}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">Cierre:</span>
                                    <span className="font-semibold text-gray-300">{formatDate(selectedSession.fechaCierre)}</span>
                                </div>
                            </div>

                            {/* Financial breakdown */}
                            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-3">Balance por Método de Pago</h4>
                            <div className="overflow-x-auto mb-6">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-gray-500 font-semibold">
                                            <th className="pb-2">Método</th>
                                            <th className="pb-2">Monto Esperado</th>
                                            <th className="pb-2">Declarado Físico</th>
                                            <th className="pb-2 text-right">Diferencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        <tr>
                                            <td className="py-3 font-semibold text-gray-300">Efectivo *</td>
                                            <td className="py-3 text-gray-300">{formatCurrency((selectedSession.ventasEfectivo || 0) + (selectedSession.montoInicial || 0))}</td>
                                            <td className="py-3 text-white font-bold">{formatCurrency(selectedSession.efectivoDeclarado || 0)}</td>
                                            <td className={`py-3 text-right font-bold ${(selectedSession.diferenciaEfectivo || 0) < 0 ? 'text-red-400' : ((selectedSession.diferenciaEfectivo || 0) > 0 ? 'text-amber-400' : 'text-emerald-400')}`}>
                                                {(selectedSession.diferenciaEfectivo || 0) !== 0 ? formatCurrency(selectedSession.diferenciaEfectivo) : '$0'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 font-semibold text-gray-300">Tarjeta de Débito/Crédito</td>
                                            <td className="py-3 text-gray-300">{formatCurrency(selectedSession.ventasTarjeta || 0)}</td>
                                            <td className="py-3 text-white font-bold">{formatCurrency(selectedSession.tarjetaDeclarado || 0)}</td>
                                            <td className={`py-3 text-right font-bold ${(selectedSession.diferenciaTarjeta || 0) < 0 ? 'text-red-400' : ((selectedSession.diferenciaTarjeta || 0) > 0 ? 'text-amber-400' : 'text-emerald-400')}`}>
                                                {(selectedSession.diferenciaTarjeta || 0) !== 0 ? formatCurrency(selectedSession.diferenciaTarjeta) : '$0'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 font-semibold text-gray-300">QR / Transferencia</td>
                                            <td className="py-3 text-gray-300">{formatCurrency(selectedSession.ventasQR || 0)}</td>
                                            <td className="py-3 text-white font-bold">{formatCurrency(selectedSession.qrDeclarado || 0)}</td>
                                            <td className={`py-3 text-right font-bold ${(selectedSession.diferenciaQR || 0) < 0 ? 'text-red-400' : ((selectedSession.diferenciaQR || 0) > 0 ? 'text-amber-400' : 'text-emerald-400')}`}>
                                                {(selectedSession.diferenciaQR || 0) !== 0 ? formatCurrency(selectedSession.diferenciaQR) : '$0'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <p className="text-[10px] text-gray-500 mt-2">* El efectivo esperado incluye el fondo de caja inicial de {formatCurrency(selectedSession.montoInicial)}.</p>
                            </div>

                            {/* Egresos */}
                            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-3">Egresos Registrados (Gastos de Caja)</h4>
                            {selectedSession.egresos && selectedSession.egresos.length > 0 ? (
                                <div className="space-y-2 mb-4">
                                    {selectedSession.egresos.map((eg: any, index: number) => (
                                        <div key={index} className="flex justify-between items-center bg-[#121214] p-3 rounded-xl border border-white/5 text-sm">
                                            <span className="text-gray-300 font-medium">{eg.concepto || 'Gasto no especificado'}</span>
                                            <span className="font-bold text-red-400">-{formatCurrency(eg.monto)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-[#121214] rounded-2xl border border-white/5 text-gray-500 text-xs mb-4">
                                    No se declararon egresos en este turno de caja.
                                </div>
                            )}

                            {/* Signatures */}
                            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-400 mt-6 mb-3">Firmas de Validación</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#121214] border border-white/5 p-4 rounded-2xl text-xs">
                                <div className="border border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                    <span className="font-rajdhani text-[10px] text-gray-500 block mb-2 uppercase tracking-widest">Firma Responsable</span>
                                    <div className="h-10 flex items-center justify-center text-gray-400 italic text-[11px] font-serif border-b border-white/10 w-full pb-1">
                                        ✍️ {selectedSession.usuarioNombre}
                                    </div>
                                    <span className="text-[9px] text-gray-500 mt-1">ID: {(selectedSession.usuarioId || '').slice(0, 8)}...</span>
                                </div>
                                <div className="border border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                    <span className="font-rajdhani text-[10px] text-gray-500 block mb-2 uppercase tracking-widest">Firma Supervisor</span>
                                    <div className="h-10 flex items-center justify-center text-gray-400 italic text-[11px] font-serif border-b border-white/10 w-full pb-1">
                                        🔑 Autorizado digitalmente
                                    </div>
                                    <span className="text-[9px] text-gray-500 mt-1">Rol: Administrador Local</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: string | number;
    desc: string;
    icon: React.ReactNode;
    color: string;
}

function MetricCard({ title, value, desc, icon, color }: MetricCardProps) {
    const colorMap: Record<string, string> = {
        purple: 'bg-purple-500/10 text-purple-400',
        emerald: 'bg-emerald-500/10 text-emerald-400',
        blue: 'bg-blue-500/10 text-blue-400',
        amber: 'bg-amber-500/10 text-amber-400',
        red: 'bg-red-500/10 text-red-400'
    };

    return (
        <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl group hover:border-white/10 transition-all duration-300 cursor-default relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3.5 rounded-2xl ${colorMap[color] || 'bg-purple-500/10 text-purple-400'}`}>
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-gray-400 text-sm font-semibold mb-1">{title}</h3>
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-xs text-gray-500 mt-2 font-medium">{desc}</p>
            </div>
        </div>
    );
}
