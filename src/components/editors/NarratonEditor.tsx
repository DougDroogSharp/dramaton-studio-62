import { useState } from 'react';
import { GameData, Scene, ScenePhase, SelectionState, Subplot } from '@/types';
import { rankScenes } from '@/utils/narraton';
import { CyberInput } from '@/components/CyberInput';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Drama, Video, Tag, Users, Globe, Pencil, Play } from 'lucide-react';
import { toast } from 'sonner';
import { NarratonTestMode } from '@/components/NarratonTestMode';

interface NarratonEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

const PHASES: ScenePhase[] = ['BEGINNING', 'MIDDLE', 'END'];

const PHASE_STYLES: Record<ScenePhase, string> = {
  BEGINNING: 'border-diesel-green text-diesel-green',
  MIDDLE: 'border-diesel-gold text-diesel-gold',
  END: 'border-diesel-rust text-diesel-rust',
};

const PhaseBadge = ({ phase }: { phase?: ScenePhase }) => {
  if (!phase) return null;
  return (
    <span className={`px-1.5 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${PHASE_STYLES[phase]}`}>
      {phase}
    </span>
  );
};

const sectionLabel = 'text-[10px] text-diesel-steel uppercase tracking-widest mb-2 flex items-center gap-1';

export const NarratonEditor = ({ game, selection, onChange, onSelect }: NarratonEditorProps) => {
  const [testSceneId, setTestSceneId] = useState<string | null>(null);
  const scenes = game.scenes ?? [];
  const subplots = game.subplots ?? [];
  const worldState = game.info.worldState ?? {};
  const scene = selection.id ? scenes.find(s => s.id === selection.id) : null;

  const updateScene = (id: string, updates: Partial<Scene>) => {
    onChange({
      ...game,
      scenes: scenes.map(s => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  // Tag a scene with a target value; creates the world variable when it does
  // not exist yet (Doug's flow: tag and create in one move).
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
        s.id === target.id ? { ...s, key: { ...(s.key || {}), [name]: value } } : s
      ),
    });
  };

  const handleCreateScene = () => {
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      name: 'New Scene',
      sceneType: 'AGENCY',
      stage: [],
      script: '',
      status: 'new',
      key: {},
    };
    onChange({ ...game, scenes: [...scenes, newScene] });
    onSelect('narraton', newScene.id);
    toast.success('Scene created — tag it so Narraton can find it');
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
      scenes: scenes.map(s => (s.subplotId === id ? { ...s, subplotId: undefined } : s)),
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

  // ── Master view: ranking + unkeyed scenes + subplots + world state ──
  const ranked = rankScenes(scenes, worldState);
  const keyedIds = new Set(ranked.map(m => m.scene.id));
  const unkeyed = scenes.filter(s => !keyedIds.has(s.id));
  const subplotName = (id?: string) => subplots.find(sp => sp.id === id)?.name;

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Drama className="text-diesel-cyan" size={20} />
          <h2 className="text-lg font-bold text-diesel-paper uppercase tracking-wider">Narraton</h2>
          <span className="text-diesel-steel text-xs">least-squares scene selector</span>
        </div>
        <Button
          onClick={handleCreateScene}
          size="sm"
          className="bg-diesel-cyan/20 border border-diesel-cyan text-diesel-cyan hover:bg-diesel-cyan/30"
        >
          <Plus size={14} className="mr-1" />
          New Scene
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Selector ranking */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className={sectionLabel}>
            <Tag size={11} />
            Selector ranking — keyed scenes vs live world state
          </div>
          <ScrollArea className="flex-1 border border-diesel-border rounded bg-diesel-dark">
            <div className="p-2 space-y-1">
              {ranked.length === 0 ? (
                <div className="text-center text-diesel-steel py-8 text-xs">
                  No keyed scenes yet. Create a scene and tag it with target variables.
                </div>
              ) : (
                ranked.map((match, i) => (
                  <div
                    key={match.scene.id}
                    onClick={() => onSelect('narraton', match.scene.id)}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-colors ${
                      match.excluded
                        ? 'border-transparent opacity-40 hover:opacity-60'
                        : i === 0
                          ? 'bg-diesel-cyan/10 border-diesel-cyan/40 hover:border-diesel-cyan'
                          : 'border-transparent hover:bg-diesel-border/30'
                    }`}
                  >
                    <span className="text-diesel-steel text-xs w-5 text-right">{i + 1}.</span>
                    <Video size={12} className="text-diesel-rust" />
                    <span className="text-sm text-diesel-paper">{match.scene.name}</span>
                    <PhaseBadge phase={match.scene.phase} />
                    {subplotName(match.scene.subplotId) && (
                      <span className="text-[10px] text-diesel-purple">{subplotName(match.scene.subplotId)}</span>
                    )}
                    <span className="ml-auto font-mono text-xs text-diesel-steel">
                      {match.excluded ? 'EXCLUDED' : `Δ² ${match.score}`}
                    </span>
                    {Object.entries(match.scene.key || {}).map(([v, t]) => (
                      <span key={v} className="text-[9px] font-mono text-diesel-gold/70 hidden xl:inline">
                        {v}→{t}
                      </span>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTestSceneId(match.scene.id);
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

          {unkeyed.length > 0 && (
            <>
              <div className={`${sectionLabel} mt-3`}>
                <Video size={11} />
                Unkeyed scenes — invisible to the selector
              </div>
              <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                {unkeyed.map(s => (
                  <div
                    key={s.id}
                    onClick={() => onSelect('narraton', s.id)}
                    className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-diesel-border/30"
                  >
                    <Video size={12} className="text-diesel-steel" />
                    <span className="text-sm text-diesel-steel">{s.name}</span>
                    <PhaseBadge phase={s.phase} />
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
          const count = scenes.filter(s => s.subplotId === sp.id).length;
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
    const num = Number(newVal);
    const value = newVal.trim() !== '' && Number.isFinite(num) ? num : newVal;
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
        {Object.entries(worldState).map(([name, value]) => (
          <div key={name} className="flex items-center gap-2 p-1 font-mono text-xs">
            <span className="text-diesel-gold">{name}</span>
            <span className="text-diesel-paper ml-auto">{String(value)}</span>
            <button
              onClick={() => removeVar(name)}
              className="text-diesel-rust/60 hover:text-diesel-rust"
              title="Remove variable"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
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
            placeholder="0"
            className="w-14 bg-diesel-panel border border-diesel-border rounded px-2 py-1 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50"
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

// ── Scene detail: name, phase, subplot, key tags, in-scene variables ──
const SceneDetail = ({
  game,
  scene,
  onBack,
  onUpdate,
  onTag,
  onOpenSceneEditor,
  onTestPlay,
}: {
  game: GameData;
  scene: Scene;
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
  const key = scene.key || {};
  const localVars = scene.localVars || {};
  const untaggedVars = Object.keys(worldState).filter(v => !(v in key));

  const addTag = () => {
    const value = Number(tagVal);
    if (!tagVar.trim() || !Number.isFinite(value)) return;
    onTag(tagVar, value);
    setTagVar('');
    setTagVal('50');
  };

  const removeTag = (variable: string) => {
    const { [variable]: _, ...rest } = key;
    onUpdate({ key: rest });
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
        <div>
          <label className="text-[10px] text-diesel-steel uppercase tracking-widest mb-1 block">Phase</label>
          <div className="flex gap-1">
            {PHASES.map(p => (
              <button
                key={p}
                onClick={() => onUpdate({ phase: scene.phase === p ? undefined : p })}
                className={`px-2 py-1 border rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  scene.phase === p
                    ? PHASE_STYLES[p]
                    : 'border-diesel-border text-diesel-steel hover:text-diesel-paper'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-diesel-steel uppercase tracking-widest mb-1 block">Subplot</label>
          <select
            value={scene.subplotId || ''}
            onChange={e => onUpdate({ subplotId: e.target.value || undefined })}
            className="w-full bg-diesel-panel border border-diesel-border rounded px-2 py-1.5 text-xs text-diesel-paper focus:outline-none focus:border-diesel-purple/50"
          >
            <option value="">— no subplot —</option>
            {(game.subplots ?? []).map(sp => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
                {sp.owner ? ` (${sp.owner})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key tags */}
      <div>
        <div className={sectionLabel}>
          <Tag size={11} />
          Key — target world-state values (0–100); the selector picks the closest match
        </div>
        <div className="border border-diesel-border rounded bg-diesel-dark p-2 space-y-1">
          {Object.entries(key).map(([variable, target]) => (
            <div key={variable} className="flex items-center gap-2 p-1 font-mono text-xs">
              <span className="text-diesel-gold">{variable}</span>
              <span className="text-diesel-steel">→</span>
              <input
                type="number"
                value={target}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) onUpdate({ key: { ...key, [variable]: v } });
                }}
                className="w-16 bg-diesel-panel border border-diesel-border rounded px-1.5 py-0.5 text-xs font-mono text-diesel-paper focus:outline-none focus:border-diesel-gold/50"
              />
              <span className="text-diesel-steel/60 text-[10px] ml-auto">
                now: {String(worldState[variable] ?? '—')}
              </span>
              <button
                onClick={() => removeTag(variable)}
                className="text-diesel-rust/60 hover:text-diesel-rust"
                title="Remove tag"
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
