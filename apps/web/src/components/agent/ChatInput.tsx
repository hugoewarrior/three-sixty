'use client';

import { type FormEvent, type KeyboardEvent } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, onStop, isLoading }: ChatInputProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit(e as unknown as FormEvent);
      }
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30"
    >
      <textarea
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder="Ask about the news…"
        className="flex-1 resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none disabled:opacity-50"
        style={{ minHeight: '24px', maxHeight: '120px' }}
      />
      {isLoading ? (
        <button
          type="button"
          onClick={onStop}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-gray-300 transition hover:bg-red-600 hover:text-white"
          aria-label="Stop"
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500"
          aria-label="Send"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      )}
    </form>
  );
}
