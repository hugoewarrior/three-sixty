import { Request, Response, NextFunction } from 'express';
import { verifyCognitoToken } from '../lib/jwks';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export async function authGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[authGuard] 401 — missing Authorization header (${req.method} ${req.path})`);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = await verifyCognitoToken(token);
    next();
  } catch (err) {
    console.warn(
      `[authGuard] 401 — JWKS verification failed (${req.method} ${req.path}):`,
      err instanceof Error ? err.message : err
    );
    res.status(401).json({ error: 'Unauthorized' });
  }
}
