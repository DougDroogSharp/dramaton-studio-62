import { describe, it, expect } from 'vitest';
import { GameData, Scene } from '@/types';
import {
  collectSceneText,
  applySceneTextEdit,
  countSpokenWords,
  SceneTextEntry,
} from '@/utils/sceneText';
import { parseScript, DialogueCommand, ChoiceCommand } from '@/utils/scriptParser';

const SCRIPT = [
  '# Scene: The Alley',
  '',
  '[BGM: "rain" loop vol=70%]',
  'Detective: "The clues are all here."',
  '[ENTER suspect at 20,70]',
  'Suspect (thinking): "He knows."',
  'Narrator: Nobody moved.',
  '',
  '[CHOICE]',
  '- "Accuse him" -> scene_accuse',
  '- "Walk away" -> scene_leave',
  '[/CHOICE]',
  '[BUTTON go_north]',
].join('\n');

const makeGame = (scene: Scene): GameData => ({
  info: {
    title: 'Test', author: 'Doug', styleGuide: null, worldState: {},
    gameMode: 'INTERACTIVE', enableAutosave: true,
  },
  actors: [],
  scenes: [scene],
  drops: [],
  items: [],
  sfx: [],
  buttons: [{
    id: 'go_north', name: 'North', label: 'Head north',
    x: 10, y: 10, width: 20, height: 10,
  }],
  episodes: [],
  subplots: [],
});

const makeScene = (): Scene => ({
  id: 'scene_1',
  name: 'The Alley',
  note: 'Rewrite the suspect.',
  script: SCRIPT,
  stage: [
    { id: 'el_1', assetId: '', type: 'BALLOON', x: 50, y: 50, scale: 1, zIndex: 1, rotation: 0, text: 'Psst!', balloonType: 'SPEECH' },
    { id: 'el_2', assetId: 'actor_1', type: 'ACTOR', x: 20, y: 70, scale: 1, zIndex: 2, rotation: 0 },
  ],
});

const find = (entries: SceneTextEntry[], text: string) => {
  const hit = entries.find(e => e.text === text);
  if (!hit) throw new Error(`no entry with text "${text}"`);
  return hit;
};

describe('collectSceneText', () => {
  it('collects scene fields, dialogue, choices, notes, balloons and button labels', () => {
    const scene = makeScene();
    const entries = collectSceneText(scene, makeGame(scene));

    expect(entries.map(e => e.text)).toEqual([
      'The Alley',
      'Rewrite the suspect.',
      'Scene: The Alley',
      'The clues are all here.',
      'He knows.',
      'Nobody moved.',
      'Accuse him',
      'Walk away',
      'Psst!',
      'Head north',
    ]);
  });

  it('labels dialogue by speaker and marks thinking', () => {
    const scene = makeScene();
    const entries = collectSceneText(scene, makeGame(scene));

    expect(find(entries, 'The clues are all here.').label).toBe('Detective');
    expect(find(entries, 'He knows.').label).toBe('Suspect');
    expect(find(entries, 'He knows.').hint).toBe('thinking');
    expect(find(entries, 'The clues are all here.').hint).toBeUndefined();
  });

  it('labels choices with their target scene', () => {
    const scene = makeScene();
    const entries = collectSceneText(scene, makeGame(scene));
    expect(find(entries, 'Accuse him').hint).toBe('-> scene_accuse');
  });

  it('ignores bracketed commands and blank lines', () => {
    const scene = makeScene();
    const entries = collectSceneText(scene, makeGame(scene));
    expect(entries.some(e => e.text.includes('rain'))).toBe(false);
    expect(entries.some(e => e.text.includes('ENTER'))).toBe(false);
  });

  it('only treats dash lines inside a CHOICE block as choices', () => {
    const scene: Scene = { id: 's', name: 'S', script: '- "loose" -> nowhere' };
    const entries = collectSceneText(scene, makeGame(scene));
    expect(entries.some(e => e.kind === 'choice')).toBe(false);
  });

  it('marks button labels as shared', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'Head north');
    expect(entry.shared).toBe(true);
    expect(entry.location).toEqual({ type: 'button', buttonId: 'go_north' });
  });

  it('survives a scene with no script and no stage', () => {
    const scene: Scene = { id: 's', name: 'Empty' };
    const entries = collectSceneText(scene, makeGame(scene));
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('sceneName');
  });
});

describe('applySceneTextEdit', () => {
  it('rewrites dialogue in place and leaves the rest of the script untouched', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'The clues are all here.');
    const updates = applySceneTextEdit(scene, entry, 'Every clue is right here.');

    expect(updates?.script).toBe(
      SCRIPT.replace('The clues are all here.', 'Every clue is right here.')
    );
    // Nothing else moved: same line count, blank lines and commands intact.
    expect(updates!.script!.split('\n')).toHaveLength(SCRIPT.split('\n').length);
    expect(updates!.script).toContain('[BGM: "rain" loop vol=70%]');
    expect(updates!.script).toContain('\n\n');
  });

  it('produces a script the parser reads back as the new dialogue', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'He knows.');
    const updates = applySceneTextEdit(scene, entry, 'He knows, and he is enjoying it.');

    const dialogue = parseScript(updates!.script!)
      .filter((c): c is DialogueCommand => c.type === 'DIALOGUE');
    const suspect = dialogue.find(d => d.actorName === 'Suspect');
    expect(suspect?.text).toBe('He knows, and he is enjoying it.');
    expect(suspect?.style).toBe('thought');
  });

  it('rewrites a choice option without disturbing its target', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'Walk away');
    const updates = applySceneTextEdit(scene, entry, 'Turn your back on him');

    const choice = parseScript(updates!.script!)
      .find((c): c is ChoiceCommand => c.type === 'CHOICE');
    expect(choice?.options).toEqual([
      { text: 'Accuse him', target: 'scene_accuse' },
      { text: 'Turn your back on him', target: 'scene_leave' },
    ]);
  });

  it('replaces quotes in choice text, which the parser cannot hold', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'Accuse him');
    const updates = applySceneTextEdit(scene, entry, 'Say "it was you"');

    const choice = parseScript(updates!.script!)
      .find((c): c is ChoiceCommand => c.type === 'CHOICE');
    expect(choice?.options[0].text).toBe("Say 'it was you'");
  });

  it('collapses newlines in single-line slots so the script cannot split', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'Nobody moved.');
    const updates = applySceneTextEdit(scene, entry, 'Nobody moved.\nNobody breathed.');

    expect(updates!.script!.split('\n')).toHaveLength(SCRIPT.split('\n').length);
    expect(updates!.script).toContain('Narrator: Nobody moved. Nobody breathed.');
  });

  it('keeps newlines in balloon text', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'Psst!');
    const updates = applySceneTextEdit(scene, entry, 'Psst!\nOver here.');

    expect(updates?.stage?.find(e => e.id === 'el_1')?.text).toBe('Psst!\nOver here.');
    // The actor element is carried through untouched.
    expect(updates?.stage?.find(e => e.id === 'el_2')?.type).toBe('ACTOR');
  });

  it('rewrites scene name and note', () => {
    const scene = makeScene();
    const entries = collectSceneText(scene, makeGame(scene));
    expect(applySceneTextEdit(scene, find(entries, 'The Alley'), 'The Back Alley'))
      .toEqual({ name: 'The Back Alley' });
    expect(applySceneTextEdit(scene, find(entries, 'Rewrite the suspect.'), 'Done.'))
      .toEqual({ note: 'Done.' });
  });

  it('refuses a stale span rather than writing over the wrong text', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'The clues are all here.');
    // The script changed underneath this entry (a line was removed above it).
    const moved: Scene = { ...scene, script: SCRIPT.split('\n').slice(2).join('\n') };
    expect(applySceneTextEdit(moved, entry, 'nope')).toBeNull();
  });

  it('refuses a balloon that no longer exists', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'Psst!');
    const without: Scene = { ...scene, stage: scene.stage!.filter(e => e.id !== 'el_1') };
    expect(applySceneTextEdit(without, entry, 'nope')).toBeNull();
  });

  it('leaves button labels to the caller', () => {
    const scene = makeScene();
    const entry = find(collectSceneText(scene, makeGame(scene)), 'Head north');
    expect(applySceneTextEdit(scene, entry, 'Go north')).toBeNull();
  });

  it('round-trips repeated edits without drift', () => {
    let scene = makeScene();
    for (const [from, to] of [
      ['The clues are all here.', 'Everything is here.'],
      ['He knows.', 'He knows it all.'],
      ['Nobody moved.', 'Nobody stirred.'],
    ]) {
      const entry = find(collectSceneText(scene, makeGame(scene)), from);
      scene = { ...scene, ...applySceneTextEdit(scene, entry, to)! };
    }

    const texts = parseScript(scene.script!)
      .filter((c): c is DialogueCommand => c.type === 'DIALOGUE')
      .map(d => d.text);
    expect(texts).toEqual(['Everything is here.', 'He knows it all.', 'Nobody stirred.']);
    expect(scene.script!.split('\n')).toHaveLength(SCRIPT.split('\n').length);
  });
});

describe('countSpokenWords', () => {
  it('counts only what the player reads', () => {
    const scene = makeScene();
    const entries = collectSceneText(scene, makeGame(scene));
    // 5 + 2 + 2 (dialogue) + 2 + 2 (choices) + 1 (balloon) = 14
    expect(countSpokenWords(entries)).toBe(14);
  });
});
