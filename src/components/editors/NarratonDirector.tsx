import { useState } from 'react';
import { DEFAULT_NARRATON_POOL, GameData, NarratonAct, NarratonMeta, Scene, SelectionState, Subplot } from '@/types';
import { selectNarratonScene, createNarratonHistory, narratonPools, sortCandidates } from '@/utils/narraton';
import { CyberInput } from '@/components/CyberInput';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Drama, Video, Tag, Users, Globe, Pencil, Play } from 'lucide-react';
import { ACTS, ACT_STYLES, ActBadge, reasonLabel } from '@/components/NarratonBadges';
import { toast } from 'sonner';
import { NarratonTestMode } from '@/components/NarratonTestMode';

// The Narraton page: the story board seen through the THEATER's selector
// (src/utils/narraton.ts), so the ranking here is exactly the ranking a
// [NARRATON pool=x] would compute in a shipped game. One metadata shape,
// Scene.narraton (decision #5, 2026-09-01).

interface NarratonDirectorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

const keyTarget = (k: number | { target: number }): number => (typeof k === 'number' ? k : k.target);

const sectionLabel = 'text-[10px] text-diesel-steel uppercase tracking-widest mb-2 flex items-center gap-1';

export const NarratonDirector = ({ game, selection, onChange, onSelect }: NarratonDirectorProps) => {
  const [testSceneId, setTestSceneId] = useState<string | null>(null);
  const [newSceneEpisodeId, setNewSceneEpisodeId] = useState<string>(game.episodes?.[0]?.id ?? '');
  const scenes = game.scenes ?? [];
  const subplots = game.subplots ?? [];
  const worldState = game.info.worldState ?? {};
  const scene = selection.id ? scenes.find(s => s.id === selection.id) : null;

  const pools = narratonPools(scenes);
  const [pickedPool, setPickedPool] = useState<string>('');
  const pool = pools.includes(pickedPool) ? pickedPool : (pools[0] ?? DEFAULT_NARRATON_POOL);

  const updateScene = (id: string, updates: Partial<Scene>) => {
    onChange({
      ...game,
      scenes: scenes.map(s => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  // Tag a scene with a target value; creates the world variable when it does
  // not exist yet (Doug's flow: tag and create in one move). A scene tagged
  // without a pool joins the board's current pool so it becomes selectable.
  const tagScene = (target: Scene, variable: string, value: number) => {
    const name = variable.trim();
    if (!name) return;
    let nextInfo = game.info;
    if (!(name in worldState)) {
      nextInfo = { ...game.info, worldState: { ...worldState, [name]: 0 } };
      toast.success(`Created world variable "${name}" (starts at 0)`);
    }
    onChange({
      ...game,
      info: nextInfo,
      scenes: scenes.map(s =>
        s.id === target.id
          ? {
              ...s,
              narraton: {
                ...(s.narraton ?? {}),
                pool: s.narraton?.pool || pool,
                keys: { ...(s.narraton?.keys ?? {}), [name]: value },
              },
            }
          : s
      ),
    });
  };

  // New scenes join the picked episode so they are immediately playable
  // within it (Doug's ask 8); with no episode picked they are project-only.
  // They join the current pool so the selector can see them once keyed.
  const handleCreateScene = () => {
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      name: 'New Scene',
      sceneType: 'AGENCY',
      stage: [],
      script: '',
      status: 'new',
      narraton: { pool },
    };
    const episode = (game.episodes ?? []).find(e => e.id === newSceneEpisodeId);
    onChange({
      ...game,
      scenes: [...scenes, newScene],
      episodes: episode
        ? game.episodes.map(e =>
            e.id === episode.id ? { ...e, sceneIds: [...e.sceneIds, newScene.id] } : e
          )
        : game.episodes,
    });
    onSelect('narraton', newScene.id);
    toast.success(
      episode
        ? `Scene created in "${episode.name}" — tag it so Narraton can find it`
        : 'Scene created — tag it so Narraton can find it'
    );
  };

  const handleCreateSubplot = (name: string, owner: string) => {
    if (!name.trim()) return;
    const newSubplot: Subplot = {
      id: `subplot_${Date.now()}`,
      name: name.trim(),
      ...(owner.trim() ? { owner: owner.trim() } : {}),
      status: 'new',
    };
    onChange({ ...game, subplots: [...subplots, newSubplot] });
    toast.success(`Subplot "${newSubplot.name}" created`);
  };

  const handleDeleteSubplot = (id: string) => {
    onChange({
      ...game,
      subplots: subplots.filter(sp => sp.id !== id),
      scenes: scenes.map(s => {
        if (s.narraton?.subplot !== id) return s;
        const { subplot: _, ...rest } = s.narraton;
        return { ...s, narraton: rest };
      }),
    });
  };

  const testScene = testSceneId ? scenes.find(s => s.id === testSceneId) : null;
  const testModal = testScene ? (
    <NarratonTestMode game={game} startScene={testScene} onClose={() => setTestSceneId(null)} />
  ) : null;

  if (scene) {
    return (
      <>
        <SceneDetail
          game={game}
          scene={scene}
          pools={pools}
          onBack={() => onSelect('narraton', null)}
          onUpdate={(updates) => updateScene(scene.id, updates)}
          onTag={(variable, value) => tagScene(scene, variable, value)}
          onOpenSceneEditor={() => onSelect('scene', scene.id)}
          onTestPlay={() => setTestSceneId(scene.id)}
        />
        {testModal}
      </>
    );
  }

  // ── Master view: the pool's board + unpooled scenes + subplots + world state ──
  // Fresh history = the story's opening board: subplot rotation shows which
  // scene of each subplot is up first.
  const ranked = sortCandidates(
    selectNarratonScene(pool, scenes, worldState, createNarratonHistory(), { quiet: true }).candidates
  );
  const unpooled = scenes.filter(s => !s.narraton?.pool);
  const subplotName = (id?: string) => (id ? subplots.find(sp => sp.id === id)?.name ?? id : undefined);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Drama className="text-diesel-cyan" size={20} />
          <h2 className="text-lg font-bold text-diesel-paper uppercase tracking-wider">Narraton</h2>
          <span className="text-diesel-steel text-xs">the theater's selector, live</span>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={pool}
            onChange={e => setPickedPool(e.target.value)}
            title="Pool on the board ([NARRATON pool=…])"
            className="bg-diesel-panel border border-diesel-border rounded px-2 py-1.5 text-xs text-diesel-paper focus:outline-none focus:border-diesel-cyan/50"
          >
            {(pools.length > 0 ? pools : [DEFAULT_NARRATON_POOL]).map(p => (
              <option key={p} value={p}>
                pool {p}
              </option>
            ))}
          </select>
          {(game.episodes ?? []).length > 0 && (
            <select
              value={newSceneEpisodeId}
              onChange={e => setNewSceneEpisodeId(e.target.value)}
              title="Episode the new scene joins"
              className="bg-diesel-panel border border-diesel-border rounded px-2 py-1.5 text-xs text-diesel-paper focus:outline-none focus:border-diesel-cyan/50"
            >
              <option value="">— no episode —</option>
              {game.episodes.map(ep => (
                <option key={ep.id} value={ep.id}>
                  in {ep.name}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={handleCreateScene}
            size="sm"
            className="bg-diesel-cyan/20 border border-diesel-cyan text-diesel-cyan hover:bg-diesel-cyan/30"
          >
            <Plus size={14} className="mr-1" />
            New Scene
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Selector ranking */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className={sectionLabel}>
            <Tag size={11} />
            Pool {pool} — scenes ranked against the live world state
          </div>
          <ScrollArea className="flex-1 border border-diesel-border rounded bg-diesel-dark">
            <div className="p-2 space-y-1">
              {ranked.length === 0 ? (
                <div className="text-center text-diesel-steel py-8 text-xs">
                  No scenes in this pool yet. Create a scene and tag it with target variables.
                </div>
              ) : (
                ranked.map((c, i) => (
                  <div
                    key={c.scene.id}
                    onClick={() => onSelect('narraton', c.scene.id)}
                    title={c.eligible ? `score ${c.score.toFixed(4)}` : c.exclusionReasons.join('; ')}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-colors ${
                      !c.eligible
                        ? 'border-transparent opacity-40 hover:opacity-60'
                        : i === 0
                          ? 'bg-diesel-cyan/10 border-diesel-cyan/40 hover:border-diesel-cyan'
                          : 'border-transparent hover:bg-diesel-border/30'
                    }`}
                  >
                    <span className="text-diesel-steel text-xs w-5 text-right">{i + 1}.</span>
                    <Video size={12} className="text-diesel-rust" />
                    <span className="text-sm text-diesel-paper">{c.scene.name}</span>
                    <ActBadge act={c.scene.narraton?.act} />
                    {subplotName(c.scene.narraton?.subplot) && (
                      <span className="text-[10px] text-diesel-purple">{subplotName(c.scene.narraton?.subplot)}</span>
                    )}
                    <span className="ml-auto font-mono text-xs text-diesel-steel">
                      {c.eligible ? `score ${c.weightedScore.toFixed(3)}` : reasonLabel(c)}
                    </span>
                    {Object.entries(c.scene.narraton?.keys ?? {}).map(([v, t]) => (
                      <span key={v} className="text-[9px] font-mono text-diesel-gold/70 hidden xl:inline">
                        {v}→{keyTarget(t)}
                      </span>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTestSceneId(c.scene.id);
                      }}
                      className="text-diesel-green/70 hover:text-diesel-green"
                      title="Test play from this scene"
                    >
                      <Play size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {unpooled.length > 0 && (
            <>
              <div className={`${sectionLabel} mt-3`}>
                <Video size={11} />
                Unpooled scenes — invisible to the selector
              </div>
              <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                {unpooled.map(s => (
                  <div
                    key={s.id}
                    onClick={() => onSelect('narraton', s.id)}
                    className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-diesel-border/30"
                  >
                    <Video size={12} className="text-diesel-steel" />
                    <span className="text-sm text-diesel-steel">{s.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Side column: subplots + world state */}
        <div className="flex flex-col gap-4 min-h-0">
          <SubplotPanel
            subplots={subplots}
            scenes={scenes}
            onCreate={handleCreateSubplot}
            onDelete={handleDeleteSubplot}
          />
          <WorldStatePanel game={game} onChange={onChange} />
        </div>
      </div>
      {testModal}
    </div>
  );
};

// ── Subplots (KoC sequences: owned bags of scenes) ──
const SubplotPanel = ({
  subplots,
  scenes,
  onCreate,
  onDelete,
}: {
  subplots: Subplot[];
  scenes: Scene[];
  onCreate: (name: string, owner: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');

  const submit = () => {
    onCreate(name, owner);
    setName('');
    setOwner('');
  };

  return (
    <div>
      <div className={sectionLabel}>
        <Users size={11} />
        Subplots — owned scene bags
      </div>
      <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1">
        {subplots.map(sp => {
          const count = scenes.filter(s => s.narraton?.subplot === sp.id).length;
          return (
            <div key={sp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-diesel-border/30">
              <span className="text-sm text-diesel-purple">{sp.name}</span>
              {sp.owner && <span className="text-[10px] text-diesel-steel">({sp.owner})</span>}
              <span className="text-[10px] text-diesel-steel ml-auto">
                {count} scene{count !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => onDelete(sp.id)}
                className="text-diesel-rust/60 hover:text-diesel-rust"
                title="Delete subplot (scenes keep existing, untagged)"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
        <div className="flex gap-1 pt-1">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Subplot name..."
            className="flex-1 min-w-0 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-purple/50"
          />
          <input
            value={owner}
            onChange={e => setOwner(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Owner"
            className="w-20 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-purple/50"
          />
          <Button
            onClick={submit}
            size="sm"
            variant="ghost"
            className="text-diesel-purple hover:text-diesel-purple hover:bg-diesel-purple/10 h-6 w-6 p-0"
          >
            <Plus size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── World variables (live values the selector matches against) ──
const WorldStatePanel = ({ game, onChange }: { game: GameData; onChange: (g: GameData) => void }) => {
  const [newVar, setNewVar] = useState('');
  const [newVal, setNewVal] = useState('0');
  const worldState = game.info.worldState ?? {};

  const addVar = () => {
    const name = newVar.trim();
    if (!name || name in worldState) return;
    // Typed true/false makes a real boolean; numbers stay numbers.
    const raw = newVal.trim();
    let value: string | number | boolean;
    if (raw === 'true') value = true;
    else if (raw === 'false') value = false;
    else {
      const num = Number(raw);
      value = raw !== '' && Number.isFinite(num) ? num : newVal;
    }
    onChange({ ...game, info: { ...game.info, worldState: { ...worldState, [name]: value } } });
    setNewVar('');
    setNewVal('0');
  };

  const removeVar = (name: string) => {
    const { [name]: _, ...rest } = worldState;
    onChange({ ...game, info: { ...game.info, worldState: rest } });
  };

  return (
    <div>
      <div className={sectionLabel}>
        <Globe size={11} />
        World variables
      </div>
      <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1">
        {Object.entries(worldState).map(([name, value]) => {
          // What-if scrubber: numeric variables get a slider so Doug can
          // drag a value and watch the selector's ranking reorder live.
          const numeric = typeof value === 'number' ? value : Number(value);
          const sliderable = typeof value !== 'boolean' && String(value).trim() !== '' && Number.isFinite(numeric);
          return (
            <div key={name} className="flex items-center gap-2 p-1 font-mono text-xs">
              <span className="text-diesel-gold shrink-0">{name}</span>
              {typeof value === 'boolean' && (
                <button
                  onClick={() =>
                    onChange({
                      ...game,
                      info: { ...game.info, worldState: { ...worldState, [name]: !value } },
                    })
                  }
                  title="Toggle (booleans match keys as 0/1)"
                  className={`ml-auto px-2 py-0.5 border rounded text-[10px] font-bold uppercase ${
                    value
                      ? 'border-diesel-green text-diesel-green bg-diesel-green/10'
                      : 'border-diesel-steel/50 text-diesel-steel'
                  }`}
                >
                  {String(value)}
                </button>
              )}
              {sliderable && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.min(100, Math.max(0, numeric))}
                  onChange={e =>
                    onChange({
                      ...game,
                      info: { ...game.info, worldState: { ...worldState, [name]: Number(e.target.value) } },
                    })
                  }
                  className="flex-1 min-w-0 accent-[#c9a227]"
                  title="What-if: scrub and watch the ranking"
                />
              )}
              {typeof value !== 'boolean' && (
                <span className="text-diesel-paper ml-auto shrink-0">{String(value)}</span>
              )}
              <button
                onClick={() => removeVar(name)}
                className="text-diesel-rust/60 hover:text-diesel-rust"
                title="Remove variable"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
        <div className="flex gap-1 pt-1">
          <input
            value={newVar}
            onChange={e => setNewVar(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addVar()}
            placeholder="variable_name"
            className="flex-1 min-w-0 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50"
          />
          <input
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addVar()}
            placeholder="0 / true"
            title="Numbers make sliders; true/false makes a toggle"
            className="w-16 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50"
          />
          <Button
            onClick={addVar}
            size="sm"
            variant="ghost"
            className="text-diesel-gold hover:text-diesel-gold hover:bg-diesel-gold/10 h-6 w-6 p-0"
          >
            <Plus size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Scene detail: name, pool, act, subplot, keys, in-scene variables ──
const SceneDetail = ({
  game,
  scene,
  pools,
  onBack,
  onUpdate,
  onTag,
  onOpenSceneEditor,
  onTestPlay,
}: {
  game: GameData;
  scene: Scene;
  pools: string[];
  onBack: () => void;
  onUpdate: (updates: Partial<Scene>) => void;
  onTag: (variable: string, value: number) => void;
  onOpenSceneEditor: () => void;
  onTestPlay: () => void;
}) => {
  const [tagVar, setTagVar] = useState('');
  const [tagVal, setTagVal] = useState('50');
  const [localName, setLocalName] = useState('');
  const [localVal, setLocalVal] = useState('0');

  const worldState = game.info.worldState ?? {};
  const meta = scene.narraton;
  const keys = meta?.keys ?? {};
  const localVars = scene.localVars || {};
  const untaggedVars = Object.keys(worldState).filter(v => !(v in keys));

  // Every Narraton edit goes through here so a scene can never carry keys
  // without a pool (the theater would silently never pick it).
  const updateMeta = (patch: Partial<NarratonMeta>) => {
    const next: NarratonMeta = { ...(meta ?? {}), pool: meta?.pool || DEFAULT_NARRATON_POOL, ...patch };
    onUpdate({ narraton: next });
  };

  const setPool = (raw: string) => {
    const pool = raw.trim();
    if (!pool) {
      // No pool = not selectable; drop the whole block, as the Scene Editor does.
      onUpdate({ narraton: undefined });
      return;
    }
    updateMeta({ pool });
  };

  const addTag = () => {
    const value = Number(tagVal);
    if (!tagVar.trim() || !Number.isFinite(value)) return;
    onTag(tagVar, value);
    setTagVar('');
    setTagVal('50');
  };

  const setTarget = (variable: string, target: number) => {
    const prior = keys[variable];
    const value = typeof prior === 'object' && prior.scale ? { ...prior, target } : target;
    updateMeta({ keys: { ...keys, [variable]: value } });
  };

  const removeTag = (variable: string) => {
    const { [variable]: _, ...rest } = keys;
    updateMeta({ keys: rest });
  };

  const addLocal = () => {
    const name = localName.trim();
    if (!name || name in localVars) return;
    const num = Number(localVal);
    const value = localVal.trim() !== '' && Number.isFinite(num) ? num : localVal;
    onUpdate({ localVars: { ...localVars, [name]: value } });
    setLocalName('');
    setLocalVal('0');
  };

  const removeLocal = (name: string) => {
    const { [name]: _, ...rest } = localVars;
    onUpdate({ localVars: rest });
  };

  return (
    <div className="h-full flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-diesel-steel hover:text-diesel-paper text-xs">
          ← Back to Narraton
        </button>
        <div className="flex items-center gap-2">
          <Button
            onClick={onTestPlay}
            size="sm"
            className="bg-diesel-green/20 border border-diesel-green text-diesel-green hover:bg-diesel-green/30"
          >
            <Play size={12} className="mr-1" />
            Test Play
          </Button>
          <Button
            onClick={onOpenSceneEditor}
            size="sm"
            className="bg-diesel-rust/20 border border-diesel-rust text-diesel-rust hover:bg-diesel-rust/30"
          >
            <Pencil size={12} className="mr-1" />
            Open in Scene Editor
          </Button>
        </div>
      </div>

      <CyberInput
        label="Scene Name"
        value={scene.name}
        onChange={e => onUpdate({ name: e.target.value })}
      />

      <div className="flex gap-4">
        <div className="w-36">
          <label className="text-[10px] text-diesel-steel uppercase tracking-widest mb-1 block">Pool</label>
          <input
            value={meta?.pool ?? ''}
            onChange={e => setPool(e.target.value)}
            list={`narraton-pools-${scene.id}`}
            placeholder="none (unselectable)"
            className="w-full bg-diesel-panel border border-diesel-border rounded px-2 py-1.5 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-cyan/50"
          />
          <datalist id={`narraton-pools-${scene.id}`}>
            {pools.map(p => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] text-diesel-steel uppercase tracking-widest mb-1 block">Act</label>
          <div className="flex gap-1">
            {ACTS.map(a => (
              <button
                key={a}
                onClick={() => updateMeta({ act: meta?.act === a ? undefined : a })}
                className={`px-2 py-1 border rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  meta?.act === a
                    ? ACT_STYLES[a]
                    : 'border-diesel-border text-diesel-steel hover:text-diesel-paper'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-diesel-steel uppercase tracking-widest mb-1 block">Subplot</label>
          <select
            value={meta?.subplot || ''}
            onChange={e => updateMeta({ subplot: e.target.value || undefined })}
            className="w-full bg-diesel-panel border border-diesel-border rounded px-2 py-1.5 text-xs text-diesel-paper focus:outline-none focus:border-diesel-purple/50"
          >
            <option value="">— no subplot —</option>
            {(game.subplots ?? []).map(sp => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
                {sp.owner ? ` (${sp.owner})` : ''}
              </option>
            ))}
            {meta?.subplot && !(game.subplots ?? []).some(sp => sp.id === meta.subplot) && (
              <option value={meta.subplot}>{meta.subplot}</option>
            )}
          </select>
        </div>
      </div>

      {/* Keys */}
      <div>
        <div className={sectionLabel}>
          <Tag size={11} />
          Keys — target world-state values (0–100); the selector picks the closest match
        </div>
        <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1">
          {Object.entries(keys).map(([variable, k]) => (
            <div key={variable} className="flex items-center gap-2 p-1 font-mono text-xs">
              <span className="text-diesel-gold">{variable}</span>
              <span className="text-diesel-steel">→</span>
              <input
                type="number"
                value={keyTarget(k)}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setTarget(variable, v);
                }}
                className="w-16 bg-diesel-panel border border-diesel-border rounded px-1.5 py-0.5 text-xs font-mono text-diesel-paper focus:outline-none focus:border-diesel-gold/50"
              />
              {typeof k === 'object' && k.scale && k.scale !== 100 && (
                <span className="text-diesel-steel/60 text-[10px]">÷{k.scale}</span>
              )}
              <span className="text-diesel-steel/60 text-[10px] ml-auto">
                now: {String(worldState[variable] ?? '—')}
              </span>
              <button
                onClick={() => removeTag(variable)}
                className="text-diesel-rust/60 hover:text-diesel-rust"
                title="Remove key"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <div className="flex gap-1 pt-1">
            <input
              value={tagVar}
              onChange={e => setTagVar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              placeholder="variable (new names are created)"
              list={`narraton-vars-${scene.id}`}
              className="flex-1 min-w-0 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50"
            />
            <datalist id={`narraton-vars-${scene.id}`}>
              {untaggedVars.map(v => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <input
              type="number"
              value={tagVal}
              onChange={e => setTagVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              className="w-16 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs font-mono text-diesel-paper focus:outline-none focus:border-diesel-gold/50"
            />
            <Button
              onClick={addTag}
              size="sm"
              variant="ghost"
              className="text-diesel-gold hover:text-diesel-gold hover:bg-diesel-gold/10 h-6 px-2"
            >
              <Plus size={12} className="mr-1" />
              <span className="text-xs">Tag</span>
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-diesel-steel/70 mt-1">
          Key scale, hard requirements, weight and repeatable live in the Scene Editor's Narraton panel.
        </p>
      </div>

      {/* In-scene variables */}
      <div>
        <div className={sectionLabel}>
          <Video size={11} />
          In-scene variables — scene-local, reset on entry, invisible to Narraton
        </div>
        <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1">
          {Object.entries(localVars).map(([name, value]) => (
            <div key={name} className="flex items-center gap-2 p-1 font-mono text-xs">
              <span className="text-diesel-cyan">{name}</span>
              <span className="text-diesel-steel">=</span>
              <input
                value={String(value)}
                onChange={e => {
                  const raw = e.target.value;
                  const num = Number(raw);
                  const v = raw.trim() !== '' && Number.isFinite(num) ? num : raw;
                  onUpdate({ localVars: { ...localVars, [name]: v } });
                }}
                className="w-20 bg-diesel-panel border border-diesel-border rounded px-1.5 py-0.5 text-xs font-mono text-diesel-paper focus:outline-none focus:border-diesel-cyan/50"
              />
              <button
                onClick={() => removeLocal(name)}
                className="text-diesel-rust/60 hover:text-diesel-rust ml-auto"
                title="Remove in-scene variable"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <div className="flex gap-1 pt-1">
            <input
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLocal()}
              placeholder="local_variable"
              className="flex-1 min-w-0 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-cyan/50"
            />
            <input
              value={localVal}
              onChange={e => setLocalVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLocal()}
              placeholder="0"
              className="w-14 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-cyan/50"
            />
            <Button
              onClick={addLocal}
              size="sm"
              variant="ghost"
              className="text-diesel-cyan hover:text-diesel-cyan hover:bg-diesel-cyan/10 h-6 w-6 p-0"
            >
              <Plus size={12} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
