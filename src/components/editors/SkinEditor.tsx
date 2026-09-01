import { useState } from 'react';
import { GameData, SelectionState, Skin } from '@/types';
import { skinFromFile, isSkinAllowed, allSkinAnimations } from '@/utils/skins';
import { openBinaryFileWithPicker, SKIN_FILE_OPTIONS } from '@/utils/filePicker';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CyberInput } from '@/components/CyberInput';
import { Shirt, Upload, Trash2, Lock, Plus, Film, Bone, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface SkinEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

const sectionLabel = 'text-[10px] text-diesel-steel uppercase tracking-widest mb-2 flex items-center gap-1';

export const SkinEditor = ({ game, selection, onChange, onSelect }: SkinEditorProps) => {
  const skins = game.skins ?? [];
  const allowed = game.info.allowedSkinTypes ?? [];
  const skin = selection.id ? skins.find(s => s.id === selection.id) : null;
  const [newType, setNewType] = useState('');

  const updateSkin = (id: string, updates: Partial<Skin>) => {
    onChange({ ...game, skins: skins.map(s => (s.id === id ? { ...s, ...updates } : s)) });
  };

  const handleImport = async () => {
    const result = await openBinaryFileWithPicker(SKIN_FILE_OPTIONS);
    if (!result) return;
    try {
      const newSkin = skinFromFile(result.name, result.data);
      onChange({ ...game, skins: [...skins, newSkin] });
      onSelect('skin', newSkin.id);
      toast.success(
        newSkin.animations.length > 0
          ? `Imported "${newSkin.name}" — ${newSkin.animations.length} animation${newSkin.animations.length !== 1 ? 's' : ''} found`
          : `Imported "${newSkin.name}" — no animations in this model`
      );
    } catch (err) {
      console.error('Skin import failed:', err);
      toast.error(`Could not read skin: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const handleDelete = (id: string) => {
    onChange({
      ...game,
      skins: skins.filter(s => s.id !== id),
      actors: game.actors.map(a => (a.skinId === id ? { ...a, skinId: undefined } : a)),
    });
    if (selection.id === id) onSelect('skin', null);
    toast.success('Skin removed (wearers unassigned)');
  };

  const addAllowedType = () => {
    const t = newType.trim();
    if (!t || allowed.includes(t)) return;
    onChange({ ...game, info: { ...game.info, allowedSkinTypes: [...allowed, t] } });
    setNewType('');
  };

  const removeAllowedType = (t: string) => {
    const rest = allowed.filter(x => x !== t);
    onChange({
      ...game,
      info: { ...game.info, allowedSkinTypes: rest.length > 0 ? rest : undefined },
    });
  };

  // ── Detail view ──
  if (skin) {
    const wearers = game.actors.filter(a => a.skinId === skin.id);
    return (
      <div className="h-full flex flex-col gap-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <button onClick={() => onSelect('skin', null)} className="text-diesel-steel hover:text-diesel-paper text-xs">
            ← Back to Skins
          </button>
          <Button
            onClick={() => handleDelete(skin.id)}
            size="sm"
            variant="ghost"
            className="text-diesel-rust hover:text-diesel-rust hover:bg-diesel-rust/10"
          >
            <Trash2 size={14} />
          </Button>
        </div>

        <CyberInput
          label="Skin Name"
          value={skin.name}
          onChange={e => updateSkin(skin.id, { name: e.target.value })}
        />

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-diesel-steel uppercase tracking-widest mb-1 block">
              Skin Type (lockdown unit)
            </label>
            <input
              value={skin.skinType || ''}
              onChange={e => updateSkin(skin.id, { skinType: e.target.value.trim() || undefined })}
              placeholder="human, animal, machine..."
              list="skin-type-suggestions"
              className="w-full bg-diesel-panel border border-diesel-border rounded px-2 py-1.5 text-xs text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50"
            />
            <datalist id="skin-type-suggestions">
              {allowed.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          {allowed.length > 0 && (
            <span className={`text-[10px] uppercase pb-2 ${isSkinAllowed(skin, allowed) ? 'text-diesel-green' : 'text-diesel-rust'}`}>
              {isSkinAllowed(skin, allowed) ? 'allowed in this world' : 'BLOCKED by lockdown'}
            </span>
          )}
        </div>

        {skin.fileName && (
          <p className="text-diesel-steel/60 text-[10px] font-mono">
            source: {skin.fileName} (model binary lives in the Dropbox models/ folder)
          </p>
        )}

        <div>
          <div className={sectionLabel}>
            <Film size={11} />
            Animations — every clip found at import; each is a valid pose for the wearer
          </div>
          <div className="border border-diesel-border rounded bg-diesel-dark p-2 flex flex-wrap gap-1.5">
            {skin.animations.length === 0 ? (
              <p className="text-diesel-steel/50 text-[10px]">no animation clips in this model</p>
            ) : (
              skin.animations.map(a => (
                <span key={a} className="px-2 py-0.5 bg-diesel-cyan/10 border border-diesel-cyan/40 rounded text-[11px] font-mono text-diesel-cyan">
                  {a}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Authored clips (e.g. AI-written over the bridge) */}
        <div>
          <div className={sectionLabel}>
            <Wand2 size={11} />
            Authored animations — written in-pipeline (voice/AI); also valid poses
          </div>
          <div className="border border-diesel-border rounded bg-diesel-dark p-2 flex flex-wrap gap-1.5">
            {(skin.authoredAnimations ?? []).length === 0 ? (
              <p className="text-diesel-steel/50 text-[10px]">
                none yet — an AI collaborator can write clips here via the bridge
              </p>
            ) : (
              (skin.authoredAnimations ?? []).map(c => (
                <span
                  key={c.name}
                  className="flex items-center gap-1 px-2 py-0.5 bg-diesel-purple/10 border border-diesel-purple/40 rounded text-[11px] font-mono text-diesel-purple"
                >
                  {c.name}
                  <button
                    onClick={() =>
                      updateSkin(skin.id, {
                        authoredAnimations: (skin.authoredAnimations ?? []).filter(x => x.name !== c.name),
                      })
                    }
                    className="hover:text-diesel-rust"
                    title="Delete authored clip"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Armature */}
        <div>
          <div className={sectionLabel}>
            <Bone size={11} />
            Armature — {skin.armature?.length ?? 0} joint{(skin.armature?.length ?? 0) !== 1 ? 's' : ''} (what authored clips animate)
          </div>
          <div className="border border-diesel-border rounded bg-diesel-dark p-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar">
            {(skin.armature ?? []).length === 0 ? (
              <p className="text-diesel-steel/50 text-[10px]">no rig in this model (rigid prop)</p>
            ) : (
              (skin.armature ?? []).map(j => (
                <span
                  key={j.name}
                  title={j.parent ? `child of ${j.parent}` : 'root joint'}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    j.parent
                      ? 'bg-diesel-steel/5 border-diesel-border text-diesel-steel'
                      : 'bg-diesel-gold/10 border-diesel-gold/40 text-diesel-gold'
                  }`}
                >
                  {j.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <div className={sectionLabel}>Worn by</div>
          {wearers.length === 0 ? (
            <p className="text-diesel-steel/50 text-[10px]">no actor wears this skin yet (assign in the Actor editor)</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {wearers.map(a => (
                <button
                  key={a.id}
                  onClick={() => onSelect('actor', a.id)}
                  className="px-2 py-0.5 bg-diesel-gold/10 border border-diesel-gold/40 rounded text-[11px] text-diesel-gold hover:bg-diesel-gold/20"
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Library view ──
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shirt className="text-diesel-gold" size={20} />
          <h2 className="text-lg font-bold text-diesel-paper uppercase tracking-wider">Skins</h2>
          <span className="text-diesel-steel text-xs">user-generated Vita skins</span>
        </div>
        <Button
          onClick={handleImport}
          size="sm"
          className="bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
        >
          <Upload size={14} className="mr-1" />
          Import Skin (.glb / .gltf / .vrm)
        </Button>
      </div>

      {/* Lockdown */}
      <div className="max-w-xl">
        <div className={sectionLabel}>
          <Lock size={11} />
          Skin-type lockdown — empty list = all skins allowed in this world
        </div>
        <div className="border border-diesel-border rounded bg-diesel-dark p-2 flex flex-wrap items-center gap-1.5">
          {allowed.map(t => (
            <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-diesel-rust/10 border border-diesel-rust/40 rounded text-[11px] font-mono text-diesel-rust">
              {t}
              <button onClick={() => removeAllowedType(t)} className="hover:text-diesel-paper" title="Remove from allowlist">
                ×
              </button>
            </span>
          ))}
          <input
            value={newType}
            onChange={e => setNewType(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAllowedType()}
            placeholder={allowed.length === 0 ? 'add a type to lock down...' : 'add type...'}
            className="flex-1 min-w-24 bg-transparent px-1 py-0.5 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none"
          />
          <Button
            onClick={addAllowedType}
            size="sm"
            variant="ghost"
            className="text-diesel-rust hover:text-diesel-rust hover:bg-diesel-rust/10 h-6 w-6 p-0"
          >
            <Plus size={12} />
          </Button>
        </div>
      </div>

      {/* Skin list */}
      <ScrollArea className="flex-1 border border-diesel-border rounded bg-diesel-dark">
        <div className="p-2 space-y-1">
          {skins.length === 0 ? (
            <div className="text-center text-diesel-steel py-8">
              <Shirt size={48} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No skins yet</p>
              <p className="text-xs opacity-70">Import a .glb/.gltf/.vrm — its animations become poses</p>
            </div>
          ) : (
            skins.map(s => {
              const blocked = !isSkinAllowed(s, allowed);
              const wearerCount = game.actors.filter(a => a.skinId === s.id).length;
              const animCount = allSkinAnimations(s).length;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelect('skin', s.id)}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer border border-transparent hover:bg-diesel-border/30 ${blocked ? 'opacity-50' : ''}`}
                >
                  <Shirt size={12} className="text-diesel-gold" />
                  <span className="text-sm text-diesel-paper">{s.name}</span>
                  {s.skinType && <span className="text-[10px] font-mono text-diesel-steel">[{s.skinType}]</span>}
                  {blocked && <span className="text-[9px] uppercase text-diesel-rust">blocked</span>}
                  <span className="text-[10px] text-diesel-steel ml-auto">
                    {animCount} anim{animCount !== 1 ? 's' : ''}
                    {wearerCount > 0 && ` · ${wearerCount} wearer${wearerCount !== 1 ? 's' : ''}`}
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(s.id);
                    }}
                    className="text-diesel-rust/60 hover:text-diesel-rust"
                    title="Delete skin"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
