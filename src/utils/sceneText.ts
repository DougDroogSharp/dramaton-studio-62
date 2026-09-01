// Scene text collection — every human-readable string in one scene, in one list.
//
// The point of this module is REWRITING. It gathers all the prose a player will
// ever see in a scene (dialogue, choices, balloons, button labels, notes) so it
// can be read and rewritten in a single pass, without hunting through the
// script and the stage separately.
//
// Design note: edits to scene.script are applied SURGICALLY — we replace only
// the character span holding the text, on the one line that holds it, and leave
// the rest of the script byte-for-byte identical. We deliberately do NOT go
// through parseScript/commandsToScript (as the visual editor does), because
// that round-trip reflows the whole script: blank lines are dropped and comment
// markers are normalized. A writer's formatting is theirs to keep.

import { GameData, Scene, StageElement } from '@/types';

export type SceneTextKind =
  | 'sceneName'
  | 'sceneNote'
  | 'dialogue'
  | 'choice'
  | 'comment'
  | 'balloon'
  | 'buttonLabel';

export type SceneTextSection = 'scene' | 'script' | 'balloons' | 'buttons';

export type SceneTextLocation =
  // A field directly on the scene object.
  | { type: 'sceneField'; field: 'name' | 'note' }
  // A character span [start, end) on one line of scene.script.
  | { type: 'scriptLine'; lineIndex: number; start: number; end: number; quoteSafe: boolean }
  // The text of a BALLOON stage element.
  | { type: 'balloon'; elementId: string }
  // A shared button's label (lives on game.buttons, not on the scene).
  | { type: 'button'; buttonId: string };

export interface SceneTextEntry {
  /** Stable across keystrokes so the editing field never loses focus. */
  key: string;
  section: SceneTextSection;
  kind: SceneTextKind;
  /** Who is speaking, or what this line is. Shown to the left of the field. */
  label: string;
  /** Extra context: "thinking", "-> scene_2", "used by 2 scenes". */
  hint?: string;
  text: string;
  /** Whether newlines are allowed in this text. */
  multiline: boolean;
  /** True when this string is shared with other scenes (edit affects them too). */
  shared?: boolean;
  location: SceneTextLocation;
}

// ---------------------------------------------------------------------------
// Line matchers
//
// These mirror scriptParser.parseLine so the panel shows exactly what the
// runtime will read. The one deliberate difference: the text groups accept the
// EMPTY string (`.*` rather than the parser's `.+`). That keeps a row in place
// while the writer clears it out and types a replacement, instead of having the
// row reclassify itself mid-keystroke.
//
// Each regex captures a prefix group so the text's offset within the raw line
// is just prefix.length — no index arithmetic, no drift.
// ---------------------------------------------------------------------------

/** `Detective (thinking): "Something."` — prefix, name, thinking, text, suffix. */
const DIALOGUE_QUOTED = /^(\s*([A-Z][A-Za-z0-9_ ]*?)(\s*\(thinking\))?\s*:\s*")(.*)("\s*)$/;

/** `Detective: Something.` — same, without the quotes. */
const DIALOGUE_BARE = /^(\s*([A-Z][A-Za-z0-9_ ]*?)(\s*\(thinking\))?\s*:[ \t]*)(.*?)([ \t]*)$/;

/** `- "Go north" -> scene_2` inside a [CHOICE] block. */
const CHOICE_OPTION = /^(\s*-\s*")([^"]*)("\s*->\s*(.*?)\s*)$/;

/** `# a note` or `// a note` */
const COMMENT_LINE = /^(\s*(?:#|\/\/)[ \t]*)(.*?)([ \t]*)$/;

/** `[BUTTON go_north]` / `[HIDE_BUTTON go_north]` */
const BUTTON_REF = /^\[\s*(?:BUTTON|HIDE_BUTTON)\s+(\w+)\s*\]$/i;

const isBracketCommand = (trimmed: string) =>
  trimmed.startsWith('[') && trimmed.endsWith(']');

/**
 * Collect every editable string in a scene, in reading order.
 *
 * Script entries come back in line order, so the list reads like the scene
 * plays. Balloons and button labels follow, since they have no script position.
 */
export function collectSceneText(scene: Scene, game: GameData): SceneTextEntry[] {
  const entries: SceneTextEntry[] = [];

  // --- The scene itself -----------------------------------------------------
  entries.push({
    key: 'scene:name',
    section: 'scene',
    kind: 'sceneName',
    label: 'Scene name',
    text: scene.name ?? '',
    multiline: false,
    location: { type: 'sceneField', field: 'name' },
  });

  if (scene.note !== undefined && scene.note !== null) {
    entries.push({
      key: 'scene:note',
      section: 'scene',
      kind: 'sceneNote',
      label: 'Scene note',
      hint: 'not shown to the player',
      text: scene.note,
      multiline: true,
      location: { type: 'sceneField', field: 'note' },
    });
  }

  // --- The script -----------------------------------------------------------
  const script = scene.script ?? '';
  const lines = script.split('\n');
  const referencedButtonIds: string[] = [];
  let inChoiceBlock = false;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (isBracketCommand(trimmed)) {
      const upper = trimmed.toUpperCase();
      if (upper === '[CHOICE]') inChoiceBlock = true;
      else if (upper === '[/CHOICE]') inChoiceBlock = false;

      const buttonRef = trimmed.match(BUTTON_REF);
      if (buttonRef && !referencedButtonIds.includes(buttonRef[1])) {
        referencedButtonIds.push(buttonRef[1]);
      }
      return; // bracketed commands carry machinery, not prose
    }

    // Choice options only count inside a [CHOICE] block — that is where the
    // parser reads them from.
    if (inChoiceBlock) {
      const choice = line.match(CHOICE_OPTION);
      if (choice) {
        const start = choice[1].length;
        entries.push({
          key: `script:${lineIndex}:${start}`,
          section: 'script',
          kind: 'choice',
          label: 'Choice',
          hint: choice[4] ? `-> ${choice[4]}` : undefined,
          text: choice[2],
          multiline: false,
          // The parser reads choice text with [^"]*, so a quote would truncate it.
          location: { type: 'scriptLine', lineIndex, start, end: start + choice[2].length, quoteSafe: false },
        });
        return;
      }
    }

    const comment = line.match(COMMENT_LINE);
    if (comment) {
      const start = comment[1].length;
      entries.push({
        key: `script:${lineIndex}:${start}`,
        section: 'script',
        kind: 'comment',
        label: 'Note',
        hint: 'not shown to the player',
        text: comment[2],
        multiline: false,
        location: { type: 'scriptLine', lineIndex, start, end: start + comment[2].length, quoteSafe: true },
      });
      return;
    }

    // Quoted dialogue is tried first, matching the parser's own order.
    const quoted = line.match(DIALOGUE_QUOTED);
    if (quoted) {
      const start = quoted[1].length;
      entries.push({
        key: `script:${lineIndex}:${start}`,
        section: 'script',
        kind: 'dialogue',
        label: quoted[2].trim(),
        hint: quoted[3] ? 'thinking' : undefined,
        text: quoted[4],
        multiline: false,
        // The text sits between quotes matched greedily, so inner quotes survive.
        location: { type: 'scriptLine', lineIndex, start, end: start + quoted[4].length, quoteSafe: true },
      });
      return;
    }

    const bare = line.match(DIALOGUE_BARE);
    if (bare) {
      const start = bare[1].length;
      entries.push({
        key: `script:${lineIndex}:${start}`,
        section: 'script',
        kind: 'dialogue',
        label: bare[2].trim(),
        hint: bare[3] ? 'thinking' : undefined,
        text: bare[4],
        multiline: false,
        location: { type: 'scriptLine', lineIndex, start, end: start + bare[4].length, quoteSafe: true },
      });
    }
  });

  // --- Balloons on the stage ------------------------------------------------
  const balloons = (scene.stage ?? []).filter(
    (el): el is StageElement => el.type === 'BALLOON'
  );
  balloons.forEach((el, i) => {
    entries.push({
      key: `balloon:${el.id}`,
      section: 'balloons',
      kind: 'balloon',
      label: `Balloon ${i + 1}`,
      hint: el.balloonType === 'THOUGHT' ? 'thought' : 'speech',
      text: el.text ?? '',
      multiline: true,
      location: { type: 'balloon', elementId: el.id },
    });
  });

  // --- Button labels this scene calls up ------------------------------------
  referencedButtonIds.forEach(id => {
    const button = game.buttons?.find(b => b.id === id);
    if (!button) return;
    const otherScenes = countScenesUsingButton(game, id);
    entries.push({
      key: `button:${button.id}`,
      section: 'buttons',
      kind: 'buttonLabel',
      label: button.name || button.id,
      hint: otherScenes > 1 ? `also used in ${otherScenes - 1} other scene${otherScenes === 2 ? '' : 's'}` : undefined,
      text: button.label ?? '',
      multiline: false,
      shared: true,
      location: { type: 'button', buttonId: button.id },
    });
  });

  return entries;
}

/** How many scenes call up this button, so we can warn about shared edits. */
function countScenesUsingButton(game: GameData, buttonId: string): number {
  const pattern = new RegExp(`\\[\\s*(?:BUTTON|HIDE_BUTTON)\\s+${escapeRegExp(buttonId)}\\s*\\]`, 'i');
  return (game.scenes ?? []).filter(s => pattern.test(s.script ?? '')).length;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Make a replacement safe for the slot it is going into.
 *
 * Single-line slots cannot hold newlines without splitting the line and
 * breaking the script; slots the parser reads with [^"] cannot hold quotes.
 * Everything else is passed through untouched.
 */
export function sanitizeForLocation(text: string, entry: SceneTextEntry): string {
  let out = text;
  if (!entry.multiline) {
    out = out.replace(/\r?\n/g, ' ');
  }
  if (entry.location.type === 'scriptLine' && !entry.location.quoteSafe) {
    out = out.replace(/"/g, "'");
  }
  return out;
}

/**
 * Apply an edit and return the scene fields to change.
 *
 * Returns null for entries that do not live on the scene (button labels), and
 * for locations that no longer line up with the current scene — a stale entry
 * from before some other edit. Callers should re-collect and try again rather
 * than write to a span they can no longer trust.
 */
export function applySceneTextEdit(
  scene: Scene,
  entry: SceneTextEntry,
  rawText: string
): Partial<Scene> | null {
  const text = sanitizeForLocation(rawText, entry);
  const loc = entry.location;

  switch (loc.type) {
    case 'sceneField':
      return { [loc.field]: text } as Partial<Scene>;

    case 'balloon': {
      const stage = scene.stage ?? [];
      if (!stage.some(el => el.id === loc.elementId)) return null;
      return {
        stage: stage.map(el => (el.id === loc.elementId ? { ...el, text } : el)),
      };
    }

    case 'scriptLine': {
      const lines = (scene.script ?? '').split('\n');
      const line = lines[loc.lineIndex];
      if (line === undefined) return null;
      if (loc.start > line.length || loc.end > line.length || loc.start > loc.end) return null;
      // Guard against writing into a span that has shifted underneath us.
      if (line.slice(loc.start, loc.end) !== entry.text) return null;

      lines[loc.lineIndex] = line.slice(0, loc.start) + text + line.slice(loc.end);
      return { script: lines.join('\n') };
    }

    case 'button':
      return null; // lives on game.buttons; the caller writes it
  }
}

/** Words across everything the player will actually read. */
export function countSpokenWords(entries: SceneTextEntry[]): number {
  return entries
    .filter(e => e.kind === 'dialogue' || e.kind === 'choice' || e.kind === 'balloon')
    .reduce((sum, e) => sum + (e.text.trim() ? e.text.trim().split(/\s+/).length : 0), 0);
}

/** The kinds a player actually sees, for the "spoken only" filter. */
export const SPOKEN_KINDS: SceneTextKind[] = ['dialogue', 'choice', 'balloon', 'buttonLabel'];
