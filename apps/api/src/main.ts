/**
 * Local development Express server.
 * Mounts all route handlers for use with serverless-offline or direct node execution.
 *
 * In production each handler file is a Lambda entry point wrapped with serverless-http.
 */

import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { login, oauthSync, refresh } from './handlers/auth';
import { today, article } from './handlers/news';
import { chat, audio } from './handlers/agent';
import { handler as mcpHandler } from './handlers/mcp';

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// CORS
app.use(corsMiddleware);

// Auth routes (no authGuard on login/oauth-sync — they are public)
app.post('/auth/login', login);
app.post('/auth/oauth-sync', oauthSync);
app.post('/auth/refresh', ...refresh);

// News routes (protected — authGuard is applied inside the handler arrays)
app.get('/news/today', ...today);
app.get('/news/:id', ...article);

// Agent routes (protected)
// /agent/chat uses the Express handler locally; production routes to the Lambda Function URL (agent-stream.ts)
app.post('/agent/chat', ...chat);
app.post('/agent/audio', ...audio);

// MCP route (protected)
app.post('/mcp', ...mcpHandler);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT ?? 4000;

// Start the Express server when running directly with tsx (local dev).
// AWS_LAMBDA_FUNCTION_NAME is set by both real Lambda and serverless-offline,
// so its absence means we are in a direct-run context.
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`[api] Local dev server running at http://localhost:${PORT}`);
  });
}

export { app };

// Lambda entry point — wraps the Express app for API Gateway / serverless-offline
import serverlessHttp from 'serverless-http';
export const handler = serverlessHttp(app);
