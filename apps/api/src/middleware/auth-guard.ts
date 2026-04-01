/**
 * NOTE: This middleware validates JWTs signed with AUTH_SECRET using HS256.
 * NextAuth v5 signs its own session JWTs using this same secret, so the API
 * backend validates them using the same symmetric key — no JWKS lookup needed
 * for NextAuth-issued tokens. If you switch to Cognito-native JWT tokens,
 * you would instead verify against:
 * https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
 */

import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        provider: string;
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
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration: AUTH_SECRET not set' });
    return;
  }

  try {
    const secretBytes = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretBytes, {
      algorithms: ['HS256'],
    });

    req.user = {
      userId: (payload['sub'] ?? payload['userId'] ?? '') as string,
      email: (payload['email'] ?? '') as string,
      provider: (payload['provider'] ?? 'credentials') as string,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
