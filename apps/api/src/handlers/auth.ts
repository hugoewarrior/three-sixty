import { Request, Response } from 'express';
import { SignJWT } from 'jose';
import {
  authenticateUser,
  getUserByEmail,
  createOAuthUser,
} from '../services/cognito';
import { authGuard } from '../middleware/auth-guard';

const TOKEN_EXPIRY_SECONDS = 3600;

async function signInternalJwt(payload: {
  sub: string;
  email: string;
  provider: string;
}): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured');
  }

  const secretBytes = new TextEncoder().encode(secret);

  return new SignJWT({
    email: payload.email,
    provider: payload.provider,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_SECONDS}s`)
    .sign(secretBytes);
}

/**
 * POST /auth/login
 * Authenticates a user with Cognito USER_PASSWORD_AUTH flow.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const result = await authenticateUser(email, password);

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        id: result.userId,
        email,
        name: undefined,
      },
    });
  } catch {
    // Never expose Cognito-specific error codes to the client
    res.status(401).json({ error: 'Invalid email or password' });
  }
}

/**
 * POST /auth/oauth-sync
 * Creates or looks up a Cognito user for OAuth sign-ins.
 * Returns an internal JWT signed with AUTH_SECRET.
 */
export async function oauthSync(req: Request, res: Response): Promise<void> {
  const { email, name, provider, providerAccountId } = req.body as {
    email?: string;
    name?: string;
    provider?: string;
    providerAccountId?: string;
  };

  if (!email || !provider || !providerAccountId) {
    res.status(400).json({
      error: 'email, provider, and providerAccountId are required',
    });
    return;
  }

  try {
    let cognitoUser = await getUserByEmail(email);

    if (!cognitoUser) {
      cognitoUser = await createOAuthUser(email, name ?? email);
    }

    const accessToken = await signInternalJwt({
      sub: cognitoUser.username,
      email: cognitoUser.email,
      provider,
    });

    res.json({
      accessToken,
      userId: cognitoUser.username,
      expiresIn: TOKEN_EXPIRY_SECONDS,
    });
  } catch (error) {
    console.error('OAuth sync error:', error);
    res.status(500).json({ error: 'Failed to sync OAuth user' });
  }
}

/**
 * POST /auth/refresh
 * Issues a new JWT with a refreshed expiry. Requires authGuard.
 */
export const refresh = [
  authGuard,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const accessToken = await signInternalJwt({
        sub: req.user.userId,
        email: req.user.email,
        provider: req.user.provider,
      });

      res.json({
        accessToken,
        expiresIn: TOKEN_EXPIRY_SECONDS,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  },
];

/**
 * Lambda-compatible single-function export for Serverless Framework.
 * Applies authGuard inline before delegating to the refresh logic.
 */
export async function refreshHandler(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve) => {
    authGuard(req, res, () => resolve());
  });

  if (res.headersSent) return;

  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const accessToken = await signInternalJwt({
      sub: req.user.userId,
      email: req.user.email,
      provider: req.user.provider,
    });

    res.json({
      accessToken,
      expiresIn: TOKEN_EXPIRY_SECONDS,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
}

// ─── Lambda-compatible single-function aliases ────────────────────────────────
// login and oauthSync are already standalone functions — re-export as *Handler
export { login as loginHandler, oauthSync as oauthSyncHandler };
