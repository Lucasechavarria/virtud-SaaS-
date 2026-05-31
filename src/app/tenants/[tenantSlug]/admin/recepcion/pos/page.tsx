'use client';

import React, { useState } from 'react';
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
    CheckCircle2
} from 'lucide-react';
import Image from 'next/image';

// Mocks - Luego reemplazarán con datos reales de la BD
const DUMMY_PRODUCTS = [
    { id: '1', nombre: 'Agua Mineral 500ml', precio: 1500, categoria: 'Bebidas', imagen: 'https://images.unsplash.com/photo-1523362628745-0c14b62dc5be?auto=format&fit=crop&q=80&w=200' },
    { id: '2', nombre: 'Gatorade Naranja', precio: 2200, categoria: 'Bebidas', imagen: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&q=80&w=200' },
    { id: '3', nombre: 'Barra Proteína', precio: 1800, categoria: 'Snacks', imagen: 'https://images.unsplash.com/photo-1622312686150-13d8e58fa267?auto=format&fit=crop&q=80&w=200' },
    { id: '4', nombre: 'Pre-Entreno', precio: 15000, categoria: 'Suplementos', imagen: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=200' },
    { id: '5', nombre: 'Toalla VIRTUD', precio: 4500, categoria: 'Accesorios', imagen: 'https://images.unsplash.com/photo-1616712128790-2808c109ecd5?auto=format&fit=crop&q=80&w=200' },
];

const DUMMY_MEMBERS = [
    { id: 'm1', nombre: 'Juan Pérez', dni: '35123456', estado: 'al_dia', deuda: 0 },
    { id: 'm2', nombre: 'Ana Gómez', dni: '38987654', estado: 'con_deuda', deuda: 12000 },
];

export default function POSPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState<typeof DUMMY_MEMBERS[0] | null>(null);
    const [cart, setCart] = useState<Array<{ producto: typeof DUMMY_PRODUCTS[0], cantidad: number }>>([]);
    const [_payMethod, setPayMethod] = useState<'efectivo' | 'tarjeta' | 'qr' | null>(null);
    const [isSearchingMember, setIsSearchingMember] = useState(false);

    // Filter products
    const filteredProducts = DUMMY_PRODUCTS.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter members
    const filteredMembers = memberSearch.length > 2
        ? DUMMY_MEMBERS.filter(m => m.nombre.toLowerCase().includes(memberSearch.toLowerCase()) || m.dni.includes(memberSearch))
        : [];

    const addToCart = (product: typeof DUMMY_PRODUCTS[0]) => {
        setCart(prev => {
            const existing = prev.find(item => item.producto.id === product.id);
            if (existing) {
                return prev.map(item => item.producto.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item);
            }
            return [...prev, { producto: product, cantidad: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.producto.id === productId) {
                const newQty = item.cantidad + delta;
                return newQty > 0 ? { ...item, cantidad: newQty } : item;
            }
            return item;
        }).filter(item => item.cantidad > 0)); // remove 0 qty
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.producto.id !== productId));
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);
    const totalToPay = subtotal + (selectedMember && selectedMember.estado === 'con_deuda' ? selectedMember.deuda : 0);

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6 bg-[#0a0a0a] text-white overflow-hidden p-2">

            {/* LADO IZQUIERDO: BÚSQUEDA Y PRODUCTOS */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {/* Panel Búsqueda Alumno Top */}
                <div className="bg-[#1c1c1e] p-5 rounded-[2rem] border border-white/5 relative z-20">
                    <div className="flex gap-4 items-center">
                        <User className="text-emerald-500" size={24} />
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Buscar alumno por Nombre o DNI (para asignar ticket o cobrar cuota)"
                                value={selectedMember ? selectedMember.nombre : memberSearch}
                                onChange={(e) => {
                                    setMemberSearch(e.target.value);
                                    if (selectedMember) setSelectedMember(null);
                                    setIsSearchingMember(true);
                                }}
                                onFocus={() => setIsSearchingMember(true)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                            {/* Autocomplete Dropdown */}
                            <AnimatePresence>
                                {isSearchingMember && filteredMembers.length > 0 && !selectedMember && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full mt-2 w-full bg-[#2c2c2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                                    >
                                        {filteredMembers.map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => {
                                                    setSelectedMember(m);
                                                    setMemberSearch('');
                                                    setIsSearchingMember(false);
                                                }}
                                                className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors"
                                            >
                                                <div>
                                                    <p className="font-bold">{m.nombre}</p>
                                                    <p className="text-xs text-gray-500">DNI: {m.dni}</p>
                                                </div>
                                                {m.estado === 'con_deuda' ? (
                                                    <span className="text-red-500 text-xs font-black uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded">Deuda: ${m.deuda}</span>
                                                ) : (
                                                    <span className="text-emerald-500 text-xs font-black uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded">Al Día</span>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {selectedMember && (
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
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
                                className={`overflow-hidden rounded-xl border ${selectedMember.estado === 'con_deuda' ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} flex items-center justify-between p-4`}
                            >
                                <div className="flex items-center gap-3">
                                    {selectedMember.estado === 'con_deuda' ? <AlertCircle className="text-red-500" /> : <CheckCircle2 className="text-emerald-500" />}
                                    <div>
                                        <h3 className="font-bold text-white">{selectedMember.nombre}</h3>
                                        <p className={`text-xs ${selectedMember.estado === 'con_deuda' ? 'text-red-400' : 'text-emerald-400'} uppercase font-black tracking-widest`}>
                                            {selectedMember.estado === 'con_deuda' ? 'PENDIENTE DE PAGO' : 'CUOTA AL DÍA'}
                                        </p>
                                    </div>
                                </div>
                                {selectedMember.estado === 'con_deuda' && (
                                    <button
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex gap-2 items-center transition-colors text-sm"
                                        onClick={() => { /* In a real app, this might just ensure it's in the total */ }}
                                    >
                                        Saldar Deuda (${selectedMember.deuda})
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Vitrina de Productos */}
                <div className="bg-[#1c1c1e] p-6 rounded-[2rem] border border-white/5 flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                            <ShoppingCart className="text-emerald-500" /> Terminal POS
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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <motion.div
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    whileTap={{ scale: 0.98 }}
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden cursor-pointer group hover:border-emerald-500/50 transition-all flex flex-col"
                                >
                                    <div className="h-32 w-full relative bg-white/5">
                                        <Image src={product.imagen} alt={product.nombre} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur text-[10px] font-black uppercase text-gray-300 px-2 py-1 rounded-full">
                                            {product.categoria}
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <h3 className="font-bold text-sm text-gray-200 line-clamp-2">{product.nombre}</h3>
                                        <p className="text-emerald-400 font-black mt-2 text-lg italic">${product.precio.toLocaleString('es-AR')}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-500 text-sm italic font-bold">
                                    No se encontraron productos.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LADO DERECHO: TICKET VIRTUAL */}
            <div className="w-96 bg-[#1c1c1e] rounded-[2rem] border border-white/5 flex flex-col overflow-hidden relative z-30 shadow-2xl">
                <div className="p-5 border-b border-white/5 bg-black/20">
                    <h2 className="text-lg font-black italic uppercase tracking-tight text-center">Ticket de Compra</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <AnimatePresence>
                        {cart.length === 0 && !selectedMember?.deuda && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-gray-600 gap-3"
                            >
                                <ShoppingCart size={48} className="opacity-20" />
                                <p className="text-sm font-bold italic uppercase">Carrito vacío</p>
                            </motion.div>
                        )}

                        {/* Items de Producto */}
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
                                    <p className="text-emerald-500 text-xs font-black">${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-black/60 rounded-lg p-1 border border-white/10">
                                    <button onClick={() => updateQuantity(item.producto.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded-md"><Minus size={12} /></button>
                                    <span className="text-xs font-bold w-4 text-center">{item.cantidad}</span>
                                    <button onClick={() => updateQuantity(item.producto.id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded-md"><Plus size={12} /></button>
                                </div>
                                <button onClick={() => removeFromCart(item.producto.id)} className="text-red-500 hover:text-red-400 p-2"><X size={16} /></button>
                            </motion.div>
                        ))}

                        {/* Item de Deuda */}
                        {selectedMember?.estado === 'con_deuda' && (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-500/10 p-3 rounded-xl border border-red-500/30 flex gap-3 items-center"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-red-100 truncate">Saldar Deuda Cuota</p>
                                    <p className="text-red-400 text-xs font-black">${selectedMember.deuda.toLocaleString('es-AR')}</p>
                                </div>
                                <AlertCircle size={20} className="text-red-500" />
                            </motion.div>
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
                        <button
                            className="w-full relative overflow-hidden group bg-gradient-to-r from-emerald-600 to-green-500 text-white font-black italic uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:grayscale"
                            disabled={totalToPay === 0}
                            onClick={() => setPayMethod('efectivo')}
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
                            <Banknote size={20} className="relative z-10" />
                            <span className="relative z-10">Cobro Efectivo</span>
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="w-full relative overflow-hidden group bg-[#111] hover:bg-[#222] border border-white/10 hover:border-blue-500/50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
                                disabled={totalToPay === 0}
                                onClick={() => setPayMethod('qr')}
                            >
                                <QrCode size={18} className="text-blue-400" />
                                <span>MercadoPago</span>
                            </button>
                            <button
                                className="w-full relative overflow-hidden group bg-[#111] hover:bg-[#222] border border-white/10 hover:border-purple-500/50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50"
                                disabled={totalToPay === 0}
                                onClick={() => setPayMethod('tarjeta')}
                            >
                                <CreditCard size={18} className="text-purple-400" />
                                <span>Débito / Crédito</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
