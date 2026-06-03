'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign,
    TrendingUp,
    Building2,
    Calendar,
    Download,
    CreditCard,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronLeft,
    Wallet,
    Cpu,
    Server,
    Sparkles,
    RefreshCcw,
    Info,
    Check,
    AlertTriangle,
    ShieldAlert
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Payment {
    id: string;
    monto: number;
    moneda: string;
    concepto: string;
    estado: string;
    creado_en: string;
    metodo_pago: string;
    usuario?: { nombre_completo: string; correo: string };
    gimnasio?: { nombre: string };
}

interface SaaSPayment {
    id: string;
    monto: number;
    moneda: string;
    estado: string;
    fecha_pago: string;
    referencia_externa: string;
    gimnasio?: { nombre: string };
}

export default function FinanceHubPage() {
    const [memberPayments, setMemberPayments] = useState<Payment[]>([]);
    const [saasPayments, setSaaSPayments] = useState<SaaSPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'members' | 'saas' | 'saas_billing'>('members');
    const [gyms, setGyms] = useState<{ id: string; nombre: string }[]>([]);
    const [selectedGym, setSelectedGym] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Estados del Monedero Prepago (AI Wallet) y Híbrido
    const [billingSummary, setBillingSummary] = useState<any>(null);
    const [rechargeAmount, setRechargeAmount] = useState<string>('');
    const [alertThreshold, setAlertThreshold] = useState<number>(10);
    const [billingMethod, setBillingMethod] = useState<'prepago' | 'postpago'>('postpago');
    const [updatingWallet, setUpdatingWallet] = useState(false);

    const router = useRouter();
    const params = useParams();
    const gymId = (params?.gymId || params?.tenantSlug) as string;

    useEffect(() => {
        fetchFinanceData();
        fetchGyms();
        if (gymId) {
            fetchLocalBillingDetails();
        }
    }, [selectedGym, startDate, endDate, gymId]);

    const fetchGyms = async () => {
        try {
            const res = await fetch('/api/admin/gyms');
            const data = await res.json();
            if (res.ok) setGyms(data.gyms || []);
        } catch (_err) {
            // Silencioso: Fallback a lista vacía de gimnasios
        }
    };

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                ...(selectedGym !== 'all' && { gymId: selectedGym }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate })
            });
            const res = await fetch(`/api/admin/finance?${queryParams.toString()}`);
            const data = await res.json();
            if (res.ok) {
                setMemberPayments(data.memberPayments || []);
                setSaaSPayments(data.saasPayments || []);
            }
        } catch (error) {
            console.error('Error fetching finance:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocalBillingDetails = async () => {
        try {
            const res = await fetch('/api/admin/gym/billing');
            const data = await res.json();
            if (res.ok && data.bill) {
                setBillingSummary(data.bill);
                setAlertThreshold(data.bill.limiteAlertaSaldo ?? 10);
                setBillingMethod(data.bill.metodoCobroExcedentes ?? 'postpago');
            }
        } catch (err) {
            console.error('Error fetching billing details:', err);
        }
    };

    const handleRechargeWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = Number(rechargeAmount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Por favor introduce un monto de recarga válido.');
            return;
        }
        setUpdatingWallet(true);
        try {
            const res = await fetch('/api/admin/gym/wallet/recharge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                setRechargeAmount('');
                fetchLocalBillingDetails();
                fetchFinanceData(); // Recargar facturas SaaS del panel
            } else {
                toast.error(data.error || 'Error al recargar.');
            }
        } catch (_err) {
            toast.error('Error de conexión al recargar monedero.');
        } finally {
            setUpdatingWallet(false);
        }
    };

    const handleUpdateBillingConfig = async (threshold: number, method: 'prepago' | 'postpago') => {
        setUpdatingWallet(true);
        try {
            const res = await fetch('/api/admin/gym/wallet/recharge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limiteAlertaSaldo: threshold, metodoCobroExcedentes: method })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Configuración de facturación guardada.');
                setAlertThreshold(threshold);
                setBillingMethod(method);
                fetchLocalBillingDetails();
            } else {
                toast.error(data.error || 'Error al guardar configuración.');
            }
        } catch (_err) {
            toast.error('Error de conexión al actualizar configuración.');
        } finally {
            setUpdatingWallet(false);
        }
    };

    const totalRevenue = memberPayments
        .filter(p => p.estado === 'approved')
        .reduce((acc, p) => acc + Number(p.monto), 0);

    const saasRevenue = saasPayments
        .filter(p => p.estado === 'approved')
        .reduce((acc, p) => acc + Number(p.monto), 0);

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
                        <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                MercadoPago <span className="text-emerald-500">Hub</span>
                            </h1>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Control Financiero y Facturación SaaS</p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-[#1c1c1e] p-1.5 rounded-2xl border border-white/5">
                    {[
                        { id: 'members', label: 'Pagos Alumnos', icon: <CreditCard size={14} /> },
                        { id: 'saas', label: 'Historial Facturas', icon: <TrendingUp size={14} /> },
                        { id: 'saas_billing', label: 'Mi Suscripción SaaS', icon: <Sparkles size={14} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === tab.id
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeView !== 'saas_billing' ? (
                    <motion.div
                        key="standard_finance"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard
                                title="Recaudación Red"
                                value={`$${totalRevenue.toLocaleString()}`}
                                desc="Membresías cobradas por gimnasios"
                                icon={<DollarSign className="text-emerald-500" />}
                                color="text-emerald-500"
                            />
                            <StatCard
                                title="Ingresos SaaS"
                                value={`$${saasRevenue.toLocaleString()}`}
                                desc="Cobros por planes de suscripción"
                                icon={<TrendingUp className="text-blue-500" />}
                                color="text-blue-500"
                            />
                            <StatCard
                                title="Total Transacciones"
                                value={(memberPayments.length + saasPayments.length).toString()}
                                desc="Operaciones procesadas"
                                icon={<CreditCard className="text-purple-500" />}
                                color="text-purple-500"
                            />
                        </div>

                        {/* Filters */}
                        <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Filtrar por Gimnasio</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                        <select
                                            value={selectedGym}
                                            onChange={e => setSelectedGym(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white appearance-none focus:outline-none focus:border-emerald-500/50 transition-all text-xs font-bold uppercase tracking-widest"
                                        >
                                            <option value="all">Sincronizar Toda la Red</option>
                                            {gyms.map(g => (
                                                <option key={g.id} value={g.id}>{g.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <DateFilter label="Desde" value={startDate} onChange={setStartDate} />
                                    <DateFilter label="Hasta" value={endDate} onChange={setEndDate} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Mostrando últimos {activeView === 'members' ? memberPayments.length : saasPayments.length} registros</p>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase text-gray-400 transition-all">
                                    <Download size={14} /> Descargar Reporte
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="py-20 flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Consultando Ledger Central...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeView === 'members' ? (
                                        memberPayments.length === 0 ? <EmptyFinance /> : (
                                            memberPayments.map((p, i) => <MemberPaymentRow key={p.id} payment={p} index={i} />)
                                        )
                                    ) : (
                                        saasPayments.length === 0 ? <EmptyFinance /> : (
                                            saasPayments.map((p, i) => <SaaSPaymentRow key={p.id} payment={p} index={i} />)
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="saas_billing"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        {/* Alerta de Saldo Bajo Parpadeante */}
                        {billingSummary && billingSummary.saldoCreditos < alertThreshold && (
                            <motion.div
                                initial={{ scale: 0.98 }}
                                animate={{ scale: 1 }}
                                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                                className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center gap-4 shadow-lg shadow-amber-500/5"
                            >
                                <ShieldAlert className="text-amber-400 animate-bounce shrink-0" size={28} />
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase text-amber-400 tracking-wider">¡Alerta de AI Wallet! Saldo Bajo</p>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">
                                        Tu saldo disponible de créditos de IA (${billingSummary.saldoCreditos.toFixed(2)} USD) ha caído por debajo de tu límite de alerta configurado de ${alertThreshold} USD.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Top Portal Banner */}
                        <div className="bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 opacity-40" />
                            <div>
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    Suscripción Corporativa
                                </span>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-wider mt-2">
                                    Portal Transparente de Consumo SaaS
                                </h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                    Consulta tus cuotas integradas, saldos y configura la facturación automatizada
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Modelo de Cobro Activo:</span>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    billingSummary?.modeloFacturacion === 'consumo' ? 'bg-tactical-magenta/10 text-tactical-magenta border-tactical-magenta/20 shadow-[0_0_15px_rgba(255,0,255,0.1)]' :
                                    billingSummary?.modeloFacturacion === 'hibrido' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
                                    'bg-tactical-cyan/10 text-tactical-cyan border-tactical-cyan/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                }`}>
                                    {billingSummary?.modeloFacturacion === 'consumo' ? 'Pago x Uso' : billingSummary?.modeloFacturacion === 'hibrido' ? 'Híbrido' : 'Membresía Fija'}
                                </span>
                            </div>
                        </div>

                        {/* Interactive Wallet & Scenario Cockpit */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Billeteta AI Wallet Premium Card */}
                            <div className="bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                                <Wallet className="text-emerald-400" size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-white uppercase tracking-wider">Monedero Virtual de IA (AI Wallet)</h4>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Créditos de procesamiento de IA Prepago</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Saldo Disponible</span>
                                            <p className="text-2xl font-black text-emerald-400 leading-none italic mt-0.5">
                                                ${billingSummary ? billingSummary.saldoCreditos.toFixed(2) : '0.00'} USD
                                            </p>
                                        </div>
                                    </div>

                                    {/* Configuración de Alertas e interruptores del Admin */}
                                    <div className="space-y-6 border-t border-b border-white/5 py-6 mb-6">
                                        {/* Slider/Selector de Alerta */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-zinc-500">Alertar saldo bajo cuando sea menor a:</span>
                                                <span className="text-amber-400">${alertThreshold} USD</span>
                                            </div>
                                            <div className="flex bg-[#121214] p-1 rounded-xl border border-white/5">
                                                {[5, 10, 20].map(val => (
                                                    <button
                                                        key={val}
                                                        disabled={updatingWallet}
                                                        onClick={() => handleUpdateBillingConfig(val, billingMethod)}
                                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                                            alertThreshold === val
                                                                ? 'bg-amber-500 text-black shadow-md'
                                                                : 'text-zinc-500 hover:text-white'
                                                        }`}
                                                    >
                                                        ${val} USD
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Switch de Escenario de Excedentes */}
                                        <div className="flex justify-between items-center gap-4 bg-[#121214] p-4 rounded-2xl border border-white/5">
                                            <div>
                                                <h5 className="text-[10px] font-black text-white uppercase tracking-wider">Método de Pago de Excedentes</h5>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 leading-normal">
                                                    {billingMethod === 'prepago'
                                                        ? 'Débito del monedero prepago (Requiere créditos de IA)'
                                                        : 'Facturación al final de mes (Post-pago acumulado)'}
                                                </p>
                                            </div>
                                            <div className="flex bg-[#1c1c1e] p-1 rounded-xl border border-white/10 shrink-0">
                                                {[
                                                    { id: 'prepago', label: 'Prepago Wallet' },
                                                    { id: 'postpago', label: 'Post-pago' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        disabled={updatingWallet}
                                                        onClick={() => handleUpdateBillingConfig(alertThreshold, opt.id as any)}
                                                        className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                                            billingMethod === opt.id
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'text-zinc-500 hover:text-white'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Compra de Créditos Prepago Form (Escenario A) */}
                                <form onSubmit={handleRechargeWallet} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Monto a Cargar ($ USD)</label>
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="500"
                                                    placeholder="Monto mínimo $5"
                                                    value={rechargeAmount}
                                                    onChange={e => setRechargeAmount(e.target.value)}
                                                    className="w-full bg-[#121214] border border-white/5 rounded-2xl pl-10 pr-4 py-3.5 text-xs text-white uppercase font-bold tracking-wider focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={updatingWallet || !rechargeAmount}
                                                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/10 transition-all disabled:opacity-50"
                                            >
                                                {updatingWallet ? 'Procesando...' : 'Cargar Saldo'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider leading-relaxed">
                                        *Las recargas simulan un flujo completo de MercadoPago Sandbox, impactando tu cuenta local inmediatamente.
                                    </p>
                                </form>
                            </div>

                            {/* Consumo y Opciones Operativas (Escenario B & C) */}
                            <div className="bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4">Consumo Mensual de Cuotas e IA</h4>
                                    <div className="space-y-4">
                                        {/* Barra de Videos IA */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-zinc-500">Procesamiento de Video (Biomecánica)</span>
                                                <span className="text-white">
                                                    {billingSummary ? billingSummary.videosProcesados : 0} {billingSummary?.modeloFacturacion === 'hibrido' ? `/ ${billingSummary.limiteVideosHibrido} incl.` : ''}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-tactical-cyan rounded-full transition-all duration-1000 shadow-[0_0_10px_#00F5FF]"
                                                    style={{ width: `${billingSummary ? Math.min(100, (billingSummary.videosProcesados / (billingSummary.limiteVideosHibrido || 50)) * 100) : 0}%` }}
                                                />
                                            </div>
                                            {billingSummary?.extraVideos > 0 && (
                                                <p className="text-[8px] font-black text-amber-400 uppercase tracking-wider">
                                                    +${billingSummary.costoExtraVideos.toFixed(2)} USD excedente ({billingSummary.extraVideos} videos extra)
                                                </p>
                                            )}
                                        </div>

                                        {/* Barra de Rutinas IA */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-zinc-500">Generador de Rutinas (LLM IA)</span>
                                                <span className="text-white">
                                                    {billingSummary ? billingSummary.rutinasIA : 0} {billingSummary?.modeloFacturacion === 'hibrido' ? `/ ${billingSummary.limiteRutinasHibrido} incl.` : ''}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-tactical-magenta rounded-full transition-all duration-1000 shadow-[0_0_10px_#FF00FF]"
                                                    style={{ width: `${billingSummary ? Math.min(100, (billingSummary.rutinasIA / (billingSummary.limiteRutinasHibrido || 100)) * 100) : 0}%` }}
                                                />
                                            </div>
                                            {billingSummary?.extraRoutines > 0 && (
                                                <p className="text-[8px] font-black text-amber-400 uppercase tracking-wider">
                                                    +${billingSummary.costoExtraRutinas.toFixed(2)} USD excedente ({billingSummary.extraRoutines} rutinas extra)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Escenario B: Upgrade Express Plan */}
                                <div className="p-5 bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-3xl flex items-center justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                        <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">¿Necesitas cuotas más amplias?</p>
                                        <p className="text-[8px] text-zinc-500 leading-normal font-bold uppercase tracking-wider">
                                            Escala al siguiente plan de suscripción para aumentar tus límites incluidos de IA y reducir tus excedentes.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/${gymId}/admin/plans`)}
                                        className="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 transition-all"
                                    >
                                        Mejorar Plan
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Real-time Detailed Invoice breakdown */}
                        {billingSummary && (
                            <div className="bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Previsualización de Facturación Mensual Detallada</h4>
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5"> breakdown matemático transparente del cálculo del ciclo corriente</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Base Subscription Fee */}
                                    <div className="flex justify-between items-center text-xs font-medium">
                                        <span className="text-zinc-500 uppercase tracking-wider">Cargo de Suscripción Base ({billingSummary.modeloFacturacion === 'consumo' ? 'Pago por Uso' : 'Plan Mensual'})</span>
                                        <span className="text-white font-mono">${billingSummary.basePrice.toFixed(2)} USD</span>
                                    </div>

                                    {/* POS commissions (if applicable) */}
                                    {(billingSummary.modeloFacturacion === 'consumo' || billingSummary.modeloFacturacion === 'hibrido') && (
                                        <div className="flex justify-between items-center text-xs font-medium border-t border-white/2 pt-3">
                                            <span className="text-zinc-500 uppercase tracking-wider">Comisión POS 1.5% (Volumen facturado de ${billingSummary.volumenPOS.toFixed(2)} USD)</span>
                                            <span className="text-white font-mono">${billingSummary.comisionPOS.toFixed(2)} USD</span>
                                        </div>
                                    )}

                                    {/* Video IA Overage costs */}
                                    {billingSummary.modeloFacturacion === 'hibrido' && (
                                        <div className="flex justify-between items-center text-xs font-medium border-t border-white/2 pt-3">
                                            <span className="text-zinc-500 uppercase tracking-wider">Excedente Biomecánico ({billingSummary.extraVideos} videos adicionales)</span>
                                            <span className="text-white font-mono">${billingSummary.costoExtraVideos.toFixed(2)} USD</span>
                                        </div>
                                    )}

                                    {/* Routine IA Overage costs */}
                                    {billingSummary.modeloFacturacion === 'hibrido' && (
                                        <div className="flex justify-between items-center text-xs font-medium border-t border-white/2 pt-3">
                                            <span className="text-zinc-500 uppercase tracking-wider">Excedente Rutinas LLM ({billingSummary.extraRoutines} rutinas adicionales)</span>
                                            <span className="text-white font-mono">${billingSummary.costoExtraRutinas.toFixed(2)} USD</span>
                                        </div>
                                    )}

                                    {/* Pure IA Consumption costs (if consumption model) */}
                                    {billingSummary.modeloFacturacion === 'consumo' && (
                                        <>
                                            <div className="flex justify-between items-center text-xs font-medium border-t border-white/2 pt-3">
                                                <span className="text-zinc-500 uppercase tracking-wider">Procesamiento Biomecánico ({billingSummary.videosProcesados} videos)</span>
                                                <span className="text-white font-mono">${billingSummary.costoVideosIA.toFixed(2)} USD</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-medium border-t border-white/2 pt-3">
                                                <span className="text-zinc-500 uppercase tracking-wider">Generación de Rutinas IA ({billingSummary.rutinasIA} rutinas)</span>
                                                <span className="text-white font-mono">${billingSummary.costoRutinasIA.toFixed(2)} USD</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Wallet prepaid credits deduction */}
                                    {billingSummary.pagadoConCreditos > 0 && (
                                        <div className="flex justify-between items-center text-xs font-medium text-emerald-400 border-t border-white/2 pt-3">
                                            <span className="uppercase tracking-wider">Crédito Prepago Aplicado de AI Wallet</span>
                                            <span className="font-mono">-${billingSummary.pagadoConCreditos.toFixed(2)} USD</span>
                                        </div>
                                    )}

                                    {/* Grand Total */}
                                    <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                        <span className="text-xs font-black uppercase text-white tracking-widest">Total Estimado Próxima Factura:</span>
                                        <span className="text-xl font-black text-emerald-400 italic font-mono">${billingSummary.totalAmount.toFixed(2)} USD</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Historial de Movimientos de AI Wallet */}
                        {billingSummary && billingSummary.configuracion?.historial_recargas && (
                            <div className="space-y-4 pt-4">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">Historial de Movimientos de AI Wallet</h4>
                                <div className="space-y-3">
                                    {(billingSummary.configuracion.historial_recargas as any[]).length === 0 ? (
                                        <div className="py-8 text-center bg-white/2 rounded-2xl border border-white/5 opacity-35">
                                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">No se registran movimientos en el monedero</p>
                                        </div>
                                    ) : (
                                        [...(billingSummary.configuracion.historial_recargas as any[])]
                                            .reverse()
                                            .slice(0, 8)
                                            .map((tx: any, idx: number) => (
                                                <div key={idx} className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                                                            tx.monto > 0 
                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}>
                                                            {tx.monto > 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingUp size={16} className="text-red-400 rotate-180" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-white uppercase tracking-tight">
                                                                {tx.monto > 0 ? 'Recarga de Créditos Prepago' : 'Débito por Consumo de IA'}
                                                            </p>
                                                            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                                                Método: {tx.metodo || 'Transacción del Monedero'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-xs font-black font-mono ${tx.monto > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {tx.monto > 0 ? '+' : ''}${Number(tx.monto).toFixed(2)} USD
                                                        </p>
                                                        <p className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
                                                            {new Date(tx.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Local Past SaaS Invoices List */}
                        <div className="space-y-4 pt-4">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Historial de Facturas SaaS Pagadas</h4>
                            <div className="space-y-4">
                                {saasPayments.length === 0 ? <EmptyFinance /> : (
                                    saasPayments.slice(0, 5).map((p, i) => <SaaSPaymentRow key={p.id} payment={p} index={i} />)
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatCard({ title, value, desc, icon, color }: { title: string, value: string, desc: string, icon: any, color: string }) {
    return (
        <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-8 group hover:border-white/10 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{title}</h3>
            <p className={`text-4xl font-black italic uppercase italic leading-tight ${color}`}>{value}</p>
            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-tight mt-2">{desc}</p>
        </div>
    );
}

function DateFilter({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                <Calendar size={14} className="text-gray-500 mr-2" />
                <input
                    type="date"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="bg-transparent text-[10px] font-bold text-white uppercase focus:outline-none"
                />
            </div>
        </div>
    );
}

function MemberPaymentRow({ payment, index }: { payment: Payment, index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="group bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 flex items-center justify-between hover:border-emerald-500/30 transition-all"
        >
            <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${payment.estado === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    payment.estado === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    {payment.estado === 'approved' ? <CheckCircle2 size={24} /> : payment.estado === 'pending' ? <Clock size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-white italic uppercase tracking-tight">{payment.usuario?.nombre_completo}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{payment.metodo_pago}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                        <Building2 size={12} className="opacity-50" />
                        <span>{payment.gimnasio?.nombre || 'Red Global'}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-700 mx-1" />
                        <span>{payment.concepto}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-lg font-black text-white italic tracking-tighter mb-1">${Number(payment.monto).toLocaleString()}</p>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{new Date(payment.creado_en).toLocaleString('es-AR')}</p>
            </div>
        </motion.div>
    );
}

function SaaSPaymentRow({ payment, index }: { payment: SaaSPayment, index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="group bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 flex items-center justify-between hover:border-blue-500/30 transition-all"
        >
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-white italic uppercase tracking-tight">Cobro Suscripción SaaS</span>
                        <div className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">SaaS Revenue</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                        <Building2 size={12} className="opacity-50" />
                        <span className="text-gray-300 font-black">{payment.gimnasio?.nombre}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-700 mx-1" />
                        <span className="font-mono text-[9px]">Ref: {payment.referencia_externa}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-lg font-black text-white italic tracking-tighter mb-1">${Number(payment.monto).toLocaleString()}</p>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{new Date(payment.fecha_pago).toLocaleString('es-AR')}</p>
            </div>
        </motion.div>
    );
}

function EmptyFinance() {
    return (
        <div className="py-20 flex flex-col items-center justify-center opacity-30">
            <CreditCard size={40} className="text-white mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Sin movimientos financieros</p>
        </div>
    );
}
