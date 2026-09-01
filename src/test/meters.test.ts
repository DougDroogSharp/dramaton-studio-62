import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData } from '@/types';
import { metersFor, DEFAULT_METERS } from '@/utils/meters';
import { formatPence, interpolateWithMoney, inflateToToday, withTodayValue, penceInLabourDays } from '@/utils/interpolate';

describe('meter moves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const run = (script: string, worldState: Record<string, number> = {}) => {
    const game: GameData = createDefaultGame();
    game.info.worldState = worldState;
    game.scenes.push({ id: 's1', name: 'S1', script });
    game.scenes.push({ id: 's2', name: 'S2', script: '[SET arrived = 1]' });
    return renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));
  };

  it('records a move with where it started and where it landed', () => {
    const { result } = run('[SET rent = 62]', { rent: 50 });
    expect(result.current.state.meterMoves.get('rent')).toMatchObject({ from: 50, to: 62 });
  });

  it('keeps the ORIGINAL start across repeated nudges, so the whole journey shows', () => {
    const { result } = run('[SET rent = 55]\n[SET rent = 60]\n[SET rent = 71]', { rent: 50 });
    expect(result.current.state.meterMoves.get('rent')).toMatchObject({ from: 50, to: 71 });
  });

  it('ignores writes that do not change the value', () => {
    const { result } = run('[SET rent = 50]', { rent: 50 });
    expect(result.current.state.meterMoves.has('rent')).toBe(false);
  });

  it('ignores non-numeric variables — a changed string is not a gauge', () => {
    const { result } = run('[SET chapter = "two"]', {});
    expect(result.current.state.meterMoves.has('chapter')).toBe(false);
  });

  it('a scene change clears the panel', () => {
    const { result } = run('[SET rent = 62]\n[SCENE s2]', { rent: 50 });
    expect(result.current.state.currentSceneId).toBe('s2');
    expect(result.current.state.meterMoves.size).toBe(0);
  });

  it('a TICK accumulates into one move', () => {
    const { result } = run('[TICK 1s]\n[SET rent = rent + 3]\n[/TICK]\nNarrator: "hold"', { rent: 50 });
    act(() => { vi.advanceTimersByTime(3100); });
    const move = result.current.state.meterMoves.get('rent');
    expect(move?.from).toBe(50);
    expect(Number(move?.to)).toBeGreaterThanOrEqual(59);
  });
});

describe('meter meanings', () => {
  it('every default meter says what rising and falling mean', () => {
    for (const m of DEFAULT_METERS) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.rising.length).toBeGreaterThan(10);
      expect(m.falling.length).toBeGreaterThan(10);
    }
  });

  it('a game can override a default meaning', () => {
    const map = metersFor([
      { variable: 'rent', label: 'GELD', rising: 'up', falling: 'down' },
    ]);
    expect(map.get('rent')?.label).toBe('GELD');
    // and still knows the ones it did not override
    expect(map.get('wages')?.label).toBe('Wages');
  });
});

describe('era money', () => {
  it('renders Norman pence as pounds, shillings and pence', () => {
    // England 1066-87 struck only the silver penny; 12d = 1s, 240d = 1 pound
    expect(formatPence(1)).toBe('1d');
    expect(formatPence(12)).toBe('1s');
    expect(formatPence(40)).toBe('3s 4d');   // the mark's quarter
    expect(formatPence(160)).toBe('13s 4d'); // one mark
    expect(formatPence(240)).toBe('1£');
    expect(formatPence(253)).toBe('1£ 1s 1d');
    expect(formatPence(0)).toBe('0d');
  });

  it('interpolates {var:money} in commentary', () => {
    expect(interpolateWithMoney('The geld wants {geld:pence}.', { geld: 40 }))
      .toBe('The geld wants 3s 4d.');
  });

  it('plain {var} still works alongside it', () => {
    expect(interpolateWithMoney('Rent {rent}, geld {geld:pence}.', { rent: 62.44, geld: 12 }))
      .toBe('Rent 62.4, geld 1s.');
  });

  it('unknown variables degrade to ?? instead of throwing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(interpolateWithMoney('{nothing:pence}', {})).toBe('??');
    vi.restoreAllMocks();
  });
});

describe('inflation, honestly', () => {
  it('converts a 1929 price to today by CPI', () => {
    // bread was about 9 cents a loaf in 1929
    const now = inflateToToday(0.09, 1929)!;
    expect(now).toBeGreaterThan(1.4);
    expect(now).toBeLessThan(2.1);
  });

  it('says the price then AND now', () => {
    const s = withTodayValue(0.09, 1929, 'dollars1929');
    expect(s).toMatch(/^9c \(about \$1\.\d\d today\)$/);
  });

  it('refuses to CPI-convert the middle ages', () => {
    // a penny in 1086 cannot be CPI-converted: most of that economy
    // was never priced in coin
    expect(inflateToToday(1, 1086)).toBeUndefined();
  });

  it('converts medieval sums to labour instead', () => {
    // at a half-penny a day, and ~300 working days in a year
    expect(penceInLabourDays(10)).toBe('20 days of a labourer\'s work');
    expect(penceInLabourDays(60)).toBe('4 months of a labourer\'s work');
    // a pound — 240 pence — is 480 work-days: about two years
    expect(penceInLabourDays(240)).toBe('2 years of a labourer\'s work');
  });
});
