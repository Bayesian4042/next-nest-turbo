import { registerAs } from '@nestjs/config';

export default registerAs('openai', () => ({
  model: process.env.LLM_MODEL ?? 'gpt-4.1-mini',
  maxWorkers: parseInt(process.env.LLM_MAX_WORKERS ?? '20', 10),
}));
