'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useAuth } from '@/context/AuthContext';
import { ChatWindow } from '@/components/agent/ChatWindow';
import { ChatInput } from '@/components/agent/ChatInput';
import { Snackbar, useSnackbar } from '@/components/ui/Snackbar';
import { ConversationAppBar } from '@/components/agent/ConversationAppBar';
import { apiClient } from '@/lib/api-client';

const SUGGESTED_PROMPTS = [
  'What are the top stories in Panama today?',
  'Summarize the latest economic news',
  'What happened in the National Assembly this week?',
  'Give me a brief on Panama Canal news',
];

export default function AgentPage() {
  const { session, status: authStatus } = useAuth();
  const searchParams = useSearchParams();
  const articleId = searchParams.get('articleId');
  const articleTitle = searchParams.get('articleTitle');
  const urlConversationId = searchParams.get('conversationId');

  const [inputValue, setInputValue] = useState('');
  const { snackbar, show, dismiss } = useSnackbar();

  // Active conversation ID — set from URL param on load, or received from backend header
  const [activeConversationId, setActiveConversationId] = useState<string | null>(urlConversationId);
  const activeConversationIdRef = useRef<string | null>(urlConversationId);
  // Stores the conversationId captured from the X-Conversation-Id response header
  // while the stream is still in flight; applied to URL when stream finishes.
  const pendingConversationIdRef = useRef<string | null>(null);
  // Sidebar cache invalidation signal
  const [sidebarRefreshSignal, setSidebarRefreshSignal] = useState(0);

  const autoSentRef = useRef(false);
  const prevStatusRef = useRef<string>('');

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const token = session?.user?.accessToken ?? null;

  const apiUrl =
    process.env.NEXT_PUBLIC_AGENT_STREAM_URL ??
    `${process.env.NEXT_PUBLIC_API_URL ?? ''}/agent/chat`;

  // Custom fetch: injects the active conversationId into every request body and
  // captures the X-Conversation-Id header from the response.
  const customFetch = useCallback<typeof fetch>(async (input, init) => {
    if (activeConversationIdRef.current && init?.body) {
      try {
        const existing = JSON.parse(init.body as string) as Record<string, unknown>;
        const enhanced = { ...existing, conversationId: activeConversationIdRef.current };
        init = { ...init, body: JSON.stringify(enhanced) };
      } catch {
        // proceed without modification if body parsing fails
      }
    }

    const response = await fetch(input as RequestInfo, init as RequestInit);

    const cid = response.headers.get('x-conversation-id');
    if (cid) pendingConversationIdRef.current = cid;

    return response;
  }, []);

  const { messages, sendMessage, stop, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: apiUrl,
      headers: (): Record<string, string> => {
        const t = sessionRef.current?.user?.accessToken;
        return t ? { Authorization: `Bearer ${t}` } : {};
      },
      body: articleId ? { articleId } : {},
      fetch: customFetch,
    }),
    onError: (error) => {
      show(error instanceof Error ? error.message : 'Failed to get a response. Please try again.');
    },
  });

  // After stream finishes: update URL with the conversationId received in response header
  const isStreaming = status === 'streaming' || status === 'submitted';
  useEffect(() => {
    const wasStreaming =
      prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted';
    prevStatusRef.current = status;

    if (wasStreaming && !isStreaming && pendingConversationIdRef.current) {
      const cid = pendingConversationIdRef.current;
      pendingConversationIdRef.current = null;

      if (!activeConversationIdRef.current) {
        setActiveConversationId(cid);
        activeConversationIdRef.current = cid;
        window.history.replaceState({}, '', `/agent?conversationId=${cid}`);
        setSidebarRefreshSignal((n) => n + 1);
      } else {
        setSidebarRefreshSignal((n) => n + 1);
      }
    }
  }, [status, isStreaming]);

  // On mount: auto-send for article context (runs once, auth not required)
  useEffect(() => {
    if (autoSentRef.current) return;
    autoSentRef.current = true;

    if (articleId) {
      const label = articleTitle ?? articleId;
      void sendMessage({ text: `Please summarize this article for me: "${label}"` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load a historical conversation from the DB once auth resolves.
  // Kept separate from the mount effect so it retries when authStatus changes
  // from 'loading' → 'authenticated' (e.g. on page reload).
  const conversationLoadedRef = useRef(false);
  useEffect(() => {
    if (!urlConversationId || conversationLoadedRef.current) return;
    if (authStatus === 'loading') return;

    conversationLoadedRef.current = true;

    if (authStatus === 'authenticated') {
      apiClient.conversations
        .getDetail(urlConversationId, token)
        .then((detail) => setMessages(detail.messages as UIMessage[]))
        .catch(() => {
          // conversation not found or access denied — start fresh
        });
    }
  }, [authStatus, urlConversationId, token, setMessages]);

  function handleNewConversation() {
    setMessages([]);
    setActiveConversationId(null);
    activeConversationIdRef.current = null;
    pendingConversationIdRef.current = null;
    setInputValue('');
    window.history.replaceState({}, '', '/agent');
  }

  function handleConversationSelect(conversationId: string, loadedMessages: UIMessage[]) {
    setMessages(loadedMessages);
    setActiveConversationId(conversationId);
    activeConversationIdRef.current = conversationId;
    window.history.replaceState({}, '', `/agent?conversationId=${conversationId}`);
  }

  const visibleMessages = messages.filter((m) => m.role !== 'system');
  const showSuggestions = visibleMessages.length === 0 && !isStreaming;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left app bar */}
      <ConversationAppBar
        token={token}
        activeConversationId={activeConversationId}
        refreshSignal={sidebarRefreshSignal}
        onSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
      />

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 sm:px-6">
        {snackbar && <Snackbar message={snackbar.message} onClose={dismiss} />}

        <div className="flex-1 overflow-y-auto">
          {showSuggestions ? (
            <div className="flex h-full flex-col items-center justify-center gap-8 py-12">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-100">AI News Assistant</h1>
                <p className="mt-2 text-sm text-gray-500">
                  Ask me anything about today&apos;s news in Panama
                </p>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInputValue(prompt)}
                    className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-left text-sm text-gray-300 transition hover:border-blue-500 hover:bg-gray-800"
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

        <div className="sticky bottom-0 bg-gray-950 pb-4 pt-2">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onStop={stop}
            isLoading={isStreaming}
          />
          <p className="mt-2 text-center text-xs text-gray-600">
            AI may make mistakes. Always verify important news with original sources.
          </p>
        </div>
        </div>
      </div>
    </div>
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    const text = inputValue.trim();
    setInputValue('');
    await sendMessage({ text });
  }
}
