import {
  CognitoIdentityProvider,
  InitiateAuthCommand,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomBytes } from 'crypto';

// CognitoIdentityProvider (without "Client") is the full client with direct
// method access — avoids the AdminSetUserPasswordCommand export resolution
// issue with the modular Command pattern in TypeScript 5.9 + bundler resolution.
const cognitoClient = new CognitoIdentityProvider({
  region: process.env.APP_REGION ?? 'us-east-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const response = await cognitoClient.send(command);

  if (!response.AuthenticationResult) {
    throw new Error('Authentication failed');
  }

  const result = response.AuthenticationResult;

  return {
    accessToken: result.AccessToken ?? '',
    refreshToken: result.RefreshToken ?? '',
    expiresIn: result.ExpiresIn ?? 3600,
    userId: email,
  };
}

export interface CognitoUser {
  username: string;
  email: string;
  name?: string;
}

export async function getUserByEmail(email: string): Promise<CognitoUser | null> {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    });

    const response = await cognitoClient.send(command);

    const emailAttr = response.UserAttributes?.find((a) => a.Name === 'email');
    const nameAttr = response.UserAttributes?.find((a) => a.Name === 'name');

    return {
      username: response.Username ?? email,
      email: emailAttr?.Value ?? email,
      name: nameAttr?.Value,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      return null;
    }
    throw error;
  }
}

export async function createOAuthUser(
  email: string,
  name: string
): Promise<CognitoUser> {
  const randomPassword = randomBytes(16).toString('base64') + 'Aa1!';

  const createCommand = new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    MessageAction: MessageActionType.SUPPRESS,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: name },
    ],
  });

  await cognitoClient.send(createCommand);

  // Use the full-client method directly — AdminSetUserPasswordCommand is not
  // re-exported cleanly in this SDK version's type declarations
  await cognitoClient.adminSetUserPassword({
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: randomPassword,
    Permanent: true,
  });

  return { username: email, email, name };
}
