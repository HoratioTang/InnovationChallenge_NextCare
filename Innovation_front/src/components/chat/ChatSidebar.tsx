import { type FC } from 'react';
import { Bot, PanelRightClose } from 'lucide-react';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from '../../types';
import type { ChatMode } from '../../services/api';

interface ChatSidebarProps {
  subjectId: string;
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
  onCollapse: () => void;
  mode?: ChatMode;
}

export const ChatSidebar: FC<ChatSidebarProps> = ({
  subjectId,
  messages,
  loading,
  onSend,
  onCollapse,
  mode = 'dashboard',
}) => {
  return (
    <div className="h-full bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/60
                    flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-blue-600" />
          <span className="font-semibold text-sm text-slate-800">
            {mode === 'profile' ? `Ask about activities for ${subjectId}` : `Ask about ${subjectId}`}
          </span>
        </div>
        <button
          onClick={onCollapse}
          title="Collapse to popup"
          className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <PanelRightClose size={16} className="text-slate-400 hover:text-slate-600" />
        </button>
      </div>

      {/* Messages */}
      <ChatMessageList messages={messages} loading={loading} onSend={onSend} mode={mode} />

      {/* Input */}
      <ChatInput onSend={onSend} disabled={loading} />
    </div>
  );
};
