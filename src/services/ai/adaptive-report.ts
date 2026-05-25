import { aiClient, MODEL_PRO, SAFETY_SETTINGS } from '@/lib/config/gemini';
import { AdaptiveReportSchema, type AdaptiveReport } from '@/lib/validations/adaptive-engine';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '@/lib/logger';
import { StudentProfile } from './routine-generator';

export class AdaptiveReportGenerator {
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
        3. Calculates un Nivel de Riesgo de Lesión (0-100) basado en la calidad técnica reciente, volumen de entrenamiento y estado de recuperación.
        4. Performance Forecasting: Analiza la tendencia de peso de los últimos 90 días contra la meta del alumno (${JSON.stringify(studentProfile.metas_fitness)}).
        5. Predicción: Calculates la fecha estimada de cumplimiento del objetivo, los días restantes y la probabilidad de éxito según el ritmo actual.
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
