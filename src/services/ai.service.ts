import { RoutineGenerator, type StudentProfile, type UserGoal, type RoutineGenerationContext } from './ai/routine-generator';
import { AIChatService } from './ai/chat';
import { MovementAnalyzer } from './ai/movement-analyzer';
import { NutritionAnalyzer } from './ai/nutrition-analyzer';
import { AdaptiveReportGenerator } from './ai/adaptive-report';
import { type AdaptiveReport } from '@/lib/validations/adaptive-engine';

export type { StudentProfile, UserGoal, RoutineGenerationContext };

export class AIService {
  private generator = new RoutineGenerator();
  private chat = new AIChatService();
  private movement = new MovementAnalyzer();
  private nutrition = new NutritionAnalyzer();
  private adaptive = new AdaptiveReportGenerator();

  async generateRoutineFromPrompt(prompt: string): Promise<unknown> {
    return this.generator.generateRoutineFromPrompt(prompt);
  }

  async validatePlanSafety(plan: { rutina: unknown }, medicalData: Record<string, unknown>): Promise<{ safe: boolean; warning?: string }> {
    return this.generator.validatePlanSafety(plan, medicalData);
  }

  buildPrompt(context: RoutineGenerationContext): string {
    return this.generator.buildPrompt(context);
  }

  async generateChatResponse(message: string, history: { role: string; content: string }[] = [], _previousInteractionId?: string) {
    return this.chat.generateChatResponse(message, history, _previousInteractionId);
  }

  async analyzeMovement(filePart: string, mimeType: string, exerciseName: string = "Ejercicio desconocido"): Promise<unknown> {
    return this.movement.analyzeMovement(filePart, mimeType, exerciseName);
  }

  async analyzeNutrition(filePart: string, mimeType: string): Promise<unknown> {
    return this.nutrition.analyzeNutrition(filePart, mimeType);
  }

  async generateAdaptiveReport(
    studentProfile: StudentProfile,
    visionLogs: Record<string, unknown>[],
    nutritionLogs: Record<string, unknown>[],
    measurementLogs: Record<string, unknown>[] = [],
    recoveryLogs: Record<string, unknown>[] = []
  ): Promise<AdaptiveReport> {
    return this.adaptive.generateAdaptiveReport(studentProfile, visionLogs, nutritionLogs, measurementLogs, recoveryLogs);
  }
}

export const aiService = new AIService();
