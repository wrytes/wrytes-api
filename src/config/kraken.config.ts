import { registerAs } from '@nestjs/config';

export default registerAs('kraken', () => ({
	api: {
		publicKey: process.env.KRAKEN_PUBLIC_KEY ?? '',
		privateKey: process.env.KRAKEN_PRIVATE_KEY ?? '',
		addressKey: process.env.KRAKEN_ADDRESS_KEY ?? '',
	},
}));
