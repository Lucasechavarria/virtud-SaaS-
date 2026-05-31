'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    TrendingUp,
    Calendar,
    DollarSign,
    Download,
    Filter,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import { toast } from 'react-hot-toast';

export default function AdminReportsPage() {
    const [dateRange, setDateRange] = useState('month');
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        revenue: 0,
        active_members: 0,
        new_members: 0,
        attendance_rate: 0
    });
    const [chartData, setChartData] = useState({
        growth: [],
        revenue: []
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/admin/reports');
            if (!res.ok) throw new Error();
            const data = await res.json();

            setMetrics(data.metrics);
            setChartData(data.charts);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando reportes');
        } finally {
            setLoading(false);
        }
    };

    const exportReport = () => {
        alert('Funcionalidad de exportación PDF/Excel próximamente');
    };

    if (loading) {
        return <div className="p-8 text-white">Cargando métricas...</div>;
    }

    return (
        <div className="p-8 space-y-8 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2">Reportes y Analytics</h1>
                    <p className="text-gray-400">Visión general del rendimiento del gimnasio</p>
                </div>

                <div className="flex gap-4">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-[#1c1c1e] text-white border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-purple-500"
                    >
                        <option value="week">Esta Semana</option>
                        <option value="month">Este Mes</option>
                        <option value="quarter">Este Trimestre</option>
                        <option value="year">Este Año</option>
                    </select>

                    <button
                        onClick={exportReport}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-bold shadow-lg shadow-purple-900/20"
                    >
                        <Download size={20} />
                        Exportar
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Ingresos Totales (Est.)"
                    value={`$${metrics.revenue.toLocaleString()}`}
                    trend="+12.5%"
                    isPositive={true}
                    icon={<DollarSign size={24} className="text-green-400" />}
                    color="green"
                />
                <MetricCard
                    title="Miembros Activos"
                    value={metrics.active_members}
                    trend="+5.2%"
                    isPositive={true}
                    icon={<Users size={24} className="text-blue-400" />}
                    color="blue"
                />
                <MetricCard
                    title="Nuevos Miembros"
                    value={metrics.new_members}
                    trend="+8.1%"
                    isPositive={true}
                    icon={<TrendingUp size={24} className="text-purple-400" />}
                    color="purple"
                />
                <MetricCard
                    title="Asistencia (Mes)"
                    value={metrics.attendance_rate}
                    trend="-2.4%"
                    isPositive={false}
                    icon={<Calendar size={24} className="text-orange-400" />}
                    color="orange"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Evolución de Ingresos</h3>
                        <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
                            <Filter size={20} />
                        </button>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.revenue}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value: number) => `$${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Growth Chart */}
                <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Crecimiento de Miembros</h3>
                        <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
                            <Filter size={20} />
                        </button>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.growth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="#8b5cf6"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: string | number;
    trend: string;
    isPositive: boolean;
    icon: React.ReactNode;
    color: string;
}

function MetricCard({ title, value, trend, isPositive, icon, color }: MetricCardProps) {
    return (
        <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/5 p-6 rounded-2xl group hover:border-white/10 transition-all cursor-default">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 bg-${color}-500/10 rounded-xl`}>
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {trend}
                </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
            <p className="text-2xl font-black text-white">{value}</p>
        </div>
    );
}
