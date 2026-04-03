import type { FC } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { motion } from 'motion/react';
import type { SessionSummary } from '../../types';

interface ScoreTimelineProps {
  history: SessionSummary[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const ScoreTimeline: FC<ScoreTimelineProps> = ({ history }) => {
  const data = history.map((s) => ({
    date: formatDate(s.created_at),
    fused: s.fused_score,
    acoustic: s.acoustic_score,
    semantic: s.semantic_score,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/60 p-6"
    >
      <h3 className="font-bold text-slate-800 mb-4">Score Timeline</h3>

      {history.length < 2 ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400">
          {history.length === 0
            ? 'No sessions recorded yet.'
            : 'More sessions needed to show trends.'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            {/* Risk zone backgrounds */}
            <ReferenceArea y1={0.7} y2={1.0} fill="#fee2e2" fillOpacity={0.3} />
            <ReferenceArea y1={0.3} y2={0.7} fill="#fef3c7" fillOpacity={0.3} />
            <ReferenceArea y1={0.0} y2={0.3} fill="#dcfce7" fillOpacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="fused"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6' }}
              name="Fused Score"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="acoustic"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#94a3b8' }}
              name="Acoustic"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="semantic"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={{ r: 3, fill: '#94a3b8' }}
              name="Semantic"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};
