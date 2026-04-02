/**
 * Local development Express server.
 * Mounts all route handlers for use with serverless-offline or direct node execution.
 *
 * In production each handler file is a Lambda entry point wrapped with serverless-http.
 */

import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { login } from './handlers/auth';
import { today, article } from './handlers/news';
import { chat, audio } from './handlers/agent';
import { history, conversationDetail } from './handlers/conversation';
import { handler as mcpHandler } from './handlers/mcp';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(corsMiddleware);

// Auth routes
app.post('/auth/login', login);

// News routes (protected)
app.get('/news/today', ...today);
app.get('/news/:id', ...article);

// Agent routes (protected)
// /agent/chat uses the Express handler locally; production routes to the Lambda Function URL (agent-stream.ts)
app.post('/agent/chat', ...chat);
app.post('/agent/audio', ...audio);
// Conversation history — static route MUST come before the :conversationId param route
app.get('/agent/conversation/history', ...history);
app.get('/agent/conversation/:conversationId', ...conversationDetail);

// MCP route (protected)
app.post('/mcp', ...mcpHandler);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT ?? 4000;

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`[api] Local dev server running at http://localhost:${PORT}`);
  });
}

export { app };

import serverlessHttp from 'serverless-http';
export const handler = serverlessHttp(app);
