import type { FC } from 'react';
import { ArrowUp, ArrowDown, CheckCircle2, Info } from 'lucide-react';
import { motion } from 'motion/react';
import type { ChangeFlag } from '../../types';

interface ChangeAlertsProps {
  flags: ChangeFlag[];
  sessionCount: number;
}

export const ChangeAlerts: FC<ChangeAlertsProps> = ({ flags, sessionCount }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/60 p-6 h-full"
    >
      <h3 className="font-bold text-slate-800 mb-4">Change Alerts</h3>

      {sessionCount < 3 ? (
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-600 leading-relaxed">
            At least 3 sessions are needed for change detection. Currently {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'} recorded.
          </p>
        </div>
      ) : flags.length === 0 ? (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl">
          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-600 leading-relaxed">
            No significant changes detected from baseline.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {flags.map((flag, i) => {
            const isSignificant = flag.concern_level === 'significant';
            const borderColor = isSignificant ? 'border-red-200' : 'border-amber-200';
            const bgColor = isSignificant ? 'bg-red-50' : 'bg-amber-50';
            const badgeColor = isSignificant
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700';

            return (
              <div
                key={`${flag.feature}-${i}`}
                className={`p-3 rounded-xl border ${borderColor} ${bgColor}`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
                    {flag.concern_level}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    z = {flag.z_score.toFixed(1)}
                  </span>
                </div>

                {/* Feature name + direction */}
                <div className="flex items-center gap-1.5 mb-1">
                  {flag.direction === 'increasing' ? (
                    <ArrowUp size={12} className="text-red-500" />
                  ) : (
                    <ArrowDown size={12} className="text-red-500" />
                  )}
                  <span className="text-xs font-semibold text-slate-700">
                    {flag.feature}
                  </span>
                  <span className="text-[10px] text-slate-400">({flag.group})</span>
                </div>

                {/* Description + values */}
                <p className="text-xs text-slate-500 mb-1">{flag.description}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {flag.baseline_mean.toFixed(4)} → {flag.current_value.toFixed(4)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
