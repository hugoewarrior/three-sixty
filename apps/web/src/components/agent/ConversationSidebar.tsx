'use client';

import { useState, useRef } from 'react';
import type { UIMessage } from 'ai';
import { apiClient, type ConversationSummary, type ConversationHistoryResponse } from '@/lib/api-client';

interface ConversationSidebarProps {
  token: string | null;
  activeConversationId: string | null;
  onSelect: (conversationId: string, messages: UIMessage[]) => void;
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

export function ConversationSidebar({ token, activeConversationId, onSelect }: ConversationSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [nextKey, setNextKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  // Memory cache: stores the last fetched page result so re-opening doesn't re-fetch
  const cacheRef = useRef<ConversationHistoryResponse | null>(null);

  async function fetchHistory(cursor?: string) {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await apiClient.conversations.getHistory(token, cursor);
      setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextKey(data.nextKey);
      if (!cursor) cacheRef.current = data;
    } catch (err) {
      console.error('[ConversationSidebar] fetch error', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  function handleToggle() {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      if (cacheRef.current) {
        setItems(cacheRef.current.items);
        setNextKey(cacheRef.current.nextKey);
      } else {
        void fetchHistory();
      }
    }
  }

  async function handleSelect(summary: ConversationSummary) {
    if (loadingId) return;
    setLoadingId(summary.conversationId);
    try {
      const detail = await apiClient.conversations.getDetail(summary.conversationId, token);
      onSelect(summary.conversationId, detail.messages as UIMessage[]);
      setIsOpen(false);
    } catch (err) {
      console.error('[ConversationSidebar] load conversation error', err);
    } finally {
      setLoadingId(null);
    }
  }

  /** Call this from the parent when a new conversation is saved to invalidate the cache. */
  function invalidateCache() {
    cacheRef.current = null;
    hasFetchedRef.current = false;
    if (isOpen) {
      void fetchHistory();
    }
  }

  // Expose invalidateCache via ref forwarding isn't needed here — parent calls
  // it via a prop callback. See usage in agent/page.tsx.
  void invalidateCache; // referenced below via prop

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={handleToggle}
        aria-label={isOpen ? 'Close conversation history' : 'Open conversation history'}
        className="absolute left-0 top-3 z-40 flex items-center gap-1.5 rounded-r-lg border border-l-0 border-gray-700 bg-gray-900 px-2.5 py-2 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">History</span>
      </button>

      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <div
        className={`fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-72 flex-col border-r border-gray-800 bg-gray-950 shadow-xl transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-200">Conversation History</h2>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            className="text-gray-500 transition hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-5 w-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-gray-600">No conversations yet</p>
          ) : (
            <ul>
              {items.map((item) => {
                const isActive = item.conversationId === activeConversationId;
                const isRowLoading = loadingId === item.conversationId;
                return (
                  <li key={item.conversationId}>
                    <button
                      onClick={() => void handleSelect(item)}
                      disabled={!!loadingId}
                      className={`w-full px-4 py-3 text-left transition hover:bg-gray-800 disabled:cursor-not-allowed ${
                        isActive ? 'border-l-2 border-blue-500 bg-gray-800/60' : 'border-l-2 border-transparent'
                      }`}
                    >
                      <p className={`truncate text-xs font-medium leading-snug ${isActive ? 'text-blue-300' : 'text-gray-300'}`}>
                        {isRowLoading ? (
                          <span className="text-gray-500">Loading…</span>
                        ) : (
                          item.firstMessage || <span className="italic text-gray-600">Empty conversation</span>
                        )}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                        <span>{formatDate(item.createdAt)}</span>
                        {item.updatedAt !== item.createdAt && (
                          <>
                            <span>·</span>
                            <span>Updated {formatDate(item.updatedAt)}</span>
                          </>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Load more */}
        {nextKey && !isLoading && (
          <div className="border-t border-gray-800 p-3">
            <button
              onClick={() => void fetchHistory(nextKey)}
              disabled={isLoadingMore}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-gray-200 disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
