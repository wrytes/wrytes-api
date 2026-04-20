import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type {
	AiProvider,
	ConversationMessage,
	InvoiceExtraction,
} from '../ai.provider';
import { INVOICE_SYSTEM_PROMPT, parseInvoiceJson } from '../ai.provider';

const MODEL = 'claude-sonnet-4-6';

export class AnthropicProvider implements AiProvider {
	private readonly logger = new Logger(AnthropicProvider.name);
	private readonly client: Anthropic;

	constructor(apiKey: string) {
		this.client = new Anthropic({ apiKey });
	}

	async complete(prompt: string, systemPrompt?: string): Promise<string> {
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
	}

	async ask(
		history: ConversationMessage[],
		systemPrompt = 'You are a helpful assistant.',
	): Promise<string> {
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
	}

	async extractInvoice(
		fileData: Buffer,
		fileType: string,
	): Promise<InvoiceExtraction> {
		const base64 = fileData.toString('base64');

		const content: Anthropic.ContentBlockParam[] =
			fileType === 'application/pdf'
				? [
						{
							type: 'document',
							source: {
								type: 'base64',
								media_type: 'application/pdf',
								data: base64,
							},
						},
						{
							type: 'text',
							text: 'Extract the invoice data from this document.',
						},
					]
				: [
						{
							type: 'image',
							source: {
								type: 'base64',
								media_type: fileType as
									| 'image/jpeg'
									| 'image/png'
									| 'image/gif'
									| 'image/webp',
								data: base64,
							},
						},
						{
							type: 'text',
							text: 'Extract the invoice data from this image.',
						},
					];

		const response = await this.client.messages.create({
			model: MODEL,
			max_tokens: 2048,
			system: INVOICE_SYSTEM_PROMPT,
			messages: [{ role: 'user', content }],
		});

		const text = response.content.find((c) => c.type === 'text') as
			| Anthropic.TextBlock
			| undefined;

		if (!text?.text) throw new Error('Empty response from Anthropic');
		return parseInvoiceJson(text.text);
	}
}
