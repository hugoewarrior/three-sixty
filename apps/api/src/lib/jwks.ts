/**
 * Shared JWKS verifier for Cognito RS256 tokens.
 * createRemoteJWKSet automatically caches the key material and rotates it
 * when the endpoint returns a new kid, so this module-level singleton is safe.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const region = process.env.APP_REGION ?? 'us-east-1';
const userPoolId = process.env.COGNITO_USER_POOL_ID ?? '';

export const COGNITO_ISSUER = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const JWKS = createRemoteJWKSet(
  new URL(`${COGNITO_ISSUER}/.well-known/jwks.json`)
);

export interface TokenClaims {
  userId: string;
  email: string;
}

export async function verifyCognitoToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: COGNITO_ISSUER,
    algorithms: ['RS256'],
  });

  if (payload['token_use'] !== 'access') {
    throw new Error('Expected an access token');
  }

  const clientId = process.env.COGNITO_CLIENT_ID;
  if (clientId && payload['client_id'] !== clientId) {
    throw new Error('token client_id mismatch');
  }

  return {
    userId: (payload.sub ?? '') as string,
    // email is not included in Cognito access tokens by default;
    // it comes from the ID token. Fall back gracefully.
    email: (payload['email'] ?? '') as string,
  };
}
