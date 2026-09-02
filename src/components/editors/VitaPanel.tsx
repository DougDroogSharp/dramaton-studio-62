import { useState } from 'react';
import { Actor, GameData } from '@/types';
import {
  vitaVariables,
  syncVitaToWorldState,
  applyVitaPreset,
  presetFromActor,
  defaultGauge,
  defaultKnob,
} from '@/utils/vita';
import { Gauge as GaugeIcon, SlidersHorizontal, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

// Vita instrumentation panel: presets up front (Happy Voracious, Starving
// Lazy, ...), the raw gauges/knobs underneath for advanced users. Every
// change is synced into world state so scripts and Narraton see it.

interface VitaPanelProps {
  game: GameData;
  actor: Actor;
  onChange: (game: GameData) => void;
}

const numInput =
  'w-14 bg-diesel-panel border border-diesel-border rounded px-1.5 py-0.5 text-xs font-mono text-diesel-paper focus:outline-none focus:border-diesel-gold/50';
const nameInput =
  'flex-1 min-w-0 bg-diesel-panel border border-diesel-border rounded px-2 py-0.5 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50';

export const VitaPanel = ({ game, actor, onChange }: VitaPanelProps) => {
  const [presetId, setPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const gauges = actor.gauges ?? [];
  const knobs = actor.knobs ?? [];

  // One path for every edit: update the actor AND materialize its variables
  // into world state, clearing the previous actor's now-stale names.
  const updateVita = (updates: Partial<Actor>) => {
    const updated = { ...actor, ...updates };
    const withActor = {
      ...game,
      actors: game.actors.map(a => (a.id === actor.id ? updated : a)),
    };
    onChange(syncVitaToWorldState(withActor, updated, actor));
  };

  const handleApplyPreset = () => {
    const preset = (game.vitaPresets ?? []).find(p => p.id === presetId);
    if (!preset) return;
    const dressed = applyVitaPreset(actor, preset);
    updateVita({ gauges: dressed.gauges, knobs: dressed.knobs });
    toast.success(`Applied "${preset.name}" to ${actor.name}`);
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const preset = presetFromActor(actor, name);
    // presets are game-level, so this edit does not go through updateVita
    onChange({ ...game, vitaPresets: [...(game.vitaPresets ?? []), preset] });
    setPresetName('');
    toast.success(`Preset "${name}" saved`);
  };

  const exposed = vitaVariables(actor);

  return (
    <section>
      <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
        Vita — Gauges & Knobs
      </h3>

      {/* Presets: the friendly surface */}
      <div className="flex gap-1.5 items-center mb-3">
        <select
          value={presetId}
          onChange={e => setPresetId(e.target.value)}
          className="flex-1 bg-diesel-panel border border-diesel-border rounded px-2 py-1.5 text-xs text-diesel-paper focus:outline-none focus:border-diesel-gold/50"
        >
          <option value="">— pick a preset —</option>
          {(game.vitaPresets ?? []).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={handleApplyPreset}
          disabled={!presetId}
          className="px-3 py-1.5 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 disabled:opacity-30"
        >
          Apply
        </button>
      </div>

      {/* Gauges */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-diesel-steel uppercase tracking-widest flex items-center gap-1">
            <GaugeIcon size={11} />
            Gauges — level / red line / goal
          </span>
          <button
            onClick={() => updateVita({ gauges: [...gauges, defaultGauge()] })}
            className="text-diesel-gold/70 hover:text-diesel-gold"
            title="Add gauge"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1">
          {gauges.length === 0 ? (
            <p className="text-diesel-steel/50 text-[10px]">no gauges — apply a preset or add one</p>
          ) : (
            gauges.map((g, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={g.name}
                  onChange={e => updateVita({ gauges: gauges.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                  placeholder="gauge name"
                  className={nameInput}
                />
                {(['level', 'redLine', 'goal'] as const).map(field => (
                  <input
                    key={field}
                    type="number"
                    title={field === 'redLine' ? 'red line' : field}
                    value={g[field]}
                    onChange={e => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v)) {
                        updateVita({ gauges: gauges.map((x, j) => (j === i ? { ...x, [field]: v } : x)) });
                      }
                    }}
                    className={numInput}
                  />
                ))}
                <button
                  onClick={() => updateVita({ gauges: gauges.filter((_, j) => j !== i) })}
                  className="text-diesel-rust/60 hover:text-diesel-rust"
                  title="Remove gauge"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Knobs */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-diesel-steel uppercase tracking-widest flex items-center gap-1">
            <SlidersHorizontal size={11} />
            Knobs
          </span>
          <button
            onClick={() => updateVita({ knobs: [...knobs, defaultKnob()] })}
            className="text-diesel-gold/70 hover:text-diesel-gold"
            title="Add knob"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1">
          {knobs.length === 0 ? (
            <p className="text-diesel-steel/50 text-[10px]">no knobs yet</p>
          ) : (
            knobs.map((k, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={k.name}
                  onChange={e => updateVita({ knobs: knobs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                  placeholder="knob name"
                  className={nameInput}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={k.value}
                  onChange={e => updateVita({ knobs: knobs.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)) })}
                  className="flex-1 accent-[#c9a227]"
                />
                <input
                  type="number"
                  value={k.value}
                  onChange={e => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) {
                      updateVita({ knobs: knobs.map((x, j) => (j === i ? { ...x, value: v } : x)) });
                    }
                  }}
                  className={numInput}
                />
                <button
                  onClick={() => updateVita({ knobs: knobs.filter((_, j) => j !== i) })}
                  className="text-diesel-rust/60 hover:text-diesel-rust"
                  title="Remove knob"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save current dials as a preset */}
      {(gauges.length > 0 || knobs.length > 0) && (
        <div className="flex gap-1.5 items-center mb-3">
          <input
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
            placeholder="Save current dials as preset..."
            className={nameInput}
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="px-3 py-1 bg-diesel-green/20 border border-diesel-green text-diesel-green text-xs font-bold uppercase hover:bg-diesel-green/30 disabled:opacity-30 flex items-center gap-1"
          >
            <Save size={11} />
            Save
          </button>
        </div>
      )}

      {/* Exposed variables: the scripting contract */}
      {Object.keys(exposed).length > 0 && (
        <div>
          <span className="text-[10px] text-diesel-steel uppercase tracking-widest">
            Exposed to scripting (world variables)
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(exposed).map(([name, value]) => (
              <span key={name} className="px-1.5 py-0.5 bg-diesel-cyan/10 border border-diesel-cyan/30 rounded text-[10px] font-mono text-diesel-cyan">
                {name}={value}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
