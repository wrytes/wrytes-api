import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../core/database/prisma.service';

export class UpdateTokenMinDto {
  @IsString()
  minAmount!: string;
}

export class CreateTokenMinDto {
  @IsString()
  symbol!: string;

  @IsString()
  minAmount!: string;
}

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.tokenMinAmount.findMany({ orderBy: { symbol: 'asc' } });
  }

  async create(symbol: string, minAmount: string) {
    const existing = await this.prisma.tokenMinAmount.findUnique({ where: { symbol } });
    if (existing) throw new ConflictException(`Token minimum for "${symbol}" already exists`);
    return this.prisma.tokenMinAmount.create({
      data: { symbol, minAmount: new Decimal(minAmount) },
    });
  }

  async update(symbol: string, minAmount: string) {
    const existing = await this.prisma.tokenMinAmount.findUnique({ where: { symbol } });
    if (!existing) throw new NotFoundException(`No token minimum found for symbol "${symbol}"`);
    return this.prisma.tokenMinAmount.update({
      where: { symbol },
      data: { minAmount: new Decimal(minAmount) },
    });
  }

  async getMinForSymbol(symbol: string): Promise<Decimal> {
    const record = await this.prisma.tokenMinAmount.findUnique({ where: { symbol } });
    return record ? record.minAmount : new Decimal(0);
  }
}
