import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AiService } from '../../integrations/ai/ai.service';
import { BILLS_QUEUE, BillJobData } from './bills.queue';

@Processor(BILLS_QUEUE, { concurrency: 1 })
export class BillsProcessor extends WorkerHost {
	private readonly logger = new Logger(BillsProcessor.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly ai: AiService,
	) {
		super();
	}

	async process(job: Job<BillJobData>): Promise<void> {
		const { billId } = job.data;

		const bill = await this.prisma.invoice.findUnique({ where: { id: billId } });
		if (!bill) {
			this.logger.warn(`Bill ${billId} not found — skipping`);
			return;
		}

		await this.prisma.invoice.update({
			where: { id: billId },
			data: { status: InvoiceStatus.PROCESSING, processingStartedAt: new Date() },
		});

		try {
			const extraction = await this.ai.extractInvoice(
				Buffer.from(bill.fileData),
				bill.fileType,
			);

			await this.prisma.invoice.update({
				where: { id: billId },
				data: {
					status: InvoiceStatus.AWAITING_PAYMENT,
					processingStartedAt: null,
					fromName: extraction.fromName,
					toName: extraction.toName,
					amount: extraction.amount != null ? String(extraction.amount) : null,
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

			this.logger.log(`Bill ${billId} extracted — from: ${extraction.fromName}, amount: ${extraction.amount} ${extraction.currency}`);
		} catch (err) {
			const error = err instanceof Error ? err.message : String(err);
			const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;

			if (isFinalAttempt) {
				this.logger.error(`Bill ${billId} extraction failed permanently: ${error}`);
				await this.prisma.invoice.update({
					where: { id: billId },
					data: { status: InvoiceStatus.FAILED, processingStartedAt: null, error },
				});
			} else {
				this.logger.warn(`Bill ${billId} extraction failed (attempt ${job.attemptsMade + 1}) — retrying: ${error}`);
				await this.prisma.invoice.update({
					where: { id: billId },
					data: { status: InvoiceStatus.PENDING },
				});
				throw err;
			}
		}
	}
}
