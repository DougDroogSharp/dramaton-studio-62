// Identity lock for actor art generation.
//
// A new expression or pose must be the SAME person. Generated from a
// text prompt alone, every variant comes back as a different face and
// costume — which is exactly the bug that made the two-frame walk
// cycle flicker between two different-looking peasants.
//
// The fix has two halves, and both matter:
//   1. Ride an image the actor ALREADY has as the reference.
//   2. Lead the prompt with "same character as the reference".
//
// Learned the hard way on the walk cycles: long prompts and explicit
// "do not change the colours / do not add sleeves" lists make drift
// dramatically WORSE — the extra text pulls the model off the
// reference image and it regenerates the figure from scratch. Short
// and leading wins. Do not add a negative list here.

import { Actor } from '@/types';

/**
 * The best available image to hold this actor's identity, in order:
 * a sprite already in the pose we're generating (so only the
 * expression changes), any sprite the actor has (already in the
 * game's art style, so the model has less to invent), then the
 * uploaded body photo.
 */
export function pickIdentityRef(actor: Actor, pose?: string): string | undefined {
  const inPose = pose && actor.graphics.find(g => g.pose === pose && g.image);
  if (inPose) return inPose.image;
  const any = actor.graphics.find(g => g.image);
  if (any) return any.image;
  return actor.referenceImageFullBody;
}

/**
 * The opening line of a generation prompt. When the actor already has
 * art, identity is asserted first and everything else is described as
 * a change to it.
 */
export function identityLine(actor: Actor): string {
  const hasOwnArt = actor.graphics.some(g => g.image) || !!actor.referenceImageFullBody;
  return hasOwnArt
    ? `IDENTITY: The SAME character as the body reference image — identical face, hair, costume and colours. Only the pose, expression and camera angle change.`
    : `IDENTITY: Generate a character portrait of "${actor.name}".`;
}
