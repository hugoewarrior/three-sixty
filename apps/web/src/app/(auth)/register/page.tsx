import { redirect } from 'next/navigation';

// Registration is now handled via the access-request flow at /signup
export default function RegisterPage() {
  redirect('/signup');
}
