'use client';

import { useEffect, useCallback, useState } from 'react';

interface SnackbarProps {
  message: string;
  onClose: () => void;
  action?: { label: string; onClick: () => void };
}

export function Snackbar({ message, onClose, action }: SnackbarProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 flex w-max max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl bg-gray-800 px-4 py-3 text-sm text-gray-100 shadow-xl ring-1 ring-gray-700"
    >
      <svg
        className="h-4 w-4 flex-shrink-0 text-red-400"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <span className="flex-1">{message}</span>
      {action && (
        <button
          onClick={() => { action.onClick(); onClose(); }}
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

interface SnackbarState {
  message: string;
  action?: { label: string; onClick: () => void };
}

export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);

  const show = useCallback(
    (message: string, action?: { label: string; onClick: () => void }) => {
      setSnackbar({ message, action });
    },
    []
  );

  const dismiss = useCallback(() => setSnackbar(null), []);

  return { snackbar, show, dismiss };
}
