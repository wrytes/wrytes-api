import { registerAs } from '@nestjs/config';

export default registerAs('etherscan', () => ({
  apiKey: process.env.ETHERSCAN_API_KEY || '',
  baseUrl: process.env.ETHERSCAN_BASE_URL || 'https://api.etherscan.io/v2/api',
}));
