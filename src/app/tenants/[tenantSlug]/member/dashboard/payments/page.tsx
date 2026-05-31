'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Payment {
    id: string;
    monto: number;
    estado: string;
    metodo_pago: string;
    creado_en: string;
    aprobado_en: string | null;
}

export default function StudentPaymentsPage() {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<Payment[]>([]);

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            const response = await fetch('/api/student/payments');
            const data = await response.json();

            if (data.success) {
                setPayments(data.payments);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar pagos');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-500/20 text-green-400';
            case 'rejected': return 'bg-red-500/20 text-red-400';
            default: return 'bg-yellow-500/20 text-yellow-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return '✓ Aprobado';
            case 'rejected': return '✕ Rechazado';
            default: return '⏳ Pendiente';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">Cargando pagos...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">💳 Mis Pagos</h1>
                    <p className="text-gray-400">Historial de pagos y membresías</p>
                </div>

                {payments.length > 0 ? (
                    <div className="space-y-4">
                        {payments.map((payment) => (
                            <div key={payment.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-2xl font-bold text-white">${payment.monto.toLocaleString('es-AR')}</div>
                                        <div className="text-sm text-gray-400 capitalize">{payment.metodo_pago}</div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.estado)}`}>
                                        {getStatusLabel(payment.estado)}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400">
                                    Fecha: {new Date(payment.creado_en).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                        <div className="text-6xl mb-4">💳</div>
                        <h2 className="text-2xl font-bold text-white mb-4">No hay pagos registrados</h2>
                        <p className="text-gray-400">Tus pagos aparecerán aquí</p>
                    </div>
                )}
            </div>
        </div>
    );
}
