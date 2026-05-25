import { aiClient, MODEL_FLASH, MODEL_PRO, RoutineSchema, SAFETY_SETTINGS } from '@/lib/config/gemini';
import { AI_PROMPT_TEMPLATES, AITemplateKey } from '@/lib/constants/ai-templates';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '@/lib/logger';

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

export class RoutineGenerator {
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
}
