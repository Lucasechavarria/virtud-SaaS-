'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ShoppingCart,
    CreditCard,
    Banknote,
    QrCode,
    User,
    X,
    Plus,
    Minus,
    AlertCircle,
    CheckCircle2,
    Loader2,
    DollarSign,
    Layers,
    ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

interface Product {
    id: string;
    nombre: string;
    descripcion?: string;
    precio_venta: number;
    stock_actual: number;
    categoria: string;
    url_imagen?: string;
}

interface Member {
    id: string;
    name: string;
    email: string;
    dni?: string;
    membershipStatus: string;
    membershipEnds?: string;
}

interface PaymentPending {
    id: string;
    monto: number;
    concepto: string;
    creado_en: string;
}

interface AccountStatus {
    saldoCuentaCorriente: number;
    limiteCredito: number;
    pagosPendientes: PaymentPending[];
    deudaTotal: number;
}

export default function POSPage() {
    const params = useParams();
    const tenantSlug = params.tenantSlug as string;

    const [searchTerm, setSearchTerm] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
    
    // Checkout states
    const [cart, setCart] = useState<Array<{ producto: Product; cantidad: number }>>([]);
    const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
    const [montoAbonoCC, setMontoAbonoCC] = useState<string>('');
    const [payMethod, setPayMethod] = useState<'efectivo' | 'tarjeta' | 'qr' | null>(null);

    // Loaders and UI feedback
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [loadingAccount, setLoadingAccount] = useState(false);
    const [processingSale, setProcessingSale] = useState(false);
    const [saleSuccess, setSaleSuccess] = useState<string | null>(null);
    const [saleError, setSaleError] = useState<string | null>(null);
    const [isSearchingMember, setIsSearchingMember] = useState(false);

    // 1. Cargar productos e integrantes al inicio
    useEffect(() => {
        loadProducts();
        loadMembers();
    }, [tenantSlug]);

    const loadProducts = async () => {
        try {
            setLoadingProducts(true);
            const url = tenantSlug ? `/api/admin/products?gymId=${tenantSlug}` : '/api/admin/products';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const loadMembers = async () => {
        try {
            setLoadingMembers(true);
            const url = tenantSlug ? `/api/admin/users/list?gymId=${tenantSlug}` : '/api/admin/users/list';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setMembers(data.users || []);
            }
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoadingMembers(false);
        }
    };

    // Cargar estado de cuenta del alumno seleccionado
    const loadAccountStatus = async (memberId: string) => {
        try {
            setLoadingAccount(true);
            const res = await fetch(`/api/admin/users/${memberId}/account-status`);
            if (res.ok) {
                const data = await res.json();
                setAccountStatus({
                    saldoCuentaCorriente: data.saldoCuentaCorriente,
                    limiteCredito: data.limiteCredito,
                    pagosPendientes: data.pagosPendientes || [],
                    deudaTotal: data.deudaTotal
                });
                // Autoseleccionar todos los pagos pendientes por defecto
                if (data.pagosPendientes) {
                    setSelectedPayments(data.pagosPendientes.map((p: any) => p.id));
                }
            }
        } catch (error) {
            console.error('Error loading account status:', error);
        } finally {
            setLoadingAccount(false);
        }
    };

    // Búsqueda reactiva local sobre socios
    const filteredMembers = memberSearch.length > 1
        ? members.filter(m => 
            m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
            (m.dni && m.dni.includes(memberSearch))
          )
        : [];

    const handleSelectMember = (member: Member) => {
        setSelectedMember(member);
        setMemberSearch('');
        setIsSearchingMember(false);
        loadAccountStatus(member.id);
    };

    const handleDeselectMember = () => {
        setSelectedMember(null);
        setAccountStatus(null);
        setSelectedPayments([]);
        setMontoAbonoCC('');
    };

    // Filter products in screen
    const filteredProducts = products.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    // Cart Actions
    const addToCart = (product: Product) => {
        // Validar si hay stock disponible antes de agregar o aumentar
        const existing = cart.find(item => item.producto.id === product.id);
        const currentQty = existing ? existing.cantidad : 0;
        
        if (currentQty >= product.stock_actual) {
            setSaleError(`No puedes agregar más unidades. Stock máximo disponible de ${product.nombre}: ${product.stock_actual}`);
            setTimeout(() => setSaleError(null), 4000);
            return;
        }

        setCart(prev => {
            if (existing) {
                return prev.map(item => item.producto.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item);
            }
            return [...prev, { producto: product, cantidad: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        setCart(prev => prev.map(item => {
            if (item.producto.id === productId) {
                const newQty = item.cantidad + delta;
                if (newQty > product.stock_actual) {
                    setSaleError(`Stock máximo alcanzado para ${product.nombre}`);
                    setTimeout(() => setSaleError(null), 3000);
                    return item;
                }
                return newQty > 0 ? { ...item, cantidad: newQty } : item;
            }
            return item;
        }).filter(item => item.cantidad > 0));
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.producto.id !== productId));
    };

    // Checkbox toggle para saldar cuotas
    const togglePaymentSelection = (paymentId: string) => {
        setSelectedPayments(prev => 
            prev.includes(paymentId) 
                ? prev.filter(id => id !== paymentId) 
                : [...prev, paymentId]
        );
    };

    // Cálculos del total
    const cartSubtotal = cart.reduce((sum, item) => sum + (item.producto.precio_venta * item.cantidad), 0);
    
    // Suma de las cuotas/pagos pendientes seleccionados
    const cuotasSubtotal = (accountStatus?.pagosPendientes || [])
        .filter(p => selectedPayments.includes(p.id))
        .reduce((sum, p) => sum + Number(p.monto), 0);

    const totalToPay = cartSubtotal + cuotasSubtotal + Number(montoAbonoCC || 0);

    // Checkout / Cobro en mostrador
    const handleCheckout = async (method: 'efectivo' | 'tarjeta' | 'qr') => {
        if (totalToPay <= 0) return;
        
        try {
            setPayMethod(method);
            setProcessingSale(true);
            setSaleError(null);
            setSaleSuccess(null);

            const payload = {
                socioId: selectedMember?.id || null,
                productos: cart.map(item => ({
                    producto_id: item.producto.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.producto.precio_venta
                })),
                pagosSaldar: selectedPayments,
                montoAbonoCC: Number(montoAbonoCC || 0),
                metodoPago: method,
                montoTotalCobrado: totalToPay,
                gymId: tenantSlug
            };

            const response = await fetch('/api/admin/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fallo al procesar la transacción');
            }

            // Éxito
            setSaleSuccess('¡Cobro realizado con éxito!');
            setCart([]);
            handleDeselectMember();
            
            // Recargar productos para actualizar stocks
            await loadProducts();
            
            setTimeout(() => setSaleSuccess(null), 5000);
        } catch (error: any) {
            console.error('Error during checkout:', error);
            setSaleError(error.message || 'Error inesperado al procesar el cobro');
        } finally {
            setProcessingSale(false);
            setPayMethod(null);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6 bg-[#0a0a0a] text-white overflow-hidden p-2 relative">
            
            {/* Notificaciones flotantes animadas */}
            <AnimatePresence>
                {saleSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 20, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white font-bold px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/30"
                    >
                        <CheckCircle2 size={24} />
                        <span>{saleSuccess}</span>
                    </motion.div>
                )}
                {saleError && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 20, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white font-bold px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500/30"
                    >
                        <AlertCircle size={24} />
                        <span>{saleError}</span>
                        <button onClick={() => setSaleError(null)} className="ml-2 hover:bg-white/10 p-1 rounded-full"><X size={16} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LADO IZQUIERDO: BÚSQUEDA Y PRODUCTOS */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                
                {/* Panel Búsqueda Alumno Top */}
                <div className="bg-[#1c1c1e] p-5 rounded-[2rem] border border-white/5 relative z-20 shadow-lg">
                    <div className="flex gap-4 items-center">
                        <User className="text-emerald-500" size={24} />
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder={loadingMembers ? "Cargando socios del gimnasio..." : "Buscar alumno por Nombre o DNI (para asociar ticket, saldar cuotas o cuenta corriente)"}
                                value={selectedMember ? selectedMember.name : memberSearch}
                                disabled={loadingMembers}
                                onChange={(e) => {
                                    setMemberSearch(e.target.value);
                                    if (selectedMember) handleDeselectMember();
                                    setIsSearchingMember(true);
                                }}
                                onFocus={() => setIsSearchingMember(true)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                            />
                            {/* Autocomplete Dropdown */}
                            <AnimatePresence>
                                {isSearchingMember && filteredMembers.length > 0 && !selectedMember && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full mt-2 w-full bg-[#2c2c2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50"
                                    >
                                        {filteredMembers.map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => handleSelectMember(m)}
                                                className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors"
                                            >
                                                <div>
                                                    <p className="font-bold text-gray-100">{m.name}</p>
                                                    <p className="text-xs text-gray-500">DNI: {m.dni || 'Sin DNI'} | {m.email}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {m.membershipStatus === 'active' ? (
                                                        <span className="text-emerald-500 text-xs font-black uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded">Al Día</span>
                                                    ) : (
                                                        <span className="text-amber-500 text-xs font-black uppercase tracking-wider bg-amber-500/10 px-2 py-1 rounded">{m.membershipStatus}</span>
                                                    )}
                                                    <ChevronRight size={16} className="text-gray-500" />
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {selectedMember && (
                            <button
                                onClick={handleDeselectMember}
                                className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                                title="Quitar socio del ticket"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Member Status Badge Detailed */}
                    <AnimatePresence>
                        {selectedMember && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                className="overflow-hidden rounded-xl border bg-black/40 border-white/10 p-4"
                            >
                                {loadingAccount ? (
                                    <div className="flex justify-center items-center py-2 gap-2 text-gray-500 text-sm">
                                        <Loader2 className="animate-spin text-emerald-500" size={16} />
                                        <span>Consultando cuentas y facturación...</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Estado membresía */}
                                        <div className="bg-[#2c2c2e]/40 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Membresía</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                {selectedMember.membershipStatus === 'active' ? (
                                                    <CheckCircle2 className="text-emerald-500" size={18} />
                                                ) : (
                                                    <AlertCircle className="text-amber-500" size={18} />
                                                )}
                                                <span className="font-bold text-sm">
                                                    {selectedMember.membershipStatus === 'active' ? 'ACTIVA (Al día)' : 'INACTIVA/PENDIENTE'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 mt-1">
                                                Vence: {selectedMember.membershipEnds ? new Date(selectedMember.membershipEnds).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>

                                        {/* Cuenta corriente saldo */}
                                        <div className="bg-[#2c2c2e]/40 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Saldo Cuenta Corriente</span>
                                            <p className={`text-lg font-black mt-1 ${accountStatus && accountStatus.saldoCuentaCorriente < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                ${accountStatus?.saldoCuentaCorriente.toLocaleString('es-AR') || 0}
                                            </p>
                                            <span className="text-[9px] text-gray-500">Límite crédito: ${accountStatus?.limiteCredito.toLocaleString('es-AR') || 0}</span>
                                        </div>

                                        {/* Deuda unificada */}
                                        <div className="bg-[#2c2c2e]/40 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Deuda Total Adeudada</span>
                                            <p className={`text-lg font-black mt-1 ${accountStatus && accountStatus.deudaTotal > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                ${accountStatus?.deudaTotal.toLocaleString('es-AR') || 0}
                                            </p>
                                            <span className="text-[9px] text-gray-500">Incluye cuotas vencidas y saldo negativo CC</span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Vitrina de Productos */}
                <div className="bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                            <ShoppingCart className="text-emerald-500" /> Catálogo de Productos
                        </h2>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 pb-10">
                        {loadingProducts ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                <Loader2 className="animate-spin text-emerald-500" size={36} />
                                <span className="text-sm font-bold uppercase italic">Cargando inventario...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredProducts.map(product => (
                                    <motion.div
                                        whileHover={product.stock_actual > 0 ? { scale: 1.02, y: -4 } : {}}
                                        whileTap={product.stock_actual > 0 ? { scale: 0.98 } : {}}
                                        key={product.id}
                                        onClick={() => product.stock_actual > 0 && addToCart(product)}
                                        className={`bg-black/40 rounded-2xl border overflow-hidden transition-all flex flex-col ${
                                            product.stock_actual > 0 
                                                ? 'cursor-pointer border-white/5 hover:border-emerald-500/40 group' 
                                                : 'opacity-50 border-red-500/20'
                                        }`}
                                    >
                                        <div className="h-32 w-full relative bg-white/5">
                                            {product.url_imagen ? (
                                                <Image src={product.url_imagen} alt={product.nombre} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-600">
                                                    <Layers size={32} />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur text-[10px] font-black uppercase text-gray-300 px-2 py-1 rounded-full">
                                                {product.categoria}
                                            </div>
                                            {product.stock_actual <= 0 && (
                                                <div className="absolute inset-0 bg-red-950/80 backdrop-blur-[1px] flex items-center justify-center">
                                                    <span className="text-red-400 text-xs font-black uppercase tracking-widest border border-red-500/30 px-3 py-1 rounded bg-black/60">Agotado</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-sm text-gray-200 line-clamp-2">{product.nombre}</h3>
                                                <p className="text-[10px] text-gray-500 mt-1">Stock: {product.stock_actual} u.</p>
                                            </div>
                                            <p className="text-emerald-400 font-black mt-2 text-lg italic">${product.precio_venta.toLocaleString('es-AR')}</p>
                                        </div>
                                    </motion.div>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-500 text-sm italic font-bold">
                                        No se encontraron productos en el inventario.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LADO DERECHO: TICKET VIRTUAL */}
            <div className="w-96 bg-[#1c1c1e] rounded-[2rem] border border-white/5 flex flex-col overflow-hidden relative z-30 shadow-2xl">
                
                <div className="p-5 border-b border-white/5 bg-black/20 flex items-center justify-between">
                    <h2 className="text-lg font-black italic uppercase tracking-tight">Ticket de Compra</h2>
                    {selectedMember && (
                        <div className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                            Asociado a: {selectedMember.name.split(' ')[0]}
                        </div>
                    )}
                </div>

                {/* Contenido del ticket */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence mode="popLayout">
                        {cart.length === 0 && selectedPayments.length === 0 && !montoAbonoCC && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-gray-600 gap-3"
                            >
                                <ShoppingCart size={48} className="opacity-20 animate-pulse" />
                                <p className="text-sm font-bold italic uppercase">Carrito vacío</p>
                            </motion.div>
                        )}

                        {/* 1. SECCIÓN CARRITO TIENDA */}
                        {cart.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Productos Tienda</span>
                                {cart.map((item) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        key={item.producto.id}
                                        className="bg-black/40 p-3 rounded-xl border border-white/5 flex gap-3 items-center"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{item.producto.nombre}</p>
                                            <p className="text-emerald-500 text-xs font-black">${(item.producto.precio_venta * item.cantidad).toLocaleString('es-AR')}</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-black/60 rounded-lg p-1 border border-white/10">
                                            <button onClick={() => updateQuantity(item.producto.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded-md"><Minus size={12} /></button>
                                            <span className="text-xs font-bold w-4 text-center">{item.cantidad}</span>
                                            <button onClick={() => updateQuantity(item.producto.id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded-md"><Plus size={12} /></button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.producto.id)} className="text-red-500 hover:text-red-400 p-2"><X size={16} /></button>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* 2. SECCIÓN COBRO DE CUOTAS / FACTURAS PENDIENTES */}
                        {selectedMember && accountStatus && accountStatus.pagosPendientes.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Cuotas / Pagos Pendientes</span>
                                <div className="space-y-2">
                                    {accountStatus.pagosPendientes.map((p) => {
                                        const isChecked = selectedPayments.includes(p.id);
                                        return (
                                            <div 
                                                key={p.id}
                                                onClick={() => togglePaymentSelection(p.id)}
                                                className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                                                    isChecked 
                                                        ? 'bg-amber-500/10 border-amber-500/40 text-white' 
                                                        : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/15'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={() => {}} // Manejado por onClick del contenedor
                                                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 bg-black/40 w-4 h-4 cursor-pointer"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold truncate">{p.concepto}</p>
                                                        <p className="text-[9px] text-gray-500">Emitido: {new Date(p.creado_en).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-amber-400 font-mono">${Number(p.monto).toLocaleString('es-AR')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. SECCIÓN ABONO EXTRA A CUENTA CORRIENTE */}
                        {selectedMember && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Abono Extra a Cuenta Corriente</span>
                                <div className="relative flex items-center bg-black/40 border border-white/5 rounded-xl px-3 focus-within:border-emerald-500 transition-colors">
                                    <DollarSign className="text-gray-500" size={16} />
                                    <input 
                                        type="number"
                                        min="0"
                                        placeholder="Monto a abonar (ej. regularizar saldo o dejar a favor)"
                                        value={montoAbonoCC}
                                        onChange={(e) => setMontoAbonoCC(e.target.value)}
                                        className="w-full bg-transparent border-0 text-xs py-3 px-2 text-white focus:outline-none focus:ring-0"
                                    />
                                    {montoAbonoCC && (
                                        <button onClick={() => setMontoAbonoCC('')} className="p-1 hover:bg-white/5 rounded-full text-gray-500"><X size={14} /></button>
                                    )}
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Resumen Total y Cobro */}
                <div className="p-5 bg-black/40 border-t border-white/5 backdrop-blur-md">
                    <div className="flex justify-between items-end mb-6">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total a Pagar</span>
                        <span className="text-4xl font-black italic text-emerald-400 tracking-tighter">${totalToPay.toLocaleString('es-AR')}</span>
                    </div>

                    <div className="space-y-3">
                        {/* Botón Cobro Efectivo */}
                        <button
                            className="w-full relative overflow-hidden group bg-gradient-to-r from-emerald-600 to-green-500 text-white font-black italic uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:grayscale"
                            disabled={totalToPay === 0 || processingSale}
                            onClick={() => handleCheckout('efectivo')}
                        >
                            {processingSale && payMethod === 'efectivo' ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <Banknote size={20} className="relative z-10" />
                            )}
                            <span className="relative z-10">{processingSale && payMethod === 'efectivo' ? 'Procesando...' : 'Cobro Efectivo'}</span>
                        </button>

                        {/* Botones de Cobro MercadoPago / Tarjetas */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="w-full relative overflow-hidden group bg-[#111] hover:bg-[#222] border border-white/10 hover:border-blue-500/50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:grayscale"
                                disabled={totalToPay === 0 || processingSale}
                                onClick={() => handleCheckout('qr')}
                            >
                                {processingSale && payMethod === 'qr' ? (
                                    <Loader2 className="animate-spin text-blue-400" size={16} />
                                ) : (
                                    <QrCode size={18} className="text-blue-400" />
                                )}
                                <span>{processingSale && payMethod === 'qr' ? 'Cobrando...' : 'MercadoPago'}</span>
                            </button>
                            <button
                                className="w-full relative overflow-hidden group bg-[#111] hover:bg-[#222] border border-white/10 hover:border-purple-500/50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:grayscale"
                                disabled={totalToPay === 0 || processingSale}
                                onClick={() => handleCheckout('tarjeta')}
                            >
                                {processingSale && payMethod === 'tarjeta' ? (
                                    <Loader2 className="animate-spin text-purple-400" size={16} />
                                ) : (
                                    <CreditCard size={18} className="text-purple-400" />
                                )}
                                <span>{processingSale && payMethod === 'tarjeta' ? 'Cobrando...' : 'Tarjetas'}</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
