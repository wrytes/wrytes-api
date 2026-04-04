import { Injectable, NotFoundException } from '@nestjs/common';
import { Exchange } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';

export interface KrakenCredentials {
  publicKey: string;
  privateKey: string;
  addressKey?: string;
}

export interface DeribitCredentials {
  clientId: string;
  clientSecret: string;
}

type ExchangeCredentialsData = KrakenCredentials | DeribitCredentials;

@Injectable()
export class ExchangeCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsert(
    userId: string,
    exchange: Exchange,
    credentials: ExchangeCredentialsData,
    label = 'default',
  ) {
    const encryptedData = this.encryption.encrypt(JSON.stringify(credentials));
    return this.prisma.exchangeCredential.upsert({
      where: { userId_exchange_label: { userId, exchange, label } },
      create: { userId, exchange, label, encryptedData },
      update: { encryptedData, isActive: true, updatedAt: new Date() },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.exchangeCredential.findMany({
      where: { userId, isActive: true },
      select: { id: true, exchange: true, label: true, createdAt: true, updatedAt: true },
      orderBy: { exchange: 'asc' },
    });
  }

  async delete(userId: string, exchange: Exchange, label = 'default') {
    const existing = await this.prisma.exchangeCredential.findUnique({
      where: { userId_exchange_label: { userId, exchange, label } },
    });
    if (!existing) throw new NotFoundException(`No ${exchange} credentials found with label "${label}"`);
    await this.prisma.exchangeCredential.delete({
      where: { userId_exchange_label: { userId, exchange, label } },
    });
  }

  async getKrakenCredentials(userId: string, label?: string): Promise<KrakenCredentials> {
    const record = label
      ? await this.prisma.exchangeCredential.findUnique({
          where: { userId_exchange_label: { userId, exchange: Exchange.KRAKEN, label } },
        })
      : await this.prisma.exchangeCredential.findFirst({
          where: { userId, exchange: Exchange.KRAKEN, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
    if (!record || !record.isActive) {
      throw new NotFoundException('Kraken credentials not configured for this account');
    }
    return JSON.parse(this.encryption.decrypt(record.encryptedData)) as KrakenCredentials;
  }

  async getDeribitCredentials(userId: string, label?: string): Promise<DeribitCredentials> {
    const record = label
      ? await this.prisma.exchangeCredential.findUnique({
          where: { userId_exchange_label: { userId, exchange: Exchange.DERIBIT, label } },
        })
      : await this.prisma.exchangeCredential.findFirst({
          where: { userId, exchange: Exchange.DERIBIT, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
    if (!record || !record.isActive) {
      throw new NotFoundException('Deribit credentials not configured for this account');
    }
    return JSON.parse(this.encryption.decrypt(record.encryptedData)) as DeribitCredentials;
  }
}
