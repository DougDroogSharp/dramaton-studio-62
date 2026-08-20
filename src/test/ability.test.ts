import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement } from '@/types';
import {
  DEFAULT_ABILITY_SETTINGS,
  ABILITY_PRESETS,
  AbilitySettings,
  loadAbilitySettings,
  saveAbilitySettings,
  hasOnboarded,
  markOnboarded,
} from '@/utils/accessibility';

// Ability settings change execution at the source: the runner reads
// them while it runs, so timing, motion and pacing adapt.

const ability = (patch: Partial<AbilitySettings>): AbilitySettings =>
  ({ ...DEFAULT_ABILITY_SETTINGS, ...patch });

describe('ability settings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const el = (id: string): StageElement => ({
    id, assetId: 'a', type: 'ACTOR', x: 20, y: 60, scale: 1, zIndex: 1,
    rotation: 0, pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
  });

  const makeGame = (script: string): GameData => {
    const game = createDefaultGame();
    game.actors.push({
      id: 'a', name: 'A', status: 'work',
      graphics: [
        { id: 'n', pose: 'Neutral', expression: 'Neutral', angle: 0, image: 'n.png' },
        { id: 'w1', pose: 'Walk1', expression: 'Neutral', angle: 0, image: 'w1.png' },
        { id: 'w2', pose: 'Walk2', expression: 'Neutral', angle: 0, image: 'w2.png' },
      ],
    });
    game.scenes.push({ id: 's1', name: 'S1', stage: [el('hero')], script });
    game.scenes.push({ id: 'late', name: 'L', script: '[SET expired = 1]' });
    game.scenes.push({ id: 'act', name: 'A', script: '[SET chosen = 1]' });
    return game;
  };

  const run = (script: string, settings: AbilitySettings) =>
    renderHook(() => useScriptRunner({ game: makeGame(script), startSceneId: 's1', ability: settings }));

  it('noTimeLimits stops a timed choice from expiring (WCAG 2.2.1)', () => {
    const script = '[CHOICE 5s -> late]\n- "Act" -> act\n- "Wait" -> act\n[/CHOICE]';
    const timed = run(script, ability({}));
    act(() => { vi.advanceTimersByTime(6000); });
    expect(timed.result.current.state.currentSceneId).toBe('late');

    const untimed = run(script, ability({ noTimeLimits: true }));
    act(() => { vi.advanceTimersByTime(60000); });
    expect(untimed.result.current.state.currentSceneId).toBe('s1');
    expect(untimed.result.current.state.choices).not.toBeNull();
  });

  it('reduceMotion lands tweens instantly instead of animating', () => {
    const { result } = run('[TWEEN hero.scale to 3 over 4s]', ability({ reduceMotion: true }));
    act(() => { vi.advanceTimersByTime(10); });
    expect(result.current.state.elementOverrides.get('hero')).toMatchObject({
      scale: 3, transitionDuration: 0,
    });
  });

  it('reduceMotion cuts the camera instead of moving it', () => {
    const { result } = run('[CAMERA shot closeup on hero over 3s]', ability({ reduceMotion: true }));
    expect(result.current.state.camera?.duration).toBe(0);
  });

  it('reduceMotion suppresses the walk-cycle stride', () => {
    const { result } = run('[MOVE hero to 80,60 over 2s]', ability({ reduceMotion: true }));
    expect(result.current.state.elementOverrides.get('hero')?.pose).toBeUndefined();
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.state.elementOverrides.get('hero')?.pose).toBeUndefined();
  });

  it('textSpeed 0 shows narration whole instead of typing it', () => {
    const { result } = run('Narrator: "A long line of narration."', ability({ textSpeed: 0 }));
    expect(result.current.state.activeDialogue?.displayedText).toBe('A long line of narration.');
    expect(result.current.state.activeDialogue?.isComplete).toBe(true);
  });

  it('readingTime holds NARRATE lines longer', () => {
    const { result } = run('[NARRATE "Take your time." for 2s]', ability({ readingTime: 3 }));
    act(() => { vi.advanceTimersByTime(2500); });
    expect(result.current.state.ambientNarration).not.toBeNull(); // would have gone at 1x
    act(() => { vi.advanceTimersByTime(4000); });
    expect(result.current.state.ambientNarration).toBeNull();
  });
});

describe('ability presets and persistence', () => {
  it('every preset produces a complete settings object', () => {
    for (const preset of ABILITY_PRESETS) {
      const result = preset.apply(DEFAULT_ABILITY_SETTINGS);
      for (const key of Object.keys(DEFAULT_ABILITY_SETTINGS)) {
        expect(result[key as keyof AbilitySettings]).toBeDefined();
      }
    }
  });

  it('the blind preset turns on what a blind player needs', () => {
    const blind = ABILITY_PRESETS.find(p => p.id === 'blind')!.apply(DEFAULT_ABILITY_SETTINGS);
    expect(blind.presentation).toBe('sound');
    expect(blind.describeAction).toBe(true);
    expect(blind.noTimeLimits).toBe(true);
    expect(blind.scanChoices).toBe(true);
  });

  it('round-trips through storage and fills gaps with defaults', () => {
    saveAbilitySettings(ability({ noTimeLimits: true, readingTime: 2.5, presentation: 'sound' }));
    const loaded = loadAbilitySettings();
    expect(loaded.noTimeLimits).toBe(true);
    expect(loaded.readingTime).toBe(2.5);
    expect(loaded.presentation).toBe('sound');
    expect(loaded.scanSeconds).toBe(DEFAULT_ABILITY_SETTINGS.scanSeconds);

    // a partial/corrupt record must not produce undefined settings
    localStorage.setItem('dramaton.ability', '{"noTimeLimits":true}');
    const partial = loadAbilitySettings();
    expect(partial.presentation).toBe('both');
    expect(typeof partial.textSpeed).toBe('number');

    localStorage.setItem('dramaton.ability', 'not json');
    expect(loadAbilitySettings().presentation).toBe('both');
    localStorage.removeItem('dramaton.ability');
  });
});

describe('onboarding gate', () => {
  afterEach(() => localStorage.removeItem('dramaton.ability.onboarded'));

  it('is unseen until marked, then stays seen', () => {
    expect(hasOnboarded()).toBe(false);
    markOnboarded();
    expect(hasOnboarded()).toBe(true);
  });

  it('survives a settings change (they are independent records)', () => {
    markOnboarded();
    saveAbilitySettings(ability({ reduceMotion: true }));
    expect(hasOnboarded()).toBe(true);
    expect(loadAbilitySettings().reduceMotion).toBe(true);
    localStorage.removeItem('dramaton.ability');
  });
});
