'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Importación diferida: Recharts ya no bloquea el First Contentful Paint.
const DynamicLineChart = dynamic(
    () => import('./charts/ProgressLineChart'),
    { 
        ssr: false, 
        loading: () => <div className="w-full h-full flex items-center justify-center bg-[#2a2a2d] animate-pulse rounded-lg text-gray-500 text-sm">Cargando Gráfica...</div>
    }
);

export default function ProgressChart() {
    return (
        <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl p-6 h-[400px] flex flex-col">
            <h3 className="text-gray-400 font-medium text-sm uppercase mb-4 shrink-0">Tu Evolución</h3>
            <div className="flex-1 w-full relative min-h-0">
                <DynamicLineChart />
            </div>
        </div>
    );
}
