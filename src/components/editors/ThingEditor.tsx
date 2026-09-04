// THINGS: what you speak into existence before it has a type. A thing is a
// name, a picture if it has one, a status, and the halo (Place, Become,
// Talk, Inspect). Its first Become moves it into the typed list it now
// belongs to and opens it there.
//
// Filed 2026-09-02 22:40 -07:00 by EDITOR (actor-3d lane).

import { useState } from 'react';
import { GameData, SelectionState, UrObject, AssetStatus } from '@/types';
import { newThing } from '@/utils/halo';
import { HaloCard } from '@/components/HaloCard';
import { CyberInput } from '@/components/CyberInput';
import { NotesSection } from '@/components/NotesSection';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { ChevronRight, Egg, Plus, Trash2 } from 'lucide-react';

interface ThingEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

export const ThingEditor = ({ game, selection, onChange, onSelect }: ThingEditorProps) => {
  const things = game.things ?? [];
  const thing = selection.id ? things.find(t => t.id === selection.id) : undefined;
  const [spoken, setSpoken] = useState('');

  const speak = () => {
    const t = newThing(spoken.trim() || 'Something');
    onChange({ ...game, things: [...things, t] });
    setSpoken('');
    onSelect('thing', t.id);
  };

  const update = (id: string, updates: Partial<UrObject>) => {
    onChange({ ...game, things: things.map(t => (t.id === id ? { ...t, ...updates } : t)) });
  };

  const remove = (id: string) => {
    onChange({ ...game, things: things.filter(t => t.id !== id) });
    onSelect('thing', null);
  };

  if (!thing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <p className="text-sm text-diesel-steel flex-1">
            {things.length} thing{things.length !== 1 ? 's' : ''} without a type yet
          </p>
          <input
            value={spoken}
            onChange={e => setSpoken(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') speak(); }}
            placeholder="Speak something into existence… its name"
            className="min-w-[240px] bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button onClick={speak} className="flex items-center gap-2 px-3 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-sm font-bold uppercase hover:bg-diesel-gold/30">
            <Plus size={14} /> Thing
          </button>
        </div>
        <div className="space-y-2">
          {things.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect('thing', t.id)}
              className="w-full flex items-center gap-3 p-3 bg-diesel-black border border-diesel-border hover:border-diesel-gold transition-colors text-left"
            >
              <div className="w-10 h-10 bg-diesel-panel border border-diesel-border flex items-center justify-center">
                {t.image ? <img src={t.image} alt={t.name} className="w-full h-full object-cover" /> : <Egg size={20} className="text-diesel-steel" />}
              </div>
              <div className="flex-1">
                <div className="text-diesel-paper font-bold">{t.name}</div>
                <div className="text-xs text-diesel-steel">no type yet{(t.log?.length ?? 0) > 0 && ` • ${t.log!.length} said`}</div>
              </div>
              <StatusBadge status={t.status || 'new'} size="sm" />
              <ChevronRight size={16} className="text-diesel-steel" />
            </button>
          ))}
        </div>
        {things.length === 0 && (
          <div className="text-center py-12 text-diesel-steel">
            <Egg size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nothing spoken into existence yet. Name a thing; decide what it is later.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={() => onSelect('thing', null)} className="text-sm text-diesel-steel hover:text-diesel-gold">← Back to Things</button>
        <button onClick={() => remove(thing.id)} className="flex items-center gap-1 px-2 py-1 border border-diesel-rust text-diesel-rust text-[10px] font-bold uppercase hover:bg-diesel-rust/20">
          <Trash2 size={10} /> Forget it
        </button>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4 border-b border-diesel-border pb-2">
          <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest flex items-center gap-2"><Egg size={14} /> Thing</h3>
          <StatusSelector status={thing.status || 'new'} onChange={(status: AssetStatus) => update(thing.id, { status })} />
        </div>
        <div className="flex gap-4 items-start">
          <div className="w-20 h-20 bg-diesel-panel border border-diesel-border flex items-center justify-center shrink-0" title="Look: its picture, once something can make one">
            {thing.image ? <img src={thing.image} alt={thing.name} className="w-full h-full object-cover" /> : <Egg size={28} className="text-diesel-steel/50" />}
          </div>
          <div className="flex-1">
            <CyberInput label="Name" value={thing.name} onChange={e => update(thing.id, { name: e.target.value })} />
            <div className="mt-3">
              <NotesSection note={thing.note || ''} onChange={note => update(thing.id, { note })} />
            </div>
          </div>
        </div>
      </section>

      <HaloCard game={game} kind="thing" rec={thing} onChange={onChange} onSelect={onSelect} />
    </div>
  );
};
