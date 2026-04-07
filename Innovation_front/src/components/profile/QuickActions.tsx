import type { FC } from 'react';
import { ClipboardList, BarChart3, MessageSquare } from 'lucide-react';

interface QuickActionsProps {
  onRunNewScreening: () => void;
  onViewDashboard: () => void;
  onOpenChat: () => void;
}

export const QuickActions: FC<QuickActionsProps> = ({
  onRunNewScreening,
  onViewDashboard,
  onOpenChat,
}) => {
  return (
    <section className="mt-8 pt-6 border-t border-slate-200">
      <h2 className="text-xs font-bold tracking-wider uppercase text-slate-500 mb-4">
        Quick Actions
      </h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRunNewScreening}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-rose-300 hover:text-rose-600 hover:shadow-sm transition-all"
        >
          <ClipboardList size={16} />
          Run New Screening
        </button>
        <button
          onClick={onViewDashboard}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-rose-300 hover:text-rose-600 hover:shadow-sm transition-all"
        >
          <BarChart3 size={16} />
          View Dashboard
        </button>
        <button
          onClick={onOpenChat}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 rounded-xl text-sm font-medium text-white hover:bg-rose-700 shadow-sm transition-all"
        >
          <MessageSquare size={16} />
          Ask the Assistant
        </button>
      </div>
    </section>
  );
};
