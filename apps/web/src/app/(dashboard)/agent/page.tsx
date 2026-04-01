'use client';

import { useState, useRef, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAuth } from '@/context/AuthContext';
import { ChatWindow } from '@/components/agent/ChatWindow';
import { ChatInput } from '@/components/agent/ChatInput';

const SUGGESTED_PROMPTS = [
  'What are the top stories in Panama today?',
  'Summarize the latest economic news',
  'What happened in the National Assembly this week?',
  'Give me a brief on Panama Canal news',
];

export default function AgentPage() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const articleId = searchParams.get('articleId');
  const [inputValue, setInputValue] = useState('');

  // Keep a ref so the headers function always reads the latest session,
  // even though useChat captures the transport object only on mount.
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // In production, use the Lambda Function URL for true response streaming.
  // NEXT_PUBLIC_AGENT_STREAM_URL is the Function URL output from `serverless deploy`.
  // Locally, fall back to the Express API which streams natively via SSE.
  const apiUrl =
    process.env.NEXT_PUBLIC_AGENT_STREAM_URL ??
    `${process.env.NEXT_PUBLIC_API_URL ?? ''}/agent/chat`;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: apiUrl,
      headers: (): Record<string, string> => {
        const token = sessionRef.current?.user?.accessToken;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      body: articleId ? { articleId } : {},
    }),
    messages:
      articleId && session
        ? [
            {
              id: 'system-init',
              role: 'system' as const,
              content: `The user wants to discuss article ID: ${articleId}. Please load and summarize this article.`,
              parts: [
                {
                  type: 'text' as const,
                  text: `The user wants to discuss article ID: ${articleId}. Please load and summarize this article.`,
                },
              ],
              createdAt: new Date(),
            },
          ]
        : [],
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    const text = inputValue.trim();
    setInputValue('');
    await sendMessage({ text });
  }

  const visibleMessages = messages.filter((m) => m.role !== 'system');
  const showSuggestions = visibleMessages.length === 0 && !isStreaming;

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4 sm:px-6">
      <div className="flex-1 overflow-y-auto">
        {showSuggestions ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">AI News Assistant</h1>
              <p className="mt-2 text-sm text-gray-500">
                Ask me anything about today&apos;s news in Panama
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInputValue(prompt)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ChatWindow messages={visibleMessages} isStreaming={isStreaming} />
        )}
      </div>

      <div className="sticky bottom-0 bg-gray-50 pb-4 pt-2">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          isLoading={isStreaming}
        />
        <p className="mt-2 text-center text-xs text-gray-400">
          AI may make mistakes. Always verify important news with original sources.
        </p>
      </div>
    </div>
  );
}
