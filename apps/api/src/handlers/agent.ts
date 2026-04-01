import { Request, Response } from 'express';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';
import { model } from '../lib/ai-client';
import { buildSystemPrompt } from '../agent/prompts/system';
import { agentTools } from '../agent';
import { getArticleById } from '../services/supabase';
import { synthesizeSpeech } from '../services/tts';
import { authGuard } from '../middleware/auth-guard';
import type { ServerResponse } from 'http';

/**
 * POST /agent/chat
 * Streams an AI response using Vercel AI SDK v6 streamText.
 * Requires authGuard.
 */
export const chat = [
  authGuard,
  async (req: Request, res: Response): Promise<void> => {
    const reqId = Math.random().toString(36).slice(2, 8);
    console.log(`[agent/chat][${reqId}] START user=${req.user?.email} userId=${req.user?.userId}`);

    const { messages, articleId } = req.body as {
      messages: UIMessage[];
      articleId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      console.warn(`[agent/chat][${reqId}] 400 — missing messages array`);
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    console.log(`[agent/chat][${reqId}] messages=${messages.length} articleId=${articleId ?? 'none'}`);

    try {
      const coreMessages = await convertToModelMessages(messages);
      console.log(`[agent/chat][${reqId}] converted to ${coreMessages.length} core messages`);

      if (articleId) {
        const article = await getArticleById(articleId);
        if (article) {
          console.log(`[agent/chat][${reqId}] injecting article context: "${article.title}"`);
          const contextContent = `Contexto del artículo actual:\nTítulo: ${article.title}\nFuente: ${article.source.name}\nFecha: ${article.publishedAt}\nContenido: ${article.body}`;
          coreMessages.unshift({ role: 'user', content: contextContent });
        } else {
          console.warn(`[agent/chat][${reqId}] articleId=${articleId} not found — skipping context`);
        }
      }

      console.log(`[agent/chat][${reqId}] calling streamText model=${process.env.AI_MODEL ?? 'default'}`);

      const result = streamText({
        model,
        system: buildSystemPrompt(),
        messages: coreMessages,
        tools: agentTools,
        stopWhen: stepCountIs(5),
        onChunk: ({ chunk }) => {
          if (chunk.type === 'text-delta') {
            process.stdout.write('.');
          }
        },
        onError: (e) => {
          console.error(`[agent/chat][${reqId}] error: ${JSON.stringify(e)}`);
        },
        onFinish: ({ usage, steps }) => {
          process.stdout.write('\n');
          console.log(`[agent/chat][${reqId}] DONE steps=${steps.length} tokens_in=${usage.inputTokens} tokens_out=${usage.totalTokens}`);
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

// ─── Lambda-compatible single-function exports ────────────────────────────────

async function runWithAuthGuard(
  req: Request,
  res: Response,
  fn: (req: Request, res: Response) => Promise<void>
): Promise<void> {
  await new Promise<void>((resolve) => {
    authGuard(req, res, () => resolve());
  });
  if (!res.headersSent) {
    await fn(req, res);
  }
}

export async function chatHandler(req: Request, res: Response): Promise<void> {
  await runWithAuthGuard(req, res, async (_req, _res) => {
    const { messages, articleId } = _req.body as {
      messages: UIMessage[];
      articleId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      _res.status(400).json({ error: 'messages array is required' });
      return;
    }

    const coreMessages = await convertToModelMessages(messages);

    if (articleId) {
      const article = await getArticleById(articleId);
      if (article) {
        const contextContent = `Contexto del artículo actual:\nTítulo: ${article.title}\nFuente: ${article.source.name}\nFecha: ${article.publishedAt}\nContenido: ${article.body}`;
        coreMessages.unshift({ role: 'user', content: contextContent });
      }
    }

    const result = streamText({
      model,
      system: buildSystemPrompt(),
      messages: coreMessages,
      tools: agentTools,
      stopWhen: stepCountIs(5),
      onFinish: ({ usage }) => {
        console.log('Agent chat finished. Token usage:', usage);
      },
    });

    result.pipeUIMessageStreamToResponse(_res as unknown as ServerResponse);
  });
}

export async function audioHandler(req: Request, res: Response): Promise<void> {
  await runWithAuthGuard(req, res, async (_req, _res) => {
    const { text, articleId } = _req.body as {
      text?: string;
      articleId?: string;
    };

    if (!text || !articleId) {
      _res.status(400).json({ error: 'text and articleId are required' });
      return;
    }

    if (text.length > 3000) {
      _res.status(400).json({ error: 'text must not exceed 3000 characters' });
      return;
    }

    const audioUrl = await synthesizeSpeech(text, articleId);
    _res.json({ audioUrl });
  });
}
