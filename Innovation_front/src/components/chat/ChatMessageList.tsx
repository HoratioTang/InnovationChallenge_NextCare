import { useEffect, useRef, type FC } from 'react';
import { Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend?: (message: string) => void;
}

const STARTER_PROMPTS = [
  'Summarize the screening results so far',
  'What changes should I be concerned about?',
  'Explain the scores in simple terms',
  'What should I discuss with the doctor?',
];

export const ChatMessageList: FC<ChatMessageListProps> = ({ messages, loading, onSend }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Empty state with starter prompts
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <Bot size={32} className="text-blue-300 mb-3" />
        <p className="text-sm text-slate-400 mb-4 text-center">
          Ask me anything about this subject's screening history
        </p>
        {onSend && (
          <div className="flex flex-wrap gap-2 justify-center">
            {STARTER_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => onSend(prompt)}
                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700
                           rounded-full hover:bg-blue-100 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
        >
          {msg.role === 'assistant' && (
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
              <Bot size={14} className="text-blue-600" />
            </div>
          )}
          <div
            className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
            }`}
          >
            {msg.role === 'assistant' ? (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-4 mb-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-4 mb-1">{children}</ol>,
                  li: ({ children }) => <li className="mb-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {loading && (
        <div className="flex justify-start mb-3">
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center mr-2">
            <Bot size={14} className="text-blue-600" />
          </div>
          <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
