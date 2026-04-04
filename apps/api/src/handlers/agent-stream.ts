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
import { randomUUID } from 'crypto';
import { model } from '../lib/ai-client';
import { buildSystemPrompt } from '../agent/prompts/system';
import { agentTools } from '../agent';
import { getArticleById } from '../services/supabase';
import { verifyCognitoToken } from '../lib/jwks';
import { createConversation, updateConversation } from '../services/conversations';

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
  'Access-Control-Expose-Headers': 'X-Conversation-Id',
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
      console.log(`[stream][${reqId}] OPTIONS preflight — responding with CORS headers`);
      const preflightStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 204,
        headers: CORS_HEADERS,
      });
      preflightStream.write('');
      preflightStream.end();
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
    let conversationId: string | undefined;

    try {
      const body = JSON.parse(event.body ?? '{}') as {
        messages?: UIMessage[];
        articleId?: string;
        conversationId?: string;
      };
      messages = body.messages ?? [];
      articleId = body.articleId;
      conversationId = body.conversationId;
    } catch {
      sendError(responseStream, 400, 'Invalid JSON body');
      return;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      sendError(responseStream, 400, 'messages array is required');
      return;
    }

    console.log(`[stream][${reqId}] START user=${userEmail} messages=${messages.length} articleId=${articleId ?? 'none'} conversationId=${conversationId ?? 'new'}`);

    // ── Pre-generate conversationId so it can be sent in response headers ───
    // Lambda streaming requires all headers to be set before the first byte is
    // written, so we generate the ID here and create/update the record in onFinish.
    const outgoingConversationId = conversationId ?? randomUUID();

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
        onError: (e) => console.error(`[stream][${reqId}] stream error:`, e),
        onFinish: async ({ text, steps, usage }) => {
          console.log(
            `[stream][${reqId}] DONE steps=${steps.length} tokens_in=${usage.inputTokens} tokens_out=${usage.totalTokens}`
          );
          // TODO: migrate to event-driven pattern (e.g. EventBridge) so conversation
          // persistence does not add latency to the streaming response pipeline.
          try {
            const assistantMsg: UIMessage = {
              id: randomUUID(),
              role: 'assistant',
              parts: [{ type: 'text', text }],
            };
            const fullMessages = [...messages, assistantMsg];

            if (conversationId) {
              await updateConversation(conversationId, userId, fullMessages);
            } else {
              await createConversation(userId, userEmail, fullMessages, outgoingConversationId);
            }
            console.log(`[stream][${reqId}] conversation saved conversationId=${outgoingConversationId}`);
          } catch (err) {
            console.error(`[stream][${reqId}] conversation save error`, err);
          }
        },
      });

      // Defer HttpResponseStream.from until pipeUIMessageStreamToResponse calls
      // writeHead — that way AI SDK headers and CORS headers are committed together
      // in a single Lambda streaming metadata block.
      let httpStream: LambdaStream | null = null;
      const serverResponseShim = {
        writeHead: (_status: number, _statusText?: unknown, aiHeaders?: Record<string, string>) => {
          httpStream = awslambda.HttpResponseStream.from(responseStream, {
            statusCode: 200,
            headers: {
              ...(aiHeaders ?? {}),
              'X-Conversation-Id': outgoingConversationId,
              // Function URL CORS config already sets Access-Control-Allow-Origin.
              // Only expose the custom response header the CORS config doesn't cover.
              'Access-Control-Expose-Headers': 'X-Conversation-Id',
            },
          });
          return serverResponseShim;
        },
        write: (chunk: unknown) => { httpStream?.write(chunk); return true; },
        end: (chunk?: unknown) => { if (chunk) httpStream?.write(chunk); httpStream?.end(); },
      };

      await result.pipeUIMessageStreamToResponse(serverResponseShim as unknown as ServerResponse);
    } catch (error) {
      console.error(`[stream][${reqId}] ERROR`, error);
      sendError(responseStream, 500, 'Internal server error');
    }
  }
);
