import { Request, Response } from 'express';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';
import type { ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { model } from '../lib/ai-client';
import { buildSystemPrompt } from '../agent/prompts/system';
import { agentTools } from '../agent';
import { getArticleById } from '../services/supabase';
import { synthesizeSpeech } from '../services/tts';
import { authGuard } from '../middleware/auth-guard';
import { createConversation, updateConversation } from '../services/conversations';

/**
 * POST /agent/chat  (local Express dev only — production uses agent-stream.ts via Lambda Function URL)
 * Streams an AI response using Vercel AI SDK v6 streamText.
 * Requires authGuard.
 */
export const chat = [
  authGuard,
  async (req: Request, res: Response): Promise<void> => {
    const reqId = Math.random().toString(36).slice(2, 8);
    const { messages, articleId, conversationId } = req.body as {
      messages: UIMessage[];
      articleId?: string;
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    console.log(`[agent/chat][${reqId}] START user=${req.user?.email} messages=${messages.length} articleId=${articleId ?? 'none'} conversationId=${conversationId ?? 'new'}`);

    // For existing conversations, echo the ID back in the response header so the
    // frontend can track it. For new conversations in Express/local dev, the header
    // cannot be set after pipeUIMessageStreamToResponse flushes headers — the
    // frontend will receive the ID on the first request that includes it in the body.
    // NOTE: Production uses agent-stream.ts where pre-generation works correctly.
    if (conversationId) {
      res.setHeader('X-Conversation-Id', conversationId);
    }

    try {
      const coreMessages = await convertToModelMessages(messages);

      if (articleId) {
        const article = await getArticleById(articleId);
        if (article) {
          console.log(`[agent/chat][${reqId}] injecting article context: "${article.title}"`);
          coreMessages.unshift({
            role: 'user',
            content: `Contexto del artículo actual:\nTítulo: ${article.title}\nFuente: ${article.source.name}\nFecha: ${article.publishedAt}\nContenido: ${article.body}`,
          });
        }
      }

      const result = streamText({
        model,
        system: buildSystemPrompt(),
        messages: coreMessages,
        tools: agentTools,
        stopWhen: stepCountIs(5),
        onError: (e) => console.error(`[agent/chat][${reqId}] stream error:`, e),
        onFinish: ({ text, usage, steps }) => {
          console.log(`[agent/chat][${reqId}] DONE steps=${steps.length} tokens_in=${usage.inputTokens} tokens_out=${usage.totalTokens}`);
          // TODO: migrate to event-driven pattern (e.g. EventBridge) so conversation
          // persistence does not add latency to the streaming response pipeline.
          void (async () => {
            try {
              const assistantMsg: UIMessage = {
                id: randomUUID(),
                role: 'assistant',
                parts: [{ type: 'text', text }],
                //createdAt: new Date(),
              };
              const fullMessages = [...messages, assistantMsg];
              const userId = req.user!.userId;
              const userEmail = req.user!.email;

              if (conversationId) {
                await updateConversation(conversationId, userId, fullMessages);
              } else {
                const record = await createConversation(userId, userEmail, fullMessages);
                console.log(`[agent/chat][${reqId}] new conversation created conversationId=${record.conversationId}`);
                // The new conversationId cannot be sent as a header here since
                // headers are already flushed. The Lambda handler (agent-stream.ts)
                // handles this correctly by pre-generating the ID before streaming.
              }
            } catch (err) {
              console.error(`[agent/chat][${reqId}] conversation save error`, err);
            }
          })();
        },
      });

      result.pipeUIMessageStreamToResponse(res as unknown as ServerResponse);
    } catch (error) {
      console.error(`[agent/chat][${reqId}] ERROR`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process chat request' });
      }
    }
  },
];

/**
 * POST /agent/audio
 * Direct TTS synthesis — does not go through the agent loop.
 * Requires authGuard.
 */
export const audio = [
  authGuard,
  async (req: Request, res: Response): Promise<void> => {
    const { text, articleId } = req.body as {
      text?: string;
      articleId?: string;
    };

    if (!text || !articleId) {
      res.status(400).json({ error: 'text and articleId are required' });
      return;
    }

    if (text.length > 3000) {
      res.status(400).json({ error: 'text must not exceed 3000 characters' });
      return;
    }

    console.log(`[agent/audio] articleId=${articleId} textLen=${text.length}`);

    try {
      const audioUrl = await synthesizeSpeech(text, articleId);
      console.log(`[agent/audio] done articleId=${articleId}`);
      res.json({ audioUrl });
    } catch (error) {
      console.error('[agent/audio] ERROR', error);
      res.status(500).json({ error: 'Failed to synthesize audio' });
    }
  },
];

export async function audioHandler(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve) => {
    authGuard(req, res, () => resolve());
  });
  if (res.headersSent) return;

  const { text, articleId } = req.body as {
    text?: string;
    articleId?: string;
  };

  if (!text || !articleId) {
    res.status(400).json({ error: 'text and articleId are required' });
    return;
  }

  if (text.length > 3000) {
    res.status(400).json({ error: 'text must not exceed 3000 characters' });
    return;
  }

  const audioUrl = await synthesizeSpeech(text, articleId);
  res.json({ audioUrl });
}
