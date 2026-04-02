import { Request, Response } from 'express';
import { authenticateUser } from '../services/cognito';

/**
 * POST /auth/login
 * Authenticates with Cognito USER_PASSWORD_AUTH and returns the Cognito tokens
 * directly. Clients use the Cognito access token for all subsequent API calls;
 * the API validates it via JWKS on every request.
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
      },
    });
  } catch {
    res.status(401).json({ error: 'Invalid email or password' });
  }
}

export { login as loginHandler };
