import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import type {
	AiProvider,
	ConversationMessage,
	InvoiceExtraction,
} from '../ai.provider';
import { INVOICE_SYSTEM_PROMPT, parseInvoiceJson } from '../ai.provider';

export class OpenAiCompatibleProvider implements AiProvider {
	private readonly logger = new Logger(OpenAiCompatibleProvider.name);
	private readonly client: OpenAI;
	private readonly model: string;

	constructor(apiKey: string, baseURL: string, model: string) {
		this.client = new OpenAI({ apiKey, baseURL });
		this.model = model;
	}

	async complete(prompt: string, systemPrompt?: string): Promise<string> {
		const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
		if (systemPrompt)
			messages.push({ role: 'system', content: systemPrompt });
		messages.push({ role: 'user', content: prompt });

		const response = await this.client.chat.completions.create({
			model: this.model,
			messages,
		});
		return response.choices[0]?.message?.content ?? '';
	}

	async ask(
		history: ConversationMessage[],
		systemPrompt = 'You are a helpful assistant.',
	): Promise<string> {
		const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: 'system', content: systemPrompt },
			...history.map(
				(m) =>
					({
						role: m.role,
						content: m.content,
					}) as OpenAI.Chat.ChatCompletionMessageParam,
			),
		];
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages,
		});
		return (
			response.choices[0]?.message?.content ??
			'Unable to generate a response. Please try again.'
		);
	}

	async extractInvoice(
		fileData: Buffer,
		fileType: string,
	): Promise<InvoiceExtraction> {
		let messages: OpenAI.Chat.ChatCompletionMessageParam[];

		if (fileType === 'application/pdf') {
			const parsed = await pdfParse(fileData);
			const text = parsed.text.trim();
			this.logger.log(`PDF text extracted — ${text.length} chars`);

			messages = [
				{ role: 'system', content: INVOICE_SYSTEM_PROMPT },
				{
					role: 'user',
					content: `Extract the invoice data from this document:\n\n${text}`,
				},
			];
		} else {
			const dataUri = `data:${fileType};base64,${fileData.toString('base64')}`;
			messages = [
				{ role: 'system', content: INVOICE_SYSTEM_PROMPT },
				{
					role: 'user',
					content: [
						{ type: 'image_url', image_url: { url: dataUri } },
						{
							type: 'text',
							text: 'Extract the invoice data from this image.',
						},
					],
				},
			];
		}

		const response = await this.client.chat.completions.create({
			model: this.model,
			messages,
			response_format: { type: 'json_object' },
		});
		const raw = response.choices[0]?.message?.content ?? '';

		if (!raw) throw new Error('Empty response from model');
		return parseInvoiceJson(raw);
	}
}
