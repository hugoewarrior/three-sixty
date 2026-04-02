import { Request, Response, NextFunction } from 'express';

const ALLOWED_HEADERS = 'Content-Type, Authorization';
const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const EXPOSED_HEADERS = 'X-Conversation-Id';

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins: string[] = ['http://localhost:3000'];

  if (frontendUrl) {
    allowedOrigins.push(frontendUrl);
  }

  const requestOrigin = req.headers.origin;

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  } else if (!requestOrigin) {
    // Allow requests without Origin header (e.g. server-to-server)
    res.setHeader(
      'Access-Control-Allow-Origin',
      allowedOrigins[0]
    );
  }

  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
