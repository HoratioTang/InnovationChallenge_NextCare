import { useState, type FC } from 'react';
import { motion } from 'motion/react';
import type { CareActivity } from '../../types';

interface ActivityCardProps {
  activity: CareActivity;
}

export const ActivityCard: FC<ActivityCardProps> = ({ activity }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setExpanded((v) => !v)}
      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer"
    >
      <h4 className="font-semibold text-slate-800 text-sm mb-1">{activity.name}</h4>
      <p
        className={`text-xs text-slate-500 mb-3 ${expanded ? '' : 'line-clamp-2'}`}
      >
        {activity.description}
      </p>
      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700">
          {activity.duration}
        </span>
        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600">
          {activity.frequency}
        </span>
        <span
          className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
            activity.difficulty === 'easy'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {activity.difficulty}
        </span>
      </div>
    </motion.div>
  );
};
