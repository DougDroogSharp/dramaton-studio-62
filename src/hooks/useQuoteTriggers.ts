import { useEffect, useRef, useState, useCallback } from 'react';
import { GameData, Quote, QuoteTrigger } from '@/types';

// Quote pop-up trigger engine (Design Addendum 01 §6): watches
// worldState for threshold crossings, fires a themed quote card.
// Rules: SHORT quotes only during live play; >=30s cooldown; no
// repeats within a session; VILLAIN quotes weighted higher.

const COOLDOWN_MS = 30_000;
const AUTO_DISMISS_MS = 16_000;

// Default trigger map (Addendum themes -> variable crossings); a game
// can override/extend with game.quoteTriggers.
const DEFAULT_TRIGGERS: QuoteTrigger[] = [
  { theme: 'WAGES', variable: 'squeeze', threshold: 70, direction: 'rising' },
  { theme: 'WAGES', variable: 'wages', threshold: 12, direction: 'falling' },
  { theme: 'RENT/LAND', variable: 'rent', threshold: 25, direction: 'rising' },
  { theme: 'WEALTH-CONCENTRATION', variable: 'hoard', threshold: 300, direction: 'rising' },
  { theme: 'RESISTANCE/HOPE', variable: 'education', threshold: 60, direction: 'rising' },
  { theme: 'GOVERNMENT-CAPTURE', variable: 'spine', threshold: 30, direction: 'falling' },
  { theme: 'GOVERNMENT-CAPTURE', variable: 'regulation', threshold: 15, direction: 'falling' },
  { theme: 'MILITARY/FORCE', variable: 'aim', threshold: 60, direction: 'rising' },
  { theme: 'MILITARY/FORCE', variable: 'repression', threshold: 75, direction: 'rising' },
  { theme: 'CRISIS', variable: 'crisis', threshold: 0.5, direction: 'rising' },
  { theme: 'SLAVERY/COERCION', variable: 'shared', threshold: 5, direction: 'falling' },
  { theme: 'PROPAGANDA/PRESTIGE', variable: 'prestige', threshold: 80, direction: 'rising' },
];

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : null; }
  return null;
};

export function useQuoteTriggers(
  game: GameData,
  worldState: Record<string, string | number | boolean>,
) {
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const prevRef = useRef<Record<string, number>>({});
  const shownRef = useRef<Set<string>>(new Set());
  const lastFiredRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setActiveQuote(null);
  }, []);

  useEffect(() => {
    const quotes = game.quotes;
    if (!quotes || quotes.length === 0) return;
    const triggers = [...DEFAULT_TRIGGERS, ...(game.quoteTriggers || [])];

    const prev = prevRef.current;
    const firedThemes: string[] = [];

    for (const t of triggers) {
      const nowVal = num(worldState[t.variable]);
      if (nowVal === null) continue;
      const prevVal = prev[t.variable];
      if (prevVal !== undefined) {
        const crossed = t.direction === 'rising'
          ? prevVal < t.threshold && nowVal >= t.threshold
          : prevVal > t.threshold && nowVal <= t.threshold;
        if (crossed) firedThemes.push(t.theme);
      }
      prev[t.variable] = nowVal;
    }

    if (firedThemes.length === 0) return;
    if (Date.now() - lastFiredRef.current < COOLDOWN_MS) return;
    if (activeQuote) return;

    // SHORT quotes only during live play; unseen this session;
    // matching any fired theme. VILLAIN weighted double.
    const pool: Quote[] = [];
    for (const q of quotes) {
      if (q.length !== 'SHORT') continue;
      if (shownRef.current.has(q.text)) continue;
      if (!q.themes.some(th => firedThemes.includes(th))) continue;
      pool.push(q);
      if (q.voice === 'VILLAIN') pool.push(q);
    }
    if (pool.length === 0) return;

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    shownRef.current.add(chosen.text);
    lastFiredRef.current = Date.now();
    setActiveQuote(chosen);
    dismissTimerRef.current = setTimeout(() => setActiveQuote(null), AUTO_DISMISS_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldState, game.quotes, game.quoteTriggers]);

  useEffect(() => () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  return { activeQuote, dismiss };
}
