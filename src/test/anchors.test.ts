import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { parseScript, commandsToScript } from '@/utils/scriptParser';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { createDefaultGame, GameData, StageElement } from '@/types';

// Backdrop anchors make painted scenery addressable: FACE, MOVE and
// CAMERA all resolve a name to a point (stage element first, then the
// active drop's anchors).

describe('FACE and backdrop anchors: parsing', () => {
  it('parses both FACE forms', () => {
    expect(parseScript('[FACE aldric toward h_william]')[0]).toEqual({
      type: 'FACE', elementId: 'aldric', targetId: 'h_william',
    });
    expect(parseScript('[FACE hereward toward BOAT1]')[0]).toMatchObject({ targetId: 'BOAT1' });
    expect(parseScript('[FACE crowd 270]')[0]).toEqual({
      type: 'FACE', elementId: 'crowd', degrees: 270,
    });
    // negative angles normalize
    expect(parseScript('[FACE crowd -90]')[0]).toMatchObject({ degrees: 270 });
  });

  it('parses MOVE to a named target', () => {
    expect(parseScript('[MOVE aldric to RUBBER_TREE over 3s]')[0]).toMatchObject({
      type: 'MOVE', actorId: 'aldric', targetId: 'RUBBER_TREE', duration: 3,
    });
    // literal coordinates still parse as before, with no named target
    const literal = parseScript('[MOVE aldric to 70,60 over 3s]')[0];
    expect(literal).toMatchObject({ x: 70, y: 60 });
    expect('targetId' in literal).toBe(false);
  });

  it('round-trips', () => {
    const src = '[FACE aldric toward BOAT1]\n[FACE crowd 270]\n[MOVE aldric to RUBBER_TREE over 3s]';
    expect(commandsToScript(parseScript(src))).toBe(src);
  });
});

describe('FACE and backdrop anchors: execution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const el = (id: string, assetId: string, x: number, y: number): StageElement => ({
    id, assetId, type: 'ACTOR', x, y, scale: 1, zIndex: 1,
    rotation: 0, pose: 'Neutral', expression: 'Neutral', spriteAngle: 0,
  });

  const makeGame = (script: string): GameData => {
    const game = createDefaultGame();
    game.actors.push({
      id: 'aldric', name: 'Aldric', status: 'work',
      graphics: [0, 90, 180, 270].map(a => ({
        id: `g${a}`, pose: 'Neutral', expression: 'Neutral', angle: a, image: `n${a}.png`,
      })),
    });
    game.actors.push({
      id: 'plain', name: 'Plain', status: 'work',
      graphics: [{ id: 'p0', pose: 'Neutral', expression: 'Neutral', angle: 0, image: 'p.png' }],
    });
    game.drops = [{
      id: 'shore', name: 'Shore', prompt: '',
      image: 'shore.png',
      anchors: [
        { id: 'BOAT1', label: 'the near fishing boat', x: 15, y: 70 },
        { id: 'RUBBER_TREE', label: 'the tapped tree', x: 85, y: 55 },
      ],
    }];
    game.scenes.push({
      id: 's1', name: 'S1', dropId: 'shore',
      stage: [el('aldric', 'aldric', 50, 70), el('plain', 'plain', 50, 50)],
      script,
    });
    return game;
  };

  it('FACE toward an anchor picks the nearest directional graphic', () => {
    // BOAT1 is at x=15 (west of aldric at x=50) -> 180
    const { result } = renderHook(() => useScriptRunner({ game: makeGame('[FACE aldric toward BOAT1]'), startSceneId: 's1' }));
    expect(result.current.state.elementOverrides.get('aldric')?.spriteAngle).toBe(180);
  });

  it('FACE toward an anchor on the other side flips to the east sprite', () => {
    const { result } = renderHook(() => useScriptRunner({ game: makeGame('[FACE aldric toward RUBBER_TREE]'), startSceneId: 's1' }));
    expect(result.current.state.elementOverrides.get('aldric')?.spriteAngle).toBe(0);
  });

  it('FACE toward another stage element works', () => {
    // plain sits at y=50, above aldric at y=70 -> upward -> 270
    const { result } = renderHook(() => useScriptRunner({ game: makeGame('[FACE aldric toward plain]'), startSceneId: 's1' }));
    expect(result.current.state.elementOverrides.get('aldric')?.spriteAngle).toBe(270);
  });

  it('FACE by degrees snaps to the nearest available angle', () => {
    const { result } = renderHook(() => useScriptRunner({ game: makeGame('[FACE aldric 100]'), startSceneId: 's1' }));
    expect(result.current.state.elementOverrides.get('aldric')?.spriteAngle).toBe(90);
  });

  it('unknown targets warn and leave facing alone', () => {
    const { result } = renderHook(() => useScriptRunner({ game: makeGame('[FACE aldric toward NOPE]'), startSceneId: 's1' }));
    expect(result.current.state.elementOverrides.get('aldric')?.spriteAngle).toBeUndefined();
  });

  it('MOVE resolves a backdrop anchor as its destination', () => {
    const { result } = renderHook(() => useScriptRunner({ game: makeGame('[MOVE aldric to RUBBER_TREE over 2s]'), startSceneId: 's1' }));
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current.state.elementOverrides.get('aldric')).toMatchObject({ x: 85, y: 55 });
  });

  it('CAMERA can frame a backdrop anchor', () => {
    const { result } = renderHook(() => useScriptRunner({ game: makeGame('[CAMERA shot closeup on BOAT1 over 1s]'), startSceneId: 's1' }));
    expect(result.current.state.camera).toMatchObject({ zoom: 2.2, x: 15, y: 70 });
  });
});
