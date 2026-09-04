# DRAM Script — four extensions requested for 3-D scenes

**Filed 2026-09-03 17:52 -07:00 by HVM 3D.**
**Status: REQUEST. Nothing merged.** `docs/DRAM_SCRIPT.md` is generated from
`src/utils/scriptDocs.ts` and the editor lane owns both. This document asks; it
does not change the language.

## Why

Doug asked for three scenes in which the Meshy assets interact. They are built,
and they run: `docs/prototypes/aipotu/scenes_study.html` (Standoff · Dragon and
castle · Whale watch). The choreography is authored as DRAM Script text inside
that page and executed by a small runner at the bottom of it.

Writing them in the house language rather than in JavaScript was the point: it
turns "Dramscript ought to handle this" into a specific list. Of the twelve
commands the three scripts use, **eight are stock and needed no changes at all**
— `ENTER`, `MOVE`, `FACE`, `CAMERA`, `WAIT`, `NARRATE`, `LABEL`, `GOTO`. The
timing, the entrances, the camera moves and the narration all came for free.

Four had to be invented. They are implemented **in that page's runner only**, as
a working proposal you can read and run before deciding anything.

---

## 1. `CLIP` — play a named glTF AnimationClip  (REQUIRED)

The blocker. `ANIMATE` cycles named 2-D **pose frames**; it has no way to reach
an `AnimationClip` inside a GLB. Without this a 3-D asset cannot act at all.

```
[CLIP actor_id clip_name [once]]
```

| Name | Type | Description |
|------|------|-------------|
| `actor_id` | string | The actor |
| `clip_name` | string | A clip in the actor's model |
| `once` | flag | Play once and hold the last frame; default loops |

```
[CLIP crab rear]
[CLIP poppy play_bow once]
```

Cross-fades over ~0.3s from whatever was playing, matching how the viewers
already behave.

**Naming.** Meshy exports clips as `Armature|walking_man|baselayer`. Scripts
should say `walking`. The runner normalises: drop `Armature` and `baselayer`,
drop a trailing `man`, lowercase, spaces to underscores. Worth making that
normalisation part of the language rather than each page's private habit.

## 2. A third coordinate on `ENTER` and `MOVE`  (REQUIRED)

Stock takes `x,y` as **percentages of a 2-D stage**. A 3-D scene needs three
numbers, and needs them in **world units** — a percentage of a world that has no
edges is meaningless.

```
[ENTER dragon at 0.4,5.6,-2.2]
[MOVE  orca to 2.6,-0.5,2.0 over 3.2s]
```

Proposal: **two numbers keep today's exact meaning** (percentages, 2-D stage);
**three numbers mean world units**. Existing scripts are untouched. The scene
declares which space it is, so the runner knows without guessing.

`MOVE` is non-blocking here, and the scripts follow it with `WAIT` — the
behaviour `TWEEN` already documents. Stock `MOVE`'s blocking behaviour is
ambiguous in the reference; worth pinning down either way.

`FACE ... toward` needed no new syntax but does need 3-D semantics: yaw toward a
world position. The models face `+Z` by house convention, so it is
`atan2(dx, dz)`. Stock `FACE` snaps to the nearest directional sprite, which has
no 3-D meaning; a real rotation should replace it when the scene is 3-D.

## 3. `ATTACH` / `BREATHE` — an effect pinned to a point on a model  (REQUIRED)

`EFFECT sfx on target` attaches to a **whole element** and has no socket
concept. The dragon's fire has to leave its **mouth**, wherever the head happens
to be pointing.

```
[ATTACH fire to dragon mouth]
[BREATHE dragon 2.4s]
```

`ATTACH` binds an effect to a named point; `BREATHE` fires it for a duration.
(`BREATHE` may be better as `[EFFECT fire on dragon.mouth for 2.4s]` — I am not
attached to the spelling, only to the capability.)

**This one is only half-solved in my runner, and you should know why.** The
Meshy models carry **no named sockets** — no skeleton at all on the dragon — so
"mouth" is currently a measured offset in the actor's own space: 62% of its
height, 46% of its depth forward. It tracks the model's yaw and looks right, but
it is a guess, and it would be wrong the moment the dragon's head animated
independently of its body.

Doing this properly needs a socket convention on the **assets**, not just the
language — an empty node named `socket_mouth` in the GLB. That is a note for
whoever runs the Meshy pipeline as much as for the editor lane.

## 4. `ORBIT` — circle one thing around another  (NICE TO HAVE)

```
[ORBIT gull around rowboat radius 3.0 height 2.6 over 9s]
```

Genuinely optional: a chain of `MOVE`s approximates it. But a bird circling a
boat, a moon, a vulture, a camera arc are common enough that the verb pays for
itself, and the `MOVE` chain version is ugly and jerky.

---

## What I did not need

No new flow control, no new dialogue forms, no new variables. `LABEL`/`GOTO`
loop the scenes indefinitely and `NARRATE` carries the commentary — including,
usefully, as the audio-description channel, which the reference already calls
out. The language's spine held up well; it is specifically the **3-D nouns**
that are missing, not the grammar.

## To try them

`http://10.0.0.137:8201/stage.html` → Scenes → Standoff · Dragon & castle ·
Whale watch. Or directly:
`http://10.0.0.137:8201/scenes_study.html?s=standoff` (`dragon`, `whalewatch`).

The scripts are the `SCENES` table near the top of `scenes_study.html`; the
runner is the `Runner` class near the bottom. Every extension is commented `EXT`
at its first use.

— HVM 3D
