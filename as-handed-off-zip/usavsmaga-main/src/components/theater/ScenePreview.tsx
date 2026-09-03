import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameData, Scene } from '@/types';
import { Stage } from '@/components/Stage';
import { DialogueBox } from '@/components/theater/DialogueBox';
import { ChoicePanel } from '@/components/theater/ChoicePanel';
import { useScriptRunner, ScriptError } from '@/hooks/useScriptRunner';
import { Play, Pause, RotateCcw, StepForward, StepBack, ChevronRight, ChevronLeft, Video, Volume2, VolumeX, Settings } from 'lucide-react';
import { StageButtonStrip } from '@/components/theater/StageButtonStrip';
import { parseScript, ScriptCommand } from '@/utils/scriptParser';
import { TheaterProgressBar } from '@/components/theater/TheaterProgressBar';
import { estimateSceneDuration, estimateCommandDuration } from '@/utils/sceneDuration';

interface ScenePreviewProps {
  scene: Scene;
  game: GameData;
  onClose: () => void;
  startAtCommandIndex?: number; // If set, execute up to this command immediately
  onScriptError?: (error: ScriptError) => void; // Called when commands reference missing actors/items
}

// Generate a fingerprint of scene data to detect changes
const getSceneFingerprint = (scene: Scene): string => {
  return JSON.stringify({
    script: scene.script,
    dropId: scene.dropId,
    stage: scene.stage,
    audioTracks: scene.audioTracks,
  });
};

export const ScenePreview: React.FC<ScenePreviewProps> = ({ scene, game, onClose, startAtCommandIndex, onScriptError }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(startAtCommandIndex !== undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevFingerprintRef = useRef<string>(getSceneFingerprint(scene));

  // Handle audio commands
  const handleAudioCommand = useCallback((
    type: 'bgm' | 'ambience' | 'sfx',
    name: string,
    options: { loop?: boolean; volume?: number }
  ) => {
    if (isMuted) return;
    
    // Find audio track in current scene
    const track = scene.audioTracks?.find(t => t.name === name);
    
    if (track) {
      // Stop previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const audio = new Audio(track.url);
      audio.loop = options.loop ?? track.loop;
      audio.volume = (options.volume ?? track.volume) * (isMuted ? 0 : 1);
      audio.play();
      audioRef.current = audio;
    }
  }, [scene, isMuted]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Script runner for the scene
  const scriptRunner = useScriptRunner({
    game,
    startSceneId: scene.id,
    onAudioCommand: handleAudioCommand,
    onScriptError,
  });

  // Execute to starting command index if specified
  const hasExecutedStartRef = useRef(false);
  useEffect(() => {
    if (startAtCommandIndex !== undefined && !hasExecutedStartRef.current) {
      hasExecutedStartRef.current = true;
      scriptRunner.executeToIndex(startAtCommandIndex);
    }
  }, [startAtCommandIndex, scriptRunner]);

  // Auto-restart when scene data changes
  const sceneFingerprint = getSceneFingerprint(scene);
  useEffect(() => {
    if (sceneFingerprint !== prevFingerprintRef.current) {
      prevFingerprintRef.current = sceneFingerprint;
      setHasStarted(startAtCommandIndex !== undefined);
      hasExecutedStartRef.current = false;
      scriptRunner.goToScene(scene.id);
    }
  }, [sceneFingerprint, scene.id, scriptRunner, startAtCommandIndex]);

  // Handle Play button - toggle auto-play
  const handlePlayToggle = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
    }
    
    // Toggle auto-play mode
    scriptRunner.toggleAutoPlay();
    
    // If we just enabled auto-play and script hasn't advanced, kick it off
    if (!scriptRunner.state.isAutoPlay) {
      scriptRunner.advance();
    }
  }, [hasStarted, scriptRunner]);

  // Handle Step button - single step without auto-play
  const handleStep = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
    }
    // Disable auto-play if it was on
    if (scriptRunner.state.isAutoPlay) {
      scriptRunner.toggleAutoPlay();
    }
    scriptRunner.advance();
  }, [hasStarted, scriptRunner]);

  // Handle Step Back button - go to previous state
  const handleStepBack = useCallback(() => {
    // Disable auto-play if it was on
    if (scriptRunner.state.isAutoPlay) {
      scriptRunner.toggleAutoPlay();
    }
    scriptRunner.stepBack();
  }, [scriptRunner]);

  // Get background
  const background = scene.dropId 
    ? game.drops.find(d => d.id === scene.dropId) 
    : undefined;

  // Find actor for dialogue
  const dialogueActor = scriptRunner.state.activeDialogue?.actorId
    ? game.actors.find(a => a.id === scriptRunner.state.activeDialogue?.actorId)
    : undefined;

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Choice selection with number keys
      if (scriptRunner.state.choices && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < scriptRunner.state.choices.options.length) {
          scriptRunner.selectChoice(index);
        }
        return;
      }
      
      // Spacebar toggles play/pause
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayToggle();
        return;
      }
      
      // Enter advances (single step)
      if (e.key === 'Enter') {
        e.preventDefault();
        handleStep();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scriptRunner, onClose, handlePlayToggle, handleStep]);

  // Parse commands for debug display
  const commands = useMemo(
    () => scene.script ? parseScript(scene.script) : [],
    [scene.script]
  );

  // Get current command for debug display
  const currentCommandIndex = scriptRunner.state.currentCommandIndex;
  const currentCommand = commands[currentCommandIndex];
  
  // Format command for display
  const formatCommand = (cmd: ScriptCommand | undefined, short = false): string => {
    if (!cmd) return '—';
    switch (cmd.type) {
      case 'DIALOGUE':
        const maxLen = short ? 25 : 40;
        return `${cmd.actorName}: "${cmd.text.slice(0, maxLen)}${cmd.text.length > maxLen ? '...' : ''}"`;
      case 'ENTER':
        return `ENTER: ${cmd.itemId} at (${cmd.x}, ${cmd.y})`;
      case 'EXIT':
        return `EXIT: ${cmd.itemId}`;
      case 'ZORDER':
        return `ZORDER: ${cmd.itemId} ${cmd.direction}`;
      case 'WAIT':
        return `WAIT: ${cmd.duration}s`;
      case 'SCENE':
        return `SCENE: ${cmd.sceneId}`;
      case 'CHOICE':
        return `CHOICE: ${cmd.options.length} options`;
      case 'BUTTON':
        return `BUTTON: ${cmd.buttonId}`;
      case 'HIDE_BUTTON':
        return `HIDE_BUTTON: ${cmd.buttonId}`;
      case 'MOVE':
        return `MOVE: ${cmd.itemId} to (${cmd.x}, ${cmd.y})`;
      case 'COMMENT':
        return `# ${cmd.text.slice(0, short ? 30 : 50)}`;
      case 'SET':
        return `SET: ${cmd.variable} = ${cmd.value}`;
      case 'IF':
        return `IF: ${cmd.variable} ${cmd.operator} ${cmd.value}`;
      case 'POSE':
        return `POSE: ${cmd.actorId}${cmd.pose ? ` pose=${cmd.pose}` : ''}${cmd.expression ? ` expr=${cmd.expression}` : ''}`;
      default:
        return cmd.type;
    }
  };

  // Get visible commands for history panel (current + 3 previous)
  const visibleCommands = useMemo(() => {
    if (!hasStarted) return [];
    const result: { index: number; command: ScriptCommand }[] = [];
    const startIndex = Math.max(0, currentCommandIndex - 3);
    for (let i = startIndex; i <= currentCommandIndex && i < commands.length; i++) {
      if (commands[i]) {
        result.push({ index: i, command: commands[i] });
      }
    }
    return result;
  }, [commands, currentCommandIndex, hasStarted]);

  // Handle clicking on a previous command to jump back
  const handleCommandClick = useCallback((commandIndex: number) => {
    if (commandIndex >= currentCommandIndex) return; // Can't jump forward or to current
    
    // Pause auto-play if active
    if (scriptRunner.state.isAutoPlay) {
      scriptRunner.toggleAutoPlay();
    }
    
    // Jump to the clicked command
    scriptRunner.executeToIndex(commandIndex);
  }, [currentCommandIndex, scriptRunner]);

  // Determine current command info for display
  const commandInfo = hasStarted 
    ? `Cmd ${currentCommandIndex + 1}/${commands.length}` 
    : 'Ready';

  return (
    <div className="fixed inset-0 bg-diesel-black/95 z-50 flex flex-col">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1 px-4 py-2 border-b border-diesel-border/50 bg-diesel-dark/50 text-sm">
        {/* Back button */}
        <button
          onClick={onClose}
          className="p-1 text-diesel-steel hover:text-diesel-paper transition-colors"
          title="Back to Scene Editor"
        >
          <ChevronLeft size={14} />
        </button>
        
        <div className="border-r border-diesel-border h-4 mx-1" />
        
        {/* Game Title */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-diesel-steel hover:text-diesel-gold transition-colors"
          title="Game Settings"
        >
          <Settings size={12} />
          <span className="text-xs">{game.info.title || 'Untitled Game'}</span>
        </button>
        
        <ChevronRight size={12} className="text-diesel-steel/50" />
        
        {/* Scenes */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-diesel-steel hover:text-diesel-gold transition-colors"
          title="Return to Scenes"
        >
          <Video size={12} className="text-diesel-rust" />
          <span className="text-xs">Scenes</span>
        </button>
        
        <ChevronRight size={12} className="text-diesel-steel/50" />
        
        {/* Scene Name */}
        <span className="text-xs text-diesel-gold font-bold">{scene.name}</span>
        
        <ChevronRight size={12} className="text-diesel-steel/50" />
        
        {/* Preview indicator */}
        <span className="text-xs text-diesel-paper uppercase tracking-wide">Preview</span>
        
        {/* Spacer + Command counter */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-diesel-steel/70">{commandInfo}</span>
          <span className="text-diesel-green font-mono text-xs">
            {hasStarted ? formatCommand(currentCommand) : '—'}
          </span>
        </div>
      </nav>

      {/* Progress Bar */}
      {hasStarted && (() => {
        const durationEstimate = estimateSceneDuration(commands);
        const baseElapsed = durationEstimate.commandTimestamps[currentCommandIndex] ?? 0;
        const currentCmdDuration = currentCommand ? estimateCommandDuration(currentCommand) : 0;
        const interpolatedElapsed = baseElapsed + (scriptRunner.state.subCommandProgress * currentCmdDuration);
        
        return (
          <TheaterProgressBar
            currentCommandIndex={currentCommandIndex}
            totalCommands={commands.length}
            elapsedSeconds={interpolatedElapsed}
            totalSeconds={durationEstimate.totalSeconds}
            isPaused={!scriptRunner.state.isAutoPlay && !scriptRunner.state.isWaiting}
            hasChoices={durationEstimate.hasChoices}
          />
        );
      })()}

      {/* Header Controls */}
      <div className="flex items-center px-4 py-2 border-b border-diesel-border">
        <div className="flex items-center gap-2">
          {/* Play/Pause button - toggles auto-play */}
          <button
            onClick={handlePlayToggle}
            className={`
              flex items-center gap-1 px-3 py-1 border 
              ${scriptRunner.state.isAutoPlay 
                ? 'border-diesel-rust bg-diesel-rust/20 text-diesel-rust hover:bg-diesel-rust/30' 
                : 'border-diesel-green bg-diesel-green/20 text-diesel-green hover:bg-diesel-green/30'
              }
              text-xs font-bold uppercase
            `}
            title={scriptRunner.state.isAutoPlay ? "Pause (Space)" : "Play (Space)"}
          >
            {scriptRunner.state.isAutoPlay ? <Pause size={12} /> : <Play size={12} />}
            {scriptRunner.state.isAutoPlay ? 'Pause' : 'Play'}
          </button>
          
          {/* Step Back button - go to previous state */}
          <button
            onClick={handleStepBack}
            disabled={!scriptRunner.canStepBack}
            className="
              flex items-center gap-1 px-3 py-1 border border-diesel-cyan
              text-diesel-cyan hover:bg-diesel-cyan/20
              text-xs font-bold uppercase disabled:opacity-30 disabled:cursor-not-allowed
            "
            title="Step back (undo last command)"
          >
            <StepBack size={12} />
            Back
          </button>
          
          {/* Step button - execute single command */}
          <button
            onClick={handleStep}
            className="
              flex items-center gap-1 px-3 py-1 border border-diesel-gold
              text-diesel-gold hover:bg-diesel-gold/20
              text-xs font-bold uppercase
            "
            title="Execute next command"
          >
            <StepForward size={12} />
            Step
          </button>
          
          {/* Restart button */}
          <button
            onClick={() => {
              setHasStarted(false);
              scriptRunner.goToScene(scene.id);
            }}
            className="flex items-center gap-1 px-3 py-1 border border-diesel-border text-diesel-steel hover:border-diesel-rust hover:text-diesel-rust text-xs font-bold uppercase"
          >
            <RotateCcw size={12} />
            Restart
          </button>
          
          {/* Mute button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`
              flex items-center gap-1 px-3 py-1 border text-xs font-bold uppercase
              ${isMuted 
                ? 'border-diesel-rust text-diesel-rust' 
                : 'border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold'
              }
            `}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            {isMuted ? 'Muted' : 'Sound'}
          </button>
        </div>
      </div>
      
      {/* Stage Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-4xl flex flex-col">
          <Stage
            scene={scene}
            game={game}
            background={background}
            hideElement={scriptRunner.state.hiddenElements}
            elementOverrides={scriptRunner.state.elementOverrides}
            activeEffects={scriptRunner.state.activeEffects}
            scriptMode={true}
          />
          {/* Button Strip below stage */}
          <StageButtonStrip />
        </div>
      </div>
      
      {/* Dialogue / Choice Area */}
      <div className="px-4 pb-4">
        {scriptRunner.state.activeDialogue && (
          <DialogueBox
            dialogue={scriptRunner.state.activeDialogue}
            actor={dialogueActor}
            onAdvance={scriptRunner.advance}
          />
        )}
        
        {scriptRunner.state.choices && (
          <ChoicePanel
            choices={scriptRunner.state.choices}
            onSelect={scriptRunner.selectChoice}
          />
        )}
        
        {/* End of scene */}
        {scriptRunner.state.isComplete && !scriptRunner.state.activeDialogue && !scriptRunner.state.choices && (
          <div className="text-center py-6">
            <p className="text-diesel-steel text-sm uppercase tracking-wider mb-4">
              — End of Scene —
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => scriptRunner.goToScene(scene.id)}
                className="px-4 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust font-bold uppercase text-sm hover:bg-diesel-rust/30"
              >
                Replay
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase text-sm hover:bg-diesel-gold/30"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
        
        {/* Empty script hint */}
        {!scene.script?.trim() && (
          <div className="text-center py-8">
            <p className="text-diesel-steel text-sm">
              No script to preview. Add dialogue and commands to the scene script.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 border border-diesel-border text-diesel-steel hover:border-diesel-paper hover:text-diesel-paper text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
      
      {/* Footer - Command History Panel */}
      <div className="border-t border-diesel-border bg-diesel-dark/30">
        {/* Command History Panel */}
        <div className="px-4 py-2 border-b border-diesel-border/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-diesel-steel/70 text-xs uppercase tracking-wide">Command History</span>
            <span className="text-diesel-steel/50 text-xs">({commandInfo})</span>
          </div>
          
          {!hasStarted ? (
            <div className="text-diesel-steel/50 text-xs font-mono py-1">
              Press Play or Step to begin
            </div>
          ) : visibleCommands.length === 0 ? (
            <div className="text-diesel-steel/50 text-xs font-mono py-1">
              No commands yet
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-20 overflow-y-auto custom-scrollbar">
              {visibleCommands.map(({ index, command }) => {
                const isCurrent = index === currentCommandIndex;
                const canClick = index < currentCommandIndex;
                
                return (
                  <div
                    key={index}
                    onClick={canClick ? () => handleCommandClick(index) : undefined}
                    className={`
                      flex items-center gap-2 px-2 py-0.5 font-mono text-xs rounded
                      ${isCurrent 
                        ? 'bg-diesel-gold/20 text-diesel-gold' 
                        : canClick
                          ? 'text-diesel-steel hover:text-diesel-paper hover:bg-diesel-panel/50 cursor-pointer'
                          : 'text-diesel-steel/50'
                      }
                    `}
                    title={canClick ? `Click to jump to command ${index + 1}` : undefined}
                  >
                    <span className={`w-4 ${isCurrent ? 'text-diesel-gold' : 'text-diesel-steel/30'}`}>
                      {isCurrent ? '▸' : ''}
                    </span>
                    <span className="w-12 text-diesel-steel/50">
                      Cmd {index + 1}:
                    </span>
                    <span className="flex-1 truncate">
                      {formatCommand(command, true)}
                    </span>
                    {isCurrent && scriptRunner.state.isWaiting && (
                      <span className="text-diesel-gold/70">(waiting...)</span>
                    )}
                    {isCurrent && scriptRunner.state.isComplete && (
                      <span className="text-diesel-rust">(complete)</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Keyboard hints */}
        <div className="text-center py-1">
          <p className="text-diesel-steel/50 text-xs">
            SPACE to play/pause • ENTER to step • ESC to close • 1-9 for choices
          </p>
        </div>
      </div>
    </div>
  );
};
