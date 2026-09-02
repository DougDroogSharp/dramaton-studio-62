import React from 'react';
import { Scene, Subplot, NarratonRequirement, NarratonAct, ScenePhase } from '@/types';
import { OPERATORS } from '@/constants';
import { isNarratonCandidate } from '@/utils/narratonDirector';
import { Plus, X } from 'lucide-react';

// Narraton selection metadata panel for the scene editor. Edits the flat
// Narraton fields on Scene (the one shape, unified 2026-09-02):
//   pool: which [NARRATON pool=x] draws this scene.
//   key + keyScale: target values, least-squares matched against worldState.
//   requires: hard gates. repeatable / weight: history & bias.
//   act: story-act gate. phase / subplot: position in a subplot's bag.
// The Narraton tab (NarratonDirector) writes the same fields from the board.

interface NarratonEditorProps {
  scene: Scene;
  subplots: Subplot[];
  worldStateVars: string[]; // known variable names for datalist hints
  onChange: (patch: Partial<Scene>) => void;
}

const inputCls =
  'bg-diesel-dark border border-diesel-border text-diesel-paper p-1.5 text-xs focus:outline-none focus:border-diesel-gold';

const ACTS: NarratonAct[] = ['BEGINNING', 'MIDDLE', 'END'];
const PHASES: ScenePhase[] = ['BEGINNING', 'MIDDLE', 'END'];

const parseReqValue = (raw: string): string | number | boolean => {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.trim() !== '' && !isNaN(Number(raw))) return Number(raw);
  return raw;
};

export const NarratonEditor: React.FC<NarratonEditorProps> = ({ scene, subplots, worldStateVars, onChange }) => {
  const key = scene.key ?? {};
  const keyScale = scene.keyScale ?? {};
  const requires = scene.requires ?? [];
  const selectable = isNarratonCandidate(scene);

  const writeKeys = (nextKey: Record<string, number>, nextScale: Record<string, number>) => {
    onChange({
      key: Object.keys(nextKey).length > 0 ? nextKey : undefined,
      keyScale: Object.keys(nextScale).length > 0 ? nextScale : undefined,
    });
  };

  const setKey = (variable: string, target: number, scale: number) => {
    const nextKey = { ...key, [variable]: target };
    const nextScale = { ...keyScale };
    if (!Number.isFinite(scale) || scale <= 0 || scale === 100) delete nextScale[variable];
    else nextScale[variable] = scale;
    writeKeys(nextKey, nextScale);
  };

  const renameKey = (oldVar: string, newVar: string) => {
    const name = newVar.trim();
    if (!name || name === oldVar) return;
    const nextKey: Record<string, number> = {};
    for (const [v, t] of Object.entries(key)) nextKey[v === oldVar ? name : v] = t;
    const nextScale: Record<string, number> = {};
    for (const [v, s] of Object.entries(keyScale)) nextScale[v === oldVar ? name : v] = s;
    writeKeys(nextKey, nextScale);
  };

  const removeKey = (variable: string) => {
    const { [variable]: _t, ...nextKey } = key;
    const { [variable]: _s, ...nextScale } = keyScale;
    writeKeys(nextKey, nextScale);
  };

  const setRequirements = (next: NarratonRequirement[]) => {
    onChange({ requires: next.length > 0 ? next : undefined });
  };

  const setRequirement = (index: number, patch: Partial<NarratonRequirement>) => {
    setRequirements(requires.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <section className="bg-diesel-black border border-diesel-border p-3">
      <h3 className="text-xs font-bold text-diesel-rust uppercase tracking-widest mb-1">Narraton</h3>
      <p className="text-[10px] text-diesel-steel mb-3">
        Storyteller selection: [NARRATON pool=…] picks the pool scene whose keys best match the world state.
        {selectable ? '' : ' No pool and no keys: invisible to the selector.'}
      </p>

      <datalist id="narraton-vars">
        {worldStateVars.map(v => <option key={v} value={v} />)}
      </datalist>

      {/* Pool */}
      <div className="flex flex-col gap-1 mb-3">
        <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Pool</label>
        <input
          type="text"
          value={scene.pool ?? ''}
          onChange={e => onChange({ pool: e.target.value.trim() || undefined })}
          placeholder="e.g. main — empty: not drawn by [NARRATON]"
          className={inputCls}
        />
      </div>

      {/* Keys */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">
            Keys <span className="text-diesel-steel normal-case tracking-normal">(variable → target, over scale)</span>
          </label>
          <button
            onClick={() => setKey(`var${Object.keys(key).length + 1}`, 50, 100)}
            className="p-1 text-diesel-gold hover:text-diesel-paper"
            title="Add key"
          >
            <Plus size={12} />
          </button>
        </div>
        {Object.entries(key).map(([variable, target]) => (
          <div key={variable} className="flex gap-1 mb-1 items-center">
            <input
              type="text"
              defaultValue={variable}
              list="narraton-vars"
              onBlur={e => renameKey(variable, e.target.value)}
              className={`${inputCls} flex-1 min-w-0`}
              title="Variable"
            />
            <input
              type="number"
              value={target}
              onChange={e => setKey(variable, Number(e.target.value) || 0, keyScale[variable] ?? 100)}
              className={`${inputCls} w-16`}
              title="Target value"
            />
            <input
              type="number"
              value={keyScale[variable] ?? 100}
              onChange={e => setKey(variable, target, Number(e.target.value) || 100)}
              className={`${inputCls} w-16`}
              title="Scale: the variable's range (100 for 0-100 variables). A miss of more than half the scale excludes the scene."
            />
            <button onClick={() => removeKey(variable)} className="p-1 text-diesel-rust hover:text-diesel-paper">
              <X size={12} />
            </button>
          </div>
        ))}
        {Object.keys(key).length === 0 && (
          <p className="text-[10px] text-diesel-steel italic">No keys: matches any state perfectly (score 0).</p>
        )}
      </div>

      {/* Requires */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Requires</label>
          <button
            onClick={() => setRequirements([...requires, { variable: '', operator: '==', value: true }])}
            className="p-1 text-diesel-gold hover:text-diesel-paper"
            title="Add requirement"
          >
            <Plus size={12} />
          </button>
        </div>
        {requires.map((req, i) => (
          <div key={i} className="flex gap-1 mb-1 items-center">
            <input
              type="text"
              value={req.variable}
              list="narraton-vars"
              onChange={e => setRequirement(i, { variable: e.target.value })}
              placeholder="variable"
              className={`${inputCls} flex-1 min-w-0`}
            />
            <select
              value={req.operator}
              onChange={e => setRequirement(i, { operator: e.target.value as NarratonRequirement['operator'] })}
              className={`${inputCls} w-14`}
            >
              {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <input
              type="text"
              value={String(req.value)}
              onChange={e => setRequirement(i, { value: parseReqValue(e.target.value) })}
              placeholder="value"
              className={`${inputCls} w-16`}
            />
            <button
              onClick={() => setRequirements(requires.filter((_, j) => j !== i))}
              className="p-1 text-diesel-rust hover:text-diesel-paper"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Repeatable / Weight / Act */}
      <div className="flex gap-2 items-end mb-3">
        <label className="flex items-center gap-1.5 text-xs text-diesel-paper cursor-pointer pb-1.5">
          <input
            type="checkbox"
            checked={scene.repeatable ?? false}
            onChange={e => onChange({ repeatable: e.target.checked || undefined })}
            className="accent-diesel-gold"
          />
          Repeatable
        </label>
        <div className="flex flex-col gap-1 w-16">
          <label className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold">Weight</label>
          <input
            type="number"
            step="0.1"
            value={scene.weight ?? 1}
            onChange={e => {
              const w = Number(e.target.value);
              onChange({ weight: Number.isFinite(w) && w > 0 && w !== 1 ? w : undefined });
            }}
            className={inputCls}
            title="Score divides by this (default 1); heavier scenes win ties and near-ties"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold">Act</label>
          <select
            value={scene.act ?? ''}
            onChange={e => onChange({ act: (e.target.value || undefined) as NarratonAct | undefined })}
            className={inputCls}
            title="Story act gate against the `act` world variable (1/2/3 or the names); soft"
          >
            <option value="">any act</option>
            {ACTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Phase / Subplot (also on the Narraton tab's board) */}
      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-1 w-28">
          <label className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold">Phase</label>
          <select
            value={scene.phase ?? ''}
            onChange={e => onChange({ phase: (e.target.value || undefined) as ScenePhase | undefined })}
            className={inputCls}
            title="Position in the subplot's arc: MIDDLE waits for BEGINNING, END for MIDDLE"
          >
            <option value="">unphased</option>
            {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold">Subplot</label>
          <select
            value={scene.subplotId ?? ''}
            onChange={e => onChange({ subplotId: e.target.value || undefined })}
            className={inputCls}
            title="Owned bag of scenes; subplots are created on the Narraton tab"
          >
            <option value="">— no subplot —</option>
            {subplots.map(sp => (
              <option key={sp.id} value={sp.id}>
                {sp.name}{sp.owner ? ` (${sp.owner})` : ''}
              </option>
            ))}
            {scene.subplotId && !subplots.some(sp => sp.id === scene.subplotId) && (
              <option value={scene.subplotId}>{scene.subplotId} (missing)</option>
            )}
          </select>
        </div>
      </div>
    </section>
  );
};
