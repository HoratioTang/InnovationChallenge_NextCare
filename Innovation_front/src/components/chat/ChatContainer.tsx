import { useState, useEffect, type FC } from 'react';
import { ChatPopup } from './ChatPopup';
import { ChatSidebar } from './ChatSidebar';
import { sendChatMessage, type ChatMode } from '../../services/api';
import type { ChatMessage } from '../../types';

interface ChatContainerProps {
  subjectId: string;
  onSidebarToggle?: (open: boolean) => void;
  mode?: ChatMode;
}

export const ChatContainer: FC<ChatContainerProps> = ({ subjectId, onSidebarToggle, mode = 'dashboard' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarMode, setSidebarMode] = useState(false);

  // Clear chat when subject changes
  useEffect(() => {
    setMessages([]);
  }, [subjectId]);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(subjectId, text, history, mode);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I couldn\'t process that request. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const expandToSidebar = () => {
    setSidebarMode(true);
    onSidebarToggle?.(true);
  };

  const collapseToPopup = () => {
    setSidebarMode(false);
    onSidebarToggle?.(false);
  };

  if (sidebarMode) {
    return (
      <div className="w-[380px] flex-shrink-0 py-8 pr-8 h-[calc(100vh-2rem)]">
        <ChatSidebar
          subjectId={subjectId}
          messages={messages}
          loading={loading}
          onSend={handleSend}
          onCollapse={collapseToPopup}
          mode={mode}
        />
      </div>
    );
  }

  return (
    <ChatPopup
      subjectId={subjectId}
      messages={messages}
      loading={loading}
      onSend={handleSend}
      onExpandToSidebar={expandToSidebar}
      mode={mode}
    />
  );
};
