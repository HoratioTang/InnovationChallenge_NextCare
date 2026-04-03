import type { FC } from 'react';

interface ScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
}

function getRiskStyle(score: number | null) {
  if (score === null) return { color: 'bg-slate-300', text: 'text-slate-400', label: '—' };
  if (score < 0.3) return { color: 'bg-emerald-500', text: 'text-emerald-600', label: 'Low' };
  if (score < 0.7) return { color: 'bg-amber-500', text: 'text-amber-600', label: 'Moderate' };
  return { color: 'bg-red-500', text: 'text-red-600', label: 'Elevated' };
}

export const ScoreBadge: FC<ScoreBadgeProps> = ({ score, size = 'md' }) => {
  const style = getRiskStyle(score);
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${dotSize} rounded-full ${style.color}`} />
      <span className={`${textSize} font-semibold ${style.text}`}>
        {score !== null ? score.toFixed(2) : '—'}
      </span>
    </span>
  );
};

export { getRiskStyle };
