import { useState } from 'react';
import { GameData, SelectionState, Drawing, Drop, Actor, ActorGraphic } from '@/types';
import {
  drawingFromSeed,
  fileToDataUrl,
  blobToDataUrl,
  readImageSize,
  trimDataUrl,
  findDrawingUses,
  removeDrawing,
  replaceDrawingImage,
  findDrawingByFile,
  isImageFileName,
  dataUrlBytes,
  formatBytes,
} from '@/utils/drawings';
import { loadLibraryFromDB, saveLibraryToDB, addDrawingToLibrary } from '@/utils/library';
import { POSES, EXPRESSIONS } from '@/constants';
import { CyberInput } from '@/components/CyberInput';
import { NotesSection } from '@/components/NotesSection';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { PenTool, Upload, FolderOpen, Trash2, Crop, Monitor, User, Archive, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// DRAWINGS — the shared store of finished 2-D art (Facing Alligators,
// 2026-09-02). Import an artist's files once; make backdrops and actor
// poses that point at them. No generation lives here: the drawing is the
// artist's, the editor only places it. Which drawing becomes what, and how
// it sits in the frame, is the creator's choice.

export const DRAWINGS_VERSION = 'v0.1';

interface DrawingsEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

interface ScannedFile {
  name: string;
  path: string;
  size: number;
  mtime: number;
}

const sectionLabel = 'text-[10px] text-diesel-steel uppercase tracking-widest mb-2 flex items-center gap-1';
const btn = 'flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const btnCyan = `${btn} bg-diesel-cyan/10 border-diesel-cyan text-diesel-cyan hover:bg-diesel-cyan/20`;
const btnPaper = `${btn} bg-diesel-panel border-diesel-border text-diesel-paper hover:border-diesel-paper`;
const btnRust = `${btn} bg-diesel-rust/10 border-diesel-rust text-diesel-rust hover:bg-diesel-rust/20`;

export const DrawingsEditor = ({ game, selection, onChange, onSelect }: DrawingsEditorProps) => {
  const drawings = game.drawings ?? [];
  const selected = selection.id ? drawings.find(d => d.id === selection.id) : null;

  const [artist, setArtist] = useState(drawings[drawings.length - 1]?.artist ?? '');
  const [folder, setFolder] = useState(game.info.artFolder ?? '');
  const [scan, setScan] = useState<{ dir: string; files: ScannedFile[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // pose target for "add as actor pose"
  const [targetActor, setTargetActor] = useState<string>(game.actors[0]?.id ?? '__new__');
  const [pose, setPose] = useState('Neutral');
  const [expression, setExpression] = useState('Neutral');

  const updateDrawing = (id: string, updates: Partial<Drawing>) =>
    onChange({ ...game, drawings: drawings.map(d => (d.id === id ? { ...d, ...updates } : d)) });

  // ── import ────────────────────────────────────────────────────────

  const addSeeds = async (
    seeds: { fileName: string; sourcePath?: string; getImage: () => Promise<string> }[],
  ) => {
    const added: Drawing[] = [];
    let skipped = 0;
    let failed = 0;
    for (const s of seeds) {
      if (findDrawingByFile(drawings, s.fileName, s.sourcePath)) {
        skipped++;
        continue;
      }
      try {
        setBusy(`Reading ${s.fileName}…`);
        const image = await s.getImage();
        const size = await readImageSize(image).catch(() => undefined);
        added.push(drawingFromSeed({
          fileName: s.fileName,
          sourcePath: s.sourcePath,
          artist: artist.trim() || undefined,
          image,
          width: size?.width,
          height: size?.height,
        }));
      } catch (err) {
        console.error('drawing import failed:', s.fileName, err);
        failed++;
      }
    }
    setBusy(null);
    if (added.length > 0) {
      onChange({ ...game, drawings: [...drawings, ...added] });
    }
    const parts = [`${added.length} imported`];
    if (skipped) parts.push(`${skipped} already here`);
    if (failed) parts.push(`${failed} unreadable`);
    (added.length > 0 ? toast.success : toast.info)(parts.join(' · '));
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/') || isImageFileName(f.name));
    e.target.value = '';
    if (files.length === 0) return;
    await addSeeds(files.map(f => ({ fileName: f.name, getImage: () => fileToDataUrl(f) })));
  };

  const scanFolder = async () => {
    const dir = folder.trim();
    if (!dir) {
      toast.error('Enter the absolute path of the art folder');
      return;
    }
    setBusy('Scanning folder…');
    try {
      const res = await fetch(`/api/drawings/list?dir=${encodeURIComponent(dir)}`);
      if (!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('folder import needs the dev server (npm run dev); use Import files here');
      }
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      setScan({ dir: j.dir, files: j.files });
      if (dir !== game.info.artFolder) {
        onChange({ ...game, info: { ...game.info, artFolder: dir } });
      }
      toast.success(`${j.files.length} image${j.files.length !== 1 ? 's' : ''} in folder`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not scan folder');
    } finally {
      setBusy(null);
    }
  };

  const importScanned = async () => {
    if (!scan) return;
    await addSeeds(scan.files.map(f => ({
      fileName: f.name,
      sourcePath: scan.dir,
      getImage: async () => {
        const res = await fetch(`/api/drawings/file?path=${encodeURIComponent(f.path)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return blobToDataUrl(await res.blob());
      },
    })));
  };

  // ── actions on one drawing ────────────────────────────────────────

  const handleTrim = async (d: Drawing) => {
    setBusy('Trimming borders…');
    try {
      const r = await trimDataUrl(d.image);
      if (!r.trimmed) {
        toast.info('No uniform border found — nothing trimmed');
        return;
      }
      onChange(replaceDrawingImage(game, d.id, r.image, { width: r.width, height: r.height }));
      toast.success(`Trimmed to ${r.width}×${r.height} (the file on disk is untouched)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Trim failed');
    } finally {
      setBusy(null);
    }
  };

  const makeBackdrop = (d: Drawing) => {
    const drop: Drop = {
      id: `drop_${Date.now()}`,
      name: d.name,
      prompt: '',
      image: d.image,
      drawingId: d.id,
      fit: 'contain',
      status: 'work',
      note: d.artist ? `Drawing by ${d.artist}` : '',
    };
    onChange({ ...game, drops: [...game.drops, drop] });
    toast.success(`Backdrop "${d.name}" created (DR tab)`, {
      action: { label: 'Open', onClick: () => onSelect('drop', drop.id) },
    });
  };

  const addAsPose = (d: Drawing) => {
    let actors = game.actors;
    let actorId = targetActor;
    if (actorId === '__new__' || !actors.some(a => a.id === actorId)) {
      const a: Actor = { id: `actor_${Date.now()}`, name: d.name, graphics: [], status: 'work' };
      actors = [...actors, a];
      actorId = a.id;
    }
    const g: ActorGraphic = {
      id: `graphic_${Date.now()}`,
      pose: pose.trim() || 'Neutral',
      expression: expression.trim() || 'Neutral',
      angle: 0,
      image: d.image,
      drawingId: d.id,
    };
    actors = actors.map(a => (a.id === actorId ? { ...a, graphics: [...a.graphics, g] } : a));
    onChange({ ...game, actors });
    const name = actors.find(a => a.id === actorId)?.name ?? 'actor';
    toast.success(`${name}: ${g.pose} · ${g.expression} added (AC tab)`, {
      action: { label: 'Open', onClick: () => onSelect('actor', actorId) },
    });
  };

  const saveToLibrary = async (d: Drawing) => {
    const library = await loadLibraryFromDB();
    await saveLibraryToDB(addDrawingToLibrary(library, d, game.info.title));
    toast.success('Saved to the Asset Library (LB) — any other document can pull it in');
  };

  const handleDelete = (d: Drawing) => {
    const uses = findDrawingUses(game, d.id);
    onChange(removeDrawing(game, d.id));
    if (selection.id === d.id) onSelect('drawing', null);
    const n = uses.drops.length + uses.graphics.length;
    toast.success(n > 0 ? `Drawing removed; its ${n} use${n !== 1 ? 's' : ''} keep their image` : 'Drawing removed');
  };

  // ── detail view ───────────────────────────────────────────────────

  if (selected) {
    const uses = findDrawingUses(game, selected.id);
    const poses = [...POSES, ...(game.info.customPoses ?? [])];
    const expressions = [...EXPRESSIONS, ...(game.info.customExpressions ?? [])];
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <button onClick={() => onSelect('drawing', null)} className="text-sm text-diesel-steel hover:text-diesel-paper">
            ← Back to Drawings
          </button>
          <StatusSelector status={selected.status || 'new'} onChange={status => updateDrawing(selected.id, { status })} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* the drawing */}
          <div>
            <div className="bg-diesel-black border border-diesel-border flex items-center justify-center" style={{ maxHeight: '60vh' }}>
              <img src={selected.image} alt={selected.name} className="max-h-[60vh] w-auto max-w-full object-contain" />
            </div>
            <p className="text-diesel-steel/70 text-[10px] font-mono mt-1 break-all">
              {selected.width && selected.height ? `${selected.width}×${selected.height} · ` : ''}
              {formatBytes(dataUrlBytes(selected.image))}
              {selected.fileName ? ` · ${selected.fileName}` : ''}
              {selected.sourcePath ? ` · ${selected.sourcePath}` : ''}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => handleTrim(selected)} disabled={busy !== null} className={btnPaper} title="Crop away uniform bars or margins (phone screenshots). The file on disk is untouched.">
                {busy?.startsWith('Trimming') ? <Loader2 size={12} className="animate-spin" /> : <Crop size={12} />}
                Trim borders
              </button>
              <button onClick={() => saveToLibrary(selected)} className={btnPaper} title="Copy into the cross-document Asset Library">
                <Archive size={12} />
                Save to Library
              </button>
              <button onClick={() => handleDelete(selected)} className={btnRust}>
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          </div>

          {/* facts + uses */}
          <div className="space-y-4">
            <CyberInput label="Name" value={selected.name} onChange={e => updateDrawing(selected.id, { name: e.target.value })} />
            <CyberInput label="Artist" value={selected.artist ?? ''} onChange={e => updateDrawing(selected.id, { artist: e.target.value || undefined })} placeholder="who drew it — credited, never generated" />
            <CyberInput
              label="Tags (comma separated)"
              value={(selected.tags ?? []).join(', ')}
              onChange={e => updateDrawing(selected.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder="cover, alligator, rain"
            />
            <NotesSection note={selected.note || ''} onChange={note => updateDrawing(selected.id, { note })} />

            <section className="border border-diesel-cyan/40 bg-diesel-black p-3 space-y-3">
              <div className={sectionLabel}>
                <Monitor size={11} />
                Use it
              </div>
              <button onClick={() => makeBackdrop(selected)} className={`${btnCyan} w-full justify-center`}>
                <Monitor size={12} />
                Make a backdrop (whole drawing, letterboxed)
              </button>
              <div className="border-t border-diesel-border pt-3 space-y-2">
                <div className="flex gap-2">
                  <label className="flex-1 text-[10px] uppercase tracking-widest text-diesel-steel">
                    Actor
                    <select
                      value={targetActor}
                      onChange={e => setTargetActor(e.target.value)}
                      className="mt-1 w-full bg-diesel-panel border border-diesel-border px-2 py-1 text-xs text-diesel-paper focus:outline-none focus:border-diesel-cyan/50"
                    >
                      {game.actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      <option value="__new__">+ new actor named after this drawing</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <label className="flex-1 text-[10px] uppercase tracking-widest text-diesel-steel">
                    Pose
                    <input list="dw-poses" value={pose} onChange={e => setPose(e.target.value)} className="mt-1 w-full bg-diesel-panel border border-diesel-border px-2 py-1 text-xs text-diesel-paper focus:outline-none focus:border-diesel-cyan/50" />
                    <datalist id="dw-poses">{poses.map(p => <option key={p} value={p} />)}</datalist>
                  </label>
                  <label className="flex-1 text-[10px] uppercase tracking-widest text-diesel-steel">
                    Expression
                    <input list="dw-expressions" value={expression} onChange={e => setExpression(e.target.value)} className="mt-1 w-full bg-diesel-panel border border-diesel-border px-2 py-1 text-xs text-diesel-paper focus:outline-none focus:border-diesel-cyan/50" />
                    <datalist id="dw-expressions">{expressions.map(x => <option key={x} value={x} />)}</datalist>
                  </label>
                </div>
                <button onClick={() => addAsPose(selected)} className={`${btnCyan} w-full justify-center`}>
                  <User size={12} />
                  Add as actor pose
                </button>
              </div>
            </section>

            <section>
              <div className={sectionLabel}>Used by</div>
              {uses.drops.length === 0 && uses.graphics.length === 0 ? (
                <p className="text-diesel-steel/50 text-[10px]">not placed yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {uses.drops.map(d => (
                    <button key={d.id} onClick={() => onSelect('drop', d.id)} className="px-2 py-0.5 bg-diesel-paper/10 border border-diesel-paper/40 rounded text-[11px] text-diesel-paper hover:bg-diesel-paper/20">
                      backdrop: {d.name}
                    </button>
                  ))}
                  {uses.graphics.map(u => (
                    <button key={u.graphic.id} onClick={() => onSelect('actor', u.actor.id)} className="px-2 py-0.5 bg-diesel-gold/10 border border-diesel-gold/40 rounded text-[11px] text-diesel-gold hover:bg-diesel-gold/20">
                      {u.actor.name}: {u.graphic.pose} · {u.graphic.expression}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ── store view ────────────────────────────────────────────────────

  const alreadyIn = (f: ScannedFile) => !!scan && !!findDrawingByFile(drawings, f.name, scan.dir);
  const newCount = scan ? scan.files.filter(f => !alreadyIn(f)).length : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <PenTool className="text-diesel-cyan" size={20} />
          <h2 className="text-lg font-bold text-diesel-paper uppercase tracking-wider">Drawings</h2>
          <span className="text-[10px] font-mono text-diesel-cyan border border-diesel-cyan/40 px-1.5 py-0.5 rounded">{DRAWINGS_VERSION}</span>
          <span className="text-diesel-steel text-xs">finished 2-D art — imported once, used anywhere</span>
        </div>
        <label className={`${btnCyan} cursor-pointer`}>
          <Upload size={12} />
          Import files…
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        </label>
      </div>

      {/* provenance defaults + folder import */}
      <div className="grid md:grid-cols-[1fr_2fr] gap-3 max-w-4xl">
        <div>
          <div className={sectionLabel}>Artist for new imports</div>
          <input
            value={artist}
            onChange={e => setArtist(e.target.value)}
            placeholder="e.g. Chris Unruh"
            className="w-full bg-diesel-black border border-diesel-border px-2 py-1.5 text-xs text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-cyan/50"
          />
        </div>
        <div>
          <div className={sectionLabel}>
            <FolderOpen size={11} />
            Art folder on this machine (dev server only; nothing on disk is moved)
          </div>
          <div className="flex gap-2">
            <input
              value={folder}
              onChange={e => setFolder(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scanFolder()}
              placeholder="C:\Users\...\Facing_Alligators_Art"
              className="flex-1 bg-diesel-black border border-diesel-border px-2 py-1.5 text-xs font-mono text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-cyan/50"
            />
            <button onClick={scanFolder} disabled={busy !== null} className={btnPaper}>
              {busy?.startsWith('Scanning') ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Scan
            </button>
            <button onClick={importScanned} disabled={!scan || newCount === 0 || busy !== null} className={btnCyan}>
              <Upload size={12} />
              Import {scan ? `${newCount} new` : 'folder'}
            </button>
          </div>
          {scan && (
            <div className="mt-2 border border-diesel-border bg-diesel-black p-2 max-h-28 overflow-y-auto custom-scrollbar text-[10px] font-mono">
              {scan.files.length === 0 ? (
                <p className="text-diesel-steel/60">no image files in that folder</p>
              ) : (
                scan.files.map(f => (
                  <div key={f.path} className="flex justify-between gap-2">
                    <span className={alreadyIn(f) ? 'text-diesel-steel/50' : 'text-diesel-paper'}>{f.name}</span>
                    <span className="text-diesel-steel/60 shrink-0">
                      {formatBytes(f.size)}{alreadyIn(f) ? ' · imported' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {busy && (
        <p className="text-diesel-cyan text-xs flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          {busy}
        </p>
      )}

      {/* the store */}
      {drawings.length === 0 ? (
        <div className="text-center py-12 text-diesel-steel border border-dashed border-diesel-border">
          <PenTool size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No drawings yet</p>
          <p className="text-xs opacity-70">Import files, or scan the art folder and import what is new</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {drawings.map(d => {
            const uses = findDrawingUses(game, d.id);
            const n = uses.drops.length + uses.graphics.length;
            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect('drawing', d.id)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect('drawing', d.id)}
                className="group bg-diesel-black border border-diesel-border hover:border-diesel-cyan transition-colors text-left overflow-hidden cursor-pointer focus:outline-none focus:border-diesel-cyan"
                title={d.fileName ?? d.name}
              >
                <div className="aspect-square flex items-center justify-center overflow-hidden">
                  <img src={d.image} alt={d.name} className="w-full h-full object-contain" />
                </div>
                <div className="p-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-diesel-paper truncate group-hover:text-diesel-cyan">{d.name}</span>
                    <StatusBadge status={d.status || 'new'} size="sm" />
                  </div>
                  <p className="text-[10px] text-diesel-steel truncate">
                    {d.artist ?? 'unknown artist'}
                    {d.width && d.height ? ` · ${d.width}×${d.height}` : ''}
                    {n > 0 ? ` · ${n} use${n !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
