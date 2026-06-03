/**
 * 🛡️ SISTEMA DE MÓDULOS MULTITENANT SAAS (SSOT)
 * Mapeo oficial de bits a módulos activos para evitar desbordamiento del JWT.
 */
export const MODULE_BITS: Record<string, number> = {
    'Pos': 1,        // Bit 0 (1)
    'Finanzas': 2,   // Bit 1 (2)
    'Crm': 4,        // Bit 2 (4)
    'Nutricion': 8,  // Bit 3 (8)
    'Clases': 16,    // Bit 4 (16)
    'VisionLab': 32  // Bit 5 (32)
};

/**
 * Valida de forma segura y eficiente si un gimnasio tiene contratado un módulo específico.
 * Soporta de manera híbrida y retrocompatible tanto el formato bitmask (entero compacto)
 * como el formato heredado (array de strings o Record booleano).
 */
export function hasModuleAccess(
    activeModules: unknown,
    moduleName: string
): boolean {
    if (!activeModules) return false;

    const bit = MODULE_BITS[moduleName];
    if (!bit) {
        // Si no está registrado en bitmask, no podemos evaluarlo como número, pero sí como array/objeto
        if (typeof activeModules === 'number' || typeof activeModules === 'boolean') {
            console.warn(`[Module Guard] El módulo solicitado "${moduleName}" no está registrado en MODULE_BITS y no se puede evaluar con bitmask.`);
            return false;
        }
    } else {
        // CASO A: Formato Bitmask moderno (Número entero en claims)
        if (typeof activeModules === 'number') {
            return (activeModules & bit) !== 0;
        }

        // CASO B: Formato de texto número (ej. "11" en cookies o strings de persistencia)
        const num = Number(activeModules);
        if (!isNaN(num) && typeof activeModules !== 'boolean' && !Array.isArray(activeModules) && activeModules !== '') {
            return (num & bit) !== 0;
        }
    }

    // CASO C: Retrocompatibilidad heredada (Array de strings, ej: ["Pos", "Finanzas"])
    if (Array.isArray(activeModules)) {
        return activeModules.some(m => String(m).toLowerCase() === moduleName.toLowerCase());
    }

    // CASO D: Retrocompatibilidad heredada (Objeto JSONB booleano, ej: {"Pos": true})
    if (typeof activeModules === 'object') {
        const record = activeModules as Record<string, unknown>;
        
        // Comprobar con la llave exacta o case-insensitive
        return !!(
            record[moduleName] || 
            record[moduleName.toLowerCase()] || 
            record[moduleName.toUpperCase()] ||
            Object.entries(record).find(([k, v]) => k.toLowerCase() === moduleName.toLowerCase() && v === true)
        );
    }

    return false;
}
