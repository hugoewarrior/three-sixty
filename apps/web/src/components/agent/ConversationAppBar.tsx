'use client';

import { useState, useEffect } from 'react';
import type { UIMessage } from 'ai';
import { apiClient, type ConversationSummary } from '@/lib/api-client';

interface ConversationAppBarProps {
  token: string | null;
  activeConversationId: string | null;
  refreshSignal: number;
  onSelect: (conversationId: string, messages: UIMessage[]) => void;
  onNewConversation: () => void;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export function ConversationAppBar({
  token,
  activeConversationId,
  refreshSignal,
  onSelect,
  onNewConversation,
}: ConversationAppBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [nextKey, setNextKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function fetchHistory(cursor?: string) {
    if (cursor) setIsLoadingMore(true);
    else setIsLoading(true);
    try {
      const data = await apiClient.conversations.getHistory(token, cursor);
      setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextKey(data.nextKey);
    } catch (err) {
      console.error('[ConversationAppBar] fetch error', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  // Fetch history on mount and whenever authStatus changes (token becomes available)
  useEffect(() => {
    if (!token) return;
    void fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Re-fetch from the top when a new conversation is saved
  useEffect(() => {
    if (refreshSignal > 0 && token) void fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  async function handleSelect(summary: ConversationSummary) {
    if (loadingId) return;
    setLoadingId(summary.conversationId);
    try {
      const detail = await apiClient.conversations.getDetail(summary.conversationId, token);
      onSelect(summary.conversationId, detail.messages as UIMessage[]);
    } catch (err) {
      console.error('[ConversationAppBar] load conversation error', err);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div
      className={`flex flex-shrink-0 flex-col border-r border-gray-800 bg-gray-950 transition-[width] duration-200 ${
        isExpanded ? 'w-72' : 'w-14'
      }`}
    >
      {/* ── Top actions ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 border-b border-gray-800 p-2">
        {/* Toggle expand/collapse */}
        <button
          onClick={() => setIsExpanded((e) => !e)}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          title={isExpanded ? 'Collapse' : 'Expand'}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-gray-500 transition hover:bg-gray-800 hover:text-gray-200"
        >
          {isExpanded ? (
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
            </svg>
          )}
          {isExpanded && <span className="truncate text-xs font-semibold uppercase tracking-wider">Conversations</span>}
        </button>

        {/* New conversation */}
        <button
          onClick={onNewConversation}
          title="New conversation"
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-sm text-gray-400 transition hover:bg-gray-800 hover:text-gray-100"
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
            />
          </svg>
          {isExpanded && <span className="truncate text-sm">New conversation</span>}
        </button>
      </div>

      {/* ── History icon (collapsed hint) ────────────────────────────────── */}
      {!isExpanded && (
        <div className="flex justify-center p-2 pt-3">
          <span title="Conversation history">
            <svg className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
      )}

      {/* ── Conversation list (expanded only) ────────────────────────────── */}
      {isExpanded && (
        <>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <svg className="h-5 w-5 animate-spin text-gray-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-gray-600">No conversations yet</p>
            ) : (
              <ul className="py-1">
                {items.map((item) => {
                  const isActive = item.conversationId === activeConversationId;
                  const isRowLoading = loadingId === item.conversationId;
                  return (
                    <li key={item.conversationId}>
                      <button
                        onClick={() => void handleSelect(item)}
                        disabled={!!loadingId}
                        className={`w-full border-l-2 px-3 py-2.5 text-left transition hover:bg-gray-800 disabled:cursor-not-allowed ${
                          isActive ? 'border-blue-500 bg-gray-800/60' : 'border-transparent'
                        }`}
                      >
                        <p
                          className={`truncate text-xs font-medium leading-snug ${
                            isActive ? 'text-blue-300' : 'text-gray-300'
                          }`}
                        >
                          {isRowLoading ? (
                            <span className="text-gray-500">Loading…</span>
                          ) : item.firstMessage ? (
                            item.firstMessage
                          ) : (
                            <span className="italic text-gray-600">Empty conversation</span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-600">
                          {formatDate(item.createdAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Load more */}
          {nextKey && !isLoading && (
            <div className="border-t border-gray-800 p-2">
              <button
                onClick={() => void fetchHistory(nextKey)}
                disabled={isLoadingMore}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-gray-200 disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
