import { Request, Response } from 'express';
import { authGuard } from '../middleware/auth-guard';
import { getConversation, listConversations } from '../services/conversations';

/**
 * GET /agent/conversation/history
 * Returns a paginated list of conversation summaries for the authenticated user.
 * Accepts optional ?lastKey=<base64url> cursor for pagination.
 */
export const history = [
  authGuard,
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.user!;
    const limit = 10;

    let lastKey: Record<string, unknown> | undefined;
    if (req.query.lastKey) {
      try {
        lastKey = JSON.parse(
          Buffer.from(req.query.lastKey as string, 'base64url').toString('utf8')
        ) as Record<string, unknown>;
      } catch {
        res.status(400).json({ error: 'Invalid lastKey cursor' });
        return;
      }
    }

    try {
      const result = await listConversations(userId, limit, lastKey);
      res.json({
        items: result.items,
        nextKey: result.nextKey
          ? Buffer.from(JSON.stringify(result.nextKey)).toString('base64url')
          : null,
      });
    } catch (err) {
      console.error('[conversation/history] ERROR', err);
      res.status(500).json({ error: 'Failed to fetch conversation history' });
    }
  },
];

/**
 * GET /agent/conversation/:conversationId
 * Returns a single conversation (including full messages) for the authenticated user.
 * Returns 404 if not found or if the conversation belongs to another user.
 *
 * NOTE: This route must be registered AFTER the static /history route in main.ts
 * to prevent Express matching "history" as a conversationId param.
 */
export const conversationDetail = [
  authGuard,
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.user!;
    const { conversationId } = req.params;

    try {
      const conversation = await getConversation(conversationId, userId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      res.json(conversation);
    } catch (err) {
      console.error('[conversation/detail] ERROR', err);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  },
];
