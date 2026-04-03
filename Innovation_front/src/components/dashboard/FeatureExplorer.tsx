import { useState, useEffect, type FC } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { motion } from 'motion/react';
import { fetchFeatureTrends } from '../../services/api';
import type { BaselineStats } from '../../types';

interface FeatureExplorerProps {
  subjectId: string;
  baselines: Record<string, BaselineStats>;
}

const FEATURE_GROUPS: Record<string, { label: string; features: string[] }> = {
  diversity: {
    label: 'Lexical Diversity',
    features: ['mattr', 'mtld', 'n_unique_words', 'ttr_raw'],
  },
  filler: {
    label: 'Fillers & Pauses',
    features: ['filler_um_rate', 'filler_uh_rate', 'filler_total_rate', 'discourse_filler_rate', 'empty_speech_rate'],
  },
  coherence: {
    label: 'Coherence',
    features: ['semantic_coherence_mean', 'semantic_coherence_std', 'topic_drift', 'repetitiveness_score'],
  },
  syntactic: {
    label: 'Syntactic',
    features: ['mean_dependency_distance', 'idea_density_proxy'],
  },
  utterance: {
    label: 'Utterance',
    features: ['mlu', 'sentence_count', 'total_word_count'],
  },
  lexical: {
    label: 'Lexical Ratios',
    features: ['pronoun_to_noun_ratio', 'content_word_density'],
  },
  frequency: {
    label: 'Word Frequency',
    features: ['mean_word_frequency', 'low_freq_word_ratio', 'high_freq_word_ratio'],
  },
};

const LINE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const FeatureExplorer: FC<FeatureExplorerProps> = ({ subjectId, baselines }) => {
  const [selectedGroup, setSelectedGroup] = useState('diversity');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);

  const group = FEATURE_GROUPS[selectedGroup];

  // Reset feature selection when group changes
  useEffect(() => {
    setSelectedFeatures(group.features.slice(0, 2));
  }, [selectedGroup]);

  // Fetch trend data when features change
  useEffect(() => {
    if (selectedFeatures.length === 0) {
      setChartData([]);
      return;
    }

    let cancelled = false;
    fetchFeatureTrends(subjectId, selectedFeatures)
      .then((data) => {
        if (cancelled) return;
        // Pivot: group by created_at, one column per feature
        const byDate = new Map<string, Record<string, unknown>>();
        for (const point of data) {
          const key = point.created_at;
          if (!byDate.has(key)) {
            byDate.set(key, { date: formatDate(key) });
          }
          if (point.feature_value !== null) {
            byDate.get(key)![point.feature_name] = point.feature_value;
          }
        }
        setChartData(Array.from(byDate.values()));
      })
      .catch(() => setChartData([]));

    return () => { cancelled = true; };
  }, [subjectId, selectedFeatures]);

  const toggleFeature = (f: string) => {
    setSelectedFeatures((prev) => {
      if (prev.includes(f)) return prev.filter((x) => x !== f);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, f];
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/60 p-6 h-full"
    >
      <h3 className="font-bold text-slate-800 mb-4">Feature Explorer</h3>

      {/* Group selector */}
      <select
        value={selectedGroup}
        onChange={(e) => setSelectedGroup(e.target.value)}
        className="w-full mb-3 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Object.entries(FEATURE_GROUPS).map(([key, g]) => (
          <option key={key} value={key}>{g.label}</option>
        ))}
      </select>

      {/* Feature toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {group.features.map((f) => (
          <button
            key={f}
            onClick={() => toggleFeature(f)}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
              selectedFeatures.includes(f)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-xs text-slate-400">
          Select features to view trends.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '11px',
              }}
            />
            {selectedFeatures.map((f, i) => (
              <Line
                key={f}
                type="monotone"
                dataKey={f}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={f}
                connectNulls
              />
            ))}
            {/* Baseline reference lines */}
            {selectedFeatures.map((f, i) => {
              const b = baselines[f];
              if (!b) return null;
              return (
                <ReferenceLine
                  key={`baseline-${f}`}
                  y={b.mean}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeDasharray="6 4"
                  strokeOpacity={0.5}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};
