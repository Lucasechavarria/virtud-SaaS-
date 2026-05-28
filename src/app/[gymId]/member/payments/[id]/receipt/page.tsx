'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Download, Printer } from 'lucide-react';
import _Image from 'next/image';

export default function ReceiptPage({ params }: { params: { id: string } }) {
    const [payment, setPayment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // En una implementación real, buscaríamos el pago por ID
        // Como es para "impresión", podemos simular datos si no tenemos el endpoint aún
        const mockPayment = {
            id: params.id,
            monto: 15000,
            concepto: 'Abono Mensual Feb 2026',
            fecha: new Date().toLocaleDateString(),
            metodo: 'MercadoPago',
            gym: {
                nombre: 'Virtud Training Center',
                direccion: 'Calle Falsa 123, CABA',
                cuit: '20-12345678-9'
            }
        };
        setPayment(mockPayment);
        setLoading(false);
    }, [params.id]);

    if (loading) return <div>Cargando comprobante...</div>;

    return (
        <div className="min-h-screen bg-white text-black p-10 font-sans">
            <div className="max-w-2xl mx-auto border-2 border-gray-100 p-12 rounded-3xl shadow-sm">
                <div className="flex justify-between items-start mb-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-600 mb-4">
                            <ShieldCheck size={32} />
                            <span className="text-2xl font-black italic tracking-tighter uppercase text-black">{payment.gym.nombre}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{payment.gym.direccion}</p>
                        <p className="text-[10px] text-gray-400 font-bold">CUIT: {payment.gym.cuit}</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-1">Recibo</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Nº {payment.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-10 mb-12 pt-12 border-t border-gray-100">
                    <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fecha de Pago</h4>
                        <p className="font-bold">{payment.fecha}</p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Método de Pago</h4>
                        <p className="font-bold">{payment.metodo}</p>
                    </div>
                </div>

                <div className="space-y-4 mb-12">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Detalle del Servicio</h4>
                    <div className="flex justify-between items-center py-4 border-b border-gray-50">
                        <p className="font-medium text-gray-600">{payment.concepto}</p>
                        <p className="font-black">${payment.monto.toLocaleString()}</p>
                    </div>
                </div>

                <div className="flex justify-between items-end pt-12">
                    <div>
                        <p className="text-[10px] text-gray-400 font-medium italic">Este es un comprobante de pago válido emitido por Virtud SaaS.</p>
                    </div>
                    <div className="text-right">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pagado</h4>
                        <p className="text-5xl font-black italic tracking-tighter">${payment.monto.toLocaleString()}</p>
                    </div>
                </div>

                <div className="mt-20 flex gap-4 no-print">
                    <button
                        onClick={() => window.print()}
                        className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
                    >
                        <Printer size={16} />
                        Imprimir Recibo
                    </button>
                    <button className="p-4 border border-gray-200 rounded-2xl text-gray-400 hover:text-black hover:border-black transition-all">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .border-2 { border: none !important; }
                }
            `}</style>
        </div>
    );
}
