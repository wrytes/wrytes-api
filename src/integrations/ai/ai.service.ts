import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';
import type { ConversationMessage, InvoiceExtraction } from './ai.provider';

export type { ConversationMessage, InvoiceExtraction };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: OpenAiCompatibleProvider;

  constructor(config: ConfigService) {
    const apiKey  = config.get<string>('ai.openaiApiKey', 'ollama');
    const baseURL = config.get<string>('ai.openaiBaseUrl', 'http://localhost:11434/v1');
    const model   = config.get<string>('ai.openaiModel', 'llama3.2-vision:11b');
    this.provider = new OpenAiCompatibleProvider(apiKey, baseURL, model);
    this.logger.log(`AI provider: ${baseURL} / ${model}`);
  }

  complete(prompt: string, systemPrompt?: string): Promise<string> {
    return this.provider.complete(prompt, systemPrompt);
  }

  ask(history: ConversationMessage[], systemPrompt?: string): Promise<string> {
    return this.provider.ask(history, systemPrompt);
  }

  extractInvoice(fileData: Buffer, fileType: string): Promise<InvoiceExtraction> {
    return this.provider.extractInvoice(fileData, fileType);
  }
}
