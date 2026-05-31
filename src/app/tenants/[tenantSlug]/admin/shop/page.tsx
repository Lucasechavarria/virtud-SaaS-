import React from 'react';
import PosComponent from '@/features/shop/components/PosComponent';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Tienda | Virtud Gym',
    description: 'Punto de venta para gimnasios. Sistema de inventario y cross-selling.',
};

export default function ShopPage() {
    return (
        <div className="p-6">
            <PosComponent />
        </div>
    );
}
