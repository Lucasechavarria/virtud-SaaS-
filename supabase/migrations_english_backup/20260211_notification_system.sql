-- Sprint 15: Sistema de Notificaciones Push PWA
-- Fecha: 11 de Febrero de 2026

-- 1. Tabla de preferencias de notificaciones por usuario
CREATE TABLE IF NOT EXISTS public.notificaciones_preferencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Preferencias por tipo de notificación
    pagos_vencimiento BOOLEAN DEFAULT true,
    pagos_confirmacion BOOLEAN DEFAULT true,
    clases_recordatorio BOOLEAN DEFAULT true,
    clases_cancelacion BOOLEAN DEFAULT true,
    logros_nuevos BOOLEAN DEFAULT true,
    mensajes_nuevos BOOLEAN DEFAULT true,
    rutinas_nuevas BOOLEAN DEFAULT true,
    
    -- Configuración de timing
    recordatorio_clases_horas INTEGER DEFAULT 2, -- Horas antes de la clase
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de historial de notificaciones
CREATE TABLE IF NOT EXISTS public.historial_notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('pago', 'clase', 'logro', 'mensaje', 'rutina', 'sistema')),
    titulo TEXT NOT NULL,
    cuerpo TEXT NOT NULL,
    datos JSONB, -- Metadata adicional
    enviada BOOLEAN DEFAULT false,
    enviada_en TIMESTAMP WITH TIME ZONE,
    error TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Modificar tabla push_subscriptions para agregar relación con usuario
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE;

-- 4. Habilitar RLS
ALTER TABLE public.notificaciones_preferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_notificaciones ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para notificaciones_preferencias
CREATE POLICY "Usuarios pueden ver sus propias preferencias de notificaciones"
ON public.notificaciones_preferencias FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden insertar sus propias preferencias de notificaciones"
ON public.notificaciones_preferencias FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus propias preferencias de notificaciones"
ON public.notificaciones_preferencias FOR UPDATE
USING (auth.uid() = usuario_id);

-- 6. Políticas RLS para historial_notificaciones
CREATE POLICY "Usuarios pueden ver su historial de notificaciones"
ON public.historial_notificaciones FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Sistema puede insertar notificaciones"
ON public.historial_notificaciones FOR INSERT
WITH CHECK (true); -- El backend tiene permisos de servicio

-- 7. Índices para performance
CREATE INDEX idx_notif_prefs_usuario ON public.notificaciones_preferencias(usuario_id);
CREATE INDEX idx_historial_notif_usuario ON public.historial_notificaciones(usuario_id);
CREATE INDEX idx_historial_notif_tipo ON public.historial_notificaciones(tipo);
CREATE INDEX idx_historial_notif_enviada ON public.historial_notificaciones(enviada) WHERE enviada = false;
CREATE INDEX idx_push_subs_usuario ON public.push_subscriptions(usuario_id);

-- 8. Función para notificación de nuevo mensaje
CREATE OR REPLACE FUNCTION notificar_nuevo_mensaje()
RETURNS TRIGGER AS $$
DECLARE
    remitente_nombre TEXT;
BEGIN
    -- Obtener nombre del remitente
    SELECT nombre_completo INTO remitente_nombre
    FROM public.perfiles
    WHERE id = NEW.remitente_id;
    
    INSERT INTO public.historial_notificaciones (
        usuario_id,
        tipo,
        titulo,
        cuerpo,
        datos
    ) VALUES (
        NEW.receptor_id,
        'mensaje',
        'Nuevo Mensaje de ' || COALESCE(remitente_nombre, 'Usuario'),
        LEFT(NEW.contenido, 100),
        jsonb_build_object('mensaje_id', NEW.id, 'remitente_id', NEW.remitente_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para nuevos mensajes
DROP TRIGGER IF EXISTS trigger_notificar_nuevo_mensaje ON public.mensajes;
CREATE TRIGGER trigger_notificar_nuevo_mensaje
AFTER INSERT ON public.mensajes
FOR EACH ROW
EXECUTE FUNCTION notificar_nuevo_mensaje();

-- 10. Comentarios para documentación
COMMENT ON TABLE public.notificaciones_preferencias IS 'Almacena las preferencias de notificaciones de cada usuario';
COMMENT ON TABLE public.historial_notificaciones IS 'Registro de todas las notificaciones enviadas o pendientes';
COMMENT ON COLUMN public.push_subscriptions.usuario_id IS 'Relación con el usuario propietario de la suscripción';
