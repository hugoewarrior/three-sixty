export interface User {
  id: string;
  email: string;
  name?: string;
  provider: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  expiresAt: number;
}
