import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';

if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
}

// Inicialización perezosa del cliente SDK estándar
let genAIInstance: GoogleGenerativeAI | null = null;

export const getGemini = () => {
    if (!genAIInstance) {
        genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key_for_build');
    }
    return genAIInstance;
};

// Exportar el cliente para uso general (aunque se recomienda usar getGemini)
export const aiClient = getGemini();

// Modelos Gemini (Estrategia Híbrida LDE System 2026)
export const MODEL_FLASH = "gemini-1.5-flash";
export const MODEL_PRO = "gemini-1.5-pro";
export const DEFAULT_MODEL = MODEL_FLASH; // El 80% de las tareas se resuelven con Flash


// Configuración de Seguridad para permitir temas de salud y fitness
export const SAFETY_SETTINGS = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    // Crítico para salud, ejercicio y rehabilitación:
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH, // Útil para anatomía en videos
    },
];

export const SafetyDisclaimerSchema = z.object({
    nivel_de_riesgo: z.enum(['BAJO', 'MEDIO', 'ALTO']),
    clausula_legal: z.string(),
    requiere_validacion_profesor: z.boolean(),
    mensaje_profesor: z.string().optional()
});

export const NutritionPlanSchema = z.object({
    calorias_diarias: z.number(),
    macros: z.object({
        proteinas_gramos: z.number(),
        carbohidratos_gramos: z.number(),
        grasas_gramos: z.number(),
    }),
    ajustes_por_salud: z.string().describe("Justificación médica de los ajustes dietarios"),
    comidas: z.array(z.object({
        nombre: z.string(),
        sugerencia: z.string(),
        es_opcional: z.boolean().default(false)
    })),
    hidratacion: z.object({
        litros_diarios: z.number(),
        durante_entreno: z.string()
    }),
    advertencia_profesor: z.string().optional()
});

// Esquema Zod para la salida estructurada de rutinas según el Prompt Maestro
export const RoutineSchema = z.object({
    rutina_metadata: z.object({
        id_rutina: z.string(),
        compartida_con_alumno: z.boolean(),
        objetivo_principal: z.string(),
        nivel_alumno: z.string(),
        frecuencia_semanal: z.string(),
        duracion_estimada_minutos: z.number(),
        editable_por_profesor: z.boolean(),
        editable_por_alumno: z.boolean()
    }),
    aviso_legal: SafetyDisclaimerSchema,
    sistema_de_logros: z.object({
        puntaje_maximo_sesion: z.number(),
        criterios_puntaje: z.object({
            ejercicio_completado: z.number(),
            rutina_finalizada: z.number(),
            respeto_de_tiempos: z.number(),
            constancia_semanal: z.number()
        })
    }),
    rutina: z.array(z.object({
        dia: z.union([z.number(), z.string()]),
        grupo_muscular: z.string(),
        bloques: z.array(z.object({
            tipo: z.enum(['ejercicio', 'descanso', 'circuito']),
            nombre: z.string(),
            cronometrado: z.boolean(),
            tiempo_recomendado_segundos: z.number(),
            tiempo_editable: z.boolean(),
            ejercicios: z.array(z.object({
                id_ejercicio: z.string(),
                nombre: z.string(),
                equipamiento: z.string(),
                series: z.number(),
                repeticiones: z.string(),
                tempo: z.string(),
                descanso_segundos: z.number(),
                descanso_editable: z.boolean(),
                marcable_como_realizado: z.boolean().default(true),
                estado_inicial: z.string().default('pendiente'),
                puntaje_base: z.number(),
                indicaciones_tecnicas: z.string(),
                alertas_medicas: z.string(),
                alternativa_sin_equipo: z.string(),
                link_tutorial_sugerido: z.string().optional(), // Nuevo campo
                descripcion_visual: z.string().optional()      // Nuevo campo
            }))
        }))
    })),
    plan_nutricional: NutritionPlanSchema.optional(),
    finalizacion_sesion: z.object({
        requiere_confirmacion: z.boolean(),
        metricas_generadas: z.object({
            tiempo_total_real: z.boolean(),
            ejercicios_completados: z.boolean(),
            ejercicios_omitidos: z.boolean(),
            puntaje_obtenido: z.boolean()
        })
    }),
    recomendaciones_post_entrenamiento: z.array(z.string()),
    alertas_y_advertencias: z.array(z.string()).optional()
});
export type RoutineAIResponse = z.infer<typeof RoutineSchema>;
