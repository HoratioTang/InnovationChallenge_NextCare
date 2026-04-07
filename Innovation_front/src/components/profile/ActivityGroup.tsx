import type { FC } from 'react';
import { motion } from 'motion/react';
import { Brain, MessageCircle, Mic, BookOpen, Type, Sparkles, Languages } from 'lucide-react';
import type { CareGroup } from '../../types';
import { ActivityCard } from './ActivityCard';

interface ActivityGroupProps {
  group: CareGroup;
  priority: boolean;
  delay?: number;
}

// Map feature group → icon. Keys must match config.FEATURE_GROUPS.
const GROUP_ICONS: Record<string, FC<{ size?: number; className?: string }>> = {
  diversity: Brain,
  coherence: MessageCircle,
  filler: Mic,
  syntactic: Type,
  lexical: BookOpen,
  utterance: Sparkles,
  frequency: Languages,
};

export const ActivityGroup: FC<ActivityGroupProps> = ({ group, priority, delay = 0 }) => {
  const Icon = GROUP_ICONS[group.group] ?? Brain;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl border p-5 ${
        priority
          ? 'bg-gradient-to-br from-rose-50/60 to-white border-rose-200 shadow-sm'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            priority ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-base">{group.domain}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
          {priority && group.reason && (
            <p className="text-xs font-medium text-rose-700 mt-2">
              Recommended: {group.reason.toLowerCase()}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {group.activities.map((act) => (
          <ActivityCard key={act.name} activity={act} />
        ))}
      </div>
    </motion.div>
  );
};
