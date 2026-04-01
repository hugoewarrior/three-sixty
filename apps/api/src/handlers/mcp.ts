import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpServer } from '../mcp/server';
// Register tools and resources by importing the side-effect modules
import '../mcp/tools';
import '../mcp/resources';
import { authGuard } from '../middleware/auth-guard';

async function mcpCore(req: Request, res: Response): Promise<void> {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body as Record<string, unknown>);
  } catch (error) {
    console.error('MCP handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'MCP server error' });
    }
  }
}

/**
 * POST /mcp — Express middleware array (used by main.ts router).
 * Requires authGuard.
 */
export const handler = [authGuard, mcpCore];

/**
 * Lambda-compatible single-function export for Serverless Framework.
 */
export async function mcpHandler(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve) => {
    authGuard(req, res, () => resolve());
  });
  if (!res.headersSent) {
    await mcpCore(req, res);
  }
}
