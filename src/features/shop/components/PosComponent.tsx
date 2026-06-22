'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart,
    Search,
    User,
    CreditCard,
    Banknote,
    Trash2,
    Plus,
    Minus,
    CheckCircle2,
    Package,
    TrendingUp,
    Loader2,
    X,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
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
}

interface CartItem extends Product {
    quantity: number;
}

export default function ShopPos() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string | undefined;

    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
    
    // Alumnos / Miembros
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [memberSearch, setMemberSearch] = useState('');
    const [isSearchingMember, setIsSearchingMember] = useState(false);

    // Productos
    const [products, setProducts] = useState<Product[]>([]);

    // Estados de carga e interfaz
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [saleError, setSaleError] = useState<string | null>(null);

    // Cargar productos de la sucursal actual
    useEffect(() => {
        loadProducts();
    }, []);

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
            console.error('Error fetching products:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Búsqueda dinámica y debouncada de socios en el servidor
    useEffect(() => {
        if (memberSearch.length < 2) {
            setMembers([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                setLoadingMembers(true);
                const queryParam = encodeURIComponent(memberSearch);
                const url = tenantSlug 
                    ? `/api/admin/users/list?gymId=${tenantSlug}&search=${queryParam}` 
                    : `/api/admin/users/list?search=${queryParam}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setMembers(data.users || []);
                }
            } catch (error) {
                console.error('Error searching members:', error);
            } finally {
                setLoadingMembers(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [memberSearch, tenantSlug]);

    const filteredMembers = members;

    const handleSelectMember = (member: Member) => {
        setSelectedMember(member);
        setMemberSearch('');
        setIsSearchingMember(false);
    };

    const handleDeselectMember = () => {
        setSelectedMember(null);
        setMemberSearch('');
    };

    // Filtrar catálogo de productos por búsqueda
    const filteredProducts = products.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToCart = (product: Product) => {
        const existing = cart.find(item => item.id === product.id);
        const currentQty = existing ? existing.quantity : 0;

        if (currentQty >= product.stock_actual) {
            setSaleError(`Stock máximo disponible para ${product.nombre}: ${product.stock_actual} unidades.`);
            setTimeout(() => setSaleError(null), 3000);
            return;
        }

        setCart(prev => {
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = item.quantity + delta;
                if (newQty > product.stock_actual) {
                    setSaleError(`No puedes superar el stock de ${product.nombre} (${product.stock_actual} ud)`);
                    setTimeout(() => setSaleError(null), 3000);
                    return item;
                }
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const total = cart.reduce((acc, item) => acc + (item.precio_venta * item.quantity), 0);

    const handleCompleteSale = async () => {
        if (cart.length === 0) return;
        
        try {
            setIsProcessing(true);
            setSaleError(null);

            const payload = {
                socioId: selectedMember?.id || null,
                productos: cart.map(item => ({
                    producto_id: item.id,
                    cantidad: item.quantity,
                    precio_unitario: item.precio_venta
                })),
                metodoPago: paymentMethod,
                montoTotalCobrado: total,
                gymId: tenantSlug
            };

            const res = await fetch('/api/admin/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al completar la venta');
            }

            // Exito
            setShowSuccess(true);
            setCart([]);
            handleDeselectMember();
            
            // Recargar catálogo de productos para refrescar stock en pantalla
            await loadProducts();
            
            setTimeout(() => setShowSuccess(false), 4000);
        } catch (error: any) {
            console.error('Error in ShopPOS sale:', error);
            setSaleError(error.message || 'Error inesperado al concretar el cobro');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-10rem)] relative">
            
            {/* Alertas flotantes */}
            <AnimatePresence>
                {saleError && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 10, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white font-bold px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500/20"
                    >
                        <AlertCircle size={20} />
                        <span>{saleError}</span>
                        <button onClick={() => setSaleError(null)} className="ml-2 hover:bg-white/10 p-1 rounded-full"><X size={14} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Products Area */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Punto de Venta</h2>
                        <p className="text-gray-500 text-sm">Venta rápida de productos y suplementos</p>
                    </div>

                    {/* Buscador de Alumnos Opcional */}
                    <div className="relative w-full md:w-80 z-30">
                        <div className="flex gap-2 items-center bg-[#1c1c1e] border border-white/5 rounded-2xl px-4 py-2">
                            <User size={16} className={selectedMember ? "text-emerald-500" : "text-gray-500"} />
                            <input
                                type="text"
                                placeholder={loadingMembers ? "Cargando socios..." : "Asociar Socio (Opcional)"}
                                value={selectedMember ? selectedMember.name : memberSearch}
                                disabled={loadingMembers}
                                onChange={(e) => {
                                    setMemberSearch(e.target.value);
                                    if (selectedMember) handleDeselectMember();
                                    setIsSearchingMember(true);
                                }}
                                onFocus={() => setIsSearchingMember(true)}
                                className="w-full bg-transparent border-0 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-0"
                            />
                            {selectedMember && (
                                <button onClick={handleDeselectMember} className="p-1 hover:bg-white/5 rounded-full text-red-500"><X size={12} /></button>
                            )}
                        </div>

                        {/* Autocomplete dropdown de alumnos */}
                        <AnimatePresence>
                            {isSearchingMember && filteredMembers.length > 0 && !selectedMember && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full mt-2 w-full bg-[#2c2c2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
                                >
                                    {filteredMembers.map(m => (
                                        <div
                                            key={m.id}
                                            onClick={() => handleSelectMember(m)}
                                            className="p-3 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors text-xs"
                                        >
                                            <div>
                                                <p className="font-bold text-gray-200">{m.name}</p>
                                                <p className="text-[10px] text-gray-500">DNI: {m.dni || 'S/D'}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-500" />
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar producto en el catálogo..."
                        className="w-full bg-[#1c1c1e] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium placeholder-gray-500 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loadingProducts ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                        <span className="text-xs font-bold uppercase tracking-wider">Cargando catálogo...</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 scrollbar-hide">
                        {filteredProducts.map(product => {
                            const isOutOfStock = product.stock_actual <= 0;
                            return (
                                <motion.button
                                    key={product.id}
                                    whileHover={!isOutOfStock ? { scale: 1.02 } : {}}
                                    whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
                                    disabled={isOutOfStock}
                                    onClick={() => addToCart(product)}
                                    className={`bg-[#1c1c1e] border p-4 rounded-3xl text-left flex flex-col gap-3 group transition-all relative ${
                                        isOutOfStock 
                                            ? 'opacity-40 border-red-500/20' 
                                            : 'border-white/5 hover:border-orange-500/30'
                                    }`}
                                >
                                    <div className="w-full aspect-square bg-white/5 rounded-2xl flex items-center justify-center text-gray-700 overflow-hidden relative">
                                        <Package size={40} className="group-hover:text-orange-500 transition-colors" />
                                        {isOutOfStock && (
                                            <div className="absolute inset-0 bg-red-950/70 backdrop-blur-[1px] flex items-center justify-center">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-black/80 text-red-400 px-2.5 py-1 rounded border border-red-500/30">Sin Stock</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{product.categoria}</p>
                                        <p className="font-bold text-white text-sm line-clamp-1">{product.nombre}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto w-full">
                                        <p className="font-black text-white italic text-base tracking-tighter">
                                            ${product.precio_venta.toLocaleString('es-AR')}
                                        </p>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${product.stock_actual < 5 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                            {product.stock_actual} ud
                                        </span>
                                    </div>
                                </motion.button>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500 text-sm italic font-bold">
                                No se encontraron productos.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Cart Area */}
            <div className="w-full lg:w-96 flex flex-col gap-6">
                <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl relative">

                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-x-0 top-0 z-40 p-6 bg-green-500 text-black flex items-center justify-center gap-3 font-black uppercase italic tracking-tighter"
                            >
                                <CheckCircle2 size={24} />
                                Venta Completada
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="text-orange-500" size={24} />
                            <h3 className="font-black text-white italic uppercase tracking-tighter text-xl">Carrito</h3>
                        </div>
                        <span className="bg-white/5 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/5">
                            {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-10">
                                <ShoppingCart size={60} className="mb-4" />
                                <p className="text-sm font-bold uppercase tracking-widest">El carrito está vacío</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <motion.div
                                    layout
                                    key={item.id}
                                    className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-3"
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-white text-sm">{item.nombre}</p>
                                        <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="font-black text-orange-400 italic tracking-tighter">
                                            ${(item.precio_venta * item.quantity).toLocaleString('es-AR')}
                                        </p>
                                        <div className="flex items-center gap-3 bg-black/40 px-2 py-1 rounded-xl border border-white/5">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="text-white hover:text-orange-500"><Minus size={14} /></button>
                                            <span className="text-white font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="text-white hover:text-orange-500"><Plus size={14} /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    <div className="p-8 bg-black/20 border-t border-white/5 space-y-6">
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Método de Pago</p>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'efectivo', icon: Banknote, label: 'Efectivo' },
                                    { id: 'tarjeta', icon: CreditCard, label: 'Tarjeta' },
                                    { id: 'transferencia', icon: TrendingUp, label: 'Transf.' },
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id as any)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${paymentMethod === method.id
                                                ? 'bg-orange-600/20 border-orange-500 text-orange-500 shadow-lg shadow-orange-500/10'
                                                : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                                            }`}
                                    >
                                        <method.icon size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-tighter">{method.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span>${total.toLocaleString('es-AR')}</span>
                            </div>
                            {selectedMember && (
                                <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold uppercase tracking-widest border-t border-white/5 pt-1.5">
                                    <span>Socio</span>
                                    <span className="text-emerald-400">{selectedMember.name.split(' ')[0]}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-white text-2xl font-black italic uppercase tracking-tighter border-t border-white/5 pt-2">
                                <span>Total</span>
                                <span className="text-orange-500">${total.toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        <button
                            disabled={cart.length === 0 || isProcessing}
                            onClick={handleCompleteSale}
                            className={`w-full py-5 rounded-2xl font-black uppercase italic tracking-widest text-lg transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-2 ${
                                isProcessing || cart.length === 0
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                                    : 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-600/20'
                            }`}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <span>Finalizar Venta</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
