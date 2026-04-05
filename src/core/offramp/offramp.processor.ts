import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job, Queue } from 'bullmq';
import { parseUnits, getAddress } from 'viem';
import type { Address } from 'viem';
import { FiatCurrency } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SafeService } from '../../integrations/safe/safe.service';
import { KrakenDeposit } from '../../integrations/kraken/kraken.deposit';
import { KrakenOrders } from '../../integrations/kraken/kraken.orders';
import { KrakenWithdraw } from '../../integrations/kraken/kraken.withdraw';
import { NotificationEvent, AdminNotificationEvent } from '../../common/events/notification.events';
import { ENABLED_TOKENS } from '../../config/tokens.config';
import {
  OFFRAMP_QUEUE,
  OffRampJobData,
  KRAKEN_DEPOSIT_ASSET,
  KRAKEN_DEPOSIT_METHOD_HINT,
  KRAKEN_FIAT_ASSET,
  KRAKEN_WITHDRAW_KEY_ENV,
  krakenPairFor,
} from './offramp.queue';

const OPERATOR = 'operator';
const DEPOSIT_POLL_DELAY_MS = 30_000;
const DEPOSIT_POLL_MAX_ATTEMPTS = 240; // 2 hours
const WITHDRAWAL_POLL_DELAY_MS = 60_000;
const WITHDRAWAL_POLL_MAX_ATTEMPTS = 60; // 1 hour

@Processor(OFFRAMP_QUEUE)
export class OffRampProcessor extends WorkerHost {
  private readonly logger = new Logger(OffRampProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly safe: SafeService,
    private readonly krakenDeposit: KrakenDeposit,
    private readonly krakenOrders: KrakenOrders,
    private readonly krakenWithdraw: KrakenWithdraw,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(OFFRAMP_QUEUE) private readonly queue: Queue<OffRampJobData>,
  ) {
    super();
  }

  async process(job: Job<OffRampJobData>): Promise<void> {
    const { executionId } = job.data;

    const execution = await this.prisma.offRampExecution.findUnique({
      where: { id: executionId },
      include: { route: { include: { safeWallet: true, bankAccount: true } } },
    });

    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found — skipping`);
      return;
    }

    try {
      switch (execution.status) {
        case 'DETECTED':
          await this.handleTransfer(execution);
          break;
        case 'TRANSFERRING':
          await this.handleWaitDeposit(execution, job.attemptsMade);
          break;
        case 'DEPOSITED':
          await this.handleSell(execution);
          break;
        case 'SOLD':
          await this.handleWithdraw(execution);
          break;
        case 'WITHDRAWING':
          await this.handleCheckWithdrawal(execution, job.attemptsMade);
          break;
        default:
          this.logger.warn(`Execution ${executionId} in terminal status ${execution.status} — skipping`);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Execution ${executionId} failed at ${execution.status}: ${error}`);
      await this.prisma.offRampExecution.update({
        where: { id: executionId },
        data: { status: 'FAILED', error },
      });
      this.notifyUser(execution.userId, 'Off-ramp failed', `Your off-ramp could not be completed: ${error}`, 'error');
      this.notifyAdmin('Off-ramp execution failed', `Execution \`${executionId}\` failed at status \`${execution.status}\`\n\nError: ${error}`, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Step 1 DETECTED → TRANSFERRING
  // Encode & execute Safe → Kraken ERC-20 transfer
  // ---------------------------------------------------------------------------
  private async handleTransfer(execution: any) {
    const { route, tokenSymbol, tokenAmount } = execution;
    const { safeWallet } = route;

    const krakenAsset = KRAKEN_DEPOSIT_ASSET[tokenSymbol];
    if (!krakenAsset) {
      throw new Error(`Token ${tokenSymbol} is not supported for direct Kraken deposit. Manual swap required.`);
    }

    // Find the deposit method (ERC20) and get deposit address
    const methodHint = KRAKEN_DEPOSIT_METHOD_HINT[tokenSymbol];
    const methodsRes = await this.krakenDeposit.getMethods(OPERATOR, { asset: krakenAsset });
    if (methodsRes.error?.length) throw new Error(`Kraken deposit methods error: ${methodsRes.error.join(', ')}`);

    this.logger.log(`Kraken deposit methods for ${krakenAsset}: ${methodsRes.result.map((m) => m.method).join(', ')}`);

    const method = methodsRes.result.find((m) =>
      m.method.toUpperCase().includes(methodHint.toUpperCase()),
    );
    if (!method) throw new Error(`No ERC20 deposit method found for ${krakenAsset}. Available: ${methodsRes.result.map((m) => m.method).join(', ')}`);

    const addrRes = await this.krakenDeposit.getAddresses(OPERATOR, {
      asset: krakenAsset,
      method: method.method,
    });
    if (addrRes.error?.length) throw new Error(`Kraken deposit address error: ${addrRes.error.join(', ')}`);

    const depositAddress = addrRes.result[0]?.address;
    if (!depositAddress) throw new Error('No Kraken deposit address available');

    // Resolve token contract address
    const tokenConfig = ENABLED_TOKENS.find((t) => t.symbol === tokenSymbol);
    if (!tokenConfig?.addresses[1]) throw new Error(`Token ${tokenSymbol} not found in config`);

    const tokenAddress = getAddress(tokenConfig.addresses[1]) as Address;
    const amount = parseUnits(tokenAmount.toString(), tokenConfig.decimals);

    this.logger.log(`Transferring ${tokenAmount} ${tokenSymbol} from Safe ${safeWallet.address} to Kraken ${depositAddress}`);

    this.notifyUser(execution.userId, 'Crypto received', `${tokenAmount} ${tokenSymbol} received — transferring to exchange.`);

    await this.prisma.offRampExecution.update({
      where: { id: execution.id },
      data: { status: 'TRANSFERRING' },
    });

    const txHash = await this.safe.executeTransfer(
      safeWallet.id,
      tokenAddress,
      getAddress(depositAddress) as Address,
      amount,
    );

    await this.prisma.offRampExecution.update({
      where: { id: execution.id },
      data: { onChainTxHash: txHash },
    });

    // Enqueue deposit polling
    await this.enqueueNext(execution.id, DEPOSIT_POLL_DELAY_MS);
  }

  // ---------------------------------------------------------------------------
  // Step 2 TRANSFERRING → DEPOSITED
  // Poll Kraken until deposit confirmed
  // ---------------------------------------------------------------------------
  private async handleWaitDeposit(execution: any, attempt: number) {
    if (attempt >= DEPOSIT_POLL_MAX_ATTEMPTS) {
      throw new Error('Kraken deposit not confirmed after maximum polling attempts (2h)');
    }

    const krakenAsset = KRAKEN_DEPOSIT_ASSET[execution.tokenSymbol];
    const statusRes = await this.krakenDeposit.getStatus(OPERATOR, { asset: krakenAsset });
    if (statusRes.error?.length) throw new Error(`Kraken deposit status error: ${statusRes.error.join(', ')}`);

    const match = statusRes.result.find(
      (d) => d.txid === execution.onChainTxHash && d.status === 'Success',
    );

    if (!match) {
      this.logger.log(`Execution ${execution.id}: waiting for Kraken deposit confirmation (attempt ${attempt})`);
      throw new Error('RETRY'); // BullMQ will retry with delay
    }

    await this.prisma.offRampExecution.update({
      where: { id: execution.id },
      data: { status: 'DEPOSITED', krakenDepositRef: match.refid },
    });

    this.notifyUser(execution.userId, 'Arrived at exchange', `${execution.tokenAmount} ${execution.tokenSymbol} confirmed on Kraken — swapping to fiat.`);

    await this.enqueueNext(execution.id, 0);
  }

  // ---------------------------------------------------------------------------
  // Step 3 DEPOSITED → SOLD
  // Place market sell order and wait for fill
  // ---------------------------------------------------------------------------
  private async handleSell(execution: any) {
    const { route, tokenSymbol, tokenAmount } = execution;
    const pair = krakenPairFor(tokenSymbol, route.targetCurrency);
    if (!pair) throw new Error(`No Kraken trading pair for ${tokenSymbol}/${route.targetCurrency}`);

    await this.prisma.offRampExecution.update({
      where: { id: execution.id },
      data: { status: 'SELLING' },
    });

    this.logger.log(`Placing sell order — pair: ${pair}, volume: ${tokenAmount}`);

    const filledOrder = await this.krakenOrders.placeAndWait(OPERATOR, {
      ordertype: 'market',
      type: 'sell',
      pair,
      volume: tokenAmount.toString(),
    });

    const fiatAmount = filledOrder.cost;

    await this.prisma.offRampExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SOLD',
        krakenOrderId: filledOrder.descr.order,
        fiatAmount,
      },
    });

    this.notifyUser(execution.userId, 'Swapped to fiat', `${execution.tokenAmount} ${execution.tokenSymbol} → ${fiatAmount} ${route.targetCurrency} — initiating bank withdrawal.`);

    await this.enqueueNext(execution.id, 0);
  }

  // ---------------------------------------------------------------------------
  // Step 4 SOLD → WITHDRAWING
  // Initiate fiat withdrawal to Wrytes AG bank account
  // ---------------------------------------------------------------------------
  private async handleWithdraw(execution: any) {
    const { route, fiatAmount } = execution;
    const currency = route.targetCurrency as FiatCurrency;

    const fiatAsset = KRAKEN_FIAT_ASSET[currency];
    const withdrawKeyEnv = KRAKEN_WITHDRAW_KEY_ENV[currency];

    if (!fiatAsset || !withdrawKeyEnv) {
      throw new Error(`Currency ${currency} is not supported for fiat withdrawal`);
    }

    const withdrawKey = this.configService.get<string>(withdrawKeyEnv);
    if (!withdrawKey) {
      throw new Error(`${withdrawKeyEnv} is not configured — cannot initiate fiat withdrawal`);
    }

    const withdrawRes = await this.krakenWithdraw.withdraw(OPERATOR, {
      asset: fiatAsset,
      key: withdrawKey,
      amount: fiatAmount.toString(),
    });

    if (withdrawRes.error?.length) throw new Error(`Kraken withdrawal error: ${withdrawRes.error.join(', ')}`);

    await this.prisma.offRampExecution.update({
      where: { id: execution.id },
      data: { status: 'WITHDRAWING', krakenWithdrawalId: withdrawRes.result.refid },
    });

    await this.enqueueNext(execution.id, WITHDRAWAL_POLL_DELAY_MS);
  }

  // ---------------------------------------------------------------------------
  // Step 5 WITHDRAWING → COMPLETED
  // Poll until withdrawal succeeds
  // ---------------------------------------------------------------------------
  private async handleCheckWithdrawal(execution: any, attempt: number) {
    if (attempt >= WITHDRAWAL_POLL_MAX_ATTEMPTS) {
      throw new Error('Fiat withdrawal not confirmed after maximum polling attempts (1h)');
    }

    const currency = execution.route.targetCurrency as FiatCurrency;
    const fiatAsset = KRAKEN_FIAT_ASSET[currency] ?? currency;

    const statusRes = await this.krakenWithdraw.withdrawStatus(OPERATOR, { asset: fiatAsset });
    if (statusRes.error?.length) throw new Error(`Kraken withdrawal status error: ${statusRes.error.join(', ')}`);

    const match = statusRes.result.find(
      (w) => w.refid === execution.krakenWithdrawalId && w.status === 'Success',
    );

    if (!match) {
      this.logger.log(`Execution ${execution.id}: waiting for fiat withdrawal (attempt ${attempt})`);
      throw new Error('RETRY');
    }

    const route = execution.route;
    const bankAccount = route.bankAccount;

    await this.prisma.offRampExecution.update({
      where: { id: execution.id },
      data: { status: 'PENDING_BANK_TRANSFER' },
    });

    this.notifyUser(
      execution.userId,
      'Payment pending',
      `${execution.fiatAmount} ${currency} received — your bank transfer is being prepared.`,
    );

    this.notifyAdmin(
      'Payment pending review',
      `Execution \`${execution.id}\`\nAmount: *${execution.fiatAmount} ${currency}*\nUser: \`${execution.userId}\`\nBank: ${bankAccount.label} — \`${bankAccount.iban}\`\n\nMark as settled: \`PATCH /offramp/executions/${execution.id}/settle\``,
      'warning',
    );

    this.logger.log(`Execution ${execution.id} PENDING_BANK_TRANSFER — awaiting manual PostFinance transfer`);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private async enqueueNext(executionId: string, delayMs: number) {
    await this.queue.add(
      OFFRAMP_QUEUE,
      { executionId },
      { delay: delayMs, attempts: DEPOSIT_POLL_MAX_ATTEMPTS, backoff: { type: 'fixed', delay: DEPOSIT_POLL_DELAY_MS } },
    );
  }

  private notifyUser(userId: string, title: string, message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.eventEmitter.emit('notification', new NotificationEvent(userId, title, message, level));
  }

  private notifyAdmin(title: string, message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.eventEmitter.emit('notification.admin', new AdminNotificationEvent(title, message, level));
  }
}
