import { registerAs } from '@nestjs/config';

export default registerAs('alchemy', () => ({
  apiKey: process.env.ALCHEMY_API_KEY ?? '',
  network: process.env.ALCHEMY_NETWORK ?? 'eth-mainnet',
}));
