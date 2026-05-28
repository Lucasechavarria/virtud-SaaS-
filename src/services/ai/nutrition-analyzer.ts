import { aiClient, MODEL_FLASH, SAFETY_SETTINGS } from '@/lib/config/gemini';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '@/lib/logger';

export class NutritionAnalyzer {
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
}
