import { aiClient, DEFAULT_MODEL } from '@/lib/config/gemini';
import { logger } from '@/lib/logger';

export class AIChatService {
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
}
