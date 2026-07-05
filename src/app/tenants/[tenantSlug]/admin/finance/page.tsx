'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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
    Sparkles,
    Info,
    AlertTriangle,
    ShieldAlert,
    HelpCircle,
    ArrowUpRight
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
    const [userRole, setUserRole] = useState<string | null>(null);
    const [gyms, setGyms] = useState<{ id: string; nombre: string }[]>([]);
    const [selectedGym, setSelectedGym] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Estados del Monedero de IA
    const [billingSummary, setBillingSummary] = useState<any>(null);
    const [rechargeAmount, setRechargeAmount] = useState<string>('');
    const [alertThreshold, setAlertThreshold] = useState<number>(10);
    const [billingMethod, setBillingMethod] = useState<'prepago' | 'postpago'>('postpago');
    const [updatingWallet, setUpdatingWallet] = useState(false);

    const router = useRouter();
    const params = useParams();
    const gymId = (params?.gymId || params?.tenantSlug) as string;
    const [checkingAccess, setCheckingAccess] = useState(true);

    const [gymInfo, setGymInfo] = useState<any>(null);
    const [showPlansModal, setShowPlansModal] = useState(false);
    const [saasPlans, setSaaSPlans] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [initiatingPaymentPlanId, setInitiatingPaymentPlanId] = useState<string | null>(null);

    const mapFeatureToSpanish = (feat: string): string => {
        const map: Record<string, string> = {
            'rutinas_ia': 'Rutinas de Entrenamiento con IA',
            'asistencias_qr': 'Control de Asistencias por QR',
            'gamificacion': 'Módulo de Gamificación',
            'nutricion_ia': 'Planificación de Nutrición con IA',
            'pagos_online': 'Cobros Online / Pasarela de Pagos',
            'api_access': 'Acceso Completo a la API',
            'reportes_avanzados': 'Módulo de Reportes Avanzados',
            'personal_trainer_ia': 'Personal Trainer de IA Integrado'
        };
        return map[feat.toLowerCase()] || feat;
    };

    const fetchGymInfo = async () => {
        try {
            const url = gymId
                ? `/api/admin/gym/info?gymId=${gymId}`
                : '/api/admin/gym/info';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.success) {
                setGymInfo(data.gym);
            }
        } catch (err) {
            console.error('Error fetching gym info in finance page:', err);
        }
    };

    const fetchSaaSPlansAndOpenModal = async (preselectId?: string) => {
        setLoadingPlans(true);
        try {
            const res = await fetch('/api/public/saas-plans');
            const data = await res.json();
            if (res.ok && data.success) {
                setSaaSPlans(data.plans || []);
                setShowPlansModal(true);
            } else {
                toast.error('No se pudieron cargar los planes disponibles.');
            }
        } catch (err) {
            console.error('Error fetching SaaS plans:', err);
            toast.error('Error de conexión al obtener planes.');
        } finally {
            setLoadingPlans(false);
        }
    };

    const handleInitiatePlanPayment = async (planId: string) => {
        setInitiatingPaymentPlanId(planId);
        try {
            const res = await fetch('/api/saas/payments/create-preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            });
            const data = await res.json();
            if (res.ok && data.init_point) {
                toast.success('Redirigiendo a MercadoPago...');
                window.location.href = data.init_point;
            } else {
                toast.error(data.error || 'Error al iniciar el pago.');
            }
        } catch (err) {
            console.error('Error initiating plan payment:', err);
            toast.error('Error de conexión con la pasarela.');
        } finally {
            setInitiatingPaymentPlanId(null);
        }
    };

    useEffect(() => {
        const checkAccessAndLoad = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                const { data: profile } = await (supabase
                    .from('perfiles') as any)
                    .select('rol, permisos')
                    .eq('id', user.id)
                    .single();

                if (profile?.rol === 'recepcion' && (profile?.permisos as any)?.acceso_finanzas !== true) {
                    toast.error('Acceso denegado: No tienes permisos para ver finanzas');
                    router.push(gymId ? `/${gymId}/admin/recepcion/pos` : '/admin/recepcion/pos');
                    return;
                }
                setUserRole(profile?.rol || null);
                setCheckingAccess(false);
                fetchFinanceData();
                fetchGyms();
                fetchGymInfo();
                if (gymId) {
                    fetchLocalBillingDetails();
                }
            } catch (error) {
                console.error('Error checking access:', error);
                setCheckingAccess(false);
                fetchFinanceData();
                fetchGyms();
                fetchGymInfo();
                if (gymId) {
                    fetchLocalBillingDetails();
                }
            }
        };
        checkAccessAndLoad();
    }, [selectedGym, startDate, endDate, gymId]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const upgradePlanId = urlParams.get('upgradePlanId');

        if (paymentStatus === 'success') {
            toast.success('¡Suscripción actualizada correctamente! Tu nuevo plan ya está activo.');
            router.replace(window.location.pathname);
        } else if (paymentStatus === 'failure') {
            toast.error('Ocurrió un error al procesar tu pago. Por favor intenta nuevamente.');
            router.replace(window.location.pathname);
        }

        if (upgradePlanId) {
            fetchSaaSPlansAndOpenModal(upgradePlanId);
        }
    }, [gymId]);

    const fetchGyms = async () => {
        try {
            const res = await fetch('/api/admin/gyms');
            const data = await res.json();
            if (res.ok) setGyms(data.gyms || []);
        } catch (_err) {
            // Fallback a lista vacía de gimnasios
        }
    };

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            // gymId de URL tiene prioridad para impersonación, si no hay filtro manual de sucursal
            const effectiveGymId = selectedGym !== 'all' ? selectedGym : (gymId || undefined);
            const queryParams = new URLSearchParams({
                ...(effectiveGymId && { gymId: effectiveGymId }),
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
            const url = gymId
                ? `/api/admin/gym/billing?gymId=${gymId}`
                : '/api/admin/gym/billing';
            const res = await fetch(url);
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
                body: JSON.stringify({ amount: amt, ...(gymId && { gymId }) })
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
                body: JSON.stringify({ limiteAlertaSaldo: threshold, metodoCobroExcedentes: method, ...(gymId && { gymId }) })
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

    if (checkingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 md:p-10 max-w-7xl mx-auto pb-32 bg-[#0a0a0c] text-white min-h-screen relative overflow-hidden">
            {/* Glowing background highlights */}
            <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Panel
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Caja y <span className="text-emerald-400 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Finanzas</span>
                            </h1>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1.5">Control de ingresos de alumnos y cobros del sistema</p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-[#121214] p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    {[
                        { id: 'members', label: 'Cobros Alumnos', icon: <CreditCard size={14} /> },
                        { id: 'saas', label: 'Historial de Licencia', icon: <TrendingUp size={14} /> },
                        { id: 'saas_billing', label: 'Costo del Sistema e IA', icon: <Sparkles size={14} /> }
                    ].filter(tab => userRole === 'superadmin' || userRole === 'admin' || tab.id === 'members').map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeView === tab.id
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/10 scale-[1.02]'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Informative introductory message to simplify view */}
            <div className="bg-[#121214]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 flex items-start gap-4 relative z-10">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
                    <Info size={20} />
                </div>
                <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">¿Cómo funciona esta sección?</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                        {activeView === 'members' && 'Aquí verás el dinero total que abonan tus alumnos. Puedes revisar quién pagó, cuándo y el concepto (membresía, matrícula, etc.).'}
                        {activeView === 'saas' && 'Aquí tienes un registro de las facturas que has pagado a Virtud SaaS por el uso de la plataforma del gimnasio.'}
                        {activeView === 'saas_billing' && 'Consulta el costo fijo mensual de tu plan, revisa tus consumos de Inteligencia Artificial (procesamiento de video biomecánico y generación automática de rutinas) y carga saldo de créditos.'}
                    </p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeView !== 'saas_billing' ? (
                    <motion.div
                        key="standard_finance"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8 relative z-10"
                    >
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {activeView === 'members' ? (
                                <>
                                    <StatCard
                                        title="Ingresos por Alumnos"
                                        value={`$${totalRevenue.toLocaleString('es-AR')}`}
                                        desc="Dinero total cobrado a tus alumnos este mes"
                                        icon={<DollarSign className="text-emerald-400" />}
                                        color="text-emerald-400"
                                    />
                                    <StatCard
                                        title="Transacciones"
                                        value={memberPayments.length.toString()}
                                        desc="Pagos de alumnos procesados con éxito"
                                        icon={<CreditCard className="text-teal-400" />}
                                        color="text-teal-400"
                                    />
                                    <StatCard
                                        title="Ticket Promedio"
                                        value={`$${(memberPayments.length > 0 ? Math.round(totalRevenue / memberPayments.length) : 0).toLocaleString('es-AR')}`}
                                        desc="Monto promedio cobrado por alumno"
                                        icon={<TrendingUp className="text-emerald-300" />}
                                        color="text-emerald-300"
                                    />
                                </>
                            ) : (
                                <>
                                    <StatCard
                                        title="Inversión en Licencia"
                                        value={`$${saasRevenue.toLocaleString('es-AR')}`}
                                        desc="Total invertido en el uso de la plataforma"
                                        icon={<TrendingUp className="text-blue-400" />}
                                        color="text-blue-400"
                                    />
                                    <StatCard
                                        title="Facturas Pagadas"
                                        value={saasPayments.length.toString()}
                                        desc="Comprobantes de servicio emitidos y abonados"
                                        icon={<CreditCard className="text-indigo-400" />}
                                        color="text-indigo-400"
                                    />
                                    <StatCard
                                        title="Estado de Cuenta"
                                        value={gymInfo?.estado_pago_saas === 'active' ? 'Al día' : 'Pendiente'}
                                        desc="Situación de la licencia con Virtud SaaS"
                                        icon={<CheckCircle2 className="text-emerald-400" />}
                                        color={gymInfo?.estado_pago_saas === 'active' ? 'text-emerald-400' : 'text-red-400'}
                                    />
                                </>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="bg-[#121214]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Filtrar por Sucursal</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                        <select
                                            value={selectedGym}
                                            onChange={e => setSelectedGym(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white appearance-none focus:outline-none focus:border-emerald-500/50 transition-all text-xs font-bold uppercase tracking-widest cursor-pointer"
                                        >
                                            <option value="all" className="bg-[#121214]">Ver todas las sucursales</option>
                                            {gyms.map(g => (
                                                <option key={g.id} value={g.id} className="bg-[#121214]">{g.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 flex-col sm:flex-row">
                                    <DateFilter label="Desde el día" value={startDate} onChange={setStartDate} />
                                    <DateFilter label="Hasta el día" value={endDate} onChange={setEndDate} />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-white/5 gap-4">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                    Mostrando últimos {activeView === 'members' ? memberPayments.length : saasPayments.length} movimientos encontrados
                                </p>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:text-white transition-all border border-white/5 hover:border-white/10">
                                    <Download size={14} /> Exportar Datos
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="py-20 flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Buscando cobros registrados...</p>
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
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8 relative z-10"
                    >
                        {/* LOW BALANCE ALERT */}
                        {billingSummary && billingSummary.saldoCreditos < alertThreshold && (
                            <motion.div
                                initial={{ scale: 0.98 }}
                                animate={{ scale: 1 }}
                                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                                className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center gap-4 shadow-lg shadow-amber-500/5"
                            >
                                <ShieldAlert className="text-amber-400 animate-pulse shrink-0" size={28} />
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase text-amber-400 tracking-wider">⚠️ ¡Saldo de Inteligencia Artificial Bajo!</p>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">
                                        Tu saldo disponible de IA (${billingSummary.saldoCreditos.toFixed(2)} USD) es menor al aviso configurado (${alertThreshold} USD). Te sugerimos cargar saldo para evitar que las funciones inteligentes se desactiven.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Top Portal Banner */}
                        <div className="bg-[#121214]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 opacity-40" />
                            <div>
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    Detalle del Plan y Consumos
                                </span>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-wider mt-2.5">
                                    Costo Mensual y Uso del Sistema
                                </h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                    Revisa la cuota de tu plan, gastos de Inteligencia Artificial y configura tus pagos.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Tipo de Plan:</span>
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {billingSummary?.modeloFacturacion === 'consumo' ? 'Pago Solo por lo que Usas' : billingSummary?.modeloFacturacion === 'hibrido' ? 'Plan Fijo + Variables de IA' : 'Plan Mensual Fijo'}
                                </span>
                            </div>
                        </div>

                        {/* Interactive Wallet & Scenario Cockpit */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* AI Wallet Card */}
                            <div className="bg-[#121214]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                                                <Wallet size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-white uppercase tracking-wider">Monedero de Inteligencia Artificial</h4>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Saldo prepago para funciones inteligentes</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Saldo disponible</span>
                                            <p className="text-2xl font-black text-emerald-400 leading-none italic mt-0.5">
                                                ${billingSummary ? billingSummary.saldoCreditos.toFixed(2) : '0.00'} USD
                                            </p>
                                        </div>
                                    </div>

                                    {/* Clarifying info about IA Credits */}
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6">
                                        <div className="flex gap-2.5 items-start">
                                            <HelpCircle size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-zinc-400 leading-relaxed font-bold uppercase">
                                                ¿Qué son los créditos de IA?
                                                <span className="block mt-1 font-medium normal-case">
                                                    La plataforma utiliza modelos de IA para analizar videos de ejercicios biomecánicos y generar rutinas personalizadas. Cada acción consume créditos. Puedes cargar saldo aquí para ir descontándolo.
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Configuration Alert slider */}
                                    <div className="space-y-6 border-t border-b border-white/5 py-6 mb-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-zinc-500">Avisarme cuando mi saldo sea menor a:</span>
                                                <span className="text-amber-400">${alertThreshold} USD</span>
                                            </div>
                                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                                {[5, 10, 20].map(val => (
                                                    <button
                                                        key={val}
                                                        disabled={updatingWallet}
                                                        onClick={() => handleUpdateBillingConfig(val, billingMethod)}
                                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${alertThreshold === val
                                                                ? 'bg-amber-500 text-black shadow-md font-black'
                                                                : 'text-zinc-500 hover:text-white'
                                                            }`}
                                                    >
                                                        ${val} USD
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Switch for Overage billing method */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/30 p-4 rounded-2xl border border-white/5">
                                            <div>
                                                <h5 className="text-[10px] font-black text-white uppercase tracking-wider">Pago de consumos extras</h5>
                                                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 leading-normal">
                                                    {billingMethod === 'prepago'
                                                        ? 'Descontar automáticamente de mi saldo prepago de IA'
                                                        : 'Sumar consumos extras a mi factura mensual al final del mes'}
                                                </p>
                                            </div>
                                            <div className="flex bg-[#121214] p-1 rounded-xl border border-white/5 shrink-0 self-end sm:self-auto">
                                                {[
                                                    { id: 'prepago', label: 'Saldo Prepago' },
                                                    { id: 'postpago', label: 'En la Factura' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        disabled={updatingWallet}
                                                        onClick={() => handleUpdateBillingConfig(alertThreshold, opt.id as any)}
                                                        className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${billingMethod === opt.id
                                                                ? 'bg-emerald-600 text-white font-black'
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

                                {/* Recharge Credits Form */}
                                <form onSubmit={handleRechargeWallet} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Monto a Cargar (en dólares USD)</label>
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="500"
                                                    placeholder="Ej. $10, $20 (Mínimo $5 USD)"
                                                    value={rechargeAmount}
                                                    onChange={e => setRechargeAmount(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-3.5 text-xs text-white uppercase font-bold tracking-wider focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700 font-mono"
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
                                        *Los pagos se procesan de forma simulada en entorno de pruebas y el saldo se acredita inmediatamente.
                                    </p>
                                </form>
                            </div>

                            {/* Monthly consumption limits */}
                            <div className="bg-[#121214]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4">Consumo de Inteligencia Artificial este Mes</h4>

                                    <div className="space-y-6">
                                        {/* Videos progress bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-zinc-400">Análisis biomecánicos en video</span>
                                                <span className="text-white font-mono">
                                                    {billingSummary ? billingSummary.videosProcesados : 0} {billingSummary?.modeloFacturacion === 'hibrido' ? `/ ${billingSummary.limiteVideosHibrido} incl.` : ''}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                                    style={{ width: `${billingSummary ? Math.min(100, (billingSummary.videosProcesados / (billingSummary.limiteVideosHibrido || 50)) * 100) : 0}%` }}
                                                />
                                            </div>
                                            {billingSummary?.extraVideos > 0 && (
                                                <p className="text-[8px] font-black text-amber-400 uppercase tracking-wider">
                                                    +${billingSummary.costoExtraVideos.toFixed(2)} USD extra ({billingSummary.extraVideos} videos adicionales)
                                                </p>
                                            )}
                                        </div>

                                        {/* Routines progress bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-zinc-400">Creación de rutinas automáticas</span>
                                                <span className="text-white font-mono">
                                                    {billingSummary ? billingSummary.rutinasIA : 0} {billingSummary?.modeloFacturacion === 'hibrido' ? `/ ${billingSummary.limiteRutinasHibrido} incl.` : ''}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-teal-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                                                    style={{ width: `${billingSummary ? Math.min(100, (billingSummary.rutinasIA / (billingSummary.limiteRutinasHibrido || 100)) * 100) : 0}%` }}
                                                />
                                            </div>
                                            {billingSummary?.extraRoutines > 0 && (
                                                <p className="text-[8px] font-black text-amber-400 uppercase tracking-wider">
                                                    +${billingSummary.costoExtraRutinas.toFixed(2)} USD extra ({billingSummary.extraRoutines} rutinas adicionales)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Upgrade callout */}
                                <div className="p-5 bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-3xl flex items-center justify-between gap-4 mt-6">
                                    <div className="space-y-1 flex-1">
                                        <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">¿Necesitas cupo ilimitado o ampliar tus límites?</p>
                                        <p className="text-[8px] text-zinc-500 leading-normal font-bold uppercase tracking-wider">
                                            Puedes cambiarte a un plan mensual mayor para incluir más cantidad de rutinas y videos biomecánicos cada mes.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => fetchSaaSPlansAndOpenModal()}
                                        disabled={loadingPlans}
                                        className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 transition-all font-black disabled:opacity-50"
                                    >
                                        {loadingPlans ? 'Cargando...' : 'Mejorar Plan'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Detailed invoice breakdown */}
                        {billingSummary && (
                            <div className="bg-[#121214]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Detalle del próximo pago estimado</h4>
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Desglose simple de la factura acumulada en el período actual</p>
                                </div>

                                <div className="space-y-4 pt-2">
                                    {/* Base Subscription Fee */}
                                    <div className="flex justify-between items-center text-xs font-medium">
                                        <span className="text-zinc-500 uppercase tracking-wider">Plan Base Mensual ({billingSummary.modeloFacturacion === 'consumo' ? 'Pago por uso' : 'Membresía del Sistema'})</span>
                                        <span className="text-white font-mono font-bold">${billingSummary.basePrice.toFixed(2)} USD</span>
                                    </div>

                                    {/* POS commissions */}
                                    {(billingSummary.modeloFacturacion === 'consumo' || billingSummary.modeloFacturacion === 'hibrido') && (
                                        <div className="flex justify-between items-center text-xs font-medium border-t border-white/5 pt-3">
                                            <span className="text-zinc-500 uppercase tracking-wider">Comisión por cobros con tarjeta (1.5% de los cobros de tus alumnos: ${billingSummary.volumenPOS.toFixed(2)} USD)</span>
                                            <span className="text-white font-mono font-bold">${billingSummary.comisionPOS.toFixed(2)} USD</span>
                                        </div>
                                    )}

                                    {/* Video IA Overage costs */}
                                    {billingSummary.modeloFacturacion === 'hibrido' && (
                                        <div className="flex justify-between items-center text-xs font-medium border-t border-white/5 pt-3">
                                            <span className="text-zinc-500 uppercase tracking-wider">Videos de ejercicios adicionales realizados ({billingSummary.extraVideos} videos extra)</span>
                                            <span className="text-white font-mono font-bold">${billingSummary.costoExtraVideos.toFixed(2)} USD</span>
                                        </div>
                                    )}

                                    {/* Routine IA Overage costs */}
                                    {billingSummary.modeloFacturacion === 'hibrido' && (
                                        <div className="flex justify-between items-center text-xs font-medium border-t border-white/5 pt-3">
                                            <span className="text-zinc-500 uppercase tracking-wider">Rutinas de entrenamiento adicionales creadas ({billingSummary.extraRoutines} rutinas extra)</span>
                                            <span className="text-white font-mono font-bold">${billingSummary.costoExtraRutinas.toFixed(2)} USD</span>
                                        </div>
                                    )}

                                    {/* Pure IA Consumption costs */}
                                    {billingSummary.modeloFacturacion === 'consumo' && (
                                        <>
                                            <div className="flex justify-between items-center text-xs font-medium border-t border-white/5 pt-3">
                                                <span className="text-zinc-500 uppercase tracking-wider">Análisis biomecánicos realizados ({billingSummary.videosProcesados} videos)</span>
                                                <span className="text-white font-mono font-bold">${billingSummary.costoVideosIA.toFixed(2)} USD</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-medium border-t border-white/5 pt-3">
                                                <span className="text-zinc-500 uppercase tracking-wider">Rutinas automáticas creadas ({billingSummary.rutinasIA} rutinas)</span>
                                                <span className="text-white font-mono font-bold">${billingSummary.costoRutinasIA.toFixed(2)} USD</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Wallet prepaid credits deduction */}
                                    {billingSummary.pagadoConCreditos > 0 && (
                                        <div className="flex justify-between items-center text-xs font-medium text-emerald-400 border-t border-white/5 pt-3 bg-emerald-500/5 px-3 py-2 rounded-xl">
                                            <span className="uppercase tracking-wider font-bold">Descuento aplicado por saldo de IA prepago</span>
                                            <span className="font-mono font-bold">-${billingSummary.pagadoConCreditos.toFixed(2)} USD</span>
                                        </div>
                                    )}

                                    {/* Grand Total */}
                                    <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-2">
                                        <span className="text-xs font-black uppercase text-white tracking-widest">Monto final estimado a pagar:</span>
                                        <span className="text-xl font-black text-emerald-400 italic font-mono">${billingSummary.totalAmount.toFixed(2)} USD</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Wallet movements log */}
                        {billingSummary && billingSummary.configuracion?.historial_recargas && (
                            <div className="space-y-4 pt-4">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">Historial de Cargas y Consumos de IA</h4>
                                <div className="space-y-3">
                                    {(billingSummary.configuracion.historial_recargas as any[]).length === 0 ? (
                                        <div className="py-8 text-center bg-white/5 rounded-2xl border border-white/5 opacity-50">
                                            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Aún no registras movimientos en tu saldo de IA</p>
                                        </div>
                                    ) : (
                                        [...(billingSummary.configuracion.historial_recargas as any[])]
                                            .reverse()
                                            .slice(0, 8)
                                            .map((tx: any, idx: number) => (
                                                <div key={idx} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${tx.monto > 0
                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                            }`}>
                                                            {tx.monto > 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingUp size={16} className="text-red-400 rotate-180" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-white uppercase tracking-tight">
                                                                {tx.monto > 0 ? 'Carga de saldo de IA' : 'Consumo de Inteligencia Artificial'}
                                                            </p>
                                                            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                                                Detalle: {tx.monto > 0 ? 'Carga prepaga exitosa' : (tx.metodo || 'Consumo directo del monedero')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-xs font-black font-mono ${tx.monto > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {tx.monto > 0 ? '+' : ''}${Number(tx.monto).toFixed(2)} USD
                                                        </p>
                                                        <p className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5 font-mono">
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
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Historial de Facturas del Sistema Pagadas</h4>
                            <div className="space-y-4">
                                {saasPayments.length === 0 ? <EmptyFinance /> : (
                                    saasPayments.slice(0, 5).map((p, i) => <SaaSPaymentRow key={p.id} payment={p} index={i} />)
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Planes del SaaS */}
            <AnimatePresence>
                {showPlansModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            transition={{ type: "spring", bounce: 0.15 }}
                            className="bg-[#121214] border border-white/10 rounded-[3rem] w-full max-w-5xl p-8 md:p-12 shadow-2xl relative my-8"
                        >
                            <button
                                onClick={() => setShowPlansModal(false)}
                                className="absolute top-6 right-6 w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center border border-white/5 text-zinc-400 hover:text-white transition-all z-10"
                            >
                                <XCircle size={20} />
                            </button>

                            <div className="text-center mb-10">
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    Planes SaaS Disponibles
                                </span>
                                <h3 className="text-3xl font-black text-white italic uppercase tracking-wider mt-3">
                                    Mejora tu plan de <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Suscripción</span>
                                </h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                    Selecciona el plan ideal para ampliar tus límites de alumnos y funciones biomecánicas
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                                {saasPlans.map((p, idx) => {
                                    const cleanFeatures = Array.isArray(p.caracteristicas)
                                        ? p.caracteristicas.map(mapFeatureToSpanish)
                                        : [];

                                    const finalFeatures = [
                                        `${p.limite_sucursales === 9999 || p.limite_sucursales === 0 ? 'Sedes ilimitadas' : `Hasta ${p.limite_sucursales} sedes`}`,
                                        `${p.limite_usuarios === 9999 || p.limite_usuarios === 0 ? 'Alumnos ilimitados' : `Hasta ${p.limite_usuarios} alumnos`}`,
                                        ...cleanFeatures
                                    ];

                                    const isCurrentPlan = gymInfo?.planes_suscripcion?.nombre === p.nombre || gymInfo?.plan_id === p.id;
                                    const isFeatured = idx === 1 || p.nombre.toLowerCase().includes('pro') || p.nombre.toLowerCase().includes('profesional');

                                    return (
                                        <div
                                            key={p.id}
                                            className={`p-8 rounded-[2.5rem] border flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${isCurrentPlan
                                                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.05)]'
                                                    : isFeatured
                                                        ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-500 shadow-xl shadow-emerald-900/20'
                                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            {isCurrentPlan && (
                                                <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">
                                                    Plan Activo
                                                </div>
                                            )}
                                            {!isCurrentPlan && isFeatured && (
                                                <div className="absolute top-0 right-0 bg-white text-black text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">
                                                    Recomendado
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="text-lg font-black italic uppercase tracking-tight text-white mb-4">
                                                    {p.nombre}
                                                </h4>
                                                <div className="flex items-baseline gap-1 mb-8">
                                                    <span className="text-4xl font-black italic tracking-tighter text-white font-mono">
                                                        ${p.precio_mensual.toLocaleString('es-AR')}
                                                    </span>
                                                    <span className={`text-[10px] font-bold ${isFeatured && !isCurrentPlan ? 'text-emerald-200' : 'text-zinc-500'}`}>
                                                        /mes
                                                    </span>
                                                </div>
                                                <ul className="space-y-3 mb-8">
                                                    {finalFeatures.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-[10px] font-bold uppercase tracking-wider text-left">
                                                            <CheckCircle2 size={12} className={`shrink-0 mt-0.5 ${isFeatured && !isCurrentPlan ? 'text-white' : 'text-emerald-400'}`} />
                                                            <span className={isFeatured && !isCurrentPlan ? 'text-white' : 'text-zinc-400'}>
                                                                {f}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <button
                                                disabled={isCurrentPlan || initiatingPaymentPlanId !== null}
                                                onClick={() => handleInitiatePlanPayment(p.id)}
                                                className={`w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${isCurrentPlan
                                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                                                        : isFeatured
                                                            ? 'bg-white text-emerald-950 hover:bg-zinc-100 shadow-md'
                                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    }`}
                                            >
                                                {initiatingPaymentPlanId === p.id
                                                    ? 'Procesando...'
                                                    : isCurrentPlan
                                                        ? 'Tu Plan Actual'
                                                        : `Elegir ${p.nombre}`}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatCard({ title, value, desc, icon, color }: { title: string, value: string, desc: string, icon: any, color: string }) {
    return (
        <div className="bg-[#121214]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 group hover:border-white/10 transition-all duration-300 relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
            </div>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{title}</h3>
            <p className={`text-4xl font-black italic uppercase leading-none tracking-tighter ${color}`}>{value}</p>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-tight mt-3">{desc}</p>
        </div>
    );
}

function DateFilter({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-2 w-full">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4 w-full">
                <Calendar size={14} className="text-zinc-500 mr-2 shrink-0" />
                <input
                    type="date"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="bg-transparent text-[10px] font-bold text-white uppercase focus:outline-none w-full cursor-pointer select-none"
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
            className="group bg-[#121214]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex items-center justify-between hover:border-emerald-500/20 transition-all duration-300 shadow-md"
        >
            <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${payment.estado === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    payment.estado === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                    {payment.estado === 'approved' ? <CheckCircle2 size={24} /> : payment.estado === 'pending' ? <Clock size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-xs font-black text-white italic uppercase tracking-tight">{payment.usuario?.nombre_completo}</span>
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{payment.metodo_pago}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                        <Building2 size={12} className="opacity-50" />
                        <span>{payment.gimnasio?.nombre || 'Red Global'}</span>
                        <div className="w-1 h-1 rounded-full bg-zinc-700 mx-1" />
                        <span>{payment.concepto}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-lg font-black text-white italic tracking-tighter mb-1 font-mono">${Number(payment.monto).toLocaleString()}</p>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest font-mono">{new Date(payment.creado_en).toLocaleString('es-AR')}</p>
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
            className="group bg-[#121214]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex items-center justify-between hover:border-blue-500/20 transition-all duration-300 shadow-md"
        >
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-black text-white italic uppercase tracking-tight">Licencia Mensual Virtud SaaS</span>
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Gasto de Licencia</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                        <Building2 size={12} className="opacity-50" />
                        <span className="text-zinc-300 font-black">{payment.gimnasio?.nombre}</span>
                        <div className="w-1 h-1 rounded-full bg-zinc-700 mx-1" />
                        <span className="font-mono text-[9px]">Ref: {payment.referencia_externa}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-lg font-black text-white italic tracking-tighter mb-1 font-mono">${Number(payment.monto).toLocaleString()}</p>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest font-mono">{new Date(payment.fecha_pago).toLocaleString('es-AR')}</p>
            </div>
        </motion.div>
    );
}

function EmptyFinance() {
    return (
        <div className="py-20 flex flex-col items-center justify-center opacity-30">
            <CreditCard size={40} className="text-white mb-4 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">No hay movimientos registrados en este período</p>
        </div>
    );
}
