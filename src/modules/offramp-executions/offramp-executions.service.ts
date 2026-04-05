import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OffRampExecutionStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class OffRampExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, routeId?: string) {
    return this.prisma.offRampExecution.findMany({
      where: { userId, ...(routeId ? { routeId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async get(id: string, userId: string) {
    const execution = await this.prisma.offRampExecution.findFirst({ where: { id, userId } });
    if (!execution) throw new NotFoundException('Execution not found');
    return execution;
  }

  // Internal: create execution record
  async create(data: {
    routeId: string;
    userId: string;
    tokenSymbol: string;
    tokenAmount: string;
    depositTxHash: string;
  }) {
    return this.prisma.offRampExecution.create({ data });
  }

  // Internal: advance status
  async updateStatus(
    id: string,
    status: OffRampExecutionStatus,
    extra?: Partial<{
      onChainTxHash: string;
      krakenDepositRef: string;
      krakenOrderId: string;
      fiatAmount: string;
      krakenWithdrawalId: string;
      error: string;
    }>,
  ) {
    return this.prisma.offRampExecution.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  // Internal: find by deposit tx hash (de-duplication)
  async findByDepositTxHash(txHash: string) {
    return this.prisma.offRampExecution.findFirst({ where: { depositTxHash: txHash } });
  }

  // Admin: list all executions awaiting manual bank transfer
  async listPendingBankTransfers() {
    return this.prisma.offRampExecution.findMany({
      where: { status: OffRampExecutionStatus.PENDING_BANK_TRANSFER },
      include: {
        route: {
          include: {
            bankAccount: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  // Admin: hard delete an execution
  async delete(id: string) {
    const execution = await this.prisma.offRampExecution.findUnique({ where: { id } });
    if (!execution) throw new NotFoundException('Execution not found');
    return this.prisma.offRampExecution.delete({ where: { id } });
  }

  // Admin: mark an execution as settled after manual bank transfer
  async settle(id: string, bankTransferRef?: string) {
    const execution = await this.prisma.offRampExecution.findUnique({ where: { id } });
    if (!execution) throw new NotFoundException('Execution not found');
    if (execution.status !== OffRampExecutionStatus.PENDING_BANK_TRANSFER) {
      throw new BadRequestException(`Execution is not pending bank transfer (status: ${execution.status})`);
    }
    return this.prisma.offRampExecution.update({
      where: { id },
      data: { status: OffRampExecutionStatus.SETTLED, bankTransferRef },
    });
  }
}
