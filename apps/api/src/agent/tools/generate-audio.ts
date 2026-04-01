import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { synthesizeSpeech } from '../../services/tts';
import { updateArticleAudio } from '../../services/supabase';

export const generateAudioTool = tool({
  description:
    'Generates a spoken-word audio file from a text summary using AWS Polly and stores it in S3. Use this when the user requests an audio version of a news summary.',
  inputSchema: zodSchema(z.object({
    text: z
      .string()
      .max(3000)
      .describe(
        'The summary text to synthesize into speech (maximum 3000 characters)'
      ),
    articleId: z
      .string()
      .describe('The article ID used to name the S3 object and update the database'),
  })),
  execute: async ({ text, articleId }) => {
    const audioUrl = await synthesizeSpeech(text, articleId);
    await updateArticleAudio(articleId, audioUrl);

    return { audioUrl };
  },
});
