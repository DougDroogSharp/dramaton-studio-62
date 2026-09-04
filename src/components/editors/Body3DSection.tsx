// 3-D BODY: the affordance card the "3-D actor" facet snaps onto a thing
// (Doug's object-centric frame, 2026-09-02: not a page, a halo on the
// object). Verbs: give it a body (from words · from its picture · from the
// store · from a file); gauges: rig, height; knobs: moves (library clips as
// [POSE] words), look (snapshot). The actor wears a Skin whose modelFile
// points into the one model store. Plan: docs/editor/ACTOR_3D_PLAN.md.
//
// Filed 2026-09-02 22:07 -07:00 by EDITOR (actor-3d lane); the Meshy and
// file verbs added 2026-09-03 00:40 -07:00.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Actor, ClipRef, GameData, Skin, Utterance } from '@/types';
import { Body3DPanel, Body3DPanelHandle, Body3DInfo } from '@/components/editors/Body3DPanel';
import { isSkinAllowed, skinFromStoreEntry, clipPoseName } from '@/utils/skins';
import { rigLabel } from '@/utils/rigKind';
import { TARGET_H } from '@/utils/rig3d';
import {
  BodyProgress, CREDITS_FROM_PICTURE, CREDITS_FROM_WORDS, StoredBodyResult, bodyPromptFor, importBodyFile, makeBody,
} from '@/utils/meshyClient';
import { openBinaryFileWithPicker } from '@/utils/filePicker';
import DieselpunkLoader from '@/components/DieselpunkLoader';
import { Box, Camera, Film, FileUp, Image as ImageIcon, MessageSquareText, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface StoreEntry { file: string; name: string; mb?: number; _note?: string }
interface StoreListing { skins: StoreEntry[]; clips: StoreEntry[]; props: StoreEntry[]; error?: string }

interface Body3DSectionProps {
  game: GameData;
  actor: Actor;
  onChange: (game: GameData) => void;
}

const selectClass = 'bg-diesel-panel border border-diesel-border rounded px-2 py-1.5 text-xs text-diesel-paper focus:outline-none focus:border-diesel-gold/50';
const chipClass = 'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border cursor-pointer';
const verb = 'flex items-center gap-1 px-3 py-2 border text-[11px] font-bold uppercase tracking-wider transition-colors';
const verbOff = `${verb} border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold`;
const verbOn = `${verb} border-diesel-gold bg-diesel-gold/20 text-diesel-gold`;

const BODY_FILE_OPTIONS = {
  types: [{ description: '3D bodies', accept: { 'model/gltf-binary': ['.glb', '.vrm'], 'model/gltf+json': ['.gltf'], 'application/octet-stream': ['.fbx'] } }],
};

export const Body3DSection = ({ game, actor, onChange }: Body3DSectionProps) => {
  const skins = game.skins ?? [];
  const skin = actor.skinId ? skins.find(s => s.id === actor.skinId) : undefined;
  const [store, setStore] = useState<StoreListing | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  // Which clip the preview plays: own:<name> | lib:<file> | ''
  const [clipChoice, setClipChoice] = useState('');
  // "Give it a body" mode: words | picture | null
  const [mode, setMode] = useState<'words' | 'picture' | null>(null);
  const [prompt, setPrompt] = useState('');
  const [progress, setProgress] = useState<BodyProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<Body3DPanelHandle>(null);
  // The live game for callbacks that outlive a render (the Meshy chain runs minutes).
  const gameRef = useRef(game);
  gameRef.current = game;

  const refreshStore = () => {
    fetch('/api/models/list')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: StoreListing) => { setStore(data); if (data.error) setStoreError(data.error); else setStoreError(null); })
      .catch((err: unknown) => setStoreError(`model store not reachable (dev server only): ${err instanceof Error ? err.message : String(err)}`));
  };
  useEffect(() => { refreshStore(); }, []);

  // Reset the clip choice when the body changes.
  useEffect(() => { setClipChoice(''); }, [actor.skinId]);

  const updateSkin = (id: string, updates: Partial<Skin>) => {
    onChange({ ...game, skins: skins.map(s => (s.id === id ? { ...s, ...updates } : s)) });
  };

  const wear = (g: GameData, newSkin: Skin, line?: Utterance): GameData => ({
    ...g,
    skins: [...(g.skins ?? []), newSkin],
    actors: g.actors.map(a => (a.id === actor.id
      ? { ...a, skinId: newSkin.id, status: a.status === 'new' ? 'work' : a.status, ...(line ? { log: [...(a.log ?? []), line] } : {}) }
      : a)),
  });

  const setBody = (value: string) => {
    if (!value) {
      onChange({ ...game, actors: game.actors.map(a => (a.id === actor.id ? { ...a, skinId: undefined } : a)) });
      return;
    }
    if (value.startsWith('store:')) {
      const file = value.slice('store:'.length);
      const entry = store?.skins.find(e => e.file === file);
      if (!entry) return;
      const newSkin = skinFromStoreEntry(entry);
      onChange(wear(game, newSkin));
      toast.success(`${actor.name} wears "${newSkin.name}" from the model store`);
      return;
    }
    onChange({ ...game, actors: game.actors.map(a => (a.id === actor.id ? { ...a, skinId: value } : a)) });
  };

  // A body came back from Meshy or from disk: it joins the store listing,
  // the skin library, the actor, and the actor's conversation.
  const adopt = (result: StoredBodyResult, source: Skin['source']) => {
    const filedAt = new Date().toISOString();
    const newSkin: Skin = {
      id: `skin_${Date.now()}`,
      name: actor.name,
      fileName: result.file,
      modelFile: result.file,
      animations: [],
      rig: result.humanoid ? 'mixamorig' : 'static',
      ...(result.clips.length > 0 ? { clipRefs: result.clips } : {}),
      source: { ...source, filedAt } as Skin['source'],
      status: 'work',
    };
    const line: Utterance = {
      at: filedAt,
      who: 'phrog',
      text: result.humanoid
        ? `Made a body (${result.how}); it walks. Bones renamed to Mixamo names (${result.renamedBones}). Moves so far: ${result.clips.map(c => c.name).join(', ') || 'none'}.`
        : `Made a body (${result.how}); it came back without a walkable rig, so it is a prop in the store, not registered as a walker.`,
      turned: [{ path: `${actor.name.toLowerCase()}.body`, to: result.file }],
    };
    onChange(wear(gameRef.current, newSkin, line));
    refreshStore();
    toast.success(result.humanoid ? `${actor.name} has a body and it walks` : `${actor.name} has a body (no rig: a prop)`);
  };

  const runMake = async (opts: { prompt?: string; imageDataUrl?: string }, source: Skin['source']) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setProgress({ stage: opts.prompt ? 'preview' : 'image', label: 'Asking Meshy', percent: 0 });
    try {
      const result = await makeBody({ name: actor.name, ...opts, signal: ac.signal }, setProgress);
      adopt(result, source);
      setMode(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
      console.error('give it a body:', err);
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const fromWords = () => {
    // The box shows the prefilled words until the creator edits them.
    const text = (prompt || bodyPromptFor(actor)).trim();
    if (!text) { toast.error('Say what it looks like first'); return; }
    runMake({ prompt: text }, { kind: 'meshy-text', prompt: text, filedAt: '' });
  };

  const picture = actor.referenceImageFullBody || actor.image || actor.graphics.find(g => g.image)?.image;
  const fromPicture = () => {
    if (!picture) { toast.error('No picture yet: add a Body reference image or a sprite first'); return; }
    runMake({ imageDataUrl: picture }, { kind: 'meshy-image', filedAt: '' });
  };

  const fromFile = async () => {
    const picked = await openBinaryFileWithPicker(BODY_FILE_OPTIONS);
    if (!picked) return;
    setProgress({ stage: 'save', label: `Copying ${picked.name} into the model store`, percent: 50 });
    try {
      const result = await importBodyFile(actor.name, picked.name, picked.data);
      adopt(result, { kind: 'import', filedAt: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setProgress(null);
    }
  };

  // What the preview learned: fill the manifest in once, never loop.
  const onLoaded = (info: Body3DInfo) => {
    if (!skin) return;
    const updates: Partial<Skin> = {};
    if (skin.rig !== info.rig) updates.rig = info.rig;
    if (skin.heightM === undefined || Math.abs(skin.heightM - info.heightM) > 0.001) updates.heightM = Math.round(info.heightM * 1000) / 1000;
    if (skin.animations.length === 0 && info.animations.length > 0) updates.animations = info.animations;
    if (Object.keys(updates).length > 0) updateSkin(skin.id, updates);
  };

  // Store files not yet in this game's skin library.
  const storeChoices = useMemo(() => {
    const used = new Set(skins.map(s => s.modelFile).filter(Boolean));
    return (store?.skins ?? []).filter(e => !used.has(e.file));
  }, [store, skins]);

  const linkable = skin && !skin.modelFile && skin.fileName
    ? store?.skins.find(e => e.file === skin.fileName)
    : undefined;

  const assignClip = (entry: StoreEntry) => {
    if (!skin) return;
    const name = clipPoseName(entry.name);
    const refs = skin.clipRefs ?? [];
    if (refs.some(r => r.file === entry.file)) return;
    updateSkin(skin.id, { clipRefs: [...refs, { name, file: entry.file }] });
    toast.success(`Pose "${name}" assigned from the clip library`);
  };

  const removeClip = (ref: ClipRef) => {
    if (!skin) return;
    updateSkin(skin.id, { clipRefs: (skin.clipRefs ?? []).filter(r => r.file !== ref.file) });
    if (clipChoice === `lib:${ref.file}`) setClipChoice('');
  };

  const snapshot = () => {
    const png = panelRef.current?.snapshot();
    if (!png) { toast.error('Nothing to snapshot yet'); return; }
    onChange({ ...game, actors: game.actors.map(a => (a.id === actor.id ? { ...a, image: png } : a)) });
    toast.success('Snapshot saved as the actor thumbnail');
  };

  const clipUrl = clipChoice.startsWith('lib:') ? `/models/${clipChoice.slice(4)}` : undefined;
  const clipName = clipChoice.startsWith('own:') ? clipChoice.slice(4) : undefined;
  const libClipLabel = (file: string) => store?.clips.find(c => c.file === file)?.name ?? file;
  const busy = progress !== null;

  return (
    <section>
      <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2 flex items-center justify-between">
        <span><Box size={14} className="inline mr-2" />3-D Body</span>
        {skin && (
          <span className={`text-[10px] normal-case tracking-normal font-mono ${skin.rig === 'mixamorig' ? 'text-diesel-green' : skin.rig === 'static' ? 'text-diesel-rust' : 'text-diesel-steel'}`}>
            {rigLabel(skin.rig)}
            {skin.heightM !== undefined && ` · came in ${skin.heightM.toFixed(2)}, scaled to ${TARGET_H}`}
          </span>
        )}
      </h3>

      {/* GIVE IT A BODY: four ways in, said as verbs */}
      <div className="mb-3">
        <div className="text-[10px] text-diesel-steel uppercase tracking-widest mb-1.5">Give it a body</div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setMode(mode === 'words' ? null : 'words')} disabled={busy} className={`${mode === 'words' ? verbOn : verbOff} disabled:opacity-40`} title={`Meshy text-to-3D, then auto-rig · about ${CREDITS_FROM_WORDS} credits`}>
            <MessageSquareText size={12} /> from words
          </button>
          <button onClick={() => setMode(mode === 'picture' ? null : 'picture')} disabled={busy} className={`${mode === 'picture' ? verbOn : verbOff} disabled:opacity-40`} title={`Meshy image-to-3D from its picture, then auto-rig · about ${CREDITS_FROM_PICTURE} credits`}>
            <ImageIcon size={12} /> from its picture
          </button>
          <select value={skin ? skin.id : ''} onChange={e => setBody(e.target.value)} disabled={busy} className={`${selectClass} flex-1 min-w-[200px]`} title="From the model store, or this game's skins">
            <option value="">— from the store: pick a body —</option>
            {skins.length > 0 && (
              <optgroup label="This game's skins">
                {skins.map(s => {
                  const blocked = !isSkinAllowed(s, game.info.allowedSkinTypes);
                  return (
                    <option key={s.id} value={s.id} disabled={blocked}>
                      {s.name}{s.skinType ? ` [${s.skinType}]` : ''}{s.modelFile ? '' : ' (manifest only)'}{blocked ? ' (blocked by lockdown)' : ''}
                    </option>
                  );
                })}
              </optgroup>
            )}
            {storeChoices.length > 0 && (
              <optgroup label="Model store (rigged)">
                {storeChoices.map(e => (
                  <option key={e.file} value={`store:${e.file}`}>
                    {e.name}{e.mb ? ` · ${e.mb} MB` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button onClick={fromFile} disabled={busy} className={`${verbOff} disabled:opacity-40`} title="Copy a .glb / .fbx / .gltf / .vrm from disk into the model store">
            <FileUp size={12} /> from a file
          </button>
        </div>

        {mode === 'words' && !busy && (
          <div className="mt-2 border border-diesel-gold/40 bg-diesel-black p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-diesel-steel">What it looks like. The house style is already on the end; edit anything.</span>
              <button onClick={() => setPrompt(bodyPromptFor(actor))} className="text-[10px] text-diesel-steel hover:text-diesel-paper">Reset words</button>
            </div>
            <textarea
              value={prompt || bodyPromptFor(actor)}
              onChange={e => setPrompt(e.target.value)}
              className="w-full h-24 bg-diesel-dark border border-diesel-border text-diesel-paper p-2 text-xs font-mono resize-none focus:outline-none focus:border-diesel-gold"
            />
            <div className="flex justify-end mt-2">
              <button onClick={fromWords} className={`${verbOn} flex items-center gap-1`} title="Spends Meshy credits">
                <Sparkles size={12} /> Make it · about {CREDITS_FROM_WORDS} credits
              </button>
            </div>
          </div>
        )}

        {mode === 'picture' && !busy && (
          <div className="mt-2 border border-diesel-gold/40 bg-diesel-black p-2 flex items-center gap-3">
            {picture ? (
              <img src={picture} alt="its picture" className="w-16 h-16 object-contain border border-diesel-border bg-diesel-panel" />
            ) : (
              <div className="w-16 h-16 border border-dashed border-diesel-border flex items-center justify-center text-diesel-steel"><ImageIcon size={16} /></div>
            )}
            <div className="flex-1 text-[10px] text-diesel-steel">
              {picture ? 'Meshy builds the body from this picture (the Body reference, else the thumbnail, else a sprite), then rigs it.' : 'No picture yet. Add a Body reference image above, or snapshot a sprite first.'}
            </div>
            <button onClick={fromPicture} disabled={!picture} className={`${verbOn} flex items-center gap-1 disabled:opacity-40`} title="Spends Meshy credits">
              <Sparkles size={12} /> Make it · about {CREDITS_FROM_PICTURE} credits
            </button>
          </div>
        )}

        {busy && progress && (
          <div className="mt-2 border border-diesel-border bg-diesel-black p-3 flex items-center gap-4">
            <DieselpunkLoader size="sm" message={progress.stage.toUpperCase()} />
            <div className="flex-1">
              <div className="text-xs text-diesel-paper">{progress.label}</div>
              <div className="h-1.5 bg-diesel-panel border border-diesel-border mt-1">
                <div className="h-full bg-diesel-gold transition-all" style={{ width: `${Math.max(2, Math.min(100, progress.percent))}%` }} />
              </div>
              <div className="text-[10px] font-mono text-diesel-steel mt-1">{progress.stage} · {progress.percent}% · minutes, not seconds</div>
            </div>
            {abortRef.current && (
              <button onClick={() => abortRef.current?.abort()} className={verbOff} title="Stop waiting (the Meshy task keeps running on their side)">stop</button>
            )}
          </div>
        )}
      </div>

      {storeError && (
        <p className="text-diesel-rust/80 text-[10px] font-mono mb-2">{storeError}</p>
      )}

      {skin && !skin.modelFile && (
        <div className="text-diesel-steel text-[10px] mb-2 flex items-center gap-2">
          <span>Manifest-only skin (imported in the SK tab): no model file to preview.</span>
          {linkable && (
            <button onClick={() => updateSkin(skin.id, { modelFile: linkable.file, source: { kind: 'store', filedAt: new Date().toISOString() } })} className="px-2 py-0.5 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/20">
              Link to store copy
            </button>
          )}
        </div>
      )}

      {skin?.modelFile && (
        <>
          <div className="border border-diesel-border bg-diesel-black" style={{ height: 320 }}>
            <Body3DPanel
              ref={panelRef}
              modelUrl={`/models/${skin.modelFile}`}
              clipName={clipName}
              clipUrl={clipUrl}
              onLoaded={onLoaded}
              className="w-full h-full"
            />
          </div>

          {/* Clip row: preview any clip; assign library clips as poses */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Film size={12} className="text-diesel-steel" />
            <select value={clipChoice} onChange={e => setClipChoice(e.target.value)} className={`${selectClass} flex-1 min-w-[160px]`} title="Preview clip">
              <option value="">rest pose</option>
              {skin.animations.length > 0 && (
                <optgroup label="This model's clips">
                  {skin.animations.map(a => <option key={a} value={`own:${a}`}>{a}</option>)}
                </optgroup>
              )}
              {(skin.clipRefs ?? []).length > 0 && (
                <optgroup label="Its moves">
                  {(skin.clipRefs ?? []).map(c => <option key={c.file} value={`lib:${c.file}`}>{c.name}</option>)}
                </optgroup>
              )}
              {(store?.clips.length ?? 0) > 0 && (
                <optgroup label="Clip library (bones only, joins by bone name)">
                  {store!.clips.map(c => <option key={c.file} value={`lib:${c.file}`}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
            {clipChoice.startsWith('lib:') && (
              <button
                onClick={() => { const e = store?.clips.find(c => c.file === clipChoice.slice(4)); if (e) assignClip(e); }}
                disabled={(skin.clipRefs ?? []).some(r => r.file === clipChoice.slice(4))}
                className="px-2 py-1.5 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-[10px] font-bold uppercase hover:bg-diesel-gold/30 disabled:opacity-40"
              >
                Assign as pose
              </button>
            )}
            <button onClick={snapshot} className="flex items-center gap-1 px-2 py-1.5 border border-diesel-paper text-diesel-paper text-[10px] font-bold uppercase hover:bg-diesel-paper/10" title="Render this view to the actor thumbnail">
              <Camera size={10} /> Snapshot
            </button>
          </div>

          {/* Assigned library clips = pose words for Dramscript */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-diesel-steel uppercase tracking-widest">Moves:</span>
            {(skin.clipRefs ?? []).length === 0 ? (
              <span className="text-[10px] text-diesel-steel/60">none yet — preview a library clip and assign it</span>
            ) : (
              (skin.clipRefs ?? []).map(r => (
                <span
                  key={r.file}
                  onClick={() => setClipChoice(`lib:${r.file}`)}
                  title={`${libClipLabel(r.file)} · ${r.file}`}
                  className={`${chipClass} ${clipChoice === `lib:${r.file}` ? 'bg-diesel-cyan/20 border-diesel-cyan text-diesel-cyan' : 'bg-diesel-cyan/10 border-diesel-cyan/40 text-diesel-cyan'}`}
                >
                  {r.name}
                  <button onClick={e => { e.stopPropagation(); removeClip(r); }} className="hover:text-diesel-rust" title="Unassign"><X size={10} /></button>
                </span>
              ))
            )}
          </div>

          <p className="text-diesel-steel/60 text-[10px] font-mono mt-2">
            {skin.modelFile} · {skin.source ? `${skin.source.kind} · ${skin.source.filedAt.slice(0, 16).replace('T', ' ')}` : 'source unknown'}
            {skin.source?.taskIds ? ` · Meshy ${Object.entries(skin.source.taskIds).map(([k, v]) => `${k} ${v.slice(0, 8)}…`).join(', ')}` : ''}
            {' · '}model clips and moves are offered as poses in the Dramscript editor.
          </p>
        </>
      )}
    </section>
  );
};
