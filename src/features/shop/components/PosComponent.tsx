'use client';

import React, { useState } from 'react';
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
    TrendingUp
} from 'lucide-react';

interface Product {
    id: string;
    nombre: string;
    precio_venta: number;
    stock_actual: number;
    categoria: string;
    imagen_url?: string;
}

interface CartItem extends Product {
    quantity: number;
}

const MOCK_PRODUCTS: Product[] = [
    { id: '1', nombre: 'Agua Mineral 500ml', precio_venta: 1200, stock_actual: 45, categoria: 'Bebidas' },
    { id: '2', nombre: 'Barrita Proteica', precio_venta: 2500, stock_actual: 12, categoria: 'Suplementos' },
    { id: '3', nombre: 'Creatina 300g', precio_venta: 35000, stock_actual: 5, categoria: 'Suplementos' },
    { id: '4', nombre: 'Toalla Microfibra', precio_venta: 8500, stock_actual: 20, categoria: 'Accesorios' },
    { id: '5', nombre: 'Bebida Isotónica', precio_venta: 1800, stock_actual: 30, categoria: 'Bebidas' },
];

export default function ShopPos() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const filteredProducts = MOCK_PRODUCTS.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
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
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((acc, item) => acc + (item.precio_venta * item.quantity), 0);

    const handleCompleteSale = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);
        // Simulación de guardado en DB
        await new Promise(r => setTimeout(r, 1500));
        setIsProcessing(false);
        setShowSuccess(true);
        setCart([]);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-10rem)]">
            {/* Products Area */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Punto de Venta</h2>
                        <p className="text-gray-500 text-sm">Venta rápida de productos y suplementos</p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar producto o escanear código..."
                        className="w-full bg-[#1c1c1e] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 scrollbar-hide">
                    {filteredProducts.map(product => (
                        <motion.button
                            key={product.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => addToCart(product)}
                            className="bg-[#1c1c1e] border border-white/5 p-4 rounded-3xl text-left flex flex-col gap-3 group transition-all hover:border-orange-500/30"
                        >
                            <div className="w-full aspect-square bg-white/5 rounded-2xl flex items-center justify-center text-gray-700">
                                <Package size={40} className="group-hover:text-orange-500 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{product.categoria}</p>
                                <p className="font-bold text-white text-sm line-clamp-1">{product.nombre}</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                                <p className="font-black text-white italic text-lg tracking-tighter">
                                    ${product.precio_venta.toLocaleString('es-AR')}
                                </p>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${product.stock_actual < 10 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                    {product.stock_actual} ud
                                </span>
                            </div>
                        </motion.button>
                    ))}
                </div>
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
                                className="absolute inset-x-0 top-0 z-20 p-6 bg-green-500 text-black flex items-center justify-center gap-3 font-black uppercase italic tracking-tighter"
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
                            {cart.length} items
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
                            <div className="flex items-center justify-between text-white text-2xl font-black italic uppercase tracking-tighter">
                                <span>Total</span>
                                <span className="text-orange-500">${total.toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        <button
                            disabled={cart.length === 0 || isProcessing}
                            onClick={handleCompleteSale}
                            className={`w-full py-5 rounded-2xl font-black uppercase italic tracking-widest text-lg transition-all active:scale-95 shadow-2xl ${isProcessing || cart.length === 0
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                                    : 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-600/20'
                                }`}
                        >
                            {isProcessing ? 'Procesando...' : 'Finalizar Venta'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
