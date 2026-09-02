import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { parseScript, commandToString, DialogueCommand } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement, ActorGraphic } from '@/types';

describe('dialogue acting tags — parsing', () => {
  it('plain dialogue and (thinking) are unchanged', () => {
    const cmds = parseScript('Bob: "hi"\nBob (thinking): "hmm"');
    expect((cmds[0] as DialogueCommand)).toMatchObject({ style: 'speech', text: 'hi' });
    expect((cmds[0] as DialogueCommand).expression).toBeUndefined();
    expect((cmds[1] as DialogueCommand).style).toBe('thought');
  });

  it('parses (Expression) and (Pose/Expression)', () => {
    const cmds = parseScript('Bob (Angry): "grr"\nBob (Pointing/Angry): "you!"');
    expect(cmds[0] as DialogueCommand).toMatchObject({ expression: 'Angry', style: 'speech' });
    expect((cmds[0] as DialogueCommand).pose).toBeUndefined();
    expect(cmds[1] as DialogueCommand).toMatchObject({ pose: 'Pointing', expression: 'Angry' });
  });

  it('round-trips through the serializer', () => {
    for (const src of ['Bob: "hi"', 'Bob (thinking): "hmm"', 'Bob (Angry): "grr"', 'Bob (Pointing/Angry): "you!"']) {
      expect(commandToString(parseScript(src)[0])).toBe(src);
    }
  });
});

describe('dialogue acting tags — runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const g = (pose: string, expression: string): ActorGraphic =>
    ({ id: `${pose}_${expression}`, pose, expression, angle: 0, image: 'data:image/png;base64,x' });

  const makeGame = (script: string, graphics: ActorGraphic[]): GameData => {
    const game = createDefaultGame();
    game.actors.push({ id: 'bob', name: 'Bob', graphics, status: 'work' });
    const el: StageElement = {
      id: 'bob_el', assetId: 'bob', type: 'ACTOR', x: 50, y: 60, scale: 1, zIndex: 1, rotation: 0,
      pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
    };
    game.scenes.push({ id: 's1', name: 'S1', script, stage: [el] });
    return game;
  };

  it('explicit tag switches the speaker stage sprite to the matching graphic', () => {
    const game = makeGame('Bob (Pointing/Angry): "you!"',
      [g('Neutral', 'Neutral'), g('Pointing', 'Angry')]);
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('bob_el')).toMatchObject({
      pose: 'Pointing', expression: 'Angry', spriteAngle: 0,
    });
    expect(result.current.state.activeDialogue?.expression).toBe('Angry');
  });

  it('missing graphic warns and keeps the current look', () => {
    const game = makeGame('Bob (Jump/Scared): "eek"', [g('Neutral', 'Neutral')]);
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('bob_el')?.pose).toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  it('auto-varies among graphics when no tag and several exist', () => {
    const game = makeGame('Bob: "line one here"',
      [g('Neutral', 'Neutral'), g('Neutral', 'Happy'), g('Pointing', 'Angry')]);
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    const ov = result.current.state.elementOverrides.get('bob_el');
    // resolved to one real triple from the library
    const triples = ['Neutral/Neutral', 'Neutral/Happy', 'Pointing/Angry'];
    expect(triples).toContain(`${ov?.pose}/${ov?.expression}`);
  });

  it('single-graphic actors are left alone (no churn)', () => {
    const game = makeGame('Bob: "hello"', [g('Neutral', 'Neutral')]);
    const { result } = renderHook(() => useScriptRunner({ game, startSceneId: 's1' }));

    expect(result.current.state.elementOverrides.get('bob_el')).toBeUndefined();
  });
});
