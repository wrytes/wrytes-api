import { registerAs } from '@nestjs/config';

export default registerAs('alchemy', () => ({
  apiKey: process.env.ALCHEMY_API_KEY ?? '',
}));
