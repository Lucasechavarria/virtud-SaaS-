/**
 * Sprint 5 — Interfaces fuertes para reemplazar `any` en componentes críticos.
 * Centraliza los tipos del Coach, Sesiones de entrenamiento, Análisis de video y Estadísticas del Gym.
 */

// ─────────────────────────────────────────────
// Coach → Student relationship
// ─────────────────────────────────────────────

export interface CoachStudent {
    id: string;
    nombre: string;
    email: string;
    experiencia: string;
    status: 'active' | 'alert' | 'inactive';
    lastAttendance: string;
    nextClass: string;
    edad: number;
    url_avatar?: string | null;
    active_goal?: StudentGoal | null;
    active_routine?: StudentRoutine | null;
}

export interface StudentGoal {
    id: string;
    objetivo_principal: string;
    fecha_inicio?: string;
    fecha_objetivo?: string;
    estado?: 'activa' | 'completada' | 'abandonada';
}

export interface StudentRoutine {
    id: string;
    nombre: string;
    tipo?: string;
    dias_por_semana?: number;
    created_at?: string;
}

// ─────────────────────────────────────────────
// Workout Sessions (Coach / Student)
// ─────────────────────────────────────────────

export interface WorkoutSession {
    id: string;
    alumno_id: string;
    rutina_id: string;
    fecha_inicio: string;
    fecha_fin?: string | null;
    estado: 'en_progreso' | 'completada' | 'cancelada';
    duracion_minutos?: number;
    ejercicios_completados?: number;
    ejercicios_totales?: number;
    puntos_ganados?: number;
    notas?: string | null;
}

// ─────────────────────────────────────────────
// Video Analysis (Coach Vision module)
// ─────────────────────────────────────────────

export interface VideoAnalysis {
    id: string;
    alumno_id: string;
    alumno_nombre?: string;
    coach_id: string;
    video_url: string;
    thumbnail_url?: string | null;
    ejercicio: string;
    estado: 'pendiente' | 'en_revision' | 'completado';
    feedback?: string | null;
    puntuacion?: number | null;
    angulos_detectados?: Record<string, number>;
    created_at: string;
    updated_at?: string;
}

// ─────────────────────────────────────────────
// Gym / Admin Stats
// ─────────────────────────────────────────────

export interface GymStats {
    totalSocios: number;
    sociosActivos: number;
    sociosInactivos: number;
    ingresosMes: number;
    nuevosEsteMes: number;
    asistenciaHoy: number;
    churnRiesgo: number;
    tasaRetencion: number;
}

export interface GymOverviewMetrics {
    mrr: number;
    totalGyms: number;
    totalUsers: number;
    churnRate: number;
    ticketPromedio: number;
    activeSubscriptions: number;
}

// ─────────────────────────────────────────────
// Student Dashboard Trends
// ─────────────────────────────────────────────

export interface BodyMetricTrend {
    value: number;
    direction: 'up' | 'down' | 'stable';
    percentage: number;
}

export interface StudentDashboardMetrics {
    peso_actual?: number;
    grasa_corporal?: number;
    peso_trend?: BodyMetricTrend | null;
    grasa_trend?: BodyMetricTrend | null;
    racha_asistencia: number;
    puntos_totales: number;
    nivel: number;
}
