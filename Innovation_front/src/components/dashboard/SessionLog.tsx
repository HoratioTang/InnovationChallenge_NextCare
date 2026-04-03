import { useState, type FC } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ScoreBadge } from './ScoreBadge';
import { fetchSession } from '../../services/api';
import type { SessionSummary, SessionDetail } from '../../types';

interface SessionLogProps {
  subjectId: string;
  history: SessionSummary[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FEATURE_DISPLAY_GROUPS: Record<string, string[]> = {
  'Lexical': ['pronoun_to_noun_ratio', 'content_word_density', 'noun_ratio', 'verb_ratio', 'pronoun_ratio', 'adjective_ratio'],
  'Diversity': ['mattr', 'mtld', 'n_unique_words', 'ttr_raw'],
  'Frequency': ['mean_word_frequency', 'low_freq_word_ratio', 'high_freq_word_ratio'],
  'Utterance': ['mlu', 'sentence_count', 'sentence_length_std', 'total_word_count'],
  'Fillers': ['filler_um_rate', 'filler_uh_rate', 'filler_total_rate', 'um_to_uh_ratio', 'discourse_filler_rate', 'empty_speech_rate'],
  'Syntactic': ['mean_dependency_distance', 'max_dependency_distance', 'idea_density_proxy'],
  'Coherence': ['semantic_coherence_mean', 'semantic_coherence_std', 'semantic_coherence_min', 'repetitiveness_score', 'topic_drift'],
};

export const SessionLog: FC<SessionLogProps> = ({ subjectId, history }) => {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Newest first
  const sorted = [...history].reverse();
  const visible = showAll ? sorted : sorted.slice(0, 5);

  const handleExpand = async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(sessionId);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const d = await fetchSession(subjectId, sessionId);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/60 p-6"
    >
      <h3 className="font-bold text-slate-800 mb-4">Session Log</h3>

      {history.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No sessions recorded.</p>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_2rem] gap-2 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <span>#</span>
            <span>Date</span>
            <span className="text-right">Fused</span>
            <span className="text-right">Acoustic</span>
            <span className="text-right">Semantic</span>
            <span />
          </div>

          {/* Rows */}
          {visible.map((s, i) => {
            const rowNum = history.length - i;
            const isExpanded = expandedId === s.session_id;

            return (
              <div key={s.session_id}>
                <button
                  onClick={() => handleExpand(s.session_id)}
                  className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_2rem] gap-2 px-3 py-3 w-full text-left hover:bg-slate-50 transition-colors rounded-lg items-center"
                >
                  <span className="text-xs text-slate-400 font-mono">{rowNum}</span>
                  <span className="text-xs text-slate-600">{formatDate(s.created_at)}</span>
                  <span className="text-right"><ScoreBadge score={s.fused_score} size="sm" /></span>
                  <span className="text-right text-xs text-slate-500 font-mono">
                    {s.acoustic_score?.toFixed(2) ?? '—'}
                  </span>
                  <span className="text-right text-xs text-slate-500 font-mono">
                    {s.semantic_score?.toFixed(2) ?? '—'}
                  </span>
                  <span className="text-slate-300">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-4 ml-8 border-l-2 border-blue-200 space-y-4">
                        {loadingDetail ? (
                          <p className="text-xs text-slate-400">Loading session details...</p>
                        ) : detail ? (
                          <>
                            {/* Report */}
                            {detail.report_markdown && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Report</h4>
                                <div className="prose prose-sm prose-slate max-w-none text-xs leading-relaxed">
                                  <ReactMarkdown>{detail.report_markdown}</ReactMarkdown>
                                </div>
                              </div>
                            )}

                            {/* Transcript */}
                            {detail.transcript && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Transcript</h4>
                                <p className="text-xs text-slate-500 whitespace-pre-wrap bg-slate-50 rounded-xl p-3">{detail.transcript}</p>
                              </div>
                            )}

                            {/* MERaLiON insights */}
                            {(detail.meralion_acoustic_analysis || detail.meralion_cognitive_insights) && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Analysis Notes</h4>
                                {detail.meralion_acoustic_analysis && (
                                  <p className="text-xs text-slate-500 mb-1"><strong>Acoustic:</strong> {detail.meralion_acoustic_analysis}</p>
                                )}
                                {detail.meralion_cognitive_insights && (
                                  <p className="text-xs text-slate-500"><strong>Cognitive:</strong> {detail.meralion_cognitive_insights}</p>
                                )}
                              </div>
                            )}

                            {/* Linguistic features */}
                            {detail.linguistic_features && Object.keys(detail.linguistic_features).length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Linguistic Features</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Object.entries(FEATURE_DISPLAY_GROUPS).map(([groupName, featureNames]) => {
                                    const groupFeatures = featureNames.filter(
                                      (f) => detail.linguistic_features[f] !== undefined
                                    );
                                    if (groupFeatures.length === 0) return null;
                                    return (
                                      <div key={groupName} className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{groupName}</p>
                                        {groupFeatures.map((f) => (
                                          <div key={f} className="flex justify-between text-[10px] py-0.5">
                                            <span className="text-slate-500">{f}</span>
                                            <span className="text-slate-700 font-mono">
                                              {detail.linguistic_features[f] !== null
                                                ? Number(detail.linguistic_features[f]).toFixed(4)
                                                : '—'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-400">Failed to load session details.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Show all toggle */}
          {sorted.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors w-full text-center py-2"
            >
              {showAll ? 'Show less' : `Show all ${sorted.length} sessions`}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
};
