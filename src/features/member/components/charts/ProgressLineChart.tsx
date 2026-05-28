'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const data = [
    { name: 'Ene', peso: 85, fuerza: 100 },
    { name: 'Feb', peso: 84, fuerza: 110 },
    { name: 'Mar', peso: 82, fuerza: 115 },
    { name: 'Abr', peso: 80, fuerza: 130 },
    { name: 'May', peso: 79, fuerza: 135 },
    { name: 'Jun', peso: 78, fuerza: 145 },
];

export default function ProgressLineChart() {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                    itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="peso" stroke="#FF5722" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="fuerza" stroke="#82ca9d" strokeWidth={3} />
            </LineChart>
        </ResponsiveContainer>
    );
}
