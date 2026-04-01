import { createOpenAI } from '@ai-sdk/openai';

const openAI = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const modelId = process.env.AI_MODEL ?? '';

export const model = openAI(modelId);
