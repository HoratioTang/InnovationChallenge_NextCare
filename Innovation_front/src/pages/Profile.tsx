import { useState, useEffect, useCallback, type FC } from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { ProfileCard, type ProfileStatus } from '../components/profile/ProfileCard';
import { fetchSubjects, fetchChangeSummary } from '../services/api';
import type { SubjectSummary, ChangeFlag } from '../types';

interface ProfileProps {
  onSelectProfile: (subjectId: string) => void;
}

interface EnrichedProfile extends SubjectSummary {
  status: ProfileStatus;
}

const MIN_SESSIONS = 3;

function getProfileStatus(sessionCount: number, flags: ChangeFlag[]): ProfileStatus {
  if (sessionCount < MIN_SESSIONS) {
    return { label: 'New — more screenings needed', color: 'slate' };
  }
  if (flags.length === 0) {
    return { label: 'Stable', color: 'green' };
  }
  if (flags.some((f) => f.concern_level === 'significant')) {
    return { label: 'Review recommended', color: 'red' };
  }
  return { label: 'Some changes noticed', color: 'orange' };
}

export const Profile: FC<ProfileProps> = ({ onSelectProfile }) => {
  const [profiles, setProfiles] = useState<EnrichedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchSubjects();
      const enriched = await Promise.all(
        list.map(async (s) => {
          let flags: ChangeFlag[] = [];
          try {
            const changes = await fetchChangeSummary(s.subject_id);
            flags = changes.flags;
          } catch {
            // Non-critical — show card with default status
          }
          return { ...s, status: getProfileStatus(s.session_count, flags) };
        }),
      );
      setProfiles(enriched);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Profile</h1>
        <p className="text-slate-500">
          Personalized care suggestions based on screening results.
        </p>
      </motion.div>

      {profiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <Heart size={28} className="text-rose-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">No profiles yet</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            Run your first screening from the Screening tab to start tracking results.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((p, i) => (
            <ProfileCard
              key={p.subject_id}
              name={p.name}
              sessionCount={p.session_count}
              lastScreened={p.last_screened}
              status={p.status}
              onSelect={() => onSelectProfile(p.subject_id)}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
};
