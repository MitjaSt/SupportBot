import { ConfigService } from '@/config/config.service';
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.openai.apiKey,
      timeout: this.config.openai.timeout * 1000,
    });
  }

  get enabled(): boolean {
    return this.config.followup.enabled;
  }

  /**
   * Generate 2-3 short follow-up question suggestions based on the exchange.
   * Returns [] if the feature is disabled or if generation fails.
   */
  async generate(question: string, answer: string): Promise<string[]> {
    if (!this.enabled) return [];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.chatModel,
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content:
              'You generate short follow-up question suggestions for a macular disease helpline chatbot. ' +
              'Return ONLY a JSON array of 2-3 concise questions (max 10 words each) the user might ask next. ' +
              'No explanation, no markdown, just the JSON array.',
          },
          {
            role: 'user',
            content: `User asked: ${question}\n\nAssistant answered: ${answer}`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? '[]';
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return (parsed as unknown[])
        .filter((q): q is string => typeof q === 'string' && q.length > 0)
        .slice(0, 3);
    } catch (err) {
      this.logger.warn('Failed to generate follow-up suggestions', err);
      return [];
    }
  }
}
