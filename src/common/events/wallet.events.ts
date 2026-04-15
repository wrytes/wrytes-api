export class WalletAuthRequestEvent {
  constructor(
    public readonly sessionId: string,
    public readonly walletAddress: string,
    public readonly telegramChatId: number,
    public readonly expiresAt: Date,
  ) {}
}
