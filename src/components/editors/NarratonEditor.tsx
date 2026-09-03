import React from 'react';
import { NarratonMeta, NarratonRequirement, NarratonKey, NarratonAct } from '@/types';
import { OPERATORS } from '@/constants';
import { Plus, X } from 'lucide-react';

// Narraton selection metadata panel for the scene editor.
// pool: which [NARRATON pool=x] draws this scene.
// keys: target values, least-squares matched against worldState.
// requires: hard gates. repeatable/subplot/weight: rotation & bias.

interface NarratonEditorProps {
  meta: NarratonMeta | undefined;
  worldStateVars: string[]; // known variable names for datalist hints
  // The editor's named subplots (GameData.subplots); `subplot` may hold one
  // of their ids, or any free string.
  subplots?: { id: string; name: string; owner?: string }[];
  onChange: (meta: NarratonMeta | undefined) => void;
}

const ACTS: NarratonAct[] = ['BEGINNING', 'MIDDLE', 'END'];

const inputCls =
  'bg-diesel-dark border border-diesel-border text-diesel-paper p-1.5 text-xs focus:outline-none focus:border-diesel-gold';

const keyTarget = (k: number | NarratonKey): number => (typeof k === 'number' ? k : k.target);
const keyScale = (k: number | NarratonKey): number => (typeof k === 'number' ? 100 : (k.scale ?? 100));

export const NarratonEditor: React.FC<NarratonEditorProps> = ({ meta, worldStateVars, subplots = [], onChange }) => {
  const update = (patch: Partial<NarratonMeta>) => {
    onChange({ pool: meta?.pool ?? '', ...meta, ...patch });
  };

  const setPool = (pool: string) => {
    if (pool.trim() === '' && meta) {
      // Clearing the pool removes the scene from Narraton selection
      onChange(undefined);
      return;
    }
    update({ pool: pool.trim() });
  };

  const keys = meta?.keys ?? {};
  const requires = meta?.requires ?? [];

  const setKey = (variable: string, target: number, scale: number) => {
    const next = { ...keys };
    delete next[variable];
    next[variable] = scale === 100 ? target : { target, scale };
    update({ keys: next });
  };

  const renameKey = (oldVar: string, newVar: string) => {
    if (!newVar.trim() || newVar === oldVar) return;
    const next: Record<string, number | NarratonKey> = {};
    for (const [v, k] of Object.entries(keys)) next[v === oldVar ? newVar.trim() : v] = k;
    update({ keys: next });
  };

  const removeKey = (variable: string) => {
    const next = { ...keys };
    delete next[variable];
    update({ keys: next });
  };

  const setRequirement = (index: number, patch: Partial<NarratonRequirement>) => {
    const next = requires.map((r, i) => (i === index ? { ...r, ...patch } : r));
    update({ requires: next });
  };

  const parseReqValue = (raw: string): string | number | boolean => {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw.trim() !== '' && !isNaN(Number(raw))) return Number(raw);
    return raw;
  };

  return (
    <section className="bg-diesel-black border border-diesel-border p-3">
      <h3 className="text-xs font-bold text-diesel-rust uppercase tracking-widest mb-1">Narraton</h3>
      <p className="text-[10px] text-diesel-steel mb-3">
        Storyteller selection: [NARRATON pool=…] picks the pool scene whose keys best match the world state.
        Empty pool = not selectable.
      </p>

      <datalist id="narraton-vars">
        {worldStateVars.map(v => <option key={v} value={v} />)}
      </datalist>
      <datalist id="narraton-subplots">
        {subplots.map(sp => <option key={sp.id} value={sp.id}>{sp.name}{sp.owner ? ` (${sp.owner})` : ''}</option>)}
      </datalist>

      {/* Pool */}
      <div className="flex flex-col gap-1 mb-3">
        <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Pool</label>
        <input
          type="text"
          value={meta?.pool ?? ''}
          onChange={e => setPool(e.target.value)}
          placeholder="e.g. main"
          className={inputCls}
        />
      </div>

      {meta && (
        <>
          {/* Keys */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">
                Keys <span className="text-diesel-steel normal-case tracking-normal">(variable → target, ÷scale)</span>
              </label>
              <button
                onClick={() => setKey(`var${Object.keys(keys).length + 1}`, 50, 100)}
                className="p-1 text-diesel-gold hover:text-diesel-paper"
                title="Add key"
              >
                <Plus size={12} />
              </button>
            </div>
            {Object.entries(keys).map(([variable, k]) => (
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
                  value={keyTarget(k)}
                  onChange={e => setKey(variable, Number(e.target.value) || 0, keyScale(k))}
                  className={`${inputCls} w-16`}
                  title="Target value"
                />
                <input
                  type="number"
                  value={keyScale(k)}
                  onChange={e => setKey(variable, keyTarget(k), Number(e.target.value) || 100)}
                  className={`${inputCls} w-16`}
                  title="Scale (normalizes the delta; 100 for 0-100 variables)"
                />
                <button onClick={() => removeKey(variable)} className="p-1 text-diesel-rust hover:text-diesel-paper">
                  <X size={12} />
                </button>
              </div>
            ))}
            {Object.keys(keys).length === 0 && (
              <p className="text-[10px] text-diesel-steel italic">No keys: matches any state perfectly (score 0).</p>
            )}
          </div>

          {/* Requires */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Requires</label>
              <button
                onClick={() => update({ requires: [...requires, { variable: '', operator: '==', value: true }] })}
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
                  onClick={() => update({ requires: requires.filter((_, j) => j !== i) })}
                  className="p-1 text-diesel-rust hover:text-diesel-paper"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Act: dramatic position, gated against the `act` world variable */}
          <div className="mb-3">
            <label className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold block mb-1">Act</label>
            <div className="flex gap-1">
              {ACTS.map(a => (
                <button
                  key={a}
                  onClick={() => update({ act: meta.act === a ? undefined : a })}
                  className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-wider ${
                    meta.act === a
                      ? 'border-diesel-gold text-diesel-gold bg-diesel-gold/10'
                      : 'border-diesel-border text-diesel-steel hover:text-diesel-paper'
                  }`}
                >
                  {a}
                </button>
              ))}
              <span className="text-[10px] text-diesel-steel self-center ml-1">untagged plays in any act</span>
            </div>
          </div>

          {/* Repeatable / Subplot / Weight */}
          <div className="flex gap-2 items-end">
            <label className="flex items-center gap-1.5 text-xs text-diesel-paper cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={meta.repeatable ?? false}
                onChange={e => update({ repeatable: e.target.checked })}
                className="accent-diesel-gold"
              />
              Repeatable
            </label>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <label className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold">Subplot</label>
              <input
                type="text"
                value={meta.subplot ?? ''}
                list="narraton-subplots"
                onChange={e => update({ subplot: e.target.value.trim() || undefined })}
                placeholder="(none)"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1 w-16">
              <label className="text-[10px] uppercase tracking-widest text-diesel-gold font-bold">Weight</label>
              <input
                type="number"
                step="0.1"
                value={meta.weight ?? 1}
                onChange={e => update({ weight: Number(e.target.value) || 1 })}
                className={inputCls}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
};
