import type { UIMessage, DynamicToolUIPart } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { SourceBadge } from './SourceBadge';
import { AudioPlayer } from './AudioPlayer';

function getTextContent(message: UIMessage): string {
  for (const part of message.parts) {
    if (part.type === 'text') return part.text;
  }
  return '';
}

function getAudioUrl(message: UIMessage): string | undefined {
  for (const part of message.parts) {
    if (
      part.type === 'dynamic-tool' &&
      (part as DynamicToolUIPart).toolName === 'generate_audio' &&
      (part as DynamicToolUIPart).state === 'output-available'
    ) {
      const output = (part as DynamicToolUIPart).output as { audioUrl?: string };
      if (output?.audioUrl) return output.audioUrl;
    }
  }
  return undefined;
}

function getSources(message: UIMessage): string[] {
  for (const part of message.parts) {
    if (
      part.type === 'dynamic-tool' &&
      (part as DynamicToolUIPart).toolName === 'search_news' &&
      (part as DynamicToolUIPart).state === 'output-available'
    ) {
      const output = (part as DynamicToolUIPart).output as { sources?: string[] };
      if (output?.sources) return output.sources;
    }
  }
  return [];
}

function isAudioUrl(href: string): boolean {
  return (
    href.includes('.mp3') ||
    href.includes('.wav') ||
    href.includes('.ogg') ||
    (href.includes('amazonaws.com') && href.includes('audio'))
  );
}

function markdownComponents(): Components {
  return {
    // Render paragraphs as <span> blocks to avoid invalid <div>-inside-<p> nesting
    // when the AudioPlayer (which uses inline-flex <span>) appears inside list items.
    p({ children }) {
      return <span className="mb-2 block last:mb-0">{children}</span>;
    },
    a({ href, children }) {
      if (href && isAudioUrl(href)) {
        return <AudioPlayer audioUrl={href} />;
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
          {children}
        </a>
      );
    },
  };
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  const text = getTextContent(message);
  const audioUrl = isUser ? undefined : getAudioUrl(message);
  const sources = isUser ? [] : getSources(message);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-medium ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
        }`}
      >
        {isUser ? 'You' : 'AI'}
      </div>

      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-gray-800 text-gray-100 ring-1 ring-gray-700 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            text
          ) : (
            <>
              <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-a:text-blue-400">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents()}>
                  {text}
                </ReactMarkdown>
              </div>
              {audioUrl && (
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <AudioPlayer audioUrl={audioUrl} />
                </div>
              )}
            </>
          )}
        </div>

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sources.map((src: string) => (
              <SourceBadge key={src} source={src} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
