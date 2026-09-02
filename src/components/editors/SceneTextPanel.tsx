import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GameData, Scene } from '@/types';
import {
  collectSceneText,
  applySceneTextEdit,
  countSpokenWords,
  SPOKEN_KINDS,
  SceneTextEntry,
  SceneTextSection,
} from '@/utils/sceneText';
import { X, Search, MessageSquare, Type } from 'lucide-react';

interface SceneTextPanelProps {
  scene: Scene;
  game: GameData;
  onSceneChange: (updates: Partial<Scene>) => void;
  onButtonLabelChange: (buttonId: string, label: string) => void;
  onClose: () => void;
}

const SECTION_TITLES: Record<SceneTextSection, string> = {
  scene: 'Scene',
  script: 'Script',
  balloons: 'Balloons on the stage',
  buttons: 'Button labels',
};

const SECTION_ORDER: SceneTextSection[] = ['scene', 'script', 'balloons', 'buttons'];

/**
 * A textarea that grows to fit its content and keeps a local draft while
 * focused, so the field never fights the writer as edits flow back through
 * the scene data.
 */
const GrowingTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  multiline: boolean;
  placeholder?: string;
}> = ({ value, onChange, multiline, placeholder }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);

  // Adopt outside changes only when the writer is not mid-sentence in this field.
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  return (
    <textarea
      ref={ref}
      value={draft}
      rows={1}
      placeholder={placeholder}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setDraft(value); }}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onKeyDown={(e) => {
        // Enter would silently become a space in a single-line slot; refuse it
        // rather than let the field imply a line break it cannot keep.
        if (!multiline && e.key === 'Enter') e.preventDefault();
        // Escape must reach the panel's close handler even from inside a field.
      }}
      className="w-full resize-none overflow-hidden bg-diesel-panel border border-diesel-border text-diesel-paper text-base leading-relaxed p-2.5 focus:outline-none focus:border-diesel-gold placeholder:text-diesel-steel/60"
    />
  );
};

export const SceneTextPanel: React.FC<SceneTextPanelProps> = ({
  scene,
  game,
  onSceneChange,
  onButtonLabelChange,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [spokenOnly, setSpokenOnly] = useState(false);

  const entries = useMemo(() => collectSceneText(scene, game), [scene, game]);
  const spokenWords = useMemo(() => countSpokenWords(entries), [entries]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e => {
      if (spokenOnly && !SPOKEN_KINDS.includes(e.kind)) return false;
      if (!q) return true;
      return e.text.toLowerCase().includes(q) || e.label.toLowerCase().includes(q);
    });
  }, [entries, query, spokenOnly]);

  const grouped = useMemo(() => {
    return SECTION_ORDER
      .map(section => ({ section, items: visible.filter(e => e.section === section) }))
      .filter(g => g.items.length > 0);
  }, [visible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleEdit = (entry: SceneTextEntry, text: string) => {
    if (entry.location.type === 'button') {
      onButtonLabelChange(entry.location.buttonId, text);
      return;
    }
    const updates = applySceneTextEdit(scene, entry, text);
    if (updates) onSceneChange(updates);
  };

  const spokenCount = entries.filter(e => SPOKEN_KINDS.includes(e.kind)).length;

  return (
    // Opaque, and above the stage's buttons — those carry an inline z-index of 100.
    <div className="fixed inset-0 bg-diesel-black z-[200] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-diesel-border">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-diesel-gold font-bold uppercase tracking-wider text-sm whitespace-nowrap">
            All Text
          </h2>
          <span className="text-diesel-paper truncate">{scene.name}</span>
          <span className="text-xs text-diesel-steel whitespace-nowrap">
            {spokenCount} line{spokenCount === 1 ? '' : 's'} · {spokenWords} word{spokenWords === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-diesel-panel border border-diesel-border">
            <Search size={14} className="text-diesel-steel flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a line..."
              className="bg-transparent text-diesel-paper text-sm w-40 focus:outline-none placeholder:text-diesel-steel/60"
            />
          </div>

          <button
            onClick={() => setSpokenOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold uppercase transition-colors ${
              spokenOnly
                ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold'
                : 'bg-diesel-panel border-diesel-border text-diesel-steel hover:border-diesel-paper'
            }`}
            title="Hide names, notes and comments — show only what the player reads"
          >
            {spokenOnly ? <MessageSquare size={14} /> : <Type size={14} />}
            {spokenOnly ? 'Spoken only' : 'Everything'}
          </button>

          <button
            onClick={onClose}
            className="p-2 text-diesel-steel hover:text-diesel-paper border border-diesel-border"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* The list */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-4 py-5 space-y-8">
          {grouped.length === 0 && (
            <div className="text-center py-16 text-diesel-steel">
              {query.trim()
                ? <p>No text matches "{query.trim()}".</p>
                : <p>This scene has no text yet.</p>}
            </div>
          )}

          {grouped.map(({ section, items }) => (
            <section key={section}>
              <h3 className="text-xs font-bold text-diesel-rust uppercase tracking-widest mb-3 pb-1.5 border-b border-diesel-border">
                {SECTION_TITLES[section]}
              </h3>
              <div className="space-y-3">
                {items.map(entry => (
                  <div key={entry.key} className="flex gap-3 items-start">
                    <div className="w-36 flex-shrink-0 pt-2.5 text-right">
                      <div
                        className={`text-sm font-bold uppercase tracking-wide break-words ${
                          entry.kind === 'dialogue'
                            ? 'text-diesel-gold'
                            : entry.kind === 'choice'
                              ? 'text-diesel-cyan'
                              : entry.kind === 'balloon'
                                ? 'text-diesel-paper'
                                : 'text-diesel-steel'
                        }`}
                      >
                        {entry.label}
                      </div>
                      {entry.hint && (
                        <div className="text-[10px] text-diesel-steel lowercase">{entry.hint}</div>
                      )}
                      {entry.shared && (
                        <div className="text-[10px] text-diesel-rust uppercase">shared</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <GrowingTextarea
                        value={entry.text}
                        multiline={entry.multiline}
                        placeholder={entry.kind === 'dialogue' ? 'What do they say?' : ''}
                        onChange={(text) => handleEdit(entry, text)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
