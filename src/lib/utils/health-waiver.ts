/**
 * Single Source of Truth (SSOT) helper para verificar si un alumno
 * ha firmado la Ficha Médica obligatoria (PAR-Q / Exención de Responsabilidad).
 * Evalúa los campos de base de datos 'exencion_aceptada' y 'parq_firmado'.
 */
export function hasCompletedMedicalWaiver(profile: Record<string, any> | null | undefined): boolean {
    if (!profile) return false;
    return Boolean(profile.exencion_aceptada || profile.parq_firmado || profile.waiver_accepted);
}
