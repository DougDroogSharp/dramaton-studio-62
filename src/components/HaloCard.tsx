// The halo, drawn on any thing's card: Place, Become, Talk, Inspect.
// (Name, Look and status are drawn by the card that hosts this, where they
// already live.) Every control is a word-sized button or a select: no
// dragging, no fine pointer work. Doug's object-centric frame, 2026-09-02.
//
// Filed 2026-09-02 22:40 -07:00 by EDITOR (actor-3d lane).

import { useState } from 'react';
import { FacetKind, GameData, SelectionState } from '@/types';
import {
  FACET_LABEL, Haloed, HaloKind, PLACE_COLUMNS, PLACE_ROWS, become, facetsOf, inspect, placeWords, sayTo,
} from '@/utils/halo';
import { MapPin, MessageSquare, Search, Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner';

interface HaloCardProps {
  game: GameData;
  kind: HaloKind;
  rec: Haloed;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

const head = 'text-sm font-bold text-diesel-gold uppercase tracking-widest mb-3 border-b border-diesel-border pb-2 flex items-center gap-2';
const word = 'px-3 py-2 border text-[11px] font-bold uppercase tracking-wider transition-colors';
const wordOff = `${word} border-diesel-border text-diesel-steel hover:border-diesel-paper hover:text-diesel-paper`;
const wordOn = `${word} border-diesel-gold bg-diesel-gold/20 text-diesel-gold`;
const selectClass = 'bg-diesel-panel border border-diesel-border rounded px-2 py-2 text-xs text-diesel-paper focus:outline-none focus:border-diesel-gold/50';

// Which facets a record of this kind can still take by saying so.
const becomable = (kind: HaloKind): FacetKind[] =>
  kind === 'thing' ? (Object.keys(FACET_LABEL) as FacetKind[]) : kind === 'actor' ? ['2d', '3d'] : [];

export const HaloCard = ({ game, kind, rec, onChange, onSelect }: HaloCardProps) => {
  const [draft, setDraft] = useState('');
  const [showInspect, setShowInspect] = useState(false);
  const facets = facetsOf(kind, rec, game);
  const place = rec.place ?? {};
  const scene = place.sceneId ? game.scenes.find(s => s.id === place.sceneId) : undefined;
  const drop = scene?.dropId ? game.drops.find(d => d.id === scene.dropId) : undefined;
  const anchors = drop?.anchors ?? [];

  const setPlace = (next: Partial<typeof place> | undefined) => {
    const merged = next === undefined ? undefined : { ...place, ...next };
    const write = (g: GameData): GameData => {
      const swap = <T extends { id: string }>(arr: T[]): T[] =>
        arr.map(x => (x.id === rec.id ? ({ ...x, place: merged } as T) : x));
      switch (kind) {
        case 'thing': return { ...g, things: swap(g.things ?? []) };
        case 'actor': return { ...g, actors: swap(g.actors) };
        case 'scene': return { ...g, scenes: swap(g.scenes) };
        case 'drop': return { ...g, drops: swap(g.drops) };
        case 'item': return { ...g, items: swap(g.items) };
        case 'sfx': return { ...g, sfx: swap(g.sfx) };
        case 'button': return { ...g, buttons: swap(g.buttons) };
      }
    };
    onChange(write(game));
  };

  const doBecome = (facet: FacetKind) => {
    const result = become(game, rec.id, facet);
    if (!result) return;
    onChange(result.game);
    toast.success(`${rec.name} is now ${FACET_LABEL[facet]}`);
    if (result.kind !== kind) onSelect(result.kind, result.id);
  };

  const say = () => {
    const text = draft.trim();
    if (!text) return;
    onChange(sayTo(game, rec.id, text));
    setDraft('');
  };

  const log = rec.log ?? [];
  const canBecome = becomable(kind).filter(f => !facets.includes(f));

  return (
    <div className="space-y-6">
      {/* PLACE */}
      <section>
        <h3 className={head}><MapPin size={14} /> Place <span className="text-[10px] normal-case tracking-normal font-mono text-diesel-steel ml-auto">{placeWords(rec.place, game)}</span></h3>
        <div className="flex flex-wrap items-start gap-3">
          <select
            value={place.sceneId ?? ''}
            onChange={e => setPlace({ sceneId: e.target.value || undefined, anchor: undefined })}
            className={`${selectClass} min-w-[180px]`}
            title="Which scene it lives in"
          >
            <option value="">— no scene —</option>
            {game.scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-1" title="Where on the stage, in words">
            {PLACE_ROWS.map(r => PLACE_COLUMNS.map(c => {
              const on = !place.anchor && place.x === c.x && place.y === r.y;
              return (
                <button key={`${r.word}-${c.word}`} onClick={() => setPlace({ x: c.x, y: r.y, anchor: undefined })} className={on ? wordOn : wordOff}>
                  {r.word} {c.word}
                </button>
              );
            }))}
          </div>
          {anchors.length > 0 && (
            <select
              value={place.anchor ?? ''}
              onChange={e => setPlace({ anchor: e.target.value || undefined })}
              className={`${selectClass} min-w-[140px]`}
              title="Or at a named anchor in the backdrop"
            >
              <option value="">— at an anchor —</option>
              {anchors.map(a => <option key={a.id} value={a.id}>{a.id}{a.label ? ` (${a.label})` : ''}</option>)}
            </select>
          )}
          <button onClick={() => setPlace(undefined)} className={wordOff} title="Nowhere yet">nowhere</button>
        </div>
      </section>

      {/* BECOME */}
      <section>
        <h3 className={head}><Sparkles size={14} /> Become
          <span className="text-[10px] normal-case tracking-normal font-mono text-diesel-steel ml-auto">
            {facets.length === 0 ? 'nothing yet' : facets.map(f => FACET_LABEL[f]).join(' + ')}
          </span>
        </h3>
        {canBecome.length === 0 ? (
          <p className="text-[10px] text-diesel-steel">
            {kind === 'thing' ? 'Pick what it becomes.' : 'Every facet this can take, it has. Facets add up; nothing is taken away.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {canBecome.map(f => (
              <button key={f} onClick={() => doBecome(f)} className={wordOff} title={`Become ${FACET_LABEL[f]}`}>
                {FACET_LABEL[f]}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* TALK */}
      <section>
        <h3 className={head}><MessageSquare size={14} /> Talk
          <span className="text-[10px] normal-case tracking-normal font-mono text-diesel-steel ml-auto">
            Phrog answers over the bridge and turns the knobs
          </span>
        </h3>
        <div className="border border-diesel-border bg-diesel-black p-2 max-h-56 overflow-y-auto custom-scrollbar space-y-1.5">
          {log.length === 0 ? (
            <p className="text-[10px] text-diesel-steel/60">Nothing said about it yet. Say what you want it to be or do.</p>
          ) : (
            log.map((u, i) => (
              <div key={`${u.at}-${i}`} className="text-xs">
                <span className={`font-mono text-[9px] uppercase mr-2 ${u.who === 'doug' ? 'text-diesel-gold' : 'text-diesel-cyan'}`}>{u.who}</span>
                <span className="text-diesel-paper">{u.text}</span>
                {u.turned && u.turned.length > 0 && (
                  <div className="ml-10 text-[10px] font-mono text-diesel-steel">
                    {u.turned.map((t, j) => <div key={j}>turned {t.path}{t.from !== undefined ? ` from ${String(t.from)}` : ''}{t.to !== undefined ? ` to ${String(t.to)}` : ''}</div>)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); say(); } }}
            placeholder={`Say it to ${rec.name}… (Enter sends)`}
            className="flex-1 h-14 bg-diesel-dark border border-diesel-border text-diesel-paper p-2 text-sm resize-none focus:outline-none focus:border-diesel-gold"
          />
          <button onClick={say} disabled={!draft.trim()} className={`${wordOn} disabled:opacity-40 flex items-center gap-1`} title="Say it">
            <Send size={12} /> Say
          </button>
        </div>
      </section>

      {/* INSPECT */}
      <section>
        <h3 className={head}><Search size={14} /> Inspect
          <button onClick={() => setShowInspect(v => !v)} className={`${showInspect ? wordOn : wordOff} ml-auto normal-case tracking-normal`}>
            {showInspect ? 'enough' : 'what are you?'}
          </button>
        </h3>
        {showInspect && (
          <ul className="text-xs text-diesel-paper space-y-1 font-mono">
            {inspect(kind, rec, game).map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
};
