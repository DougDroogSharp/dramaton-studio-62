import React, { useEffect, useState } from 'react';
import { GameData, Scene, ScenePhase } from '@/types';
import { Stage } from '@/components/Stage';
import { DialogueBox } from '@/components/theater/DialogueBox';
import { useScriptRunner, VarChange } from '@/hooks/useScriptRunner';
import { narratonRank, scoreKey } from '@/utils/narratonDirector';
import { SetCommand } from '@/utils/scriptParser';
import { X, RotateCcw, Play, Drama, FastForward } from 'lucide-react';

// Narraton TEST MODE: play a scene sandboxed (world state is snapshotted, the
// real game.info.worldState is never touched), with a live panel showing
// world variables, in-scene variables, the current scene's key stats, every
// change made, and the selector's ranking of where this could lead.

interface NarratonTestModeProps {
  game: GameData;
  startScene: Scene;
  onClose: () => void;
}

const PHASE_COLORS: Record<ScenePhase, string> = {
  BEGINNING: 'text-diesel-green',
  MIDDLE: 'text-diesel-gold',
  END: 'text-diesel-rust',
};

const setLabel = (s: SetCommand) =>
  `${s.variable} ${s.op || '='} ${typeof s.value === 'string' ? `"${s.value}"` : s.value}`;

const panelSection = 'border-b border-diesel-border px-3 py-2';
const panelTitle = 'text-[9px] text-diesel-steel uppercase tracking-widest mb-1.5';

export const NarratonTestMode: React.FC<NarratonTestModeProps> = ({ game, startScene, onClose }) => {
  // Restart = remount the run so the sandbox resets cleanly.
  const [runId, setRunId] = useState(0);
  return (
    <TestRun
      key={runId}
      game={game}
      startScene={startScene}
      onClose={onClose}
      onRestart={() => setRunId(n => n + 1)}
    />
  );
};

const TestRun: React.FC<NarratonTestModeProps & { onRestart: () => void }> = ({
  game,
  startScene,
  onClose,
  onRestart,
}) => {
  const scriptRunner = useScriptRunner({ game, startSceneId: startScene.id });
  const { state } = scriptRunner;
  // Narraton Drive: when on, the director chains scenes itself at scene end.
  const [driveMode, setDriveMode] = useState(false);
  // The story trail: every scene visited this run, in order.
  const [trail, setTrail] = useState<string[]>([startScene.id]);
  useEffect(() => {
    setTrail(prev => (prev[prev.length - 1] === state.currentSceneId ? prev : [...prev, state.currentSceneId]));
  }, [state.currentSceneId]);

  const currentScene = game.scenes.find(s => s.id === state.currentSceneId);
  const background = currentScene?.dropId
    ? game.drops.find(d => d.id === currentScene.dropId)
    : undefined;
  const dialogueActor = state.activeDialogue?.actorId
    ? game.actors.find(a => a.id === state.activeDialogue?.actorId)
    : undefined;

  // Director's view against the SANDBOX world state: consumed scenes are out,
  // phases gate, the last subplot pays the rotation penalty.
  const playedSceneIds = trail.slice(0, -1);
  const lastPlayed = playedSceneIds.length > 0
    ? game.scenes.find(s => s.id === playedSceneIds[playedSceneIds.length - 1])
    : undefined;
  const ranking = narratonRank(game.scenes, state.worldState, {
    playedSceneIds,
    lastSubplotId: lastPlayed?.subplotId,
  });
  const topPick = ranking.find(m => !m.ineligible && m.scene.id !== state.currentSceneId);

  // Narraton Drive: auto-continue to the director's pick at scene end.
  useEffect(() => {
    if (!driveMode || !state.isComplete || state.activeDialogue || state.choices || !topPick) return;
    const timer = setTimeout(() => scriptRunner.goToScene(topPick.scene.id), 1500);
    return () => clearTimeout(timer);
  }, [driveMode, state.isComplete, state.activeDialogue, state.choices, topPick, scriptRunner]);
  const currentStats = currentScene?.key && Object.keys(currentScene.key).length > 0
    ? scoreKey(currentScene.key, state.worldState)
    : null;
  const changesHere = state.varLog.filter(c => c.sceneId === state.currentSceneId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (state.choices && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < state.choices.options.length) scriptRunner.selectChoice(index);
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        scriptRunner.advance();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scriptRunner, state.choices, onClose]);

  return (
    <div className="fixed inset-0 bg-diesel-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-diesel-border">
        <div className="flex items-center gap-3">
          <Drama size={16} className="text-diesel-cyan" />
          <h2 className="text-diesel-cyan font-bold uppercase tracking-wider text-sm">
            Test Mode: {currentScene?.name ?? state.currentSceneId}
          </h2>
          <span className="text-diesel-steel/60 text-[10px] uppercase">sandbox — world state is not saved</span>
          <button
            onClick={onRestart}
            className="flex items-center gap-1 px-3 py-1 border border-diesel-border text-diesel-steel hover:border-diesel-rust hover:text-diesel-rust text-xs font-bold uppercase"
          >
            <RotateCcw size={12} />
            Restart
          </button>
          <button
            onClick={() => setDriveMode(d => !d)}
            title="At scene end, Narraton jumps to its own pick automatically"
            className={`flex items-center gap-1 px-3 py-1 border text-xs font-bold uppercase ${
              driveMode
                ? 'border-diesel-cyan bg-diesel-cyan/20 text-diesel-cyan'
                : 'border-diesel-border text-diesel-steel hover:border-diesel-cyan hover:text-diesel-cyan'
            }`}
          >
            <FastForward size={12} />
            Narraton Drive
          </button>
        </div>
        <button onClick={onClose} className="p-2 text-diesel-steel hover:text-diesel-paper transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Play area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {currentScene && (
              <div className="w-full max-w-4xl">
                <Stage
                  scene={currentScene}
                  game={game}
                  background={background}
                  hideElement={state.hiddenElements}
                  activeEffects={state.activeEffects}
                />
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            {state.activeDialogue && (
              <DialogueBox
                dialogue={state.activeDialogue}
                actor={dialogueActor}
                onAdvance={scriptRunner.advance}
              />
            )}

            {/* Choices, each clearly marked with the variables it twiddles */}
            {state.choices && (
              <div className="max-w-2xl mx-auto space-y-2">
                {state.choices.options.map((option, i) => {
                  const targetScene = game.scenes.find(s => s.id === option.target);
                  return (
                    <button
                      key={i}
                      onClick={() => scriptRunner.selectChoice(i)}
                      className="w-full text-left px-4 py-2.5 bg-diesel-panel border border-diesel-border rounded hover:border-diesel-cyan transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-diesel-steel text-xs">{i + 1}.</span>
                        <span className="text-diesel-paper text-sm flex-1">{option.text}</span>
                        <span className="text-diesel-steel/60 text-[10px]">
                          → {targetScene?.name ?? option.target}
                        </span>
                      </div>
                      {option.effects && option.effects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 ml-6">
                          {option.effects.map((s, j) => (
                            <span
                              key={j}
                              className="px-1.5 py-0.5 bg-diesel-gold/10 border border-diesel-gold/40 rounded text-[10px] font-mono text-diesel-gold"
                            >
                              {setLabel(s)}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* End of scene: show where Narraton would go */}
            {state.isComplete && !state.activeDialogue && !state.choices && (
              <div className="text-center py-4">
                <p className="text-diesel-steel text-sm uppercase tracking-wider mb-1">— End of Scene —</p>
                {topPick ? (
                  <p className="text-diesel-cyan text-xs mb-3 font-mono">
                    Narraton would pick: {topPick.scene.name} (Δ² {topPick.adjustedScore})
                    {driveMode && ' — driving there…'}
                  </p>
                ) : (
                  <p className="text-diesel-steel/60 text-xs mb-3">
                    The board is exhausted — no eligible keyed scene remains.
                  </p>
                )}
                <div className="flex items-center justify-center gap-3">
                  {topPick && (
                    <button
                      onClick={() => scriptRunner.goToScene(topPick.scene.id)}
                      className="px-4 py-2 bg-diesel-cyan/20 border border-diesel-cyan text-diesel-cyan font-bold uppercase text-sm hover:bg-diesel-cyan/30 flex items-center gap-1"
                    >
                      <Play size={12} />
                      Play Top Pick
                    </button>
                  )}
                  <button
                    onClick={onRestart}
                    className="px-4 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust font-bold uppercase text-sm hover:bg-diesel-rust/30"
                  >
                    Replay
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase text-sm hover:bg-diesel-gold/30"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {!currentScene?.script?.trim() && !state.isComplete && (
              <div className="text-center py-6">
                <p className="text-diesel-steel text-sm">
                  This scene has no script yet. Open it in the Scene Editor to add dialogue and choices.
                </p>
              </div>
            )}
          </div>

          <div className="text-center py-1.5 border-t border-diesel-border">
            <p className="text-diesel-steel/50 text-[10px]">
              SPACE to advance • 1-9 for choices • ESC to close
            </p>
          </div>
        </div>

        {/* Test panel */}
        <div className="w-72 shrink-0 border-l border-diesel-border bg-diesel-dark overflow-y-auto custom-scrollbar">
          {/* World variables */}
          <div className={panelSection}>
            <div className={panelTitle}>World variables</div>
            {Object.keys(state.worldState).length === 0 ? (
              <p className="text-diesel-steel/50 text-[10px]">none</p>
            ) : (
              Object.entries(state.worldState).map(([name, value]) => {
                const changed = game.info.worldState[name] !== value;
                return (
                  <div key={name} className="flex justify-between font-mono text-[11px] py-0.5">
                    <span className={changed ? 'text-diesel-gold' : 'text-diesel-steel'}>{name}</span>
                    <span className={changed ? 'text-diesel-gold font-bold' : 'text-diesel-paper'}>
                      {String(value)}
                      {changed && (
                        <span className="text-diesel-steel/50 font-normal ml-1">
                          (was {String(game.info.worldState[name] ?? '—')})
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* In-scene variables */}
          <div className={panelSection}>
            <div className={panelTitle}>In-scene variables</div>
            {Object.keys(state.localState).length === 0 ? (
              <p className="text-diesel-steel/50 text-[10px]">none declared for this scene</p>
            ) : (
              Object.entries(state.localState).map(([name, value]) => (
                <div key={name} className="flex justify-between font-mono text-[11px] py-0.5">
                  <span className="text-diesel-cyan">{name}</span>
                  <span className="text-diesel-paper">{String(value)}</span>
                </div>
              ))
            )}
          </div>

          {/* Current scene stats */}
          <div className={panelSection}>
            <div className={panelTitle}>Current scene</div>
            <div className="text-diesel-paper text-xs font-bold mb-1">
              {currentScene?.name ?? state.currentSceneId}
              {currentScene?.phase && (
                <span className={`ml-2 text-[9px] uppercase ${PHASE_COLORS[currentScene.phase]}`}>
                  {currentScene.phase}
                </span>
              )}
            </div>
            {currentStats ? (
              <>
                {currentStats.distances.map(d => (
                  <div key={d.variable} className="flex justify-between font-mono text-[11px] py-0.5">
                    <span className="text-diesel-gold">{d.variable}</span>
                    <span className="text-diesel-steel">
                      {d.actual} / {d.target}
                      <span className={Math.abs(d.diff) > 25 ? 'text-diesel-rust ml-1' : 'text-diesel-steel/50 ml-1'}>
                        ({d.diff >= 0 ? '+' : ''}{d.diff})
                      </span>
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-mono text-[11px] pt-1 border-t border-diesel-border/50 mt-1">
                  <span className="text-diesel-steel">match score Δ²</span>
                  <span className={currentStats.excluded ? 'text-diesel-rust' : 'text-diesel-paper'}>
                    {currentStats.score}
                    {currentStats.excluded ? ' (excluded)' : ''}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-diesel-steel/50 text-[10px]">no key — invisible to the selector</p>
            )}
            {changesHere.length > 0 && (
              <div className="mt-1.5">
                <div className="text-[9px] text-diesel-steel/70 uppercase tracking-widest">changed here</div>
                {changesHere.map((c, i) => (
                  <ChangeRow key={i} change={c} />
                ))}
              </div>
            )}
          </div>

          {/* Full change log */}
          <div className={panelSection}>
            <div className={panelTitle}>All changes this run</div>
            {state.varLog.length === 0 ? (
              <p className="text-diesel-steel/50 text-[10px]">nothing changed yet</p>
            ) : (
              state.varLog.map((c, i) => <ChangeRow key={i} change={c} />)
            )}
          </div>

          {/* The story so far */}
          <div className={panelSection}>
            <div className={panelTitle}>Story so far</div>
            {trail.map((id, i) => {
              const s = game.scenes.find(x => x.id === id);
              return (
                <div key={`${id}-${i}`} className="text-[11px] py-0.5 flex items-center gap-1">
                  <span className="text-diesel-steel/60 font-mono">{i + 1}.</span>
                  <span className={i === trail.length - 1 ? 'text-diesel-paper font-bold' : 'text-diesel-steel'}>
                    {s?.name ?? id}
                  </span>
                  {s?.subplotId && (
                    <span className="text-[9px] text-diesel-purple">
                      {game.subplots?.find(sp => sp.id === s.subplotId)?.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Where this could lead — the director's live board */}
          <div className={panelSection}>
            <div className={panelTitle}>Where this could lead</div>
            {ranking.length === 0 ? (
              <p className="text-diesel-steel/50 text-[10px]">no keyed scenes</p>
            ) : (
              ranking.slice(0, 8).map((m, i) => (
                <div
                  key={m.scene.id}
                  className={`flex justify-between text-[11px] py-0.5 ${
                    m.ineligible
                      ? 'text-diesel-steel/40'
                      : m.scene.id === state.currentSceneId
                        ? 'text-diesel-steel'
                        : m === topPick
                          ? 'text-diesel-cyan font-bold'
                          : 'text-diesel-paper'
                  }`}
                >
                  <span className="truncate mr-2">
                    {i + 1}. {m.scene.name}
                    {m.scene.id === state.currentSceneId && ' (here)'}
                    {m.sameSubplot && !m.ineligible && ' ↻'}
                  </span>
                  <span className="font-mono shrink-0">
                    {m.ineligible === 'played' && 'PLAYED'}
                    {m.ineligible === 'wrong-phase' && 'PHASE'}
                    {m.ineligible === 'big-miss' && 'MISS'}
                    {!m.ineligible && `Δ² ${m.adjustedScore}`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChangeRow = ({ change }: { change: VarChange }) => (
  <div className="font-mono text-[10px] py-0.5 flex items-center gap-1">
    <span className={change.scope === 'local' ? 'text-diesel-cyan' : 'text-diesel-gold'}>
      {change.variable}
    </span>
    <span className="text-diesel-steel/60">
      {String(change.from ?? '—')} → {String(change.to)}
    </span>
    {change.scope === 'local' && <span className="text-diesel-cyan/50 text-[9px]">local</span>}
  </div>
);
