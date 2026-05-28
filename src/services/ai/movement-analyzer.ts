import { aiClient, MODEL_PRO, SAFETY_SETTINGS } from '@/lib/config/gemini';
import { CorreccionesIASchema } from '@/lib/validations/videos';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '@/lib/logger';

export class MovementAnalyzer {
  async analyzeMovement(filePart: string, mimeType: string, exerciseName: string = "Ejercicio desconocido"): Promise<unknown> {
    try {
      // Validar peso para evitar que Node.js o el payload Base64 exploten la memoria. Max ~10MB.
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
}
