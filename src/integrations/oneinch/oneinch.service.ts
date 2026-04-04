import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address } from 'viem';
import {
  OneInchQuote,
  OneInchSwap,
  OneInchApproveTx,
  QuoteParams,
  SwapParams,
  RawQuoteResponse,
  RawSwapResponse,
  RawAllowanceResponse,
  RawApproveTxResponse,
} from './oneinch.types';

const QUOTE_CACHE_TTL_MS = 15_000;

@Injectable()
export class OneInchService {
  private readonly logger = new Logger(OneInchService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly quoteCache = new Map<string, { data: OneInchQuote; ts: number }>();

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('oneinch.apiKey') ?? '';
    this.baseUrl = this.configService.get<string>('oneinch.baseUrl')!;

    if (!this.apiKey) {
      this.logger.warn('ONEINCH_API_KEY not set — requests may be rate-limited');
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get a price quote for swapping `srcAmount` of `src` into `dst`.
   * Results are cached for 15 seconds.
   */
  async quote(
    chainId: number,
    src: Address,
    dst: Address,
    srcAmount: bigint,
    params?: QuoteParams,
  ): Promise<OneInchQuote> {
    const cacheKey = `${chainId}:${src}:${dst}:${srcAmount}`;
    const cached = this.quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < QUOTE_CACHE_TTL_MS) return cached.data;

    const raw = await this.get<RawQuoteResponse>(chainId, 'quote', {
      src,
      dst,
      amount: srcAmount.toString(),
      ...this.flattenParams(params),
    });

    const result: OneInchQuote = {
      srcToken: src,
      dstToken: dst,
      srcAmount,
      dstAmount: BigInt(raw.toAmount),
      gas: BigInt(raw.gas ?? 200_000),
      protocols: this.parseProtocols(raw.protocols),
    };

    this.quoteCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  /**
   * Get calldata to execute a swap on-chain.
   * `from` is the wallet that will send the transaction.
   */
  async swap(
    chainId: number,
    src: Address,
    dst: Address,
    srcAmount: bigint,
    from: Address,
    params?: SwapParams,
  ): Promise<OneInchSwap> {
    const raw = await this.get<RawSwapResponse>(chainId, 'swap', {
      src,
      dst,
      amount: srcAmount.toString(),
      from,
      slippage: params?.slippage ?? 1,
      ...this.flattenParams(params),
    });

    return {
      srcToken: src,
      dstToken: dst,
      srcAmount,
      dstAmount: BigInt(raw.toAmount),
      tx: {
        from: raw.tx.from as Address,
        to: raw.tx.to as Address,
        data: raw.tx.data as `0x${string}`,
        value: BigInt(raw.tx.value),
        gas: BigInt(raw.tx.gas),
        gasPrice: BigInt(raw.tx.gasPrice),
      },
    };
  }

  /**
   * Get the current 1inch router allowance for a token.
   */
  async allowance(chainId: number, tokenAddress: Address, walletAddress: Address): Promise<bigint> {
    const raw = await this.get<RawAllowanceResponse>(chainId, 'approve/allowance', {
      tokenAddress,
      walletAddress,
    });
    return BigInt(raw.allowance);
  }

  /**
   * Get calldata to approve the 1inch router for a token.
   * Omit `amount` for unlimited approval.
   */
  async approveCalldata(
    chainId: number,
    tokenAddress: Address,
    amount?: bigint,
  ): Promise<OneInchApproveTx> {
    const query: Record<string, string> = { tokenAddress };
    if (amount !== undefined) query.amount = amount.toString();

    const raw = await this.get<RawApproveTxResponse>(chainId, 'approve/transaction', query);

    return {
      to: raw.to as Address,
      data: raw.data as `0x${string}`,
      value: BigInt(raw.value),
      gasPrice: BigInt(raw.gasPrice),
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async get<T>(chainId: number, path: string, params: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${chainId}/${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
      });
    } catch (err) {
      this.logger.error(`1inch fetch failed: ${err.message}`);
      throw new BadGatewayException('Failed to reach 1inch API');
    }

    const text = await res.text();

    if (!res.ok) {
      this.logger.error(`1inch ${path} (${res.status}): ${text.trim()}`);
      throw new BadGatewayException(`1inch API error: ${text.trim()}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BadGatewayException('1inch API returned invalid JSON');
    }
  }

  private flattenParams(params?: Record<string, any>): Record<string, any> {
    return params ?? {};
  }

  private parseProtocols(protocols?: Array<Array<Array<{ name: string }>>>): string[] {
    if (!protocols?.length) return [];
    const names = new Set<string>();
    for (const route of protocols)
      for (const hop of route)
        for (const p of hop)
          names.add(p.name);
    return [...names];
  }
}
