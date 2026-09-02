import { WorldVars, warnOnce } from './expression';

// {variable} interpolation against the live world state.
//
// One implementation, used everywhere text can carry a number the
// simulation owns: dialogue lines, SET_TEXT labels, NARRATE, and the
// meter commentary. Numbers round to one decimal; an unknown variable
// renders as ?? and warns rather than throwing.
export function interpolateText(text: string, vars: WorldVars): string {
  if (!text.includes('{')) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (v === undefined) {
      warnOnce(`{${name}}: variable is not defined; showing ??`);
      return '??';
    }
    if (typeof v === 'number') {
      return String(Math.round(v * 10) / 10);
    }
    return String(v);
  });
}

// ---------------------------------------------------------------- money
//
// Era money, so a meter can say what a number is worth in the coin the
// characters actually used rather than in abstract points.
//
// England 1066-1087 struck only ONE coin: the silver penny. Shillings
// and pounds were reckoning units, not coins you could hold —
// 12 pence = 1 shilling, 240 pence = 1 pound (a pound of silver), and
// the mark (a Danish import) = 160 pence = 13s 4d. Domesday values
// manors in pounds, shillings and pence; the geld was assessed on hides.

export interface MoneyFormat {
  /** id used by a game's meters, e.g. "pennies" */
  id: string;
  /** turn a number into era coin */
  format: (n: number) => string;
}

/** Norman England: pounds / shillings / pence from a count of pence. */
export function formatPence(pence: number): string {
  const p = Math.max(0, Math.round(pence));
  const pounds = Math.floor(p / 240);
  const shillings = Math.floor((p % 240) / 12);
  const pennies = p % 12;
  const parts: string[] = [];
  if (pounds) parts.push(`${pounds}£`);
  if (shillings) parts.push(`${shillings}s`);
  if (pennies || parts.length === 0) parts.push(`${pennies}d`);
  return parts.join(' ');
}

// ---------------------------------------------------------------- inflation
//
// So a price in the money of the time can also be said in today's, which
// is the only way "nine cents" lands as a real number for a reader now.
//
// Post-1913 figures come from the US BLS Consumer Price Index (CPI-U,
// 1982-84 = 100): 1929 = 17.1, 1900 = 8.3 (Officer & Williamson's
// reconstruction, since BLS starts in 1913), 2025 ≈ 320.
// These are ROUND figures and CPI comparisons across a century are
// approximate by nature — a 1929 basket is not a 2025 basket. The
// engine says "about", and means it.
const CPI_BY_YEAR: Record<number, number> = {
  1900: 8.3,
  1913: 9.9,
  1920: 20.0,
  1929: 17.1,
  1931: 15.2,
  1933: 13.0,
  2025: 320,
};

const CPI_NOW = CPI_BY_YEAR[2025];

/** Nearest CPI anchor at or before the year. */
function cpiFor(year: number): number | undefined {
  const years = Object.keys(CPI_BY_YEAR).map(Number).sort((a, b) => a - b);
  let best: number | undefined;
  for (const y of years) if (y <= year) best = CPI_BY_YEAR[y];
  return best;
}

/**
 * What an amount from `year` is worth today, by CPI. Returns undefined
 * for years we have no honest anchor for (anything medieval — a penny
 * in 1086 cannot be CPI-converted, because most of that economy was
 * never priced in coin at all; use days of labour instead).
 */
export function inflateToToday(amount: number, year: number): number | undefined {
  const then = cpiFor(year);
  if (!then || year < 1900) return undefined;
  return (amount * CPI_NOW) / then;
}

/** "9¢ (about $1.68 today)" — the price then, and what it means now. */
export function withTodayValue(amount: number, year: number, format = 'dollars'): string {
  const fmt = MONEY_FORMATS[format] ?? MONEY_FORMATS.dollars;
  const now = inflateToToday(amount, year);
  if (now === undefined) return fmt(amount);
  const nowStr = now < 10
    ? `$${now.toFixed(2)}`
    : `$${Math.round(now).toLocaleString()}`;
  return `${fmt(amount)} (about ${nowStr} today)`;
}

/**
 * A medieval sum said the only way it converts honestly: in days of
 * common labour. In 1086 a penny was a substantial coin — a day's
 * unskilled wage was a fraction of one — so this reports labour-days
 * rather than pretending to a dollar figure.
 */
export function penceInLabourDays(pence: number, pencePerDay = 0.5): string {
  const days = pence / pencePerDay;
  if (days >= 300) return `${Math.round(days / 300)} years of a labourer's work`;
  if (days >= 30) return `${Math.round(days / 30)} months of a labourer's work`;
  return `${Math.round(days)} days of a labourer's work`;
}

export const MONEY_FORMATS: Record<string, (n: number) => string> = {
  // Norman England, 1066-1087
  pence: formatPence,
  // 1900s Congo Free State / Belgium
  francs: (n: number) => `${Math.round(n).toLocaleString()} fr`,
  // Prohibition Chicago
  dollars1929: (n: number) => (n < 1 ? `${Math.round(n * 100)}c` : `$${n.toFixed(2)}`),
  // Present day
  dollars: (n: number) => `$${Math.round(n).toLocaleString()}`,
  // The island game invents its own; a game supplies the unit name and
  // this formats it. See GameData.meters.
  plain: (n: number) => String(Math.round(n)),
};

/**
 * Extended interpolation: {var} as usual, plus {var:money} rendered in
 * the named era format — {rent:pence} on William gives "3s 4d".
 */
export function interpolateWithMoney(
  text: string,
  vars: WorldVars,
  moneyFormat?: string,
): string {
  if (!text.includes('{')) return text;
  return text.replace(/\{(\w+)(?::(\w+))?\}/g, (_, name: string, fmt?: string) => {
    const v = vars[name];
    if (v === undefined) {
      warnOnce(`{${name}}: variable is not defined; showing ??`);
      return '??';
    }
    const n = typeof v === 'number' ? v : Number(v);
    const chosen = fmt === 'money' ? (moneyFormat || 'plain') : (fmt || moneyFormat);
    if (chosen && Number.isFinite(n) && MONEY_FORMATS[chosen]) {
      return MONEY_FORMATS[chosen](n);
    }
    if (typeof v === 'number') return String(Math.round(v * 10) / 10);
    return String(v);
  });
}
