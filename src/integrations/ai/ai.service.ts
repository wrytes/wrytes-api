import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.anthropicApiKey');
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Single-turn completion — sends a prompt and returns the text response.
   */
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content.find((c) => c.type === 'text') as
        | Anthropic.TextBlock
        | undefined;
      return text?.text ?? '';
    } catch (err) {
      this.logger.error(`AI complete failed: ${err.message}`);
      return '';
    }
  }

  /**
   * Multi-turn conversational assistant.
   * Pass the full conversation history and an optional system prompt.
   */
  async ask(
    history: ConversationMessage[],
    systemPrompt = 'You are a helpful assistant.',
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: history,
      });

      const text = response.content.find((c) => c.type === 'text') as
        | Anthropic.TextBlock
        | undefined;
      return text?.text ?? 'Unable to generate a response. Please try again.';
    } catch (err) {
      this.logger.error(`AI ask failed: ${err.message}`);
      return 'Unable to generate a response. Please try again.';
    }
  }
}
