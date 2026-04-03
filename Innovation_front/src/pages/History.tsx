import { useState, useEffect, useCallback, type FC } from 'react';
import { ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { SubjectCard } from '../components/dashboard/SubjectCard';
import { fetchSubjects, fetchHistory, fetchChangeSummary, deleteSubject } from '../services/api';
import type { SubjectSummary } from '../types';

interface HistoryProps {
  onSelectSubject: (subjectId: string) => void;
}

interface EnrichedSubject extends SubjectSummary {
  latestScore: number | null;
  alertCount: number;
}

export const History: FC<HistoryProps> = ({ onSelectSubject }) => {
  const [subjects, setSubjects] = useState<EnrichedSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchSubjects();

      // Enrich each subject with latest score and alert count
      const enriched = await Promise.all(
        list.map(async (s) => {
          let latestScore: number | null = null;
          let alertCount = 0;
          try {
            const [history, changes] = await Promise.all([
              fetchHistory(s.subject_id),
              fetchChangeSummary(s.subject_id),
            ]);
            if (history.length > 0) {
              latestScore = history[history.length - 1].fused_score;
            }
            alertCount = changes.flags.length;
          } catch {
            // Non-critical — show card without enrichment
          }
          return { ...s, latestScore, alertCount };
        }),
      );

      setSubjects(enriched);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleDelete = async (subjectId: string) => {
    try {
      await deleteSubject(subjectId);
      setSubjects((prev) => prev.filter((s) => s.subject_id !== subjectId));
    } catch {
      // Silently fail — card stays
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 max-w-6xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">History</h1>
        <p className="text-slate-500">
          Review screening results and track changes over time.
        </p>
      </motion.div>

      {subjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">No screening history yet</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            Run your first screening from the Screening tab to start tracking results.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((s, i) => (
            <SubjectCard
              key={s.subject_id}
              name={s.name}
              sessionCount={s.session_count}
              lastScreened={s.last_screened}
              latestScore={s.latestScore}
              alertCount={s.alertCount}
              onSelect={() => onSelectSubject(s.subject_id)}
              onDelete={() => handleDelete(s.subject_id)}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
};
