'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

const ERROR_MESSAGES: Record<string, string> = {
  SessionExpired: 'Tu sesión expiró. Por favor inicia sesión nuevamente',
  OAuthAccountNotLinked: 'Este correo ya está registrado con otro método',
  Callback: 'Error al completar el inicio de sesión. Intenta nuevamente',
};

function getErrorMessage(code: string | null): string {
  if (!code) return '';
  return ERROR_MESSAGES[code] ?? 'Ocurrió un error. Intenta nuevamente';
}

export function LoginError() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const errorMessage = getErrorMessage(errorCode);

  if (!errorMessage) return null;

  return <ErrorBanner message={errorMessage} className="mb-6" />;
}


type Provider = 'cognito' | 'google' | 'facebook';

export default function LoginPage() {
  const [loading, setLoading] = useState<Provider | null>(null);

  async function handleSignIn(provider: Provider) {
    setLoading(provider);
    await signIn(provider, { callbackUrl: '/dashboard' });
    setLoading(null);
  }


  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 px-12 text-white">
        <div className="text-center">
          <div className="mb-6 text-7xl font-black tracking-tight">360</div>
          <h1 className="text-3xl font-bold">Three Sixty AI</h1>
          <p className="mt-3 text-lg text-blue-200">
            Las noticias de Panamá, con inteligencia artificial
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-gray-950 px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <span className="text-4xl font-black text-blue-400">360</span>
            <p className="mt-1 text-sm text-gray-500">Three Sixty AI</p>
          </div>

          <h2 className="mb-2 text-2xl font-black text-gray-100">Iniciar sesión</h2>
          <p className="mb-6 text-sm text-gray-500">
            Selecciona cómo quieres acceder a tu cuenta
          </p>

          <Suspense fallback={null}>
            <LoginError />
          </Suspense>

          <div className="space-y-3">
            {/* Cognito — primary */}
            <button
              onClick={() => handleSignIn('cognito')}
              disabled={!!loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {loading === 'cognito' ? 'Redirigiendo…' : 'Continuar con correo y contraseña'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-800" />
              <span className="text-xs text-gray-500">o continúa con</span>
              <div className="flex-1 border-t border-gray-800" />
            </div>

            {/* Google */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={!!loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-gray-800 disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading === 'google' ? 'Redirigiendo…' : 'Continuar con Google'}
            </button>

            {/* Facebook */}
            <button
              onClick={() => handleSignIn('facebook')}
              disabled={!!loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#166FE5] disabled:opacity-60"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {loading === 'facebook' ? 'Redirigiendo…' : 'Continuar con Facebook'}
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            ¿No tienes acceso?{' '}
            <Link href="/signup" className="font-medium text-blue-400 hover:underline">
              Solicita acceso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
