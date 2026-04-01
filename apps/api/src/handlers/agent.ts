import { Request, Response } from 'express';
import { streamText, stepCountIs } from 'ai';
import { model } from '../lib/ai-client';
import { buildSystemPrompt } from '../agent/prompts/system';
import { agentTools } from '../agent';
import { getArticleById } from '../services/supabase';
import { synthesizeSpeech } from '../services/tts';
import { authGuard } from '../middleware/auth-guard';
import type { ChatMessage } from '@panama-news/shared-types';
import type { ServerResponse } from 'http';

/**
 * POST /agent/chat
 * Streams an AI response using Vercel AI SDK v6 streamText.
 * Uses pipeUIMessageStreamToResponse for Express/Lambda compatibility.
 * Requires authGuard.
 */
export const chat = [
  authGuard,
  async (req: Request, res: Response): Promise<void> => {
    const { messages, articleId } = req.body as {
      messages: ChatMessage[];
      articleId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    try {
      // If articleId provided, prepend article context as a system message
      const enrichedMessages: ChatMessage[] = [...messages];

      if (articleId) {
        const article = await getArticleById(articleId);
        if (article) {
          const contextContent = `Contexto del artículo actual:\nTítulo: ${article.title}\nFuente: ${article.source.name}\nFecha: ${article.publishedAt}\nContenido: ${article.body}`;
          enrichedMessages.unshift({
            role: 'system',
            content: contextContent,
          });
        }
      }

      const result = streamText({
        model,
        system: buildSystemPrompt(),
        messages: enrichedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools: agentTools,
        stopWhen: stepCountIs(5),
        onFinish: ({ usage }) => {
          console.log('Agent chat finished. Token usage:', usage);
        },
      });

      // Use pipeUIMessageStreamToResponse for Express (Node.js ServerResponse) compatibility
      // This produces a stream in the format the useChat hook in AI SDK v6 expects
      result.pipeUIMessageStreamToResponse(res as unknown as ServerResponse);
    } catch (error) {
      console.error('Agent chat error:', error);
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
      res.status(400).json({
        error: 'text must not exceed 3000 characters',
      });
      return;
    }

    try {
      const audioUrl = await synthesizeSpeech(text, articleId);
      res.json({ audioUrl });
    } catch (error) {
      console.error('Audio synthesis error:', error);
      res.status(500).json({ error: 'Failed to synthesize audio' });
    }
  },
];

// ─── Lambda-compatible single-function exports ───────────────────────────────

async function runWithAuthGuard(
  req: Request,
  res: Response,
  fn: (req: Request, res: Response) => Promise<void>
): Promise<void> {
  await new Promise<void>((resolve) => {
    authGuard(req, res, () => resolve());
    resolve()
  });
  if (!res.headersSent) {
    await fn(req, res);
  }
}

export async function chatHandler(req: Request, res: Response): Promise<void> {
  await runWithAuthGuard(req, res, async (_req, _res) => {
    const { messages, articleId } = _req.body as {
      messages: ChatMessage[];
      articleId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      _res.status(400).json({ error: 'messages array is required' });
      return;
    }

    const enrichedMessages: ChatMessage[] = [...messages];

    if (articleId) {
      const article = await getArticleById(articleId);
      if (article) {
        const contextContent = `Contexto del artículo actual:\nTítulo: ${article.title}\nFuente: ${article.source.name}\nFecha: ${article.publishedAt}\nContenido: ${article.body}`;
        enrichedMessages.unshift({ role: 'system', content: contextContent });
      }
    }

    const result = streamText({
      model,
      system: buildSystemPrompt(),
      messages: enrichedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
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

