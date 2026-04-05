import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { FiatCurrency, OffRampRouteStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../core/database/prisma.service';
import { SafeService } from '../../integrations/safe/safe.service';

export class CreateRouteDto {
  label!: string;
  targetCurrency!: FiatCurrency;
  bankAccountId!: string;
  minTriggerAmount?: string;
}

@Injectable()
export class OffRampRoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safe: SafeService,
  ) {}

  async create(userId: string, dto: CreateRouteDto) {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, userId },
    });
    if (!bankAccount) throw new NotFoundException('Bank account not found');

    if (bankAccount.currency !== dto.targetCurrency) {
      throw new BadRequestException(
        `Bank account currency (${bankAccount.currency}) must match targetCurrency (${dto.targetCurrency})`,
      );
    }

    const existing = await this.prisma.offRampRoute.findUnique({
      where: { userId_label: { userId, label: dto.label } },
    });
    if (existing) throw new ConflictException(`Route with label "${dto.label}" already exists`);

    // Auto-provision a dedicated Safe using the route label as identifier
    const safeLabel = `offramp:${dto.label}`;
    const safeWallet = await this.safe.getOrCreate(userId, 1, safeLabel);

    const route = await this.prisma.offRampRoute.create({
      data: {
        userId,
        label: dto.label,
        safeWalletId: safeWallet.id,
        targetCurrency: dto.targetCurrency,
        bankAccountId: dto.bankAccountId,
        minTriggerAmount: dto.minTriggerAmount ? new Decimal(dto.minTriggerAmount) : new Decimal(0),
      },
      include: { safeWallet: true, bankAccount: { select: { currency: true, label: true } } },
    });

    return { ...route, depositAddress: safeWallet.address };
  }

  async list(userId: string) {
    const routes = await this.prisma.offRampRoute.findMany({
      where: { userId },
      include: {
        safeWallet: { select: { address: true, deployed: true } },
        bankAccount: { select: { currency: true, label: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return routes.map((r) => ({ ...r, depositAddress: r.safeWallet.address }));
  }

  async get(id: string, userId: string) {
    const route = await this.prisma.offRampRoute.findFirst({
      where: { id, userId },
      include: {
        safeWallet: { select: { address: true, deployed: true, chainId: true } },
        bankAccount: { select: { currency: true, label: true } },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    return { ...route, depositAddress: route.safeWallet.address };
  }

  async setStatus(id: string, userId: string, status: OffRampRouteStatus) {
    const route = await this.prisma.offRampRoute.findFirst({ where: { id, userId } });
    if (!route) throw new NotFoundException('Route not found');
    return this.prisma.offRampRoute.update({ where: { id }, data: { status } });
  }

  async updateMinTrigger(id: string, userId: string, minTriggerAmount: string) {
    const route = await this.prisma.offRampRoute.findFirst({ where: { id, userId } });
    if (!route) throw new NotFoundException('Route not found');
    return this.prisma.offRampRoute.update({
      where: { id },
      data: { minTriggerAmount: new Decimal(minTriggerAmount) },
    });
  }

  // Internal: find active route for a given Safe address + chain
  async findActiveForSafe(safeAddress: string) {
    return this.prisma.offRampRoute.findFirst({
      where: {
        status: OffRampRouteStatus.ACTIVE,
        safeWallet: { address: safeAddress },
      },
      include: {
        safeWallet: true,
        bankAccount: true,
      },
    });
  }

  // Internal: list all active routes with their Safe addresses (for monitor)
  async listActiveSafeAddresses(): Promise<{ routeId: string; address: string; minTriggerAmount: Decimal; targetCurrency: FiatCurrency }[]> {
    const routes = await this.prisma.offRampRoute.findMany({
      where: { status: OffRampRouteStatus.ACTIVE },
      select: {
        id: true,
        minTriggerAmount: true,
        targetCurrency: true,
        safeWallet: { select: { address: true } },
      },
    });
    return routes.map((r) => ({
      routeId: r.id,
      address: r.safeWallet.address,
      minTriggerAmount: r.minTriggerAmount,
      targetCurrency: r.targetCurrency,
    }));
  }
}
