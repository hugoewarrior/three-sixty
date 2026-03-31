import { auth } from '@/auth';

/**
 * Get the current session in server components and Route Handlers.
 * Returns null if the user is unauthenticated.
 */
export async function getServerSession() {
  const session = await auth();
  return session ?? null;
}
