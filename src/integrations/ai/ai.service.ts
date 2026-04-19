import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';
import type { ConversationMessage, InvoiceExtraction } from './ai.provider';

export type { ConversationMessage, InvoiceExtraction };

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private provider: OpenAiCompatibleProvider;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey  = this.config.get<string>('ai.openaiApiKey', 'ollama');
    const baseURL = this.config.get<string>('ai.openaiBaseUrl', 'http://localhost:11434/v1');
    const model   = this.config.get<string>('ai.openaiModel', 'llama3.2-vision:11b');
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
