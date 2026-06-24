'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
    Palette,
    Smartphone,
    Globe,
    Save,
    Eye,
    Type,
    ImageIcon,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function BrandingSettings() {
    const params = useParams();
    const tenantSlug = params?.tenantSlug as string;
    const [gymId, setGymId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        color_primario: '#fbbf24',
        color_secundario: '#000000',
        logo_url: '',
        favicon_url: '',
    });

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
                        .is('deleted_at', null)
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
            const { data } = await supabase.from('gimnasios').select('*').eq('id', gymId).is('deleted_at', null).single();
            if (data) {
                setFormData({
                    nombre: data.nombre || '',
                    color_primario: data.color_primario || '#fbbf24',
                    color_secundario: (data as any).color_secundario || '#000000',
                    logo_url: data.logo_url || '',
                    favicon_url: (data as any).favicon_url || '',
                });
            }
        };
        fetchGym();
    }, [gymId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'favicon_url') => {
        const file = e.target.files?.[0];
        if (!file || !gymId) return;

        setLoading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${gymId}-${field}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('gym-assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('gym-assets')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [field]: publicUrl }));
            toast.success('Imagen subida correctamente');
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Error al subir la imagen');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gymId) return;

        setLoading(true);
        const { error } = await supabase
            .from('gimnasios')
            .update({
                nombre: formData.nombre,
                color_primario: formData.color_primario,
                color_secundario: formData.color_secundario,
                logo_url: formData.logo_url,
                favicon_url: formData.favicon_url,
            })
            .eq('id', gymId);

        setLoading(false);
        if (error) {
            toast.error('Error al guardar la personalización');
        } else {
            toast.success('Marca actualizada correctamente. Recarga para ver los cambios.');
            // Forzar actualización de variables CSS locales para feedback inmediato
            document.documentElement.style.setProperty("--primary", formData.color_primario);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                        <Palette className="text-primary" size={36} />
                        Personalización de Marca
                    </h2>
                    <p className="text-gray-500 font-medium">Configura la identidad visual de tu gimnasio y la experiencia PWA.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <form onSubmit={handleSave} className="lg:col-span-2 space-y-8">
                    {/* General Info */}
                    <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/5 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Comercial</label>
                                <div className="relative">
                                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full bg-black/20 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-primary/50 outline-none transition-all font-bold"
                                        placeholder="Ej: Iron Gym Elite"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Color Primario</label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={formData.color_primario}
                                        onChange={(e) => setFormData({ ...formData, color_primario: e.target.value })}
                                        className="h-14 w-20 bg-black/20 border border-white/5 rounded-2xl p-1 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.color_primario}
                                        onChange={(e) => setFormData({ ...formData, color_primario: e.target.value })}
                                        className="flex-1 bg-black/20 border border-white/5 rounded-2xl px-4 py-4 text-white font-mono text-sm uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <ImageIcon size={14} /> Logo Principal
                                </label>
                                <div className="flex items-center gap-4">
                                    {formData.logo_url ? (
                                        <div className="relative group w-16 h-16 shrink-0">
                                            <Image src={formData.logo_url} fill className="w-full h-full object-cover rounded-xl border border-white/10" alt="Logo preview" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600 shrink-0">
                                            <ImageIcon size={24} />
                                        </div>
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition-all">
                                            <span className="text-xs font-bold text-gray-400">Subir Logo</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo_url')} />
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Smartphone size={14} /> Icono PWA (Favicon)
                                </label>
                                <div className="flex items-center gap-4">
                                    {formData.favicon_url ? (
                                        <div className="relative group w-16 h-16 shrink-0">
                                            <Image src={formData.favicon_url} fill className="w-full h-full object-cover rounded-xl border border-white/10" alt="Favicon preview" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, favicon_url: '' }))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600 shrink-0">
                                            <Smartphone size={24} />
                                        </div>
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition-all">
                                            <span className="text-xs font-bold text-gray-400">Subir Icono</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'favicon_url')} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground py-6 rounded-3xl font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4"
                    >
                        {loading ? 'Guardando cambios...' : <><Save size={20} /> Guardar Identidad Visual</>}
                    </button>
                </form>

                {/* Preview Card */}
                <div className="space-y-6">
                    <div className="bg-[#1c1c1e] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl sticky top-8">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Eye size={18} className="text-primary" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vista Previa PWA</h4>
                            </div>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                                <div className="w-2 h-2 rounded-full bg-green-500/20" />
                            </div>
                        </div>

                        <div className="p-10 space-y-10 aspect-[9/16] max-h-[600px] flex flex-col items-center justify-center text-center bg-black/40">
                            {formData.logo_url ? (
                                <div className="relative w-[120px] h-[120px] mb-4">
                                    <Image src={formData.logo_url} alt="Preview Logo" fill className="object-contain rounded-3xl" unoptimized />
                                </div>
                            ) : (
                                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-4 border border-primary/20">
                                    <ImageIcon className="text-primary" size={40} />
                                </div>
                            )}
                            <div className="space-y-2">
                                <h5 className="text-3xl font-black text-white italic uppercase tracking-tighter">{formData.nombre || 'Nombre Gym'}</h5>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Powered by Virtud Gym</p>
                            </div>

                            <div className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 text-left">
                                <div className="w-8 h-8 rounded-lg bg-primary" />
                                <div className="flex-1">
                                    <div className="h-2 w-20 bg-white/10 rounded-full mb-2" />
                                    <div className="h-2 w-12 bg-white/5 rounded-full" />
                                </div>
                            </div>

                            <button
                                type="button"
                                style={{ backgroundColor: formData.color_primario }}
                                className="w-full py-4 rounded-xl font-black uppercase italic tracking-widest text-white shadow-xl opacity-80"
                            >
                                Iniciar Entrenamiento
                            </button>
                        </div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-blue-500/10 border border-blue-500/20 flex gap-4">
                        <Globe className="text-blue-500 shrink-0" size={20} />
                        <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">
                            Los cambios en el Manifest y el Favicon pueden tardar unos minutos en reflejarse debido al caché de los navegadores.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
