import type { FC } from 'react';
import { Trash2, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { ScoreBadge } from './ScoreBadge';

interface SubjectCardProps {
  name: string;
  sessionCount: number;
  lastScreened: string | null;
  latestScore: number | null;
  alertCount: number;
  onSelect: () => void;
  onDelete: () => void;
  delay?: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const SubjectCard: FC<SubjectCardProps> = ({
  name,
  sessionCount,
  lastScreened,
  latestScore,
  alertCount,
  onSelect,
  onDelete,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/60 p-6 cursor-pointer hover:shadow-xl hover:border-slate-200 transition-all duration-200 relative group"
      onClick={onSelect}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete all data for "${name}"? This cannot be undone.`)) {
            onDelete();
          }
        }}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
      >
        <Trash2 size={14} />
      </button>

      {/* Subject name */}
      <h3 className="font-bold text-slate-800 text-lg mb-3 pr-8">{name}</h3>

      {/* Meta info */}
      <div className="space-y-1.5 mb-4">
        <p className="text-xs text-slate-400">
          {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
        </p>
        <p className="text-xs text-slate-400">
          Last: {formatDate(lastScreened)}
        </p>
      </div>

      {/* Score + alerts row */}
      <div className="flex items-center justify-between">
        <ScoreBadge score={latestScore} />
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <AlertTriangle size={12} />
              {alertCount}
            </span>
          )}
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </div>
    </motion.div>
  );
};
