import { aiClient, DEFAULT_MODEL, MODEL_FLASH, MODEL_PRO, RoutineSchema, SAFETY_SETTINGS } from '@/lib/config/gemini';
import { AI_PROMPT_TEMPLATES, AITemplateKey } from '@/lib/constants/ai-templates';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '@/lib/logger';
import { AdaptiveReportSchema, type AdaptiveReport } from '@/lib/validations/adaptive-engine';
import { CorreccionesIASchema } from '@/lib/validations/videos';

/**
 * Parámetros para generar una rutina mejorada
 */
export interface StudentProfile {
  nombre_completo?: string;
  gender?: string;
  informacion_medica?: {
    peso?: number | string;
    altura?: number | string;
    enfermedades_cronicas?: string;
    lesiones?: string;
    alergias?: string;
    medicacion?: string;
    grupo_sanguineo?: string;
    presion_arterial?: string;
    fuma?: boolean;
  };
  metas_fitness?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UserGoal {
  primary_goal?: string;
  objetivo_principal?: string;
  frecuencia_entrenamiento_por_semana?: number;
  training_frequency_per_week?: number;
  tiempo_por_sesion_minutos?: number;
  time_per_session_minutes?: number;
  [key: string]: unknown;
}

export interface RoutineGenerationContext {
  studentProfile: StudentProfile;
  userGoal: UserGoal;
  gymEquipment: { name?: string; nombre?: string; category?: string; categoria?: string;[key: string]: unknown }[];
  coachNotes?: string;
  templateKey?: AITemplateKey;
  includeNutrition?: boolean;
  historicContext?: string;
}

export class AIService {
  /**
   * Genera una rutina utilizando la API estándar de Gemini
   */
  async generateRoutineFromPrompt(prompt: string): Promise<unknown> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        logger.info(`Generating routine with Gemini (Model: ${MODEL_PRO}, Attempt: ${attempt + 1})...`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsonSchema = zodToJsonSchema(RoutineSchema as any);
        if (jsonSchema && typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
          delete (jsonSchema as Record<string, unknown>).$schema;
        }

        const model = aiClient.getGenerativeModel({
          model: MODEL_PRO, 
          safetySettings: SAFETY_SETTINGS,
          generationConfig: {
            responseMimeType: "application/json",
            // @ts-ignore - Schema structural compatibility
            responseSchema: jsonSchema as Record<string, unknown>,
            temperature: 0.1
          }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;

        let text = '';
        try {
          text = response.text();
        } catch (_error) {
          logger.error("Error retrieving text (likely blocked):", { error: _error instanceof Error ? _error.message : _error });
          logger.info("Candidates:", { candidates: response.candidates });
          logger.info("PromptFeedback:", { promptFeedback: response.promptFeedback });
        }

        if (!text) {
          logger.error("Empty text received. Full response:", { result });
          throw new Error("La IA no devolvió texto. Revise logs del servidor para detalles de seguridad/bloqueo.");
        }

        return JSON.parse(text);

      } catch (_error) {
        const err = _error as Error & { status?: number };
        logger.error(`Gemini Attempt ${attempt + 1} Error:`, { error: err.message, status: err.status });

        // Retry on 429 or 503
        if (err.status === 429 || err.status === 503 || err.message?.includes('429')) {
          attempt++;
          const delay = Math.pow(2, attempt) * 1000;
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`Fallo en la generación de rutina: ${err.message}`);
      }
    }
    throw new Error("Fallo en la generación de rutina tras varios intentos.");
  }

  /**
   * Middleware de Validación Médica (Gemini Flash)
   * Realiza un chequeo de seguridad de 1 segundo sobre el plan generado.
   */
  async validatePlanSafety(plan: { rutina: unknown }, medicalData: Record<string, unknown>): Promise<{ safe: boolean; warning?: string }> {
    try {
      const prompt = `
        Analiza este plan de entrenamiento y compáralo con la ficha médica del alumno:
        FICHA MÉDICA: ${JSON.stringify(medicalData)}
        PLAN: ${JSON.stringify(plan.rutina)}

        ¿Hay algún ejercicio CONTRAINDICADO para las lesiones o condiciones del alumno? 
        Responde exclusivamente en JSON: {"safe": boolean, "warning": "razón técnica si es inseguro"}.
      `;

      const model = aiClient.getGenerativeModel({ model: MODEL_FLASH });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      logger.error("Safety Validation Error (IA Blocked/Failed):", error);
      return { 
        safe: false, 
        warning: "ERROR DE SISTEMA: No se pudo validar la seguridad biomecánica automáticamente. REQUIERE REVISIÓN MANUAL DEL PROFESOR antes de ejecutar." 
      };
    }
  }


  /**
   * Construye el prompt interactivo de VirtudCoach 2.0
   * Actúa como Entrenador Profesional y Arquitecto de UX.
   */
  buildPrompt(context: RoutineGenerationContext): string {
    const { studentProfile, userGoal, gymEquipment, coachNotes, templateKey, historicContext } = context;
    
    const medicalData = studentProfile.informacion_medica || {};
    const goalStr = userGoal?.objetivo_principal || userGoal?.primary_goal || 'Fitness General';
    
    // Inferencia o uso de template específico
    const template = templateKey ? AI_PROMPT_TEMPLATES[templateKey] : this.inferTemplate(goalStr);
    
    // Inyectamos el contexto de seguridad y reglas de negocio del Maestro
    return `
    🎯 MISION: Actúa como el VIRTUD COACH 2.0 (Especialista en Biomecánica y Medicina Deportiva).
    👤 ALUMNO: ${studentProfile.nombre_completo || 'Usuario de Virtud'}
    
    🛡️ REGLAS INFRANQUEABLES DE SEGURIDAD:
    - Debes basar la rutina estrictamente en el INVENTARIO REAL disponible: ${gymEquipment.map(eq => `${eq.nombre || eq.name} (${eq.categoria || eq.category})`).join(', ')}.
    - Debes RESPETAR la ficha médica (Lesiones, Alergias, Patologías): ${JSON.stringify(medicalData)}.
    - Si el Alumno tiene una LESIÓN, prohíbe ejercicios que comprometan esa zona.
    
    📝 CONTEXTO DE GENERACIÓN:
    - INSTRUCCIONES DEL PROFESOR: ${coachNotes || 'Ninguna'}
    - HISTORIAL RAG (MEMORIA): ${historicContext || 'Sin historial'}
    - OBJETIVO: ${goalStr}
    
    ${template.promptSuffix}
    
    💎 REQUISITOS TÉCNICOS:
    - Incluye TEMPO (ej: 3-0-1-0) y RPE para cada ejercicio.
    - Genera la rutina siguiendo estrictamente el esquema JSON indicado.
    `;
  }

  private inferTemplate(goal: string) {
    const g = goal.toLowerCase();
    if (g.includes('rehab') || g.includes('salud') || g.includes('lesión') || g.includes('dolor')) return AI_PROMPT_TEMPLATES.REHAB;
    if (g.includes('fuerza') || g.includes('músculo') || g.includes('hipertrofia') || g.includes('volumen') || g.includes('ganancia_muscular')) return AI_PROMPT_TEMPLATES.HYPERTROPHY;
    return AI_PROMPT_TEMPLATES.BEGINNER;
  }

  /**
   * Genera una respuesta de chat manteniendo el contexto vía Interaction ID
   */
  async generateChatResponse(message: string, history: { role: string; content: string }[] = [], _previousInteractionId?: string) {
    try {
      logger.info('Chat response with Gemini (Standard)...');

      // Map history for standard model
      const chatHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const model = aiClient.getGenerativeModel({ model: DEFAULT_MODEL });
      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          temperature: 0.7,
        }
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;

      return {
        text: response.text(),
        interactionId: undefined
      };
    } catch (_error) {
      const err = _error as Error;
      logger.error("AI Chat Error:", { error: err.message });
      throw new Error(err.message || "Error al procesar mensaje de IA");
    }
  }

  /**
   * Analiza un movimiento (visión) utilizando Gemini y devuelve un JSON estructurado.
   */
  async analyzeMovement(filePart: string, mimeType: string, exerciseName: string = "Ejercicio desconocido"): Promise<unknown> {
    try {
      // Validar peso para evitar que Node.js o el payload Base64 exploten la memoria. Max ~10MB (video muy corto).
      const fileMB = (filePart.length * 0.75) / (1024 * 1024);
      if (fileMB > 10) {
          throw new Error("El video es demasiado pesado (" + fileMB.toFixed(1) + "MB). La herramienta es evaluativa: debe ser corto y limitado (máx 10MB) para dar una solución saludable rápida.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonSchema = zodToJsonSchema(CorreccionesIASchema as any);
      if (jsonSchema && typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
        delete (jsonSchema as Record<string, unknown>).$schema;
      }

      const prompt = `
      Actúa como un Especialista en Biomecánica de Élite, Fisioterapeuta y Entrenador de Atletas de Alto Rendimiento.
      Tu objetivo es realizar un análisis técnico exhaustivo del video del ejercicio: ${exerciseName}.
      
      ESTRUCTURA DEL ANÁLISIS:
      1. TÉCNICA Y BIOMECÁNICA: Evalúa la trayectoria del movimiento, el rango de movimiento (ROM), la estabilidad del core y la alineación articular (rodillas, columna, hombros).
      2. SEGURIDAD: Identifica cualquier patrón compensatorio que pueda derivar en lesiones a corto o largo plazo.
      3. CRONOLOGÍA DE ERRORES: Indica el segundo exacto donde se pierde el control técnico (ej. "segundo 3.5: pérdida de neutralidad lumbar").
      4. RECOMENDACIONES: Proporciona 3-4 sugerencias accionables y "cues" de entrenamiento para la próxima sesión.
      
      PUNTAJE GENERAL:
      Calcula un puntaje de ejecución del 0 al 100 basado en:
      - 40% Control Postural.
      - 30% Rango de Movimiento Efectivo.
      - 30% Estabilidad y Ritmo.
      
      IMPORTANTE:
      - Sé extremadamente técnico pero constructivo. 
      - Usa terminología biomecánica (ej: valgo de rodilla, anteversión pélvica, etc.).
      - Si el video no corresponde a un ejercicio físico, indícalo claramente en las recomendaciones y otorga un puntaje de 0.
    `;

      const model = aiClient.getGenerativeModel({
        model: MODEL_PRO, // Tarea Multimodal: Análisis Biomecánico
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          responseMimeType: "application/json",
          // @ts-ignore - Schema structural compatibility
          responseSchema: jsonSchema as Record<string, unknown>,
          temperature: 0.1
        }
      });

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: filePart, mimeType: mimeType } }
      ]);
      const response = await result.response;
      const text = response.text();

      if (!text) throw new Error("La IA no devolvió un análisis válido.");

      return JSON.parse(text);
    } catch (_error) {
      const err = _error as Error;
      logger.error("Vision Analyze Error:", { error: err.message });
      throw new Error(`Error analizando el movimiento: ${err.message}`);
    }
  }

  /**
   * Analiza una imagen de comida utilizando Gemini Vision
   */
  async analyzeNutrition(filePart: string, mimeType: string): Promise<unknown> {
    try {
      const { NutritionAnalysisSchema } = await import('@/lib/validations/nutrition');

      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonSchema = zodToJsonSchema(NutritionAnalysisSchema as any);
      if (jsonSchema && typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
        delete (jsonSchema as Record<string, unknown>).$schema;
      }

      const prompt = `
        Actúa como un Nutricionista Deportivo de Élite y Especialista en Composición Corporal.
        Tu objetivo es analizar la imagen de este plato de comida con precisión quirúrgica.
        
        TAREAS:
        1. Identifica el nombre del plato y todos los ingredientes visibles.
        2. Estima las calorías totales con el margen de error más bajo posible.
        3. Calcula los macros (Proteínas, Carbohidratos, Grasas) en gramos.
        4. Otorga una "Puntuación de Salud" (1-10) basada en la densidad nutricional y objetivos fitness.
        5. Proporciona una "Recomendación Táctica" breve (ej: "Añade más proteína en la siguiente comida" o "Excelente balance post-entreno").
        
        ESTYLE:
        - Sé profesional, directo y motivador.
        - Usa terminología nutricional precisa.
      `;

      const model = aiClient.getGenerativeModel({
        model: MODEL_FLASH, // Tarea de Visión: Análisis Nutricional (Flash es suficiente)
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          responseMimeType: "application/json",
          // @ts-ignore - Schema structural compatibility
          responseSchema: jsonSchema as Record<string, unknown>,
          temperature: 0.1
        }
      });

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: filePart, mimeType: mimeType } }
      ]);
      const response = await result.response;
      const text = response.text();

      if (!text) throw new Error("La IA no pudo procesar la imagen nutricional.");

      return JSON.parse(text);
    } catch (_error) {
      const err = _error as Error;
      logger.error("Nutrition Analysis Error:", { error: err.message });
      throw new Error(`Error en el análisis nutricional: ${err.message}`);
    }
  }

  /**
   * Genera un reporte adaptativo basado en el historial reciente del alumno
   */
  async generateAdaptiveReport(
    studentProfile: StudentProfile,
    visionLogs: Record<string, unknown>[],
    nutritionLogs: Record<string, unknown>[],
    measurementLogs: Record<string, unknown>[] = [],
    recoveryLogs: Record<string, unknown>[] = []
  ): Promise<AdaptiveReport> {
    try {
      logger.info('Generating Adaptive Report with Gemini...');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonSchema = zodToJsonSchema(AdaptiveReportSchema as any);
      if (jsonSchema && typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
        delete (jsonSchema as Record<string, unknown>).$schema;
      }

      const prompt = `
        Actúa como un Sistema de Inteligencia de Alto Rendimiento y Analista de Datos Deportivos.
        Tu misión es analizar el comportamiento y progreso del alumno en los últimos 7 días.
        
        DATOS DEL ALUMNO (Con Ficha Médica Único Ancla de Verdad):
        - Perfil: ${JSON.stringify(studentProfile)} // Contiene lesiones o fichas que prevalecen siempre.
        
        HISTORIAL DE BIOMECÁNICA (Videos Recientes):
        ${visionLogs.slice(0, 5).map(l => `- ${l.nombre_ejercicio}: Score ${l.puntaje_general}% en ${l.creado_en}`).join('\n')}
        
        HISTORIAL DE NUTRICIÓN (Últimos reportes tácticos):
        ${nutritionLogs.slice(0, 7).map(l => `- ${l.nombre_plato}: ${l.calorias}kcal, Score Salud ${l.puntaje_salud}/10 en ${l.creado_en}`).join('\n')}
        
        HISTORIAL DE MEDICIONES (Peso/Medidas - Últimas lecturas clave):
        ${measurementLogs.slice(0, 5).map(l => `- Fecha: ${l.registrado_en}, Peso: ${l.peso}kg, Grasa: ${l.grasa_procentaje || 'N/A'}%`).join('\n')}
 
        HISTORIAL DE RECUPERACIÓN (Pautas del Mes):
        ${recoveryLogs.slice(0, 14).map(l => `- Fecha: ${l.fecha}, Sueño: ${l.horas_sueno}h (Calidad: ${l.calidad_sueno}/10), Estrés: ${l.nivel_estres}/10, Fatiga: ${l.nivel_fatiga}/10`).join('\n')}
 
        TAREAS:
        1. Evalúa la adherencia al plan (consistencia).
        2. Detecta patrones de fatiga o degradación técnica (biomecánica). Cruzar con los logs de recuperación (sueño y fatiga reportada).
        3. Calcula un Nivel de Riesgo de Lesión (0-100) basado en la calidad técnica reciente, volumen de entrenamiento y estado de recuperación.
        4. Performance Forecasting: Analiza la tendencia de peso de los últimos 90 días contra la meta del alumno (${JSON.stringify(studentProfile.metas_fitness)}).
        5. Predicción: Calcula la fecha estimada de cumplimiento del objetivo, los días restantes y la probabilidad de éxito según el ritmo actual.
        6. Análisis de Eficiencia: Evalúa si el timing nutricional es óptimo para los resultados buscados.
        7. SOPORTE MENTAL: Evalúa el estado de ánimo y estrés reportado. Proporciona una recomendación de bienestar para evitar el agotamiento o burnout.
        8. Identifica alertas críticas si el alumno está cerca del sobre-entrenamiento o falta crónica de sueño.
        9. Genera sugerencias accionables para el coach (ajustes en macros, carga o descanso).
        10. Estima los riesgos si no se aplican los ajustes.
        
        REGLAS:
        - Sé crítico pero empático.
        - Si la recuperación es baja (< 6h de sueño o fatiga > 7), sugiere priorizar el descanso o bajar la intensidad (deload).
        - La fecha estimada debe ser realista basada en la tasa de cambio semanal real (rate of weight loss/gain).
        - Si el progreso es nulo y la recuperación es mala, identifica el estrés/sueño como el cuello de botella.
      `;

      const model = aiClient.getGenerativeModel({
        model: MODEL_PRO, // Tarea Estratégica: Pronósticos y Big Data
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          responseMimeType: "application/json",
          // @ts-ignore - Schema structural compatibility
          responseSchema: jsonSchema as Record<string, unknown>,
          temperature: 0.1
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) throw new Error("La IA no pudo generar el reporte adaptativo.");

      return JSON.parse(text);
    } catch (_error) {
      const err = _error as Error;
      logger.error("Adaptive Report Error:", { error: err.message });
      throw new Error(`Error generando reporte adaptativo: ${err.message}`);
    }
  }
}

export const aiService = new AIService();
