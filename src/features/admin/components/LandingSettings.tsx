'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
    Layout,
    Type,
    Image as ImageIcon,
    Save,
    Eye,
    MousePointer2,
    CheckCircle2,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function LandingSettings() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;
    const [gymId, setGymId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({
        hero_titulo: '',
        hero_subtitulo: '',
        hero_imagen: '',
        secciones: {
            nosotros: true,
            actividades: true,
            planes: true,
            contacto: true
        }
    });

    const [slug, setSlug] = useState('');

    useEffect(() => {
        const resolveGymId = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let resolvedId = '';
            const { data: profile } = await supabase
                .from('perfiles')
                .select('rol, gimnasio_id')
                .eq('id', user.id)
                .single();

            if (profile?.rol === 'superadmin' && tenantSlug) {
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantSlug);
                if (isUUID) {
                    resolvedId = tenantSlug;
                } else {
                    const { data: gym } = await supabase
                        .from('gimnasios')
                        .select('id')
                        .eq('slug', tenantSlug)
                        .single();
                    if (gym) resolvedId = gym.id;
                }
            } else {
                resolvedId = profile?.gimnasio_id || '';
            }
            setGymId(resolvedId);
        };
        resolveGymId();
    }, [tenantSlug]);

    useEffect(() => {
        const fetchGym = async () => {
            if (!gymId) return;
            const { data } = await supabase.from('gimnasios').select('*').eq('id', gymId).single();
            if (data) {
                const gymData = data as any;
                if (gymData.config_landing) {
                    setConfig(prev => ({
                        ...prev,
                        ...gymData.config_landing
                    }));
                }
                setSlug(data.slug || '');
            }
        };
        fetchGym();
    }, [gymId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !gymId) return;

        setLoading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${gymId}-hero-${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('gym-assets')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('gym-assets')
                .getPublicUrl(fileName);

            setConfig(prev => ({ ...prev, hero_imagen: publicUrl }));
            toast.success('Imagen de portada subida');
        } catch (_error) {
            toast.error('Error al subir imagen');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!gymId) return;
        setLoading(true);

        const { error } = await supabase
            .from('gimnasios')
            .update({
                config_landing: config
            } as any)
            .eq('id', gymId);

        setLoading(false);
        if (error) {
            toast.error('Error al guardar configuración');
        } else {
            toast.success('Landing page actualizada correctamente');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                        <Layout className="text-primary" size={36} />
                        Landing Page Builder
                    </h2>
                    <p className="text-gray-500 font-medium">Diseña tu página de ventas pública y atrae nuevos socios.</p>
                </div>
                <div className="flex gap-4">
                    <a
                        href={`/g/${slug}`}
                        target="_blank"
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 flex items-center gap-3"
                    >
                        <Eye size={16} /> Ver Pública
                    </a>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl"
                    >
                        <Save size={16} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                    {/* Hero Config */}
                    <div className="bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <MousePointer2 size={14} /> Sección Principal (Hero)
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Título de Impacto</label>
                                <div className="relative">
                                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                    <input
                                        type="text"
                                        value={config.hero_titulo}
                                        onChange={(e) => setConfig({ ...config, hero_titulo: e.target.value })}
                                        className="w-full bg-black/20 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white font-bold"
                                        placeholder="Ej: Entrena al Siguiente Nivel"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Subtítulo Descriptivo</label>
                                <textarea
                                    value={config.hero_subtitulo}
                                    onChange={(e) => setConfig({ ...config, hero_subtitulo: e.target.value })}
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-white text-sm"
                                    rows={3}
                                    placeholder="Explica por qué tu gimnasio es el mejor..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Imagen de Portada</label>
                                <div className="flex items-center gap-4">
                                    {config.hero_imagen ? (
                                        <div className="relative group w-32 h-20 shrink-0">
                                            <Image src={config.hero_imagen} fill className="w-full h-full object-cover rounded-xl border border-white/10" alt="Hero preview" unoptimized />
                                            <button
                                                onClick={() => setConfig(prev => ({ ...prev, hero_imagen: '' }))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-20 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600">
                                            <ImageIcon size={24} />
                                        </div>
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cambiar Imagen</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visibilidad de Secciones */}
                    <div className="bg-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Layout size={14} /> Visibilidad de Módulos
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(config.secciones).map(([key, value]) => (
                                <button
                                    key={key}
                                    onClick={() => setConfig({
                                        ...config,
                                        secciones: { ...config.secciones, [key]: !value }
                                    })}
                                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${value ? 'bg-primary/10 border-primary/20 text-white' : 'bg-black/20 border-white/5 text-gray-500'
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">{key}</span>
                                    {value && <CheckCircle2 size={16} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Live Mobile Preview */}
                <div className="hidden lg:block relative">
                    <div className="sticky top-8 w-full max-w-[320px] mx-auto aspect-[9/19.5] bg-black rounded-[3rem] border-[8px] border-[#1c1c1e] overflow-hidden shadow-2xl relative">
                        {/* Dynamic Content Preview */}
                        <div className="absolute inset-x-0 top-0 h-full overflow-y-auto scrollbar-hide pb-10">
                            {/* Hero Image */}
                            <div className="relative h-60 w-full">
                                <Image src={config.hero_imagen || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48"} fill className="w-full h-full object-cover" alt="Hero preview" unoptimized />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4">
                                    <h4 className="text-xl font-black italic uppercase tracking-tighter leading-tight">{config.hero_titulo || "Tu Título Aquí"}</h4>
                                </div>
                            </div>

                            {/* Sections */}
                            <div className="p-4 space-y-6">
                                {config.secciones.nosotros && (
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="h-2 w-16 bg-primary/20 rounded-full mb-2" />
                                        <div className="h-2 w-full bg-white/10 rounded-full mb-1" />
                                        <div className="h-2 w-2/3 bg-white/5 rounded-full" />
                                    </div>
                                )}
                                {config.secciones.planes && (
                                    <div className="space-y-3">
                                        <div className="h-2 w-24 bg-white/20 rounded-full mx-auto" />
                                        <div className="p-4 border border-primary/20 rounded-2xl bg-primary/5">
                                            <div className="h-4 w-12 bg-white/10 rounded-full mb-4" />
                                            <div className="h-2 w-full bg-white/10 rounded-full" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1c1c1e] rounded-b-3xl" />
                    </div>
                    <p className="text-center mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 italic">Vista Previa Móvil</p>
                </div>
            </div>
        </div>
    );
}
