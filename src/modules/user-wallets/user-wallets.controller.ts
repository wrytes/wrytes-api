import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { UserWalletsService } from './user-wallets.service';
import { CreateLinkTokenDto } from './dto/create-link-token.dto';
import { WalletChallengeDto } from './dto/wallet-challenge.dto';
import { WalletSigninDto } from './dto/wallet-signin.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('user-wallets')
@ApiTags('User Wallets')
export class UserWalletsController {
  constructor(private readonly service: UserWalletsService) {}

  // ── Link token (reverse magic key) ─────────────────────────────────────────

  @Get('link-message')
  @Public()
  @ApiOperation({
    summary: 'Get the ownership message to sign before creating a link token',
  })
  @ApiParam({ name: 'address', description: 'Wallet address', required: false })
  getLinkMessage(@Param('address') address?: string) {
    const addr = address ?? '0xYOUR_ADDRESS';
    return { message: this.service.getLinkMessage(addr) };
  }

  @Post('link-token')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a wallet link token (reverse magic key)',
    description:
      'Sign the message from GET /user-wallets/link-message with your wallet, then submit here. ' +
      'Copy the returned token and send `/link <token>` in Telegram to bind the wallet.',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        token: 'V1StGXR8_Z5jdHi6B_myT',
        expiresAt: '2026-04-14T12:15:00.000Z',
        message: 'Copy this token and send /link <token> in Telegram',
      },
    },
  })
  async createLinkToken(@Body() dto: CreateLinkTokenDto) {
    const result = await this.service.createLinkToken(dto);
    return { ...result, message: 'Copy this token and send /link <token> in Telegram' };
  }

  @Get('link-token/:token/status')
  @Public()
  @ApiOperation({ summary: 'Poll link token status' })
  @ApiResponse({
    status: 200,
    schema: {
      example: { status: 'pending', walletAddress: '0x...' },
    },
  })
  getLinkTokenStatus(@Param('token') token: string) {
    return this.service.getLinkTokenStatus(token);
  }

  // ── Wallet sign-in (JWT via Telegram 2FA) ──────────────────────────────────

  @Post('auth/challenge')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a sign-in challenge for a linked wallet',
    description: 'Sign the returned message and submit it to POST /user-wallets/auth/signin.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        nonce: 'abc123xyz',
        message: 'Wrytes Sign-In\n\nWallet: 0x...',
        expiresAt: '2026-04-14T12:10:00.000Z',
      },
    },
  })
  getChallenge(@Body() dto: WalletChallengeDto) {
    return this.service.createChallenge(dto);
  }

  @Post('auth/signin')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit wallet signature — triggers Telegram 2FA',
    description:
      'On success, a Telegram message with Allow/Deny buttons is sent to the linked account. ' +
      'Poll GET /user-wallets/auth/session/:sessionId to receive the JWT once approved.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        sessionId: 'cm9abc123',
        expiresAt: '2026-04-14T12:05:00.000Z',
        message: 'Approve the sign-in request in Telegram to receive your JWT',
      },
    },
  })
  async signin(@Body() dto: WalletSigninDto) {
    const result = await this.service.initiateSignin(dto);
    return {
      ...result,
      message: 'Approve the sign-in request in Telegram to receive your JWT',
    };
  }

  @Get('auth/session/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Poll wallet auth session — returns JWT once approved' })
  @ApiResponse({
    status: 200,
    schema: {
      example: { status: 'approved', jwt: 'eyJ...' },
    },
  })
  pollSession(@Param('sessionId') sessionId: string) {
    return this.service.pollSession(sessionId);
  }

  // ── Wallet management (protected) ──────────────────────────────────────────

  @Get()
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'List linked wallets for the authenticated user' })
  async listWallets(@CurrentUser() user: User) {
    const wallets = await this.service.listWallets(user.id);
    return { wallets };
  }

  @Delete(':address')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Unlink a wallet' })
  async unlinkWallet(@CurrentUser() user: User, @Param('address') address: string) {
    await this.service.unlinkWallet(user.id, address);
    return { message: 'Wallet unlinked successfully' };
  }
}
