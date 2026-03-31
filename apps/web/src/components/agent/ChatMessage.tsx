import type { UIMessage } from 'ai';
import { SourceBadge } from './SourceBadge';
import { AudioPlayer } from './AudioPlayer';

interface ExtendedMessage extends UIMessage {
  audioUrl?: string;
  sources?: string[];
}

function getTextContent(message: UIMessage): string {
  for (const part of message.parts) {
    if (part.type === 'text') return part.text;
  }
  return '';
}

export function ChatMessage({ message }: { message: ExtendedMessage }) {
  const isUser = message.role === 'user';
  const text = getTextContent(message);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-medium ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {isUser ? 'You' : 'AI'}
      </div>

      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white text-gray-800 shadow-sm ring-1 ring-gray-200 rounded-tl-sm'
          }`}
        >
          {text}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.sources.map((src: string) => (
              <SourceBadge key={src} source={src} />
            ))}
          </div>
        )}

        {!isUser && message.audioUrl && (
          <AudioPlayer audioUrl={message.audioUrl} />
        )}
      </div>
    </div>
  );
}
