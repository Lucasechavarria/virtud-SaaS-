'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
    LineChart, 
    Line as RechartsLine, 
    BarChart, 
    Bar as RechartsBar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
} from 'recharts';

interface SecurityMetrics {
    totalAccess: number;
    suspiciousAccess: number;
    failedLogins: number;
    activeUsers: number;
}

interface AccessLog {
    id: string;
    user_name: string;
    action: string;
    ip_address: string;
    device: string;
    timestamp: string;
    status: 'success' | 'failed' | 'suspicious';
}

export default function SecurityDashboardPage() {
    const params = useParams();
    const tenantSlug = (params?.tenantSlug) as string | undefined;

    const [metrics, setMetrics] = useState<SecurityMetrics>({
        totalAccess: 0,
        suspiciousAccess: 0,
        failedLogins: 0,
        activeUsers: 0
    });

    const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
    const [accessByHour, setAccessByHour] = useState<any[]>([]);
    const [accessByDay, setAccessByDay] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        dateRange: '24h',
        status: 'all',
        search: ''
    });

    // Estado local para búsqueda con debounce
    const [searchTerm, setSearchTerm] = useState('');

    // Debounce de búsqueda de 500ms
    useEffect(() => {
        const handler = setTimeout(() => {
            setFilter(prev => ({ ...prev, search: searchTerm }));
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        loadSecurityData();
    }, [filter]);

    const loadSecurityData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                dateRange: filter.dateRange,
                status: filter.status,
                search: filter.search
            });
            const baseUrl = tenantSlug
                ? `/api/admin/security/dashboard?gymId=${tenantSlug}`
                : '/api/admin/security/dashboard';
            const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryParams.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            setMetrics(data.metrics);
            setAccessLogs(data.logs);
            setAccessByHour(data.accessByHour || []);
            setAccessByDay(data.accessByDay || []);
        } catch (error) {
            console.error('Error loading security data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-[#0a0a0a] min-h-screen">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">🔒 Dashboard de Seguridad</h1>
                <p className="text-gray-400">Monitoreo de accesos y actividad sospechosa</p>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    title="Accesos Hoy"
                    value={metrics.totalAccess}
                    icon="📊"
                    variant="default"
                />
                <MetricCard
                    title="Sospechosos"
                    value={metrics.suspiciousAccess}
                    icon="⚠️"
                    variant="warning"
                />
                <MetricCard
                    title="Intentos Fallidos"
                    value={metrics.failedLogins}
                    icon="❌"
                    variant="danger"
                />
                <MetricCard
                    title="Usuarios Activos"
                    value={metrics.activeUsers}
                    icon="👥"
                    variant="success"
                />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">Accesos por Hora (Últimas 24h)</h2>
                    {loading ? (
                        <div className="h-[300px] w-full bg-gray-700/20 rounded-lg animate-pulse flex items-center justify-center border border-gray-700">
                            <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Generando curvas de acceso...</span>
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={accessByHour} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="time" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                    <RechartsLine type="monotone" dataKey="Accesos" stroke="#ff5722" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">Accesos por Día (Última Semana)</h2>
                    {loading ? (
                        <div className="h-[300px] w-full bg-gray-700/20 rounded-lg animate-pulse flex items-center justify-center border border-gray-700">
                            <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Calculando actividad por día...</span>
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={accessByDay} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="day" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                        cursor={{ fill: '#374151', opacity: 0.4 }}
                                    />
                                    <Legend />
                                    <RechartsBar dataKey="Exitosos" fill="#4caf50" radius={[4, 4, 0, 0]} />
                                    <RechartsBar dataKey="Fallidos" fill="#f44336" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Rango de Fecha
                        </label>
                        <select
                            value={filter.dateRange}
                            onChange={(e) => setFilter({ ...filter, dateRange: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600"
                        >
                            <option value="1h">Última hora</option>
                            <option value="24h">Últimas 24 horas</option>
                            <option value="7d">Últimos 7 días</option>
                            <option value="30d">Últimos 30 días</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Estado
                        </label>
                        <select
                            value={filter.status}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600"
                        >
                            <option value="all">Todos</option>
                            <option value="success">Exitosos</option>
                            <option value="failed">Fallidos</option>
                            <option value="suspicious">Sospechosos</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Buscar
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Usuario, IP, acción..."
                            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600"
                        />
                    </div>
                </div>
            </div>

            {/* Tabla de Accesos */}
            <AccessLogsTable logs={accessLogs} loading={loading} />
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: number;
    icon: string;
    variant?: 'default' | 'warning' | 'danger' | 'success';
}

function MetricCard({ title, value, icon, variant = 'default' }: MetricCardProps) {
    const variants = {
        default: 'border-gray-700',
        warning: 'border-yellow-500/30 bg-yellow-500/5',
        danger: 'border-red-500/30 bg-red-500/5',
        success: 'border-green-500/30 bg-green-500/5'
    };

    return (
        <div className={`bg-gray-800 rounded-lg p-6 border ${variants[variant]}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{icon}</span>
                <span className="text-3xl font-bold text-white">{value}</span>
            </div>
            <p className="text-gray-400 text-sm">{title}</p>
        </div>
    );
}

interface AccessLogsTableProps {
    logs: AccessLog[];
    loading: boolean;
}

function AccessLogsTable({ logs, loading }: AccessLogsTableProps) {
    if (loading) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Accesos Recientes</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Usuario</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Acción</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">IP</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Dispositivo</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-700/50">
                                <td className="px-4 py-3 text-sm text-white">{log.user_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-300">{log.action}</td>
                                <td className="px-4 py-3 text-sm text-gray-300 font-mono">{log.ip_address}</td>
                                <td className="px-4 py-3 text-sm text-gray-300">{log.device}</td>
                                <td className="px-4 py-3 text-sm text-gray-300">
                                    {new Date(log.timestamp).toLocaleString('es-AR')}
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={log.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: 'success' | 'failed' | 'suspicious' }) {
    const variants = {
        success: 'bg-green-500/20 text-green-500 border-green-500/30',
        failed: 'bg-red-500/20 text-red-500 border-red-500/30',
        suspicious: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
    };

    const labels = {
        success: 'Exitoso',
        failed: 'Fallido',
        suspicious: 'Sospechoso'
    };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded border ${variants[status]}`}>
            {labels[status]}
        </span>
    );
}
