-- Migración: Módulo POS (Caja), Cuentas Corrientes y Acceso por QR Dinámico
-- Fecha: 2026-03-01

-- 0. Agregar nuevo rol de Recepcionista al enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'recepcion';

-- 1. Cuentas Corrientes
CREATE TABLE IF NOT EXISTS public.cuentas_corrientes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  alumno_id uuid NOT NULL,
  gimnasio_id uuid NOT NULL,
  saldo_actual numeric DEFAULT 0,
  limite_credito numeric DEFAULT 0,
  estado text DEFAULT 'al_dia',
  creado_en timestamp with time zone DEFAULT now(),
  actualizado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT cuentas_corrientes_pkey PRIMARY KEY (id),
  CONSTRAINT cuentas_corrientes_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.perfiles(id) ON DELETE CASCADE,
  CONSTRAINT cuentas_corrientes_gimnasio_id_fkey FOREIGN KEY (gimnasio_id) REFERENCES public.gimnasios(id) ON DELETE CASCADE
);

-- 2. Movimientos Cuenta
CREATE TABLE IF NOT EXISTS public.movimientos_cuenta (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cuenta_id uuid NOT NULL,
  tipo_movimiento text NOT NULL CHECK (tipo_movimiento = ANY (ARRAY['cargo', 'abono'])),
  concepto text NOT NULL,
  monto numeric NOT NULL,
  registrado_por uuid,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT movimientos_cuenta_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_cuenta_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES public.cuentas_corrientes(id) ON DELETE CASCADE,
  CONSTRAINT movimientos_cuenta_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.perfiles(id) ON DELETE SET NULL
);

-- 3. Accesos QR
CREATE TABLE IF NOT EXISTS public.accesos_qr (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL,
  gimnasio_id uuid NOT NULL,
  token_dinamico text NOT NULL,
  expira_en timestamp with time zone NOT NULL,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT accesos_qr_pkey PRIMARY KEY (id),
  CONSTRAINT accesos_qr_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.perfiles(id) ON DELETE CASCADE,
  CONSTRAINT accesos_qr_gimnasio_id_fkey FOREIGN KEY (gimnasio_id) REFERENCES public.gimnasios(id) ON DELETE CASCADE
);

-- 4. Registro Asistencias
CREATE TABLE IF NOT EXISTS public.registro_asistencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL,
  gimnasio_id uuid NOT NULL,
  metodo_ingreso text NOT NULL CHECK (metodo_ingreso = ANY (ARRAY['qr_app', 'manual_recepcion'])),
  registrado_por uuid,
  fecha_hora timestamp with time zone DEFAULT now(),
  estado_membresia_momento text,
  CONSTRAINT registro_asistencias_pkey PRIMARY KEY (id),
  CONSTRAINT registro_asistencias_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.perfiles(id) ON DELETE CASCADE,
  CONSTRAINT registro_asistencias_gimnasio_id_fkey FOREIGN KEY (gimnasio_id) REFERENCES public.gimnasios(id) ON DELETE CASCADE,
  CONSTRAINT registro_asistencias_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.perfiles(id) ON DELETE SET NULL
);

-- 5. Modificaciones a tabla perfiles existentes
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS es_pago_agrupado_con uuid REFERENCES public.perfiles(id),
ADD COLUMN IF NOT EXISTS parq_firmado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_firma_parq timestamp with time zone,
ADD COLUMN IF NOT EXISTS estado_membresia character varying DEFAULT 'inactive'::character varying;

-- 6. Habilitación de RLS (Row Level Security)
ALTER TABLE public.cuentas_corrientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_cuenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accesos_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_asistencias ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Seguridad (RLS)
-- Cuentas Corrientes
DROP POLICY IF EXISTS "SuperAdmins y Admins pueden ver y editar todas las cuentas_corrientes" ON public.cuentas_corrientes;
CREATE POLICY "SuperAdmins y Admins pueden ver y editar todas las cuentas_corrientes" ON public.cuentas_corrientes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.rol::text IN ('superadmin', 'admin', 'recepcion'))
);

DROP POLICY IF EXISTS "Alumnos pueden ver su propia cuenta" ON public.cuentas_corrientes;
CREATE POLICY "Alumnos pueden ver su propia cuenta" ON public.cuentas_corrientes FOR SELECT USING (alumno_id = auth.uid());

-- Movimientos
DROP POLICY IF EXISTS "Recepcion, Admins y SuperAdmins pueden registrar movimientos" ON public.movimientos_cuenta;
CREATE POLICY "Recepcion, Admins y SuperAdmins pueden registrar movimientos" ON public.movimientos_cuenta FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.rol::text IN ('superadmin', 'admin', 'recepcion'))
);

DROP POLICY IF EXISTS "Alumnos pueden ver sus propios movimientos" ON public.movimientos_cuenta;
CREATE POLICY "Alumnos pueden ver sus propios movimientos" ON public.movimientos_cuenta FOR SELECT USING (
    cuenta_id IN (SELECT id FROM public.cuentas_corrientes WHERE alumno_id = auth.uid())
);

-- Accesos QR
DROP POLICY IF EXISTS "Admins y Recepcion pueden ver QR" ON public.accesos_qr;
CREATE POLICY "Admins y Recepcion pueden ver QR" ON public.accesos_qr FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.rol::text IN ('superadmin', 'admin', 'recepcion'))
);

DROP POLICY IF EXISTS "Alumnos pueden ver y generar sus propios QR" ON public.accesos_qr;
CREATE POLICY "Alumnos pueden ver y generar sus propios QR" ON public.accesos_qr FOR ALL USING (alumno_id = auth.uid());

-- Asistencias
DROP POLICY IF EXISTS "Recepcion y Admins pueden ver y registrar asistencias" ON public.registro_asistencias;
CREATE POLICY "Recepcion y Admins pueden ver y registrar asistencias" ON public.registro_asistencias FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.rol::text IN ('superadmin', 'admin', 'recepcion'))
);

DROP POLICY IF EXISTS "Alumnos pueden ver sus asistencias" ON public.registro_asistencias;
CREATE POLICY "Alumnos pueden ver sus asistencias" ON public.registro_asistencias FOR SELECT USING (alumno_id = auth.uid());
