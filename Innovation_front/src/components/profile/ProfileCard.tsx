import type { FC } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export type ProfileStatusColor = 'slate' | 'green' | 'orange' | 'red';

export interface ProfileStatus {
  label: string;
  color: ProfileStatusColor;
}

interface ProfileCardProps {
  name: string;
  sessionCount: number;
  lastScreened: string | null;
  status: ProfileStatus;
  onSelect: () => void;
  delay?: number;
}

const STATUS_STYLES: Record<ProfileStatusColor, string> = {
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  orange: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const ProfileCard: FC<ProfileCardProps> = ({
  name,
  sessionCount,
  lastScreened,
  status,
  onSelect,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/60 p-6 cursor-pointer hover:shadow-xl hover:border-slate-200 transition-all duration-200 group"
      onClick={onSelect}
    >
      {/* Header: avatar + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center text-rose-600 text-lg font-semibold">
          {name.charAt(0).toUpperCase()}
        </div>
        <h3 className="font-bold text-slate-800 text-lg flex-1 truncate">{name}</h3>
      </div>

      {/* Status pill */}
      <div className="mb-4">
        <span
          className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[status.color]}`}
        >
          {status.label}
        </span>
      </div>

      {/* Meta */}
      <div className="space-y-1 mb-4">
        <p className="text-xs text-slate-400">
          {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
        </p>
        <p className="text-xs text-slate-400">Last: {formatDate(lastScreened)}</p>
      </div>

      {/* CTA row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-sm font-medium text-slate-600 group-hover:text-rose-600 transition-colors">
          {sessionCount === 0 ? 'Run more screenings' : 'View Care Plan'}
        </span>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-400 transition-colors" />
      </div>
    </motion.div>
  );
};
