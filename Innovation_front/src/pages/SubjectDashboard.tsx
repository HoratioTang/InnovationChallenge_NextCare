import { useState, useEffect, type FC } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { ScoreTimeline } from '../components/dashboard/ScoreTimeline';
import { ChangeAlerts } from '../components/dashboard/ChangeAlerts';
import { FeatureExplorer } from '../components/dashboard/FeatureExplorer';
import { SessionLog } from '../components/dashboard/SessionLog';
import { ChatContainer } from '../components/chat/ChatContainer';
import { fetchHistory, fetchChangeSummary, fetchBaselines } from '../services/api';
import type { SessionSummary, ChangeSummary, BaselineStats } from '../types';

interface SubjectDashboardProps {
  subjectId: string;
  onBack: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const SubjectDashboard: FC<SubjectDashboardProps> = ({ subjectId, onBack }) => {
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [changeSummary, setChangeSummary] = useState<ChangeSummary>({ subject_id: subjectId, flags: [] });
  const [baselines, setBaselines] = useState<Record<string, BaselineStats>>({});
  const [loading, setLoading] = useState(true);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchHistory(subjectId),
      fetchChangeSummary(subjectId),
      fetchBaselines(subjectId),
    ])
      .then(([h, c, b]) => {
        if (cancelled) return;
        setHistory(h);
        setChangeSummary(c);
        setBaselines(b);
      })
      .catch(() => {
        // Fail gracefully — sections show empty states
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [subjectId]);

  const firstDate = history.length > 0 ? formatDate(history[0].created_at) : null;
  const lastDate = history.length > 0 ? formatDate(history[history.length - 1].created_at) : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-slate-400 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex ${chatSidebarOpen ? 'gap-6' : ''}`}>
      {/* Dashboard content */}
      <div className={`flex-1 flex flex-col p-8 ${chatSidebarOpen ? 'min-w-0' : 'max-w-6xl mx-auto w-full'}`}>
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
            History
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">{subjectId}</h1>
          <p className="text-sm text-slate-400">
            {history.length} {history.length === 1 ? 'session' : 'sessions'}
            {firstDate && lastDate && firstDate !== lastDate && (
              <> · {firstDate} — {lastDate}</>
            )}
            {firstDate && lastDate && firstDate === lastDate && (
              <> · {firstDate}</>
            )}
          </p>
        </motion.div>

        {/* Section A: Score Timeline (full width) */}
        <div className="mb-6">
          <ScoreTimeline history={history} />
        </div>

        {/* Sections B + C: side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ChangeAlerts flags={changeSummary.flags} sessionCount={history.length} />
          </div>
          <div className="lg:col-span-3">
            <FeatureExplorer subjectId={subjectId} baselines={baselines} />
          </div>
        </div>

        {/* Section D: Session Log (full width) */}
        <SessionLog subjectId={subjectId} history={history} />
      </div>

      {/* Chat — single instance, mode managed internally */}
      <ChatContainer
        subjectId={subjectId}
        onSidebarToggle={setChatSidebarOpen}
      />
    </div>
  );
};
