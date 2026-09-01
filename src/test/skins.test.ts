import { describe, it, expect } from 'vitest';
import {
  animationsFromGltf,
  animationsFromGlb,
  skinFromFile,
  isSkinAllowed,
  skinAnimationsForActor,
} from '../utils/skins';
import { Skin } from '../types';
import { getAutoCompleteSuggestions } from '../utils/scriptParser';

// Build a minimal valid GLB around a glTF JSON payload.
const makeGlb = (gltf: unknown): ArrayBuffer => {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const padded = new Uint8Array(Math.ceil(jsonBytes.length / 4) * 4);
  padded.fill(0x20); // glTF pads JSON chunks with spaces
  padded.set(jsonBytes);
  const buffer = new ArrayBuffer(12 + 8 + padded.length);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); // magic 'glTF'
  view.setUint32(4, 2, true); // version
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, padded.length, true); // chunk length
  view.setUint32(16, 0x4e4f534a, true); // 'JSON'
  new Uint8Array(buffer, 20).set(padded);
  return buffer;
};

const GLTF_WITH_ANIMS = {
  asset: { version: '2.0' },
  animations: [
    { name: 'Walk' },
    { name: 'TANTRUM' }, // non-standard clips count too
    {}, // unnamed
    { name: '  Idle  ' },
  ],
};

describe('animationsFromGltf', () => {
  it('lists every clip, trims names, and names unnamed clips stably', () => {
    expect(animationsFromGltf(GLTF_WITH_ANIMS)).toEqual(['Walk', 'TANTRUM', 'animation_2', 'Idle']);
  });

  it('returns [] when there are no animations', () => {
    expect(animationsFromGltf({ asset: { version: '2.0' } })).toEqual([]);
    expect(animationsFromGltf(null)).toEqual([]);
  });
});

describe('animationsFromGlb', () => {
  it('extracts animations from the JSON chunk', () => {
    expect(animationsFromGlb(makeGlb(GLTF_WITH_ANIMS))).toEqual(['Walk', 'TANTRUM', 'animation_2', 'Idle']);
  });

  it('rejects non-GLB data', () => {
    expect(() => animationsFromGlb(new TextEncoder().encode('not a glb at all....').buffer as ArrayBuffer))
      .toThrow(/bad magic/);
  });
});

describe('skinFromFile', () => {
  it('handles .glb binary and derives the skin name from the file name', () => {
    const skin = skinFromFile('george_summer.glb', makeGlb(GLTF_WITH_ANIMS));
    expect(skin.name).toBe('george_summer');
    expect(skin.fileName).toBe('george_summer.glb');
    expect(skin.animations).toContain('TANTRUM');
  });

  it('handles .gltf as plain JSON text', () => {
    const data = new TextEncoder().encode(JSON.stringify(GLTF_WITH_ANIMS)).buffer as ArrayBuffer;
    const skin = skinFromFile('vita.gltf', data);
    expect(skin.animations).toEqual(['Walk', 'TANTRUM', 'animation_2', 'Idle']);
  });
});

describe('isSkinAllowed (lockdown)', () => {
  const human: Skin = { id: 's1', name: 'a', skinType: 'human', animations: [] };
  const untyped: Skin = { id: 's2', name: 'b', animations: [] };

  it('allows everything when no lockdown is set', () => {
    expect(isSkinAllowed(human)).toBe(true);
    expect(isSkinAllowed(untyped, [])).toBe(true);
  });

  it('under lockdown, only listed types pass and untyped skins are blocked', () => {
    expect(isSkinAllowed(human, ['human'])).toBe(true);
    expect(isSkinAllowed(human, ['animal'])).toBe(false);
    expect(isSkinAllowed(untyped, ['human'])).toBe(false);
  });
});

describe('pose autocomplete from skin animations', () => {
  const game = {
    actors: [
      { id: 'george', name: 'George', skinId: 's1' },
      { id: 'lola', name: 'Lola' },
    ],
    skins: [{ id: 's1', animations: ['Walk', 'TANTRUM'] }],
    info: { customPoses: ['Slouch'] },
  };

  const suggestFor = (script: string) =>
    getAutoCompleteSuggestions(script, script.length, game, ['Neutral'], []);

  it('offers the wearing actor skin clips (non-standard included) plus defaults', () => {
    const labels = suggestFor('[POSE george pose=').map(s => s.label);
    expect(labels).toContain('TANTRUM');
    expect(labels).toContain('Walk');
    expect(labels).toContain('Neutral');
    expect(labels).toContain('Slouch');
  });

  it('marks skin clips and filters by prefix', () => {
    const suggestions = suggestFor('[POSE george pose=TA');
    expect(suggestions).toEqual([
      { label: 'TANTRUM', insertText: 'TANTRUM', category: 'pose', description: 'skin animation' },
    ]);
  });

  it('offers only defaults for an actor without a skin', () => {
    const labels = suggestFor('[POSE lola pose=').map(s => s.label);
    expect(labels).not.toContain('TANTRUM');
    expect(labels).toContain('Neutral');
  });
});

describe('skinAnimationsForActor', () => {
  const skins = [{ id: 's1', animations: ['Walk', 'TANTRUM'] }];

  it('returns the assigned skin animations', () => {
    expect(skinAnimationsForActor({ skinId: 's1' }, skins)).toEqual(['Walk', 'TANTRUM']);
  });

  it('returns [] with no skin assigned or unknown skin', () => {
    expect(skinAnimationsForActor({}, skins)).toEqual([]);
    expect(skinAnimationsForActor({ skinId: 'nope' }, skins)).toEqual([]);
    expect(skinAnimationsForActor(undefined, skins)).toEqual([]);
  });
});
