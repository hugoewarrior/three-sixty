/**
 * Lambda response streaming handler for POST /agent/chat.
 * Uses awslambda.streamifyResponse + Lambda Function URL (invokeMode: RESPONSE_STREAM)
 * to bypass API Gateway's 29-second timeout and deliver tokens incrementally.
 *
 * This handler is NOT used for local development — the Express app in main.ts
 * handles /agent/chat locally with native streaming.
 */

import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';
import type { ServerResponse } from 'http';
import { model } from '../lib/ai-client';
import { buildSystemPrompt } from '../agent/prompts/system';
import { agentTools } from '../agent';
import { getArticleById } from '../services/supabase';
import { verifyCognitoToken } from '../lib/jwks';

// awslambda is injected globally by the Lambda Node.js runtime.
// Not available locally — this file is only bundled/invoked in production Lambda.
declare const awslambda: {
  streamifyResponse: (
    handler: (event: StreamEvent, responseStream: LambdaStream) => Promise<void>
  ) => unknown;
  HttpResponseStream: {
    from: (stream: LambdaStream, metadata: HttpMetadata) => LambdaStream;
  };
};

interface StreamEvent {
  headers?: Record<string, string>;
  body?: string;
  requestContext?: { http?: { method?: string } };
}

interface HttpMetadata {
  statusCode: number;
  headers: Record<string, string>;
}

type LambdaStream = NodeJS.WritableStream;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function sendError(responseStream: LambdaStream, status: number, message: string): void {
  const stream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
  stream.write(JSON.stringify({ error: message }));
  stream.end();
}

export const streamHandler = awslambda.streamifyResponse(
  async (event: StreamEvent, responseStream: LambdaStream): Promise<void> => {
    const reqId = Math.random().toString(36).slice(2, 8);

    // ── CORS preflight ──────────────────────────────────────────────────────
    if (event.requestContext?.http?.method === 'OPTIONS') {
      awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: CORS_HEADERS,
      }).end();
      return;
    }

    // ── Auth (Cognito JWKS) ─────────────────────────────────────────────────
    const headers = event.headers ?? {};
    const authHeader = headers['authorization'] ?? headers['Authorization'] ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      console.warn(`[stream][${reqId}] 401 — missing Authorization header`);
      sendError(responseStream, 401, 'Unauthorized');
      return;
    }

    let userId = '';
    let userEmail = '';

    try {
      const claims = await verifyCognitoToken(authHeader.slice(7));
      userId = claims.userId;
      userEmail = claims.email;
    } catch (err) {
      console.warn(`[stream][${reqId}] 401 — JWKS verification failed:`, err instanceof Error ? err.message : err);
      sendError(responseStream, 401, 'Unauthorized');
      return;
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let messages: UIMessage[];
    let articleId: string | undefined;

    try {
      const body = JSON.parse(event.body ?? '{}') as {
        messages?: UIMessage[];
        articleId?: string;
      };
      messages = body.messages ?? [];
      articleId = body.articleId;
    } catch {
      sendError(responseStream, 400, 'Invalid JSON body');
      return;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      sendError(responseStream, 400, 'messages array is required');
      return;
    }

    console.log(`[stream][${reqId}] START user=${userEmail} userId=${userId} messages=${messages.length} articleId=${articleId ?? 'none'}`);

    // ── Open the streaming HTTP response ────────────────────────────────────
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-vercel-ai-data-stream': 'v1',
        ...CORS_HEADERS,
      },
    });

    try {
      const coreMessages = await convertToModelMessages(messages);

      if (articleId) {
        const article = await getArticleById(articleId);
        if (article) {
          console.log(`[stream][${reqId}] injecting article context: "${article.title}"`);
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
        onFinish: ({ usage, steps }) => {
          console.log(
            `[stream][${reqId}] DONE steps=${steps.length} tokens_in=${usage.inputTokens} tokens_out=${usage.totalTokens}`
          );
        },
      });

      await result.pipeUIMessageStreamToResponse(httpStream as unknown as ServerResponse);
    } catch (error) {
      console.error(`[stream][${reqId}] ERROR`, error);
      httpStream.write('\n');
      httpStream.end();
    }
  }
);
