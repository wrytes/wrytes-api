import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaService } from './core/database/prisma.service';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
	});

	const configService = app.get(ConfigService);

	const logger = app.get(Logger);
	app.useLogger(logger);

	app.enableCors({
		origin: '*',
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		credentials: true,
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	);

	app.useGlobalFilters(new AllExceptionsFilter());

	const prismaService = app.get(PrismaService);
	await prismaService.enableShutdownHooks(app);

	const config = new DocumentBuilder()
		.setTitle('Wrytes API')
		.setDescription(
			'REST API for Wrytes.\n\n' +
				'## Authentication\n' +
				'All endpoints (except /auth/verify) require API key authentication.\n' +
				'Include the `X-API-Key` header with format: `rw_prod_{keyId}.{secret}`\n\n' +
				'## Getting Started\n' +
				'1. Use Telegram bot `/api_create` to generate a magic link\n' +
				'2. Visit the magic link to receive an API key\n' +
				'3. Include the API key in the `X-API-Key` header for all requests',
		)
		.setVersion('1.0.0')
		.addApiKey(
			{
				type: 'apiKey',
				name: 'X-API-Key',
				in: 'header',
				description: 'API key in format: rw_prod_{keyId}.{secret}',
			},
			'api-key',
		)
		.addTag('Authentication', 'API key management and verification')
		.addTag(
			'User Profile',
			'KYC/KYB profile — create and manage personal or business identity details',
		)
		.addTag(
			'Bank Accounts',
			'SEPA bank accounts — add, update, and set a default for fiat payouts',
		)
		.addTag(
			'Off-Ramp Routes',
			'Off-ramp routes — configure crypto-to-fiat conversion pipelines with dedicated Safe deposit addresses',
		)
		.addTag(
			'Off-Ramp Executions',
			'Off-ramp execution history — track the lifecycle of each conversion from on-chain detection to fiat withdrawal',
		)
		.addTag(
			'User Wallets',
			'Wallet linking and wallet-based sign-in — link wallets via signed messages, authenticate with challenge/signature + Telegram 2FA',
		)
		.addTag(
			'Alchemy',
			'Ethereum chain data via Alchemy — balances, transactions, and ERC-20 token transfers',
		)
		.addTag(
			'Wallet',
			'Managed hot wallet — native and ERC-20 balances across supported chains',
		)
		.addTag(
			'Safe',
			'Safe (Gnosis) multi-sig wallet management — predict and retrieve Safe addresses per user',
		)
		.addTag(
			'Prices',
			'Token price feeds — current and historical prices for tracked assets',
		)
		.addTag(
			'Kraken',
			'Kraken CEX integration — balances, market data, orders, deposits, and withdrawals',
		)
		.addTag(
			'Deribit',
			'Deribit CEX integration — account, market data, trading, and wallet operations',
		)
		.addTag('Telegram', 'Telegram bot webhook receiver')
		.addTag('Health', 'System health monitoring')
		.addTag('Root', 'Base API endpoints')
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/docs', app, document, {
		customSiteTitle: 'Wrytes API Docs',
		customCss: '.swagger-ui .topbar { display: none }',
		swaggerOptions: {
			persistAuthorization: true,
			docExpansion: 'none',
			filter: true,
			showRequestDuration: true,
		},
	});

	const port = configService.get<number>('app.port', 3030);
	const baseUrl = configService.get<string>('app.baseUrl');

	await app.listen(port);

	logger.log(`Application is running on: ${baseUrl}`);
	logger.log(`API Documentation: ${baseUrl}/api/docs`);
	logger.log(`Health check: ${baseUrl}/health`);
	logger.log(`Environment: ${configService.get('app.nodeEnv')}`);
}

bootstrap().catch((error) => {
	console.error('Failed to start application:', error);
	process.exit(1);
});
