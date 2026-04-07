import type { FC } from 'react';
import type { CareGroup } from '../../types';
import { ActivityGroup } from './ActivityGroup';

interface ActivitySectionProps {
  title: string;
  subtitle: string;
  groups: CareGroup[];
  priority: boolean;
}

export const ActivitySection: FC<ActivitySectionProps> = ({
  title,
  subtitle,
  groups,
  priority,
}) => {
  if (groups.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2
          className={`text-xs font-bold tracking-wider uppercase ${
            priority ? 'text-rose-600' : 'text-slate-500'
          }`}
        >
          {title}
        </h2>
        <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {groups.map((g, i) => (
          <ActivityGroup key={g.group} group={g} priority={priority} delay={i * 0.05} />
        ))}
      </div>
    </section>
  );
};
