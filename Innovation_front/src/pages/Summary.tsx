import {useState, type FC} from 'react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Stethoscope,
  History,
  Calendar,
  Download,
  UserPlus,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { ScreeningResult } from '../types';

interface SummaryProps {
  results: ScreeningResult | null;
  onBackToHistory: () => void;
}

function getScoreStyle(score: number | null) {
  if (score === null) {
    return {
      label: 'Unavailable',
      bg: '#F8FAFC',
      border: 'slate-100',
      barBg: '#E2E8F0',
      barFill: '#94A3B8',
      textDark: '#334155',
      textMuted: '#64748B',
      icon: AlertCircle,
      iconColor: '#94A3B8',
      pct: 0,
    };
  }
  // Invert: low score = good (normal range), high = concerning
  const pct = Math.round(score * 100);
  if (score < 0.3) {
    return {
      label: 'Normal Range',
      bg: '#EFFFF6',
      border: 'emerald-100',
      barBg: '#D1FAE5',
      barFill: '#10B981',
      textDark: '#064E3B',
      textMuted: '#065F46',
      icon: CheckCircle2,
      iconColor: '#10B981',
      pct,
    };
  }
  if (score < 0.7) {
    return {
      label: 'Mild Variance',
      bg: '#FFFBEB',
      border: 'amber-100',
      barBg: '#FEF3C7',
      barFill: '#F59E0B',
      textDark: '#78350F',
      textMuted: '#92400E',
      icon: AlertTriangle,
      iconColor: '#F59E0B',
      pct,
    };
  }
  return {
    label: 'Elevated Risk',
    bg: '#FEF2F2',
    border: 'red-100',
    barBg: '#FECACA',
    barFill: '#EF4444',
    textDark: '#7F1D1D',
    textMuted: '#991B1B',
    icon: AlertCircle,
    iconColor: '#EF4444',
    pct,
  };
}

function extractSummaryParagraph(report: string | null): string {
  if (!report) return 'No report available. Please run the screening first.';
  const blocks = report.split('\n\n');
  for (const block of blocks) {
    const content = block
      .split('\n')
      .filter((ln) => ln.trim() && !ln.trim().startsWith('#'))
      .join('\n');
    if (content.length >= 50) return content;
  }
  return report.slice(0, 500);
}

export const Summary: FC<SummaryProps> = ({ results, onBackToHistory }) => {
  if (!results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-slate-500 text-lg">No screening results yet. Please upload and analyse a recording first.</p>
      </div>
    );
  }

  const acoustic = getScoreStyle(results.acoustic_result);
  const semantic = getScoreStyle(results.semantic_result);
  const summaryText = extractSummaryParagraph(results.report);

  return (
    <div className="flex-1 flex flex-col items-center p-8 max-w-5xl mx-auto w-full">
      <Card className="p-12 mb-8 border-none shadow-xl shadow-slate-200/50">
        <div className="space-y-10">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Initial Findings</h1>
            <p className="text-slate-500 font-medium">Your preliminary screening results based on AI analysis of speech and cognitive tasks.</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Cognitive Stability (Acoustic) */}
            <div
              className="rounded-[32px] p-8 space-y-4"
              style={{ backgroundColor: acoustic.bg, border: `1px solid ${acoustic.barBg}` }}
            >
              <div className="flex justify-between items-center">
                <span style={{ color: acoustic.textMuted }} className="font-bold text-sm">Cognitive Stability</span>
                <acoustic.icon style={{ color: acoustic.iconColor }} size={20} />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black tracking-tight" style={{ color: acoustic.textDark }}>
                  {acoustic.label}
                </h3>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: acoustic.barBg }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${acoustic.pct}%`, backgroundColor: acoustic.barFill }}
                  />
                </div>
              </div>
              <p style={{ color: `${acoustic.textMuted}cc` }} className="text-sm font-medium leading-relaxed">
                Based on vocal patterns including rhythm, pitch variability, and vocal quality.
              </p>
            </div>

            {/* Speech Fluency (Semantic) */}
            <div
              className="rounded-[32px] p-8 space-y-4"
              style={{ backgroundColor: semantic.bg, border: `1px solid ${semantic.barBg}` }}
            >
              <div className="flex justify-between items-center">
                <span style={{ color: semantic.textMuted }} className="font-bold text-sm">Speech Fluency</span>
                <semantic.icon style={{ color: semantic.iconColor }} size={20} />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black tracking-tight" style={{ color: semantic.textDark }}>
                  {semantic.label}
                </h3>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: semantic.barBg }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${semantic.pct}%`, backgroundColor: semantic.barFill }}
                  />
                </div>
              </div>
              <p style={{ color: `${semantic.textMuted}cc` }} className="text-sm font-medium leading-relaxed">
                Based on language patterns including word choice, coherence, and fluency.
              </p>
            </div>
          </div>

          {/* Summary Analysis Box */}
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-[32px] p-8 flex gap-5">
            <div className="shrink-0 pt-1">
              <Info className="text-[#3B82F6]" size={22} />
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-lg">Summary Analysis</h4>
              <p className="text-slate-600 text-[15px] leading-relaxed font-medium">
                {summaryText}
              </p>
            </div>
          </div>

          {/* Full Screening Report (collapsible) */}
          {results.report && <FullReportSection report={results.report} />}

          {/* Main Actions */}
          <div className="flex gap-4">
            <button className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-5 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
              <Stethoscope size={22} />
              <span>Talk to a Professional</span>
            </button>
            <button
              onClick={onBackToHistory}
              className="flex-1 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 font-bold py-5 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              <History size={22} />
              <span>View Full History</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Next Steps Section */}
      <div className="w-full space-y-8">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Next Steps</h3>
        <div className="grid grid-cols-3 gap-6">
          <NextStepCard
            icon={Calendar}
            title="Schedule Retest"
            desc="In 3 months for tracking"
          />
          <NextStepCard
            icon={Download}
            title="Download PDF"
            desc="Share with your doctor"
          />
          <NextStepCard
            icon={UserPlus}
            title="Caregiver Access"
            desc="Grant viewing permissions"
          />
        </div>
      </div>
    </div>
  );
};

function FullReportSection({ report }: { report: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="text-[#3B82F6]" size={22} />
          <h4 className="font-bold text-slate-800 text-lg">Full Screening Report</h4>
        </div>
        {expanded ? (
          <ChevronUp className="text-slate-400" size={20} />
        ) : (
          <ChevronDown className="text-slate-400" size={20} />
        )}
      </button>
      {expanded && (
        <div className="px-8 pb-8 prose prose-slate prose-sm max-w-none">
          <Markdown>{report}</Markdown>
        </div>
      )}
    </div>
  );
}

function NextStepCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-8 flex flex-col gap-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group">
      <div className="w-12 h-12 bg-[#F1F5F9] rounded-2xl flex items-center justify-center text-[#3B82F6] group-hover:bg-[#3B82F6] group-hover:text-white transition-all duration-300">
        <Icon size={24} />
      </div>
      <div className="space-y-1">
        <h4 className="font-extrabold text-slate-900 text-lg tracking-tight">{title}</h4>
        <p className="text-slate-400 font-medium text-sm">{desc}</p>
      </div>
    </div>
  );
}
