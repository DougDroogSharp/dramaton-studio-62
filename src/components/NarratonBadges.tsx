import { NarratonAct } from '@/types';
import { NarratonCandidate } from '@/utils/narraton';

// Small shared pieces for the Narraton page and its test mode.

export const ACTS: NarratonAct[] = ['BEGINNING', 'MIDDLE', 'END'];

export const ACT_STYLES: Record<NarratonAct, string> = {
  BEGINNING: 'border-diesel-green text-diesel-green',
  MIDDLE: 'border-diesel-gold text-diesel-gold',
  END: 'border-diesel-rust text-diesel-rust',
};

export const ActBadge = ({ act }: { act?: NarratonAct }) => {
  if (!act) return null;
  return (
    <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${ACT_STYLES[act]}`}>
      {act}
    </span>
  );
};

// A candidate's first exclusion reason, as a short badge.
export const reasonLabel = (c: NarratonCandidate): string => {
  const r = c.exclusionReasons[0] ?? '';
  if (r.startsWith('already played')) return 'PLAYED';
  if (r.startsWith('requires')) return 'GATED';
  if (r.startsWith('subplot')) return 'SUBPLOT';
  if (r.startsWith('act')) return 'ACT';
  return 'OUT';
};
