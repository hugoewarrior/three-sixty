'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

type Step = 'form' | 'loading' | 'success';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (reason.trim().length < 20) {
      setError('Por favor explica el motivo de tu solicitud (mínimo 20 caracteres).');
      return;
    }

    setStep('loading');

    // TODO: replace with real API call — POST /auth/request-access
    // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/request-access`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ name, email, reason }),
    // });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStep('success');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-4xl font-black text-blue-700">360</span>
          <p className="mt-1 text-sm text-gray-500">Three Sixty AI</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          {step === 'success' ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Solicitud enviada</h2>
              <p className="text-sm text-gray-600">
                Hemos recibido tu solicitud. Te contactaremos a{' '}
                <strong className="text-gray-900">{email}</strong> cuando tu acceso esté listo.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">Solicitar acceso</h1>
              <p className="mb-6 text-sm text-gray-500">
                Three Sixty AI es una plataforma privada. Completa el formulario y te avisaremos cuando tu acceso esté listo.
              </p>

              {error && <ErrorBanner message={error} className="mb-4" />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    ¿Por qué quieres acceso?
                  </label>
                  <textarea
                    required
                    minLength={20}
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Cuéntanos brevemente para qué usarías la plataforma…"
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {reason.length}/20 caracteres mínimos
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={step === 'loading'}
                >
                  {step === 'loading' ? 'Enviando solicitud…' : 'Enviar solicitud'}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-500">
                ¿Ya tienes acceso?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
