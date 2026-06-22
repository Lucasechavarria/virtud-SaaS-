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
    ChevronRight,
    TrendingUp,
    ArrowDownRight,
    History,
    Calendar,
    Clock
} from 'lucide-react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';

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

interface GymPlan {
    id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    duracion_meses: number;
    esta_activo: boolean;
}

interface SaleDetails {
    socio: Member | null;
    productos: Array<{ nombre: string; cantidad: number; subtotal: number }>;
    membresia: { nombre: string; precio: number } | null;
    cuotasSaldadas: number;
    abonoCC: number;
    total: number;
    metodoPago: string;
    ticketNum: string;
}

export default function POSPage() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;
    const searchParams = useSearchParams();
    const socioId = searchParams.get('socioId');

    const [searchTerm, setSearchTerm] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [gymPlans, setGymPlans] = useState<GymPlan[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
    
    // Checkout states
    const [cart, setCart] = useState<Array<{ producto: Product; cantidad: number }>>([]);
    const [selectedPlan, setSelectedPlan] = useState<GymPlan | null>(null);
    const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
    const [montoAbonoCC, setMontoAbonoCC] = useState<string>('');
    const [payMethod, setPayMethod] = useState<'efectivo' | 'tarjeta' | 'qr' | null>(null);

    // Tab Control
    const [activeTab, setActiveTab] = useState<'tienda' | 'membresias' | 'caja'>('tienda');

    // Loaders and UI feedback
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [loadingAccount, setLoadingAccount] = useState(false);
    const [processingSale, setProcessingSale] = useState(false);
    const [saleSuccess, setSaleSuccess] = useState<string | null>(null);
    const [saleError, setSaleError] = useState<string | null>(null);
    const [isSearchingMember, setIsSearchingMember] = useState(false);

    // Modal Post-Cobro
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastSaleDetails, setLastSaleDetails] = useState<SaleDetails | null>(null);

    // CAJA Y ARQUEO DIARIO STATES
    const [aperturaMonto, setAperturaMonto] = useState('');
    const [openingCashRegister, setOpeningCashRegister] = useState(false);
    const [aperturaError, setAperturaError] = useState<string | null>(null);
    const [isCashRegisterOpen, setIsCashRegisterOpen] = useState<boolean>(true);
    const [cajaTurno, setCajaTurno] = useState<any>(null);

    // Egresos menores
    const [showEgresoModal, setShowEgresoModal] = useState(false);
    const [egresoConcepto, setEgresoConcepto] = useState('');
    const [egresoMonto, setEgresoMonto] = useState('');

    // Arqueo y Cierre
    const [showArqueoModal, setShowArqueoModal] = useState(false);
    const [efectivoDeclarado, setEfectivoDeclarado] = useState('');
    const [tarjetaDeclarado, setTarjetaDeclarado] = useState('');
    const [qrDeclarado, setQrDeclarado] = useState('');
    const [closingCashRegister, setClosingCashRegister] = useState(false);
    const [cashHistory, setCashHistory] = useState<any[]>([]);
    const [loadingCashHistory, setLoadingCashHistory] = useState(false);

    // 1. Cargar productos, integrantes y planes al inicio
    useEffect(() => {
        loadProducts();
        loadMembers();
        loadPlans();
    }, [tenantSlug]);

    // 2. Verificar estado de caja contra el servidor (con fallback local)
    const checkCashRegisterStatus = async () => {
        try {
            const url = tenantSlug ? `/api/admin/reception/cash-status?gymId=${tenantSlug}` : '/api/admin/reception/cash-status';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.isOpen) {
                    setIsCashRegisterOpen(true);
                    
                    const turnoObj = {
                        estado: 'abierta',
                        montoInicial: data.montoInicial,
                        fechaApertura: data.fechaApertura,
                        egresos: data.egresos || [],
                        ventasEfectivo: data.ventasEfectivo || 0,
                        ventasTarjeta: data.ventasTarjeta || 0,
                        ventasQR: data.ventasQR || 0
                    };
                    
                    setCajaTurno(turnoObj);
                    localStorage.setItem('virtud_caja_turno', JSON.stringify(turnoObj));
                } else {
                    setIsCashRegisterOpen(false);
                    setCajaTurno(null);
                    localStorage.removeItem('virtud_caja_turno');
                }
            } else {
                loadLocalCashRegister();
            }
        } catch (e) {
            console.error('Error checking cash status from server:', e);
            loadLocalCashRegister();
        }
    };

    const loadLocalCashRegister = () => {
        const stored = localStorage.getItem('virtud_caja_turno');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.estado === 'abierta') {
                    setIsCashRegisterOpen(true);
                    setCajaTurno(parsed);
                } else {
                    setIsCashRegisterOpen(false);
                }
            } catch (e) {
                setIsCashRegisterOpen(false);
            }
        } else {
            setIsCashRegisterOpen(false);
        }
    };

    useEffect(() => {
        checkCashRegisterStatus();
        loadCashHistory();
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

    const loadPlans = async () => {
        try {
            setLoadingPlans(true);
            const url = tenantSlug ? `/api/admin/gym-plans?gymId=${tenantSlug}` : '/api/admin/gym-plans';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setGymPlans(data.plans || []);
            }
        } catch (error) {
            console.error('Error loading plans:', error);
        } finally {
            setLoadingPlans(false);
        }
    };

    const loadCashHistory = async () => {
        try {
            setLoadingCashHistory(true);
            const url = tenantSlug ? `/api/admin/reception/cash-history?gymId=${tenantSlug}` : '/api/admin/reception/cash-history';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setCashHistory(data.history || []);
            }
        } catch (error) {
            console.error('Error loading cash history:', error);
        } finally {
            setLoadingCashHistory(false);
        }
    };

    // Global USB Keyboard Barcode Scanner Listener (captures fast consecutive keystrokes)
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ignore if caja is not open
            if (!isCashRegisterOpen) return;

            // Ignore keystrokes if focused inside a text input or textarea
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                return;
            }

            const currentTime = Date.now();
            
            // If delay between keystrokes is more than 50ms, reset buffer (it's manual user typing)
            if (currentTime - lastKeyTime > 50) {
                buffer = '';
            }

            lastKeyTime = currentTime;

            if (e.key === 'Enter') {
                if (buffer.length > 0) {
                    // Try exact match by ID or sanitised name
                    const matchedProduct = products.find(p => 
                        p.id.toLowerCase() === buffer.toLowerCase() ||
                        p.nombre.toLowerCase().replace(/\s/g, '') === buffer.toLowerCase()
                    );
                    
                    if (matchedProduct) {
                        const inCartQty = cart.find(item => item.producto.id === matchedProduct.id)?.cantidad || 0;
                        if (inCartQty < matchedProduct.stock_actual) {
                            addToCart(matchedProduct);
                            // Trigger dynamic confirmation beep
                            try {
                                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                                const osc = ctx.createOscillator();
                                const gain = ctx.createGain();
                                osc.connect(gain);
                                gain.connect(ctx.destination);
                                osc.type = 'sine';
                                osc.frequency.setValueAtTime(1000, ctx.currentTime);
                                gain.gain.setValueAtTime(0.04, ctx.currentTime);
                                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                                osc.start();
                                osc.stop(ctx.currentTime + 0.1);
                            } catch (_) {}
                        }
                    }
                    buffer = '';
                }
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [products, cart, isCashRegisterOpen]);

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

    // Efecto para precargar el alumno si viene socioId en la URL
    useEffect(() => {
        if (socioId && members.length > 0) {
            const memberToSelect = members.find(m => m.id === socioId);
            if (memberToSelect) {
                handleSelectMember(memberToSelect);
                // Limpiar query param de la URL de forma segura
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [socioId, members]);

    const handleDeselectMember = () => {
        setSelectedMember(null);
        setAccountStatus(null);
        setSelectedPayments([]);
        setMontoAbonoCC('');
        setSelectedPlan(null);
    };

    // Filter products in screen
    const filteredProducts = products.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    // Cart Actions
    const addToCart = (product: Product) => {
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
    const planSubtotal = selectedPlan ? Number(selectedPlan.precio) : 0;
    
    // Suma de las cuotas/pagos pendientes seleccionados
    const cuotasSubtotal = (accountStatus?.pagosPendientes || [])
        .filter(p => selectedPayments.includes(p.id))
        .reduce((sum, p) => sum + Number(p.monto), 0);

    const totalToPay = cartSubtotal + cuotasSubtotal + Number(montoAbonoCC || 0) + planSubtotal;

    // Abrir Caja en base de datos y localStorage
    const handleOpenCashRegister = async () => {
        const monto = Number(aperturaMonto);
        if (isNaN(monto) || monto < 0) {
            setAperturaError('Monto inicial debe ser un número positivo.');
            return;
        }

        try {
            setOpeningCashRegister(true);
            setAperturaError(null);

            const res = await fetch('/api/admin/reception/cash-open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ montoInicial: monto })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Fallo al iniciar caja en el servidor');
            }

            const nuevoTurno = {
                estado: 'abierta',
                montoInicial: monto,
                fechaApertura: new Date().toISOString(),
                egresos: [],
                ventasEfectivo: 0,
                ventasTarjeta: 0,
                ventasQR: 0
            };

            localStorage.setItem('virtud_caja_turno', JSON.stringify(nuevoTurno));
            setCajaTurno(nuevoTurno);
            setIsCashRegisterOpen(true);
            
            // Sincronizar inmediatamente con el servidor
            await checkCashRegisterStatus();

            setAperturaMonto('');
            setSaleSuccess('¡Caja iniciada exitosamente!');
            setTimeout(() => setSaleSuccess(null), 3000);

        } catch (err: any) {
            setAperturaError(err.message || 'Error al iniciar caja.');
        } finally {
            setOpeningCashRegister(false);
        }
    };

    // Actualizar ventas de caja en localStorage
    const updateCashRegisterVentas = (metodo: 'efectivo' | 'tarjeta' | 'qr', monto: number) => {
        const stored = localStorage.getItem('virtud_caja_turno');
        if (!stored) return;

        try {
            const parsed = JSON.parse(stored);
            if (parsed.estado !== 'abierta') return;

            if (metodo === 'efectivo') parsed.ventasEfectivo = (parsed.ventasEfectivo || 0) + monto;
            else if (metodo === 'tarjeta') parsed.ventasTarjeta = (parsed.ventasTarjeta || 0) + monto;
            else if (metodo === 'qr') parsed.ventasQR = (parsed.ventasQR || 0) + monto;

            localStorage.setItem('virtud_caja_turno', JSON.stringify(parsed));
            setCajaTurno(parsed);
        } catch (e) {
            console.error('Error al registrar venta en caja local:', e);
        }
    };

    // Registrar egreso menor en servidor y local
    const handleAddEgreso = async () => {
        const monto = Number(egresoMonto);
        if (!egresoConcepto.trim() || isNaN(monto) || monto <= 0) {
            alert('Introduce concepto y monto mayor a cero.');
            return;
        }

        try {
            const res = await fetch('/api/admin/reception/cash-egreso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    concepto: egresoConcepto.trim(),
                    monto: monto
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al registrar egreso en el servidor');
            }

            // Sincronizar estado completo del servidor
            await checkCashRegisterStatus();

            setEgresoConcepto('');
            setEgresoMonto('');
            setShowEgresoModal(false);
            setSaleSuccess('Egreso registrado correctamente');
            setTimeout(() => setSaleSuccess(null), 3000);
        } catch (e: any) {
            console.error('Error registering egreso:', e);
            alert(e.message || 'Error al guardar el egreso');
        }
    };

    // Confirmar arqueo y enviar cierre al servidor
    const handleCloseCashRegister = async () => {
        const efDec = Number(efectivoDeclarado);
        const tjDec = Number(tarjetaDeclarado);
        const qrDec = Number(qrDeclarado);

        if (isNaN(efDec) || isNaN(tjDec) || isNaN(qrDec) || efDec < 0 || tjDec < 0 || qrDec < 0) {
            alert('Por favor declare montos válidos mayores o iguales a cero.');
            return;
        }

        const stored = localStorage.getItem('virtud_caja_turno');
        if (!stored) return;

        try {
            setClosingCashRegister(true);
            const parsed = JSON.parse(stored);
            
            const totalEgresos = (parsed.egresos || []).reduce((acc: number, curr: any) => acc + curr.monto, 0);
            
            const efEsperado = parsed.montoInicial + parsed.ventasEfectivo - totalEgresos;
            const tjEsperado = parsed.ventasTarjeta;
            const qrEsperado = parsed.ventasQR;

            const difEf = efDec - efEsperado;
            const difTj = tjDec - tjEsperado;
            const difQr = qrDec - qrEsperado;

            const payload = {
                montoInicial: parsed.montoInicial,
                ventasEfectivo: parsed.ventasEfectivo,
                ventasTarjeta: parsed.ventasTarjeta,
                ventasQR: parsed.ventasQR,
                egresos: parsed.egresos,
                efectivoDeclarado: efDec,
                tarjetaDeclarado: tjDec,
                qrDeclarado: qrDec,
                diferenciaEfectivo: difEf,
                diferenciaTarjeta: difTj,
                diferenciaQR: difQr,
                fechaApertura: parsed.fechaApertura,
                fechaCierre: new Date().toISOString()
            };

            const res = await fetch('/api/admin/reception/cash-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al guardar arqueo de caja');
            }

            localStorage.removeItem('virtud_caja_turno');
            setCajaTurno(null);
            setIsCashRegisterOpen(false);
            
            setEfectivoDeclarado('');
            setTarjetaDeclarado('');
            setQrDeclarado('');
            setShowArqueoModal(false);
            
            setSaleSuccess('¡Cierre de caja y arqueo registrado correctamente!');
            setTimeout(() => setSaleSuccess(null), 4000);

            await loadCashHistory();

        } catch (err: any) {
            alert(err.message || 'Error al procesar el arqueo de caja.');
        } finally {
            setClosingCashRegister(false);
        }
    };

    // Checkout / Cobro en mostrador
    const handleCheckout = async (method: 'efectivo' | 'tarjeta' | 'qr') => {
        if (totalToPay <= 0) return;
        
        if (selectedPlan && !selectedMember) {
            setSaleError('Debe seleccionar un socio primero para poder vender una membresía.');
            setTimeout(() => setSaleError(null), 4000);
            return;
        }
        
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
                gymId: tenantSlug,
                membresia: selectedPlan ? {
                    planId: selectedPlan.id,
                    precio: selectedPlan.precio,
                    nombre: selectedPlan.nombre,
                    duracionMeses: selectedPlan.duracion_meses
                } : null
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

            // Guardar detalles de la transacción para el modal de ticket impreso
            const ticketNum = data.ventaId ? data.ventaId.substring(0, 8).toUpperCase() : Math.random().toString(36).substring(2, 10).toUpperCase();
            
            const details = {
                socio: selectedMember,
                productos: cart.map(item => ({
                    nombre: item.producto.nombre,
                    cantidad: item.cantidad,
                    subtotal: item.producto.precio_venta * item.cantidad
                })),
                membresia: selectedPlan ? { nombre: selectedPlan.nombre, precio: selectedPlan.precio } : null,
                cuotasSaldadas: cuotasSubtotal,
                abonoCC: Number(montoAbonoCC || 0),
                total: totalToPay,
                metodoPago: method,
                ticketNum
            };

            setLastSaleDetails(details);
            setShowSuccessModal(true);

            // Registrar la venta en la caja chica local
            updateCashRegisterVentas(method, totalToPay);

            // Sincronizar con el servidor tras un breve delay (asegurar commit del RPC)
            setTimeout(() => checkCashRegisterStatus(), 1000);

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

    // Atajos de teclado rápidos (únicamente en vista de escritorio)
    useEffect(() => {
        const handleAtajosKeyDown = (e: KeyboardEvent) => {
            // Validar que estemos en una resolución de escritorio (ancho >= 1024px)
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                return;
            }

            // 1. Cerrar modales con la tecla Escape
            if (e.key === 'Escape') {
                if (showSuccessModal) {
                    setShowSuccessModal(false);
                    e.preventDefault();
                    return;
                }
                if (showEgresoModal) {
                    setShowEgresoModal(false);
                    e.preventDefault();
                    return;
                }
                if (showArqueoModal) {
                    setShowArqueoModal(false);
                    e.preventDefault();
                    return;
                }
            }

            // Ignorar atajos si el foco está en un input/textarea (excepto para Escape)
            const activeEl = document.activeElement;
            const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
            if (isInputFocused) return;

            // Si la caja no está abierta, no permitir los demás atajos
            if (!isCashRegisterOpen) return;

            // 2. Navegación de Pestañas con F1, F2, F3
            if (e.key === 'F1') {
                e.preventDefault();
                setActiveTab('tienda');
            } else if (e.key === 'F2') {
                e.preventDefault();
                setActiveTab('membresias');
            } else if (e.key === 'F3') {
                e.preventDefault();
                setActiveTab('caja');
            }

            // 3. Confirmación de Cobros con F8, F9, F10
            if (totalToPay > 0 && !processingSale) {
                if (e.key === 'F8') {
                    e.preventDefault();
                    handleCheckout('efectivo');
                } else if (e.key === 'F9') {
                    e.preventDefault();
                    handleCheckout('tarjeta');
                } else if (e.key === 'F10') {
                    e.preventDefault();
                    handleCheckout('qr');
                }
            }
        };

        window.addEventListener('keydown', handleAtajosKeyDown);
        return () => window.removeEventListener('keydown', handleAtajosKeyDown);
    }, [
        isCashRegisterOpen,
        showSuccessModal,
        showEgresoModal,
        showArqueoModal,
        totalToPay,
        processingSale,
        handleCheckout
    ]);

    // BLOQUEO DE PÁGINA SI LA CAJA ESTÁ CERRADA
    if (!isCashRegisterOpen) {
        return (
            <div className="flex h-[calc(100vh-8rem)] bg-[#0a0a0a] text-white items-center justify-center p-6 relative">
                
                {/* Notificaciones flotantes */}
                <AnimatePresence>
                    {saleSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -50 }}
                            animate={{ opacity: 1, y: 20 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white font-bold px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/30"
                        >
                            <CheckCircle2 size={24} />
                            <span>{saleSuccess}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col lg:flex-row w-full max-w-6xl gap-8 overflow-hidden h-full py-4">
                    
                    {/* MODAL APERTURA DE CAJA */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#1c1c1e] border border-white/5 p-10 rounded-[3rem] flex-1 flex flex-col justify-center text-center shadow-2xl relative"
                    >
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/25 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500">
                            <Banknote size={40} />
                        </div>
                        <h2 className="text-3xl font-black italic uppercase text-white tracking-tight mb-2">Apertura de Caja</h2>
                        <p className="text-sm text-gray-400 mb-8 leading-relaxed max-w-md mx-auto">
                            Para comenzar a realizar cobros y facturar en el Punto de Venta (POS), debes iniciar tu turno declarando el fondo inicial en efectivo de tu caja.
                        </p>

                        <div className="space-y-4 text-left max-w-sm w-full mx-auto">
                            <label className="text-xs uppercase font-black tracking-widest text-gray-500">Fondo Inicial en Efectivo (Caja Chica)</label>
                            <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl px-4 focus-within:border-emerald-500 transition-colors">
                                <DollarSign className="text-gray-500 shrink-0" size={18} />
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Ej: 5000"
                                    value={aperturaMonto}
                                    onChange={(e) => setAperturaMonto(e.target.value)}
                                    className="w-full bg-transparent border-0 text-base py-4 px-2 text-white focus:outline-none focus:ring-0 font-bold"
                                />
                            </div>
                        </div>

                        {aperturaError && (
                            <p className="text-red-500 text-xs font-bold mt-4 flex items-center gap-1 justify-center">
                                <AlertCircle size={14} /> {aperturaError}
                            </p>
                        )}

                        <div className="max-w-sm w-full mx-auto">
                            <button
                                onClick={handleOpenCashRegister}
                                disabled={openingCashRegister || !aperturaMonto || Number(aperturaMonto) < 0}
                                className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-black font-black italic uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {openingCashRegister ? <Loader2 className="animate-spin text-black" size={18} /> : null}
                                <span>{openingCashRegister ? 'Abriendo Turno...' : 'Iniciar Caja y Turno'}</span>
                            </button>
                        </div>
                    </motion.div>

                    {/* HISTORIAL DE CIERRES PREVIOS AL COSTADO */}
                    <div className="w-full lg:w-[26rem] bg-[#1c1c1e] rounded-[3rem] border border-white/5 p-6 flex flex-col overflow-hidden shadow-xl">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                            <History className="text-emerald-500" size={20} />
                            <div>
                                <h3 className="text-sm font-black italic uppercase tracking-wider">Arqueos Históricos</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Cierres de Caja Anteriores</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {loadingCashHistory ? (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    <Loader2 className="animate-spin text-emerald-500" size={24} />
                                </div>
                            ) : cashHistory.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-center text-gray-500 text-xs italic">
                                    No hay arqueos registrados anteriormente.
                                </div>
                            ) : (
                                cashHistory.map((h) => {
                                    const dateStr = new Date(h.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                                    const timeStr = new Date(h.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                                    
                                    const totalDif = (h.diferencia_efectivo || 0) + (h.diferencia_tarjeta || 0) + (h.diferencia_qr || 0);

                                    return (
                                        <div key={h.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-gray-300 flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-gray-500" />
                                                    {dateStr} - {timeStr} u.
                                                </span>
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border
                                                    ${totalDif === 0 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}
                                                >
                                                    {totalDif === 0 ? 'Cuadrado' : `Dif: $${totalDif.toLocaleString()}`}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                                                <p>Fondo Inicial: <span className="text-gray-300 font-bold">${h.monto_inicial}</span></p>
                                                <p>Ventas Ef: <span className="text-gray-300 font-bold">${h.ventas_efectivo}</span></p>
                                                <p>Ventas Tarj: <span className="text-gray-300 font-bold">${h.ventas_tarjeta}</span></p>
                                                <p>Ventas MP/QR: <span className="text-gray-300 font-bold">${h.ventas_qr}</span></p>
                                            </div>
                                            <div className="border-t border-white/5 pt-2 flex justify-between items-center text-[10px] text-gray-400">
                                                <span>Cajero: <strong className="text-gray-200">{h.recepcionista || 'N/A'}</strong></span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-6 bg-[#0a0a0a] text-white overflow-y-auto lg:overflow-hidden p-2 relative">
            
            {/* Estilos para impresión nativa del ticket térmico */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    /* Ocultar toda la interfaz de la aplicación */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Mostrar y centrar únicamente el contenedor del ticket */
                    #ticket-imprimible, #ticket-imprimible * {
                        visibility: visible !important;
                    }
                    #ticket-imprimible {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        font-family: 'Courier New', Courier, monospace !important;
                        font-size: 12px !important;
                        color: #000000 !important;
                        background: #ffffff !important;
                        padding: 4mm !important;
                        box-sizing: border-box !important;
                    }
                }
            `}} />

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

            {/* LADO IZQUIERDO: BÚSQUEDA Y PRODUCTOS/MEMBRESÍAS/CAJA */}
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

                {/* Vitrina de Catálogo (Productos / Membresías / Caja) */}
                <div className="bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                                <ShoppingCart className="text-emerald-500" /> Catálogo
                            </h2>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setActiveTab('tienda')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                                        activeTab === 'tienda' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Tienda
                                </button>
                                <button
                                    onClick={() => setActiveTab('membresias')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                                        activeTab === 'membresias' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Membresías
                                </button>
                                <button
                                    onClick={() => setActiveTab('caja')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                                        activeTab === 'caja' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Caja
                                </button>
                            </div>
                        </div>
                        {activeTab !== 'caja' && (
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'tienda' ? "Buscar producto..." : "Buscar plan..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 pb-10">
                        {loadingProducts || loadingPlans ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                <Loader2 className="animate-spin text-emerald-500" size={36} />
                                <span className="text-sm font-bold uppercase italic">Cargando catálogo...</span>
                            </div>
                        ) : activeTab === 'tienda' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredProducts.map(product => {
                                    // Sincronización dinámica de stock en UI
                                    const inCartQty = cart.find(item => item.producto.id === product.id)?.cantidad || 0;
                                    const stockDisponible = product.stock_actual - inCartQty;

                                    return (
                                        <motion.div
                                            whileHover={stockDisponible > 0 ? { scale: 1.02, y: -4 } : {}}
                                            whileTap={stockDisponible > 0 ? { scale: 0.98 } : {}}
                                            key={product.id}
                                            onClick={() => stockDisponible > 0 && addToCart(product)}
                                            className={`bg-black/40 rounded-2xl border overflow-hidden transition-all flex flex-col ${
                                                stockDisponible > 0 
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
                                                {stockDisponible <= 0 && (
                                                    <div className="absolute inset-0 bg-red-950/80 backdrop-blur-[1px] flex items-center justify-center">
                                                        <span className="text-red-400 text-xs font-black uppercase tracking-widest border border-red-500/30 px-3 py-1 rounded bg-black/60">Agotado</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-bold text-sm text-gray-200 line-clamp-2">{product.nombre}</h3>
                                                    <p className="text-[10px] text-gray-500 mt-1">Stock disponible: {stockDisponible} u.</p>
                                                </div>
                                                <p className="text-emerald-400 font-black mt-2 text-lg italic">${product.precio_venta.toLocaleString('es-AR')}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {filteredProducts.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-500 text-sm italic font-bold">
                                        No se encontraron productos en el inventario.
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'membresias' ? (
                            // Membresías/Planes de membresía disponibles
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {gymPlans.filter(plan => plan.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && plan.esta_activo).map(plan => {
                                    const isSelected = selectedPlan?.id === plan.id;
                                    return (
                                        <motion.div
                                            whileHover={{ scale: 1.02, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            key={plan.id}
                                            onClick={() => {
                                                if (!selectedMember) {
                                                    setSaleError('Debe seleccionar un socio primero para asociar la membresía.');
                                                    setTimeout(() => setSaleError(null), 4000);
                                                    return;
                                                }
                                                setSelectedPlan(isSelected ? null : plan);
                                            }}
                                            className={`bg-black/40 rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-500/5' 
                                                    : 'border-white/5 hover:border-amber-500/40 group'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-bold text-base text-gray-100 group-hover:text-amber-400 transition-colors line-clamp-1">{plan.nombre}</h3>
                                                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                                                        {plan.duracion_meses} {plan.duracion_meses === 1 ? 'Mes' : 'Meses'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-3 mb-4 min-h-[3rem]">
                                                    {plan.descripcion || 'Sin descripción adicional para este plan.'}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-baseline mt-4 border-t border-white/5 pt-3">
                                                <span className="text-[10px] uppercase font-black tracking-widest text-gray-600">Tarifa</span>
                                                <p className="text-amber-400 font-black text-xl italic">${Number(plan.precio).toLocaleString('es-AR')}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {gymPlans.filter(plan => plan.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && plan.esta_activo).length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-500 text-sm italic font-bold">
                                        No se encontraron membresías activas.
                                    </div>
                                )}
                            </div>
                        ) : (
                            // RENDER DEL CONTROL DE CAJA Y ARQUEO DIARIO
                            <div className="space-y-6">
                                {cajaTurno && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        
                                        {/* Resumen General Caja */}
                                        <div className="lg:col-span-2 bg-[#2c2c2e]/20 border border-white/5 rounded-3xl p-6 space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-200">Turno de Caja Activo</h3>
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                                        <Clock size={12} />
                                                        Iniciado: {new Date(cajaTurno.fechaApertura).toLocaleDateString()} a las {new Date(cajaTurno.fechaApertura).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setShowArqueoModal(true)}
                                                    className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-xl transition-colors"
                                                >
                                                    Realizar Arqueo y Cierre
                                                </button>
                                            </div>

                                            {/* Desglose de Totales */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-[#111] p-4 rounded-2xl border border-white/5">
                                                    <span className="text-[9px] uppercase font-black tracking-widest text-gray-500 block mb-1">Monto Inicial</span>
                                                    <strong className="text-lg font-mono text-gray-100">${cajaTurno.montoInicial.toLocaleString()}</strong>
                                                </div>
                                                <div className="bg-[#111] p-4 rounded-2xl border border-white/5">
                                                    <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500 block mb-1">Ventas Efectivo</span>
                                                    <strong className="text-lg font-mono text-emerald-400">${(cajaTurno.ventasEfectivo || 0).toLocaleString()}</strong>
                                                </div>
                                                <div className="bg-[#111] p-4 rounded-2xl border border-white/5">
                                                    <span className="text-[9px] uppercase font-black tracking-widest text-blue-500 block mb-1">Ventas MP/QR</span>
                                                    <strong className="text-lg font-mono text-blue-400">${(cajaTurno.ventasQR || 0).toLocaleString()}</strong>
                                                </div>
                                                <div className="bg-[#111] p-4 rounded-2xl border border-white/5">
                                                    <span className="text-[9px] uppercase font-black tracking-widest text-purple-500 block mb-1">Ventas Tarjeta</span>
                                                    <strong className="text-lg font-mono text-purple-400">${(cajaTurno.ventasTarjeta || 0).toLocaleString()}</strong>
                                                </div>
                                            </div>

                                            {/* Efectivo Estimado en Caja */}
                                            {(() => {
                                                const totalEgresos = (cajaTurno.egresos || []).reduce((acc: number, curr: any) => acc + curr.monto, 0);
                                                const efEsperado = cajaTurno.montoInicial + cajaTurno.ventasEfectivo - totalEgresos;
                                                return (
                                                    <div className="bg-black/30 border border-white/10 rounded-2xl p-5 flex justify-between items-center">
                                                        <div>
                                                            <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Efectivo Teórico en Caja</span>
                                                            <p className="text-[10px] text-gray-500 mt-0.5">Saldo inicial + cobros efectivo - egresos registrados</p>
                                                        </div>
                                                        <strong className="text-3xl font-black text-emerald-400 font-mono italic">${efEsperado.toLocaleString('es-AR')}</strong>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Egresos Menores del Turno */}
                                        <div className="bg-[#2c2c2e]/20 border border-white/5 rounded-3xl p-6 flex flex-col h-80 lg:h-auto overflow-hidden">
                                            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4 shrink-0">
                                                <span className="text-xs font-black uppercase tracking-wider text-gray-400">Egresos Caja Chica</span>
                                                <button
                                                    onClick={() => setShowEgresoModal(true)}
                                                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                                >
                                                    Registrar Egreso
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                                {(!cajaTurno.egresos || cajaTurno.egresos.length === 0) ? (
                                                    <p className="text-xs text-gray-600 italic text-center mt-8">No hay egresos menores registrados.</p>
                                                ) : (
                                                    cajaTurno.egresos.map((e: any) => (
                                                        <div key={e.id} className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 flex justify-between items-center">
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-gray-300 truncate">{e.concepto}</p>
                                                                <span className="text-[8px] text-gray-500 font-mono">{new Date(e.fecha).toLocaleTimeString()}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-red-400 shrink-0 font-mono">-${e.monto.toLocaleString()}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* Arqueos Históricos en la parte inferior */}
                                <div className="bg-[#2c2c2e]/10 border border-white/5 rounded-3xl p-6">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                                        <History size={18} className="text-emerald-500" />
                                        <h3 className="text-sm font-black uppercase tracking-wider">Historial de Caja Gym</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1">
                                        {loadingCashHistory ? (
                                            <div className="col-span-full py-8 text-center text-gray-500">
                                                <Loader2 className="animate-spin text-emerald-500 mx-auto" size={24} />
                                            </div>
                                        ) : cashHistory.length === 0 ? (
                                            <div className="col-span-full py-8 text-center text-gray-500 text-xs italic">
                                                No hay arqueos registrados en la base de datos.
                                            </div>
                                        ) : (
                                            cashHistory.map((h) => {
                                                const dateStr = new Date(h.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                                                const timeStr = new Date(h.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                                                const totalDif = (h.diferencia_efectivo || 0) + (h.diferencia_tarjeta || 0) + (h.diferencia_qr || 0);

                                                return (
                                                    <div key={h.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3 hover:border-white/10 transition-colors">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="font-bold text-gray-300 flex items-center gap-1.5">
                                                                <Calendar size={12} className="text-gray-500" />
                                                                {dateStr} - {timeStr} hs.
                                                            </span>
                                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border
                                                                ${totalDif === 0 
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                }`}
                                                            >
                                                                {totalDif === 0 ? 'Cuadrado' : `Dif: $${totalDif.toLocaleString()}`}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] text-gray-500 border-t border-b border-white/5 py-2">
                                                            <p>Saldo Inicial: <strong className="text-gray-300 font-mono">${h.monto_inicial}</strong></p>
                                                            <p>Ventas Ef: <strong className="text-gray-300 font-mono">${h.ventas_efectivo}</strong></p>
                                                            <p>Ventas Tarj: <strong className="text-gray-300 font-mono">${h.ventas_tarjeta}</strong></p>
                                                            <p>Ventas MP: <strong className="text-gray-300 font-mono">${h.ventas_qr}</strong></p>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] text-gray-500">
                                                            <span>Cajero: <strong className="text-gray-300">{h.recepcionista || 'N/A'}</strong></span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LADO DERECHO: TICKET VIRTUAL */}
            <div id="ticket-virtual-container" className="w-full lg:w-96 bg-[#1c1c1e] rounded-[2rem] border border-white/5 flex flex-col overflow-hidden relative z-30 shadow-2xl shrink-0">
                
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
                        {cart.length === 0 && selectedPayments.length === 0 && !montoAbonoCC && !selectedPlan && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-gray-600 gap-3"
                            >
                                <ShoppingCart size={48} className="opacity-20 animate-pulse" />
                                <p className="text-sm font-bold italic uppercase">Carrito vacío</p>
                            </motion.div>
                        )}

                        {/* 1. SECCIÓN MEMBRESÍA CONTRATADA */}
                        {selectedPlan && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Membresía Seleccionada</span>
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 flex gap-3 items-center"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{selectedPlan.nombre}</p>
                                        <p className="text-gray-500 text-[10px]">Validez: {selectedPlan.duracion_meses} {selectedPlan.duracion_meses === 1 ? 'Mes' : 'Meses'}</p>
                                        <p className="text-amber-400 text-xs font-black mt-1">${Number(selectedPlan.precio).toLocaleString('es-AR')}</p>
                                    </div>
                                    <button onClick={() => setSelectedPlan(null)} className="text-red-500 hover:text-red-400 p-2"><X size={16} /></button>
                                </motion.div>
                            </div>
                        )}

                        {/* 2. SECCIÓN CARRITO TIENDA */}
                        {cart.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
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

                        {/* 3. SECCIÓN COBRO DE CUOTAS / FACTURAS PENDIENTES */}
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

                        {/* 4. SECCIÓN ABONO EXTRA A CUENTA CORRIENTE */}
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
                                <Loader2 className="animate-spin text-white" size={18} />
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

            {/* MODAL DE TICKET / COBRO EXITOSO COMPROBANTE */}
            <AnimatePresence>
                {showSuccessModal && lastSaleDetails && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Cabecera del Comprobante */}
                            <div className="p-6 border-b border-white/5 bg-emerald-500/10 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20 text-black">
                                    <CheckCircle2 size={36} />
                                </div>
                                <h3 className="text-2xl font-black italic uppercase text-white tracking-tight">¡Cobro Registrado!</h3>
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">Ticket #{lastSaleDetails.ticketNum}</p>
                            </div>

                            {/* Resumen del Comprobante */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Cliente</span>
                                    <p className="text-base font-bold text-white mt-1">{lastSaleDetails.socio?.name || 'Venta de Mostrador Anónima'}</p>
                                    {lastSaleDetails.socio?.dni && <p className="text-xs text-gray-500">DNI: {lastSaleDetails.socio.dni}</p>}
                                </div>

                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Detalles de Facturación</span>
                                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-2.5">
                                        {lastSaleDetails.membresia && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">Plan: {lastSaleDetails.membresia.nombre}</span>
                                                <span className="font-bold text-amber-400">${lastSaleDetails.membresia.precio.toLocaleString('es-AR')}</span>
                                            </div>
                                        )}
                                        {lastSaleDetails.productos.map((prod, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">{prod.nombre} (x{prod.cantidad})</span>
                                                <span className="font-bold text-white">${prod.subtotal.toLocaleString('es-AR')}</span>
                                            </div>
                                        ))}
                                        {lastSaleDetails.cuotasSaldadas > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">Saldado de Cuotas</span>
                                                <span className="font-bold text-white">${lastSaleDetails.cuotasSaldadas.toLocaleString('es-AR')}</span>
                                            </div>
                                        )}
                                        {lastSaleDetails.abonoCC > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">Abono Cuenta Corriente</span>
                                                <span className="font-bold text-emerald-400">${lastSaleDetails.abonoCC.toLocaleString('es-AR')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-base pt-2.5 border-t border-white/5 font-black italic uppercase">
                                            <span className="text-gray-300">Total Cobrado</span>
                                            <span className="text-emerald-400 text-lg">${lastSaleDetails.total.toLocaleString('es-AR')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Método de Pago</span>
                                        <p className="font-bold text-gray-300 uppercase mt-1">{lastSaleDetails.metodoPago}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Fecha / Hora</span>
                                        <p className="font-bold text-gray-300 mt-1">{new Date().toLocaleString('es-AR')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción en el Modal */}
                            <div className="p-6 border-t border-white/5 bg-black/20 flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => window.print()}
                                        className="bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                                    >
                                        Imprimir Ticket
                                    </button>
                                    <a
                                        href={`https://wa.me/${lastSaleDetails.socio?.dni || ''}?text=Hola%20${encodeURIComponent(lastSaleDetails.socio?.name || 'Socio')},%20aqu%C3%AD%20tienes%20el%20comprobante%20de%20tu%20compra%20en%20Virtud%20Gym%20por%20un%20total%20de%20$${lastSaleDetails.total.toLocaleString('es-AR')}.%20Ticket%20%23${lastSaleDetails.ticketNum}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-colors"
                                    >
                                        WhatsApp
                                    </a>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        setLastSaleDetails(null);
                                    }}
                                    className="w-full bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                                >
                                    Nueva Venta
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TICKET IMPRIMIBLE OCULTO (Únicamente visible al disparar window.print()) */}
            {lastSaleDetails && (
                <div id="ticket-imprimible" className="hidden">
                    <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 2mm 0' }}>VIRTUD GYM</h2>
                        <p style={{ margin: '0', fontSize: '10px' }}>Comprobante de Venta POS</p>
                        <p style={{ margin: '1mm 0 0 0', fontSize: '10px' }}>Ticket #{lastSaleDetails.ticketNum}</p>
                        <p style={{ margin: '1mm 0 0 0', fontSize: '9px' }}>{new Date().toLocaleString('es-AR')}</p>
                    </div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '3mm 0' }} />
                    <div style={{ fontSize: '11px', marginBottom: '3mm' }}>
                        <strong>Cliente:</strong> {lastSaleDetails.socio?.name || 'Venta Mostrador'}<br />
                        {lastSaleDetails.socio?.dni && <><strong>DNI:</strong> {lastSaleDetails.socio.dni}<br /></>}
                        <strong>Método Pago:</strong> {lastSaleDetails.metodoPago.toUpperCase()}
                    </div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '3mm 0' }} />
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #000' }}>
                                <th style={{ textAlign: 'left', paddingBottom: '1mm' }}>Detalle</th>
                                <th style={{ textAlign: 'right', paddingBottom: '1mm' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lastSaleDetails.membresia && (
                                <tr>
                                    <td style={{ padding: '1mm 0' }}>Plan: {lastSaleDetails.membresia.nombre}</td>
                                    <td style={{ textAlign: 'right', padding: '1mm 0' }}>${lastSaleDetails.membresia.precio.toLocaleString('es-AR')}</td>
                                </tr>
                            )}
                            {lastSaleDetails.productos.map((prod, idx) => (
                                <tr key={idx}>
                                    <td style={{ padding: '1mm 0' }}>{prod.nombre} (x{prod.cantidad})</td>
                                    <td style={{ textAlign: 'right', padding: '1mm 0' }}>${prod.subtotal.toLocaleString('es-AR')}</td>
                                </tr>
                            ))}
                            {lastSaleDetails.cuotasSaldadas > 0 && (
                                <tr>
                                    <td style={{ padding: '1mm 0' }}>Pago Cuotas</td>
                                    <td style={{ textAlign: 'right', padding: '1mm 0' }}>${lastSaleDetails.cuotasSaldadas.toLocaleString('es-AR')}</td>
                                </tr>
                            )}
                            {lastSaleDetails.abonoCC > 0 && (
                                <tr>
                                    <td style={{ padding: '1mm 0' }}>Abono CC</td>
                                    <td style={{ textAlign: 'right', padding: '1mm 0' }}>${lastSaleDetails.abonoCC.toLocaleString('es-AR')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div style={{ borderBottom: '1px dashed #000', margin: '3mm 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
                        <span>TOTAL</span>
                        <span>${lastSaleDetails.total.toLocaleString('es-AR')}</span>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '6mm', fontSize: '9px' }}>
                        <p style={{ margin: '0' }}>¡Gracias por entrenar con nosotros!</p>
                        <p style={{ margin: '1mm 0 0 0' }}>virtud.fit</p>
                    </div>
                </div>
            )}

            {/* MODAL REGISTRAR EGRESO MENOR */}
            <AnimatePresence>
                {showEgresoModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-4">
                            <h3 className="text-lg font-black italic uppercase text-white">Registrar Egreso Menor</h3>
                            <p className="text-xs text-gray-400">Salida de efectivo de la caja chica para compras o egresos autorizados.</p>
                            
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Concepto / Descripción</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Artículos de limpieza"
                                        value={egresoConcepto}
                                        onChange={(e) => setEgresoConcepto(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Monto en Efectivo</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 500"
                                        value={egresoMonto}
                                        onChange={(e) => setEgresoMonto(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowEgresoModal(false);
                                        setEgresoConcepto('');
                                        setEgresoMonto('');
                                    }}
                                    className="flex-1 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white py-2 rounded-xl text-xs font-bold uppercase transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddEgreso}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-bold uppercase transition-colors"
                                >
                                    Guardar Egreso
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL DE ARQUEO Y CIERRE DE CAJA */}
            <AnimatePresence>
                {showArqueoModal && cajaTurno && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <div className="bg-[#1c1c1e] border border-white/10 rounded-[2rem] w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-black italic uppercase text-white">Arqueo y Cierre de Caja</h3>
                            
                            {/* Resumen esperado */}
                            {(() => {
                                const totalEgresos = (cajaTurno.egresos || []).reduce((acc: number, curr: any) => acc + curr.monto, 0);
                                const efEsperado = cajaTurno.montoInicial + cajaTurno.ventasEfectivo - totalEgresos;
                                const tjEsperado = cajaTurno.ventasTarjeta;
                                const qrEsperado = cajaTurno.ventasQR;

                                const efDec = Number(efectivoDeclarado || 0);
                                const tjDec = Number(tarjetaDeclarado || 0);
                                const qrDec = Number(qrDeclarado || 0);

                                const difEf = efDec - efEsperado;
                                const difTj = tjDec - tjEsperado;
                                const difQr = qrDec - qrEsperado;

                                return (
                                    <div className="space-y-4">
                                        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2.5 text-xs">
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>Efectivo Teórico (Inicial + Ventas - Egresos):</span>
                                                <strong className="text-gray-200 font-mono">${efEsperado.toLocaleString()}</strong>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>MercadoPago / QR Esperado:</span>
                                                <strong className="text-gray-200 font-mono">${qrEsperado.toLocaleString()}</strong>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>Tarjetas Esperado:</span>
                                                <strong className="text-gray-200 font-mono">${tjEsperado.toLocaleString()}</strong>
                                            </div>
                                        </div>

                                        {/* Inputs de declaración física */}
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Declaración Física en Caja</span>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-3 focus-within:border-emerald-500">
                                                    <span className="text-xs text-gray-500 w-24">Efectivo Real:</span>
                                                    <DollarSign className="text-gray-600" size={14} />
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={efectivoDeclarado}
                                                        onChange={(e) => setEfectivoDeclarado(e.target.value)}
                                                        className="w-full bg-transparent border-0 text-xs py-2.5 text-white focus:outline-none focus:ring-0 font-bold"
                                                    />
                                                    <span className={`text-[10px] font-black font-mono shrink-0 ${difEf < 0 ? 'text-red-400' : difEf > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        {difEf === 0 ? 'Cuadrado' : `${difEf > 0 ? '+' : ''}${difEf.toLocaleString()}`}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-3 focus-within:border-emerald-500">
                                                    <span className="text-xs text-gray-500 w-24">MP/QR Real:</span>
                                                    <DollarSign className="text-gray-600" size={14} />
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={qrDeclarado}
                                                        onChange={(e) => setQrDeclarado(e.target.value)}
                                                        className="w-full bg-transparent border-0 text-xs py-2.5 text-white focus:outline-none focus:ring-0 font-bold"
                                                    />
                                                    <span className={`text-[10px] font-black font-mono shrink-0 ${difQr < 0 ? 'text-red-400' : difQr > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        {difQr === 0 ? 'Cuadrado' : `${difQr > 0 ? '+' : ''}${difQr.toLocaleString()}`}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-3 focus-within:border-emerald-500">
                                                    <span className="text-xs text-gray-500 w-24">Tarjetas Real:</span>
                                                    <DollarSign className="text-gray-600" size={14} />
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={tarjetaDeclarado}
                                                        onChange={(e) => setTarjetaDeclarado(e.target.value)}
                                                        className="w-full bg-transparent border-0 text-xs py-2.5 text-white focus:outline-none focus:ring-0 font-bold"
                                                    />
                                                    <span className={`text-[10px] font-black font-mono shrink-0 ${difTj < 0 ? 'text-red-400' : difTj > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        {difTj === 0 ? 'Cuadrado' : `${difTj > 0 ? '+' : ''}${difTj.toLocaleString()}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                disabled={closingCashRegister}
                                                onClick={() => {
                                                    setShowArqueoModal(false);
                                                    setEfectivoDeclarado('');
                                                    setTarjetaDeclarado('');
                                                    setQrDeclarado('');
                                                }}
                                                className="flex-1 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                disabled={closingCashRegister || efectivoDeclarado === '' || tarjetaDeclarado === '' || qrDeclarado === ''}
                                                onClick={handleCloseCashRegister}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                            >
                                                {closingCashRegister ? <Loader2 className="animate-spin text-black" size={14} /> : null}
                                                <span>{closingCashRegister ? 'Guardando...' : 'Confirmar Cierre'}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Botón flotante de compra para móviles */}
            {totalToPay > 0 && (
                <button
                    onClick={() => {
                        document.getElementById('ticket-virtual-container')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="fixed bottom-6 right-6 lg:hidden z-40 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black italic uppercase tracking-wider px-6 py-4 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400/30 text-xs transition-transform active:scale-95 animate-pulse"
                >
                    <ShoppingCart size={16} />
                    <span>Ver Ticket (${totalToPay.toLocaleString('es-AR')})</span>
                </button>
            )}

        </div>
    );
}
