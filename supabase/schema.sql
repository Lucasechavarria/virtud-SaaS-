-- ============================================
-- VIRTUD GYM - ESQUEMA MAESTRO (SINCRONIZADO v52)
-- Idioma: Español (Coherente con Código y Migraciones)
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- INFRAESTRUCTURA & MULTI-TENANCY
-- ============================================

CREATE TABLE IF NOT EXISTS public.gimnasios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    favicon_url TEXT,
    color_primario TEXT DEFAULT '#3B82F6',
    color_secundario TEXT DEFAULT '#1E3A8A',
    es_activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USUARIOS & AUTENTICACIÓN
-- ============================================

-- Perfiles (Extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    gimnasio_id UUID REFERENCES public.gimnasios(id),
    correo TEXT UNIQUE NOT NULL,
    nombre_completo TEXT,
    nombre TEXT,
    apellido TEXT,
    dni TEXT,
    telefono TEXT,
    url_avatar TEXT,
    rol TEXT NOT NULL DEFAULT 'member' CHECK (rol IN ('member', 'coach', 'admin', 'superadmin')),
    
    -- Campos de Membresía
    estado_membresia TEXT DEFAULT 'inactive' CHECK (estado_membresia IN ('active', 'inactive', 'suspended', 'expired')),
    fecha_inicio_membresia TIMESTAMP WITH TIME ZONE,
    fecha_fin_membresia TIMESTAMP WITH TIME ZONE,
    
    -- Información Médica
    informacion_medica JSONB DEFAULT '{}'::jsonb,
    
    -- Metadatos
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ACTIVIDADES & HORARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.actividades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gimnasio_id UUID REFERENCES public.gimnasios(id),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL, -- 'gym', 'martial_arts', etc.
    categoria TEXT,
    url_imagen TEXT,
    duracion_minutos INTEGER DEFAULT 60,
    dificultad TEXT,
    capacidad_maxima INTEGER DEFAULT 20,
    esta_activa BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.horarios_de_clase (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gimnasio_id UUID REFERENCES public.gimnasios(id),
    actividad_id UUID REFERENCES public.actividades(id) ON DELETE CASCADE,
    entrenador_id UUID REFERENCES public.perfiles(id),
    
    -- Programación
    dia_de_la_semana INTEGER NOT NULL CHECK (dia_de_la_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    
    -- Capacidad
    capacidad_maxima INTEGER DEFAULT 20,
    capacidad_actual INTEGER DEFAULT 0,
    
    -- Estado
    esta_activa BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (hora_fin > hora_inicio)
);

-- ============================================
-- RESERVAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.reservas_de_clase (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE,
    horario_clase_id UUID REFERENCES public.horarios_de_clase(id) ON DELETE CASCADE,
    
    -- Detalles de Reserva
    fecha DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'reservada' CHECK (estado IN ('reservada', 'cancelada', 'en_lista_espera', 'asistida', 'inasistencia')),
    
    -- Metadatos
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(usuario_id, horario_clase_id, fecha)
);

-- ============================================
-- PAGOS & CUENTA CORRIENTE
-- ============================================

CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE,
    gimnasio_id UUID REFERENCES public.gimnasios(id),
    
    monto DECIMAL(10, 2) NOT NULL,
    moneda TEXT DEFAULT 'ARS',
    concepto TEXT NOT NULL,
    metodo_pago TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    
    aprobado_por UUID REFERENCES public.perfiles(id),
    aprobado_en TIMESTAMP WITH TIME ZONE,
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RUTINAS & EJERCICIOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.rutinas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE,
    entrenador_id UUID REFERENCES public.perfiles(id),
    
    nombre TEXT NOT NULL,
    objetivo TEXT,
    duracion_semanas INTEGER,
    generado_por_ia BOOLEAN DEFAULT false,
    esta_activa BOOLEAN DEFAULT true,
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ejercicios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rutina_id UUID REFERENCES public.rutinas(id) ON DELETE CASCADE,
    
    nombre TEXT NOT NULL,
    grupo_muscular TEXT,
    series INTEGER,
    repeticiones TEXT,
    descanso_segundos INTEGER,
    dia_numero INTEGER NOT NULL,
    orden_en_dia INTEGER NOT NULL,
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCIONES & TRIGGERS BASE
-- ============================================

-- Actualizar updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_perfiles_updated_at ON perfiles;
CREATE TRIGGER update_perfiles_updated_at BEFORE UPDATE ON perfiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_actividades_updated_at ON actividades;
CREATE TRIGGER update_actividades_updated_at BEFORE UPDATE ON actividades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_horarios_updated_at ON horarios_de_clase;
CREATE TRIGGER update_horarios_updated_at BEFORE UPDATE ON horarios_de_clase FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservas_updated_at ON reservas_de_clase;
CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas_de_clase FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para crear perfil al registrarse (GO-TRUE)
-- NOTA: Esta versión es simple, la migración de unificación agregará el blindaje search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, correo, nombre_completo, url_avatar)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'nombre_completo',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
