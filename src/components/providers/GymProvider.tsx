"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface GymContextType {
    gym: {
        id: string;
        nombre: string;
        slug: string;
        color_primario: string;
        color_secundario: string;
        logo_url: string | null;
        favicon_url: string | null;
        modulos: Record<string, boolean>;
        config_visual: Record<string, unknown>;
        config_landing: Record<string, unknown>;
    } | null;
    isLoading: boolean;
    hasModule: (moduleName: string) => boolean;
}

const DEFAULT_COLOR = "#6d28d9"; // violeta por defecto

const GymContext = createContext<GymContextType>({
    gym: null,
    isLoading: true,
    hasModule: () => true, // Por defecto mostrar todo mientras carga
});

export const useGym = () => useContext(GymContext);

export const GymProvider = ({ children }: { children: React.ReactNode }) => {
    const [gym, setGym] = useState<GymContextType["gym"]>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGymData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsLoading(false);
                    return;
                }

                // 1. Obtener el gimnasio_id del perfil del usuario
                const { data: profile } = await supabase
                    .from("perfiles")
                    .select("gimnasio_id")
                    .eq("id", user.id)
                    .single();

                if (!profile?.gimnasio_id) {
                    setIsLoading(false);
                    return;
                }

                // 2. Obtener datos del gimnasio usando las columnas reales de la DB (Tabla gimnasios validada)
                const { data: gymData } = await supabase
                    .from("gimnasios")
                    .select("id, nombre, slug, logo_url, color_primario, color_secundario, modulos_activos, es_activo")
                    .eq("id", profile.gimnasio_id)
                    .single();

                if (gymData) {
                    const primaryColor = gymData.color_primario || DEFAULT_COLOR;
                    const secondaryColor = gymData.color_secundario || "#111111";

                    setGym({
                        id: gymData.id,
                        nombre: gymData.nombre,
                        slug: gymData.slug,
                        color_primario: primaryColor,
                        color_secundario: secondaryColor,
                        logo_url: gymData.logo_url || null,
                        favicon_url: null, // Removido temporalmente por inexistencia en DB
                        modulos: (gymData.modulos_activos as Record<string, boolean>) || {
                            rutinas_ia: true,
                            gamificacion: true,
                            nutricion_ia: true,
                            pagos_online: true,
                            clases_reserva: true,
                        },
                        config_visual: {},
                        config_landing: {},
                    });

                    // 3. Inyectar variables CSS para Tailwind y UI Premium
                    const root = document.documentElement;
                    root.style.setProperty("--primary", primaryColor);
                    root.style.setProperty("--primary-foreground", "#ffffff");
                    root.style.setProperty("--secondary", secondaryColor);

                    // Favicon dinámico (Tarea de apoyo para PWA) usando logo
                    if (gymData.logo_url) {
                        const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                        if (favicon) {
                            favicon.href = gymData.logo_url!;
                        }
                    }

                    // Título de la pestaña dinámico para mejorar la percepción de Marca Propia
                    if (gymData.nombre) {
                        document.title = `${gymData.nombre} | Virtud Gym`;
                    }
                }
            } catch (error) {
                console.error("Error al cargar branding del gimnasio:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGymData();
    }, []);

    const hasModule = (moduleName: string): boolean => {
        // Si aún está cargando, permitir acceso para no bloquear la UI
        if (isLoading) return true;
        // Si no hay gym configurado, permitir todo (superadmin sin gym o gym sin módulos)
        if (!gym) return true;
        return !!gym.modulos?.[moduleName];
    };

    return (
        <GymContext.Provider value={{ gym, isLoading, hasModule }}>
            {children}
        </GymContext.Provider>
    );
};
