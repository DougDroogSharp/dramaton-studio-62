import { describe, it, expect } from 'vitest';
import { pickIdentityRef, identityLine } from '@/utils/actorIdentity';
import { Actor } from '@/types';

// Identity lock: a new expression or pose must be the SAME person.

const actor = (patch: Partial<Actor> = {}): Actor => ({
  id: 'a', name: 'Aldric', status: 'work', graphics: [], ...patch,
});

const g = (pose: string, expression: string, image: string) =>
  ({ id: `${pose}_${expression}`, pose, expression, angle: 0, image });

describe('pickIdentityRef', () => {
  it('prefers a sprite already in the pose being generated', () => {
    const a = actor({
      graphics: [g('Neutral', 'Neutral', 'NEUTRAL'), g('Pointing', 'Angry', 'POINTING')],
      referenceImageFullBody: 'PHOTO',
    });
    expect(pickIdentityRef(a, 'Pointing')).toBe('POINTING');
  });

  it('falls back to any sprite the actor has', () => {
    const a = actor({
      graphics: [g('Neutral', 'Neutral', 'NEUTRAL')],
      referenceImageFullBody: 'PHOTO',
    });
    // the actor's own art beats the uploaded photo — it is already in
    // the game's style, so the model has less to invent
    expect(pickIdentityRef(a, 'Sitting')).toBe('NEUTRAL');
  });

  it('falls back to the uploaded body reference when there is no art yet', () => {
    expect(pickIdentityRef(actor({ referenceImageFullBody: 'PHOTO' }), 'Neutral')).toBe('PHOTO');
  });

  it('returns undefined for a brand-new actor with nothing to go on', () => {
    expect(pickIdentityRef(actor(), 'Neutral')).toBeUndefined();
  });

  it('ignores graphics whose image is empty', () => {
    const a = actor({ graphics: [g('Neutral', 'Neutral', '')] });
    expect(pickIdentityRef(a, 'Neutral')).toBeUndefined();
  });
});

describe('identityLine', () => {
  it('asserts sameness once the actor has art', () => {
    const a = actor({ graphics: [g('Neutral', 'Neutral', 'IMG')] });
    expect(identityLine(a)).toContain('SAME character');
    expect(identityLine(a)).toContain('Only the pose, expression and camera angle change');
  });

  it('names the character when there is nothing to match yet', () => {
    expect(identityLine(actor())).toContain('Aldric');
    expect(identityLine(actor())).not.toContain('SAME character');
  });

  it('carries no negative list — long prompts break reference fidelity', () => {
    const line = identityLine(actor({ graphics: [g('Neutral', 'Neutral', 'IMG')] }));
    expect(line.toLowerCase()).not.toContain('do not');
    expect(line.length).toBeLessThan(220);
  });
});
