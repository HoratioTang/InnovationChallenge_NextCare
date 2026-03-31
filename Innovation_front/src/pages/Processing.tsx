import { useState, useEffect, useRef, type FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Hourglass,
  Activity,
  BarChart3,
  CheckCircle2,
  Circle,
  MicOff,
  Loader2,
  Download,
  ExternalLink,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { runScreening, exportPdf } from '../services/api';
import type { ScreeningResult } from '../types';

interface ProcessingProps {
  audioFile: File | null;
  results: ScreeningResult | null;
  setResults: (r: ScreeningResult) => void;
  onComplete: () => void;
  onCancel: () => void;
  onShowSummary: () => void;
}

function scoreLabel(score: number | null): string {
  if (score === null) return '—';
  const pct = Math.round(score * 100);
  return `${pct}/100`;
}

function riskLevel(score: number | null): { text: string; color: string } {
  if (score === null) return { text: '—', color: 'text-slate-400' };
  if (score < 0.3) return { text: 'Low Risk', color: 'text-emerald-600' };
  if (score < 0.7) return { text: 'Moderate', color: 'text-amber-600' };
  return { text: 'Elevated', color: 'text-red-600' };
}

export const Processing: FC<ProcessingProps> = ({
  audioFile,
  results,
  setResults,
  onComplete,
  onCancel,
  onShowSummary,
}) => {
  const handleDownload = async () => {
    if (!results) return;
    try {
      const blob = await exportPdf(results);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nextcare-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    }
  };

  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(1);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiCalled = useRef(false);

  // Fake progress bar — caps at 95% until API responds
  useEffect(() => {
    if (isDone || error) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }

        const next = prev + 1;
        if (next < 33) setStage(1);
        else if (next < 66) setStage(2);
        else setStage(3);

        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isDone, error]);

  // Call backend API
  useEffect(() => {
    if (!audioFile || apiCalled.current) return;
    apiCalled.current = true;

    runScreening(audioFile)
      .then((data) => {
        setResults(data);
        setProgress(100);
        setStage(3);
        setIsDone(true);
      })
      .catch((err) => {
        setError(err.message || 'Screening failed');
      });
  }, [audioFile, setResults]);

  const stages = [
    { id: 1, name: 'Starting Analysis', icon: Hourglass, desc: 'Initializing neural engine and preparing data for processing.' },
    { id: 2, name: 'Acoustic Analysis', icon: Activity, desc: 'Analyzing vocal patterns, pitch variance, and speech rhythm.' },
    { id: 3, name: 'Linguistic Analysis', icon: BarChart3, desc: 'Processing linguistic markers and semantic complexity.' }
  ];

  const currentStage = stages[stage - 1];
  const fusionRisk = riskLevel(results?.fusion_result ?? null);

  return (
    <div className="flex-1 flex flex-col items-center p-8 max-w-5xl mx-auto w-full">
      <div className="w-full space-y-6">
        {/* Main Analysis Card */}
        <Card className="p-12">
          <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 ${
              error ? 'bg-red-50' : isDone ? 'bg-emerald-50' : 'bg-blue-50'
            }`}>
              {error ? (
                <AlertCircle className="text-red-500" size={32} />
              ) : isDone ? (
                <CheckCircle2 className="text-emerald-500" size={32} />
              ) : (
                <currentStage.icon className="text-blue-600 animate-pulse" size={32} />
              )}
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {error ? 'Analysis Failed' : isDone ? 'Analysis Complete' : `Stage ${stage}: ${currentStage.name}`}
            </h2>
            <p className="text-slate-500 text-sm max-w-md mb-10">
              {error
                ? error
                : isDone
                  ? 'Your comprehensive cognitive assessment report is ready for review.'
                  : currentStage.desc}
            </p>

            {/* Progress Bar Container */}
            {!error && (
              <div className="w-full max-w-md space-y-4">
                <div className="flex justify-between items-end mb-1">
                  <span className={`text-xs font-bold ${isDone ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isDone ? 'Process finished' : 'Analysis in progress...'}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{progress}%</span>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${isDone ? 'bg-emerald-500' : 'bg-blue-600'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Stage Indicators */}
                <div className="flex justify-between pt-4">
                  {stages.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      {progress > (s.id * 33) || isDone ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : stage === s.id ? (
                        <Loader2 size={14} className="text-blue-600 animate-spin" />
                      ) : (
                        <Circle size={14} className="text-slate-300" />
                      )}
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        progress > (s.id * 33) || isDone ? 'text-slate-800' : stage === s.id ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                        {s.id === 1 ? 'Starting' : s.id === 2 ? 'Acoustics' : 'Linguistics'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons when done or error */}
            <AnimatePresence>
              {(isDone || error) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 w-full max-w-sm flex flex-col gap-3"
                >
                  {isDone && (
                    <>
                      <Button
                        variant="primary"
                        fullWidth
                        icon={<ArrowRight size={20} />}
                        className="flex-row-reverse"
                        onClick={onShowSummary}
                      >
                        View Summary
                      </Button>
                      <div className="flex gap-3">
                        <Button variant="secondary" fullWidth icon={<Download size={18} />} onClick={handleDownload}>
                          Download
                        </Button>
                        <Button variant="secondary" fullWidth icon={<ExternalLink size={18} />} onClick={onComplete}>
                          Dashboard
                        </Button>
                      </div>
                    </>
                  )}
                  {error && (
                    <Button variant="secondary" fullWidth onClick={onCancel}>
                      Back to Recording
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Status Card - Hide when done */}
        {!isDone && !error && (
          <motion.div
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MicOff className="text-slate-400" size={24} />
            </div>
            <p className="text-slate-400 font-medium mb-6">Recording Disabled During Processing</p>
            <Button variant="secondary" onClick={onCancel}>
              Cancel Analysis
            </Button>
          </motion.div>
        )}

        {/* Preliminary Results Skeleton / Real Results */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">
            {isDone ? 'Analysis Results' : 'Preliminary Results'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Combined Score</div>
              {isDone && results ? (
                <div className="text-3xl font-bold text-blue-600">
                  {scoreLabel(results.fusion_result)}
                </div>
              ) : (
                <div className="h-8 w-2/3 bg-slate-50 rounded animate-pulse" />
              )}
              <div className="text-xs text-slate-500">Weighted fusion of acoustic and semantic</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Level</div>
              {isDone && results ? (
                <div className={`text-3xl font-bold ${fusionRisk.color}`}>
                  {fusionRisk.text}
                </div>
              ) : (
                <div className="h-8 w-2/3 bg-slate-50 rounded animate-pulse" />
              )}
              <div className="text-xs text-slate-500">Based on combined screening score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
