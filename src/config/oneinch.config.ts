import { registerAs } from '@nestjs/config';

export default registerAs('oneinch', () => ({
  apiKey: process.env.ONEINCH_API_KEY ?? '',
  baseUrl: 'https://api.1inch.dev/swap/v6.0',
}));
