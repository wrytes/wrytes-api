import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AiService } from '../../integrations/ai/ai.service';
import { INVOICES_QUEUE, InvoiceJobData } from './invoices.queue';

@Processor(INVOICES_QUEUE, { concurrency: 1 })
export class InvoicesProcessor extends WorkerHost {
	private readonly logger = new Logger(InvoicesProcessor.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly ai: AiService,
	) {
		super();
	}

	async process(job: Job<InvoiceJobData>): Promise<void> {
		const { invoiceId } = job.data;

		const invoice = await this.prisma.invoice.findUnique({
			where: { id: invoiceId },
		});
		if (!invoice) {
			this.logger.warn(`Invoice ${invoiceId} not found — skipping`);
			return;
		}

		await this.prisma.invoice.update({
			where: { id: invoiceId },
			data: { status: InvoiceStatus.PROCESSING, processingStartedAt: new Date() },
		});

		try {
			const extraction = await this.ai.extractInvoice(
				Buffer.from(invoice.fileData),
				invoice.fileType,
			);

			await this.prisma.invoice.update({
				where: { id: invoiceId },
				data: {
					status: InvoiceStatus.AWAITING_PAYMENT,
					processingStartedAt: null,
					fromName: extraction.fromName,
					toName: extraction.toName,
					amount:
						extraction.amount != null
							? String(extraction.amount)
							: null,
					currency: extraction.currency,
					reference: extraction.reference,
					itemTags: extraction.itemTags,
					bankHolder: extraction.bankHolder,
					bankStreet: extraction.bankStreet,
					bankStreetNr: extraction.bankStreetNr,
					bankZip: extraction.bankZip,
					bankCity: extraction.bankCity,
					bankIban: extraction.bankIban,
				},
			});

			this.logger.log(
				`Invoice ${invoiceId} extracted — from: ${extraction.fromName}, amount: ${extraction.amount} ${extraction.currency}`,
			);
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			const isFinalAttempt =
				job.attemptsMade >= (job.opts.attempts ?? 1) - 1;

			if (isFinalAttempt) {
				this.logger.error(
					`Invoice ${invoiceId} extraction failed permanently: ${error}`,
				);
				await this.prisma.invoice.update({
					where: { id: invoiceId },
					data: { status: InvoiceStatus.FAILED, processingStartedAt: null, error },
				});
			} else {
				this.logger.warn(
					`Invoice ${invoiceId} extraction failed (attempt ${job.attemptsMade + 1}) — retrying: ${error}`,
				);
				await this.prisma.invoice.update({
					where: { id: invoiceId },
					data: { status: InvoiceStatus.PENDING },
				});
				throw err;
			}
		}
	}
}
