import { useState, type FC } from 'react';
import { MessageCircle, X, PanelRightOpen, Bot } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from '../../types';
import type { ChatMode } from '../../services/api';

interface ChatPopupProps {
  subjectId: string;
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
  onExpandToSidebar: () => void;
  mode?: ChatMode;
}

export const ChatPopup: FC<ChatPopupProps> = ({
  subjectId,
  messages,
  loading,
  onSend,
  onExpandToSidebar,
  mode = 'dashboard',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Popup panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-[400px] h-[500px] z-50
                       bg-white rounded-2xl shadow-2xl border border-slate-200
                       flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-blue-600" />
                <span className="font-semibold text-sm text-slate-800">
                  {mode === 'profile' ? `Ask about activities for ${subjectId}` : `Ask about ${subjectId}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onExpandToSidebar}
                  title="Expand to sidebar"
                  className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <PanelRightOpen size={16} className="text-slate-400 hover:text-slate-600" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X size={16} className="text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <ChatMessageList messages={messages} loading={loading} onSend={onSend} mode={mode} />

            {/* Input */}
            <ChatInput onSend={onSend} disabled={loading} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600
                   text-white shadow-lg hover:bg-blue-700 transition-colors
                   flex items-center justify-center z-50"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
};
