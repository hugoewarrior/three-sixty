import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export async function generateEmbedding(text: string): Promise<number[]> {
  const modelName =
    process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const embeddingModel = openai.embedding(modelName);

  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });

  return embedding;
}
