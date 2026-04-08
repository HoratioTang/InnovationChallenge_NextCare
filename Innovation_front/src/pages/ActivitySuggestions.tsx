import { useState, useEffect, type FC } from 'react';
import { ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ActivitySection } from '../components/profile/ActivitySection';
import { QuickActions } from '../components/profile/QuickActions';
import { ChatContainer } from '../components/chat/ChatContainer';
import { fetchCarePlan } from '../services/api';
import type { CarePlan } from '../types';

interface ActivitySuggestionsProps {
  subjectId: string;
  onBack: () => void;
  onViewDashboard: (subjectId: string) => void;
  onRunNewScreening: () => void;
}

export const ActivitySuggestions: FC<ActivitySuggestionsProps> = ({
  subjectId,
  onBack,
  onViewDashboard,
  onRunNewScreening,
}) => {
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchCarePlan(subjectId)
      .then((cp) => {
        if (!cancelled) setCarePlan(cp);
      })
      .catch(() => {
        if (!cancelled) setCarePlan(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  // Quick Actions → "Ask the Assistant" needs a way to open the chat.
  // ChatContainer manages its own visibility, but we expose a simple
  // approach: scroll to it / no-op (the floating bubble is always visible).
  // For a more direct UX we could add an imperative ref later.
  const handleOpenChat = () => {
    // ChatContainer's floating bubble is always rendered in the bottom-right.
    // Scrolling to bottom is enough of a nudge for now.
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-slate-400 text-sm">Loading care plan...</p>
      </div>
    );
  }

  if (!carePlan) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-slate-500 mb-4">Could not load care plan.</p>
        <button
          onClick={onBack}
          className="text-sm text-rose-600 hover:underline"
        >
          ← Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex ${chatSidebarOpen ? 'gap-6' : ''}`}>
      <div
        className={`flex-1 flex flex-col p-8 ${
          chatSidebarOpen ? 'min-w-0' : 'max-w-5xl mx-auto w-full'
        }`}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Profile
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">{subjectId}</h1>
          <p className="text-sm text-slate-400">
            {carePlan.session_count}{' '}
            {carePlan.session_count === 1 ? 'session' : 'sessions'} on record
          </p>
        </motion.div>

        {/* Insufficient-data banner */}
        {!carePlan.has_enough_data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
          >
            <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              These activities support cognitive health across all areas. As more
              screenings are completed, suggestions will become personalized.
            </p>
          </motion.div>
        )}

        {/* Priority section */}
        <ActivitySection
          title="Priority — Based on recent screening results"
          subtitle="These activities target cognitive areas where recent changes have been noticed."
          groups={carePlan.priority}
          priority
        />

        {/* Stable banner — only if enough data and nothing flagged */}
        {carePlan.is_stable && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6"
          >
            <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">
              Cognitive profile has been stable across recent sessions. The activities
              below support ongoing cognitive maintenance.
            </p>
          </motion.div>
        )}

        {/* General section */}
        <ActivitySection
          title={carePlan.priority.length > 0 ? 'Ongoing Activities' : 'Suggested Activities'}
          subtitle="General cognitive maintenance — encourage these as part of daily routine."
          groups={carePlan.general}
          priority={false}
        />

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 italic mt-2 mb-4">
          These activities are suggestions for general cognitive engagement and are not
          a treatment plan. They do not replace professional medical advice.
        </p>

        {/* Quick Actions */}
        <QuickActions
          onRunNewScreening={onRunNewScreening}
          onViewDashboard={() => onViewDashboard(subjectId)}
          onOpenChat={handleOpenChat}
        />
      </div>

      {/* Chatbot — same pattern as SubjectDashboard */}
      <ChatContainer subjectId={subjectId} onSidebarToggle={setChatSidebarOpen} mode="profile" />
    </div>
  );
};
