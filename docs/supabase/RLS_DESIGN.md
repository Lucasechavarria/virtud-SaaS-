# Seguridad y Funcionalidades de Base de Datos (RLS Audit)

Este documento detalla las funcionalidades de la aplicación basadas en el esquema de base de datos actual y define las políticas de seguridad (Row Level Security - RLS) requeridas para cada rol.

## Roles del Sistema
- **Public**: Usuarios no autenticados (acceso restringido a landings públicas).
- **Member (Authenticated)**: Alumnos/Usuarios estándar asociados a un gimnasio.
- **Coach**: Entrenadores de clases y asignación de rutinas.
- **Admin**: Administradores locales con control limitado a su `gimnasio_id`.
- **Superadmin**: Propietario supremo del SaaS. Puede ver métricas consolidadas, catálogo de planes y realizar conexiones de soporte técnico (impersonaciones) que son registradas de forma forense.

---

## 1. Gestión de Usuarios y Perfiles

### Tablas: `profiles`, `profile_change_history`, `user_goals`, `measurements`

#### Funcionalidades:
- **Perfiles**: Información personal, médica y de contacto.
- **Metas**: Objetivos de fitness del usuario.
- **Mediciones**: Seguimiento de peso, grasa corporal, etc.
- **Historial**: Auditoría de cambios en el perfil.

#### Políticas RLS Propuestas:

| Tabla | Rol | Permisos | Condiciones / Notas |
| :--- | :--- | :--- | :--- |
| `profiles` | **Member** | SELECT, UPDATE | Puede ver y editar *su propio* perfil. No puede cambiar su rol. |
| `profiles` | **Coach** | SELECT, UPDATE | Puede ver perfiles **solo de alumnos asignados**. Puede AGREGAR notas/lesiones al historial médico. |
| `profiles` | **Admin/Super** | ALL | Control total. Puede cambiar roles y estados. |
| `user_goals` | **Member** | ALL | Puede gestionar sus propias metas. |
| `user_goals` | **Coach** | SELECT, UPDATE | Puede ver y actualizar metas de sus alumnos. |
| `user_goals` | **Admin/Super** | ALL | Gestión total. |
| `measurements` | **Member** | SELECT | Puede ver sus mediciones (generalmente ingresadas por el coach o balanza inteligente). |
| `measurements` | **Coach** | ALL | Puede crear y gestionar mediciones de alumnos. |
| `measurements` | **Admin/Super** | ALL | Gestión total. |

---

## 2. Entrenamiento y Nutrición (Core)

### Tablas: `routines`, `exercises`, `nutrition_plans`, `routine_access_logs`

#### Funcionalidades:
- **Rutinas**: Planes de entrenamiento asignados.
- **Ejercicios**: Detalles de cada ejercicio en la rutina.
- **Nutrición**: Planes de dieta personalizados.
- **Logs**: Seguridad y auditoría de acceso a rutinas.

#### Políticas RLS Propuestas:

| Tabla | Rol | Permisos | Condiciones / Notas |
| :--- | :--- | :--- | :--- |
| `routines` | **Member** | SELECT | Solo puede ver rutinas donde `user_id = auth.uid()` y `status = 'active'`. |
| `routines` | **Coach** | ALL | Puede crear/editar rutinas y **asignarlas** (`UPDATE user_id`) a sus alumnos asignados. |
| `routines` | **Admin/Super** | ALL | Gestión total. |
| `exercises` | **Member** | SELECT | View exercises linked to their active routines. |
| `exercises` | **Coach** | ALL | Create/edit exercises within routines they manage. |
| `exercises` | **Admin/Super** | ALL | Gestión total. |
| `nutrition_plans`| **Member** | SELECT | Ver su propio plan activo. |
| `nutrition_plans`| **Coach** | ALL | Crear/editar planes para alumnos. |
| `routine_access_logs` | **System** | INSERT | El sistema inserta logs automáticamente. |
| `routine_access_logs` | **Admin/Super** | SELECT | Auditoría de accesos. |

---

## 3. Clases y Reservas

### Tablas: `activities`, `class_schedules`, `class_bookings`

#### Funcionalidades:
- **Actividades**: Tipos de clase (Yoga, CrossFit, etc.).
- **Horarios**: Calendario de clases disponibles.
- **Reservas**: Inscripción de alumnos a clases.

#### Políticas RLS Propuestas:

| Tabla | Rol | Permisos | Condiciones / Notas |
| :--- | :--- | :--- | :--- |
| `activities` | **Public/Auth** | SELECT | Visible para todos (incluso landing page si es necesario). |
| `activities` | **Admin/Super** | ALL | Crear/editar tipos de actividad. |
| `class_schedules`| **Public/Auth** | SELECT | Ver horarios activos. |
| `class_schedules`| **Admin/Super** | ALL | Gestionar la agenda del gimnasio. |
| `class_bookings` | **Member** | SELECT, INSERT, UPDATE | Ver sus reservas, reservar y cancelar. |
| `class_bookings` | **Coach** | SELECT, UPDATE | Ver asistentes y **marcar asistencia/falta** (`UPDATE status`). |
| `class_bookings` | **Admin/Super** | ALL | Gestión total de asistencia. |

> **Nota**: Para evaluar la asistencia de los profesores, se recomienda usar la tabla `class_schedules` (marcando la clase como dada) o la tabla `coach_attendance` (fichaje de entrada/salida implementado recientemente).

---

## 4. Gamificación y Retos

### Tablas: `challenges`, `challenge_participants`, `achievements`, `user_achievements`, `user_gamification`

#### Funcionalidades:
- **Retos**: Competiciones temporales.
- **Logros**: Badges desbloqueables.
- **Puntuación**: Sistema de puntos y niveles.

#### Políticas RLS Propuestas:

| Tabla | Rol | Permisos | Condiciones / Notas |
| :--- | :--- | :--- | :--- |
| `challenges` | **Member** | SELECT, INSERT | Ver retos. Pueden **CREAR retos** (desafíos a otros o abiertos). |
| `challenges` | **Admin/Super** | ALL | Crear y gestionar retos oficiales. |
| `challenge_participants` | **Member** | SELECT, INSERT | Ver participantes, unirse. Pueden invitar/desafiar a otros (`INSERT` con otro `user_id` si es desafío amistoso). |
| `challenge_participants` | **Admin/Super** | ALL | Moderar participantes. |
| `achievements` | **Auth** | SELECT | Ver logros disponibles. |
| `user_achievements` | **Member** | SELECT | Ver sus propios logros desbloqueados. |
| `user_achievements` | **System/Admin** | INSERT | El sistema otorga logros (o admins manualmente). |
| `user_gamification` | **Member** | SELECT | Ver sus propios puntos y nivel. |

---

## 5. Comunicación y Soporte

### Tablas: `messages`, `student_reports`

#### Funcionalidades:
- **Mensajería**: Chat directo (Coach <-> Alumno).
- **Reportes**: Feedback o quejas de alumnos.

#### Políticas RLS Propuestas:

| Tabla | Rol | Permisos | Condiciones / Notas |
| :--- | :--- | :--- | :--- |
| `messages` | **Member** | SELECT, INSERT | Ver/enviar mensajes propios. |
| `messages` | **Coach** | SELECT, INSERT | Ver/enviar mensajes a sus alumnos. |
| `messages` | **Admin/Super** | SELECT | **Acceso de Auditoría**: Pueden ver chats por razones de seguridad/control. |
| `student_reports`| **Member** | SELECT, INSERT | Ver sus reportes, crear nuevos. |
| `student_reports`| **Admin/Super** | ALL | Ver, gestionar y **CERRAR** reportes (`UPDATE status`). |
---

## 6. Administración y Finanzas

### Tablas: `gym_equipment`, `payments`

#### Funcionalidades:
- **Inventario**: Control de máquinas y estado.
- **Pagos**: Registro de cuotas y transacciones.

#### Políticas RLS Propuestas:

| Tabla | Rol | Permisos | Condiciones / Notas |
| :--- | :--- | :--- | :--- |
| `gym_equipment` | **Coach** | SELECT, UPDATE | Ver inventario, reportar estado (`UPDATE condition`). |
| `gym_equipment` | **Admin/Super** | ALL | Gestión de compras y bajas. |
| `payments` | **Member** | SELECT | Ver su historial de pagos. |
| `payments` | **Admin/Super** | ALL | Registrar pagos, aprobar transferencias, ver reportes. |
---

## 7. Row Level Security en Entornos Multi-Tenant (SaaS)

Para lograr el aislamiento completo de los datos entre diferentes gimnasios (tenants), se aplican políticas RLS restrictivas en base a la columna `gimnasio_id` agregada a las tablas principales.

### Funciones Helper en Supabase SQL
* `public.get_user_gym_id()`: Retorna el `gimnasio_id` del perfil asociado al usuario autenticado (`auth.uid()`).
* `public.get_user_role()`: Retorna el rol del usuario autenticado (`auth.uid()`).

### Políticas Multi-Tenant Aplicadas
* **Clases y Actividades (`actividades`, `horarios_de_clase`, `reservas_de_clase`)**:
  ```sql
  CREATE POLICY "Multi-tenant: Acceso a actividades por gimnasio" 
  ON public.actividades FOR ALL USING (gimnasio_id = public.get_user_gym_id());
  ```
* **Membresías e Ingresos (`pagos`)**:
  ```sql
  CREATE POLICY "Multi-tenant: Pagos privados por gimnasio" 
  ON public.pagos FOR ALL USING (gimnasio_id = public.get_user_gym_id());
  ```
* **Entrenamientos (`rutinas`, `ejercicios`)**:
  ```sql
  CREATE POLICY "Multi-tenant: Rutinas por gimnasio" 
  ON public.rutinas FOR ALL USING (gimnasio_id = public.get_user_gym_id());
  ```
* **Acceso y Staff (`perfiles`)**:
  ```sql
  -- Los alumnos solo pueden ver los perfiles de su propio gimnasio
  CREATE POLICY "Multi-tenant: Ver perfiles del mismo gimnasio" 
  ON public.perfiles FOR SELECT USING (gimnasio_id = public.get_user_gym_id());

  -- Solo los administradores o superadministradores pueden hacer CRUD de perfiles en su gimnasio
  CREATE POLICY "Multi-tenant: Admins gestionan perfiles" 
  ON public.perfiles FOR ALL USING (
    gimnasio_id = public.get_user_gym_id() AND 
    public.get_user_role() IN ('admin', 'superadmin')
  );
  ```

---

## 8. Seguridad y Bypass de RLS para Soporte Técnico (Impersonación)

Para garantizar la auditoría e inmutabilidad durante las intervenciones del Superadmin:
1. **Acceso Consolidado**: Los paneles del Superadmin (`/saas-admin`) hacen uso del cliente administrativo `createAdminClient()`, que utiliza la clave secreta `service_role` de Supabase para evitar las restricciones de RLS al recolectar estadísticas globales y datos de auditoría.
2. **Registro de Impersonación**: Toda sesión de soporte remoto ejecutada desde el rol de Superadmin exige una justificación y guarda un registro inmutable en la tabla `logs_acceso_remoto`.
3. **Control en Interfaz de Destino**: El flag `?impersonate=true` en las rutas del administrador local (`/[gymId]/admin`) evalúa dinámicamente si el usuario activo es un `superadmin` para habilitar temporalmente los controles del panel local de ese gimnasio sin comprometer el aislamiento general de los tenants.

---

## Resumen de Acciones Críticas

1.  **Habilitar RLS en TODAS las tablas**: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`.
2.  **Políticas por defecto restrictivas**: Empezar denegando todo y habilitar lo específico.
3.  **Funciones Helper**: Crear funciones en SQL (`auth.uid()`, `is_admin()`, `is_coach()`) para simplificar las policies.
4.  **Índices**: Asegurar índices en claves foráneas (`user_id`, `coach_id`, `gimnasio_id`) para que las policies no ralenticen las consultas.
