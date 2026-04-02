'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ChatMessage } from './ChatMessage';
import { Spinner } from '@/components/ui/Spinner';

interface ChatWindowProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

export function ChatWindow({ messages, isStreaming }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0 && !isStreaming) return null;

  return (
    <div className="flex flex-col gap-6 py-6">
      {messages.map((msg) => {
        // Skip empty assistant messages — the "Thinking…" spinner covers this state.
        if (msg.role === 'assistant' && !msg.parts.some((p) => p.type === 'text' && p.text.length > 0)) {
          return null;
        }
        return <ChatMessage key={msg.id} message={msg} />;
      })}
      {isStreaming && (
        <div className="flex gap-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-400">
            AI
          </div>
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-gray-800 px-4 py-3 ring-1 ring-gray-700">
            <Spinner size="sm" />
            <span className="text-sm text-gray-400">Thinking…</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
