import React from 'react';
import PaymentSettings from '@/features/admin/components/PaymentSettings';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Configuración de Cobros | Virtud Gym',
    description: 'Configura tus llaves de Mercado Pago para empezar a cobrar automáticamente.',
};

export default function PaymentSettingsPage() {
    return (
        <div className="p-6">
            <PaymentSettings />
        </div>
    );
}
