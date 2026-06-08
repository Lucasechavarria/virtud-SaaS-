/**
 * User and Authentication Types
 */

export interface User {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export type UserRole = 'admin' | 'coach' | 'member' | 'superadmin' | 'recepcion';

export interface UserProfile extends User {
    nombre: string;
    edad?: number;
    peso?: number;
    altura?: number;
    experiencia?: 'Principiante' | 'Intermedio' | 'Avanzado';
    historialMedico?: MedicalHistory;
}

export interface MedicalHistory {
    lesiones?: string[];
    patologias?: string[];
    cirugias?: string[];
    medicacion?: string;
    restricciones?: string;
}

export interface UserMedicalInfo {
    grupo_sanguineo?: string;
    presion_arterial?: string;
    peso?: number;
    fuma?: boolean;
    lesiones?: string;
    alergias?: string;
    enfermedades_cronicas?: string;
    patologias?: string;
    antecedentes?: string;
}

export interface UserEmergencyContact {
    nombre_completo?: string;
    relacion?: string;
    telefono?: string;
    direccion?: string;
}

// --- Supabase & Admin Types ---

export interface SupabaseUserProfile {
    id: string;
    nombre_completo: string | null;
    nombre?: string | null;
    apellido?: string | null;
    correo: string;
    email?: string; // Legacy/Alias support
    rol: UserRole;
    url_avatar?: string | null;
    telefono?: string | null;
    dni?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
    fecha_nacimiento?: string | null;
    genero?: string | null;
    gender?: string | null; // Alias for Database consistency
    informacion_medica?: UserMedicalInfo | null;
    contacto_emergencia?: UserEmergencyContact | null;
    exencion_aceptada?: boolean;
    fecha_exencion?: string | null;
    estado_membresia?: 'active' | 'inactive' | 'pending' | 'expired';
    role?: UserRole; // Alias for rol
    fecha_inicio_membresia?: string | null;
    fecha_fin_membresia?: string | null;
    observaciones_entrenador?: string | null;
    restricciones_adicionales?: string | null;
    modificaciones_recomendadas?: string | null;
    onboarding_completado?: boolean;
    onboarding_completado_en?: string | null;
    creado_en?: string;
    actualizado_en?: string;
    [key: string]: unknown;
}

export interface AdminUserListResponse extends SupabaseUserProfile {
    name: string;
    membershipStatus: string;
    membershipEnds?: string | null;
}
