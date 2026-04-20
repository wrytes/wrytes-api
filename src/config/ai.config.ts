import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openaiApiKey:  process.env.OPENAI_API_KEY  || 'ollama',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1',
  openaiModel:   process.env.OPENAI_MODEL    || 'llama3.2-vision:11b',
}));
