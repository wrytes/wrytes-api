import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { SafeService } from '../../integrations/safe/safe.service';
import { INVOICES_QUEUE, InvoiceJobData } from './invoices.queue';
import type { InvoiceResponseDto } from './dto/invoice-response.dto';

const INVOICE_CHAIN_ID = 1;
const STUCK_PROCESSING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const RESCUE_INTERVAL_MS = 60 * 1000; // check every minute
const INVOICE_SAFE_LABEL = 'invoices';
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class InvoicesService implements OnModuleInit {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly safe: SafeService,
    @InjectQueue(INVOICES_QUEUE) private readonly queue: Queue<InvoiceJobData>,
  ) {}

  onModuleInit() {
    void this.rescueStuckInvoices();
    setInterval(() => void this.rescueStuckInvoices(), RESCUE_INTERVAL_MS);
  }

  private async rescueStuckInvoices(): Promise<void> {
    const threshold = new Date(Date.now() - STUCK_PROCESSING_THRESHOLD_MS);
    const stuck = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.PROCESSING, processingStartedAt: { lt: threshold } },
      select: { id: true },
    });
    if (stuck.length === 0) return;

    this.logger.warn(`Rescuing ${stuck.length} stuck invoice(s)`);
    for (const { id } of stuck) {
      await this.prisma.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.PENDING, processingStartedAt: null },
      });
      await this.queue.add(INVOICES_QUEUE, { invoiceId: id });
    }
  }

  async upload(userId: string, file: Express.Multer.File): Promise<InvoiceResponseDto> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG, WEBP, GIF`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds 10 MB limit');
    }

    const safeWallet = await this.safe.getOrCreate(userId, INVOICE_CHAIN_ID, INVOICE_SAFE_LABEL);

    const invoice = await this.prisma.invoice.create({
      data: {
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileData: Buffer.from(file.buffer),
        safeAddress: safeWallet.address,
      },
    });

    await this.queue.add(INVOICES_QUEUE, { invoiceId: invoice.id });

    return this.toDto(invoice);
  }

  async list(userId: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      omit: { fileData: true },
    });
    return invoices.map((i) => this.toDto(i));
  }

  async get(id: string, userId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId },
      omit: { fileData: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.toDto(invoice);
  }

  async update(
    id: string,
    userId: string,
    data: { fromName?: string | null; amount?: string | null; currency?: string | null; itemTags?: string[] },
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, userId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data,
      omit: { fileData: true },
    });
    return this.toDto(updated);
  }

  async markPaid(id: string, paidTxHash: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, omit: { fileData: true } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already marked as paid');
    }
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID, paidTxHash, paidAt: new Date() },
      omit: { fileData: true },
    });
    return this.toDto(updated);
  }

  async delete(id: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.prisma.invoice.delete({ where: { id } });
  }

  private toDto(invoice: Record<string, unknown>): InvoiceResponseDto {
    return {
      id: invoice.id as string,
      userId: invoice.userId as string,
      fileName: invoice.fileName as string,
      fileType: invoice.fileType as string,
      status: invoice.status as InvoiceStatus,
      fromName: (invoice.fromName as string | null) ?? null,
      toName: (invoice.toName as string | null) ?? null,
      amount: invoice.amount != null ? String(invoice.amount) : null,
      currency: (invoice.currency as string | null) ?? null,
      reference: (invoice.reference as string | null) ?? null,
      itemTags: (invoice.itemTags as string[]) ?? [],
      safeAddress: (invoice.safeAddress as string | null) ?? null,
      paidTxHash: (invoice.paidTxHash as string | null) ?? null,
      paidAt: (invoice.paidAt as Date | null) ?? null,
      error: (invoice.error as string | null) ?? null,
      createdAt: invoice.createdAt as Date,
      updatedAt: invoice.updatedAt as Date,
    };
  }
}
