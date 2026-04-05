import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { FiatCurrency } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';

export class CreateBankAccountDto {
  iban!: string;
  bic!: string;
  holderName!: string;
  currency!: FiatCurrency;
  label?: string;
  isDefault?: boolean;
}

export class UpdateBankAccountDto {
  bic?: string;
  holderName?: string;
  label?: string;
  isDefault?: boolean;
}

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async create(userId: string, dto: CreateBankAccountDto) {
    const label = dto.label ?? 'default';

    const existing = await this.prisma.bankAccount.findUnique({
      where: { userId_label: { userId, label } },
    });
    if (existing) throw new ConflictException(`Bank account with label "${label}" already exists`);

    if (dto.isDefault) {
      await this.clearDefault(userId);
    }

    const iban = this.encryption.encrypt(dto.iban.replace(/\s/g, '').toUpperCase());
    return this.prisma.bankAccount.create({
      data: {
        userId,
        iban,
        bic: dto.bic.toUpperCase(),
        holderName: dto.holderName,
        currency: dto.currency,
        label,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async list(userId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return accounts.map((a) => ({ ...a, iban: this.maskIban(this.encryption.decrypt(a.iban)) }));
  }

  async getDecrypted(id: string, userId: string) {
    const account = await this.prisma.bankAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException('Bank account not found');
    return { ...account, iban: this.encryption.decrypt(account.iban) };
  }

  async update(id: string, userId: string, dto: UpdateBankAccountDto) {
    const account = await this.prisma.bankAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException('Bank account not found');

    if (dto.isDefault) {
      await this.clearDefault(userId);
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: string, userId: string) {
    const account = await this.prisma.bankAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException('Bank account not found');

    const inUse = await this.prisma.offRampRoute.findFirst({ where: { bankAccountId: id } });
    if (inUse) throw new ConflictException('Bank account is linked to an active route and cannot be deleted');

    await this.prisma.bankAccount.delete({ where: { id } });
  }

  async setDefault(id: string, userId: string) {
    const account = await this.prisma.bankAccount.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException('Bank account not found');
    await this.clearDefault(userId);
    return this.prisma.bankAccount.update({ where: { id }, data: { isDefault: true } });
  }

  private async clearDefault(userId: string) {
    await this.prisma.bankAccount.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private maskIban(iban: string): string {
    if (iban.length <= 8) return iban;
    return iban.slice(0, 4) + '****' + iban.slice(-4);
  }
}
