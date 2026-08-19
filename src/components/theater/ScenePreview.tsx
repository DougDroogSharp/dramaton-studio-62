import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameData, Scene } from '@/types';
import { Stage } from '@/components/Stage';
import { DialogueBox } from '@/components/theater/DialogueBox';
import { StageDialogueLayer } from '@/components/theater/StageDialogueLayer';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { X, Play, Pause, RotateCcw } from 'lucide-react';

interface ScenePreviewProps {
  scene: Scene;
  game: GameData;
  onClose: () => void;
  // When provided, dialogue text is editable in place (double-click);
  // commits rewrite the scene script.
  onUpdateScript?: (newScript: string) => void;
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

export const ScenePreview: React.FC<ScenePreviewProps> = ({ scene, game, onClose, onUpdateScript }) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevFingerprintRef = useRef<string>(getSceneFingerprint(scene));
  const suppressRestartRef = useRef(false);

  // Inline dialogue editing: replace the utterance's quoted text in the
  // scene script (first occurrence) and push the new script up. The
  // fingerprint-restart is suppressed for this change so the preview
  // stays where you are.
  const handleEditText = (oldText: string, newText: string) => {
    if (!onUpdateScript || !scene.script) return;
    const needle = `"${oldText}"`;
    if (!scene.script.includes(needle)) return;
    suppressRestartRef.current = true;
    onUpdateScript(scene.script.replace(needle, `"${newText}"`));
  };

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
  });

  // Auto-restart when scene data changes (except inline text edits)
  const sceneFingerprint = getSceneFingerprint(scene);
  useEffect(() => {
    if (sceneFingerprint !== prevFingerprintRef.current) {
      prevFingerprintRef.current = sceneFingerprint;
      if (suppressRestartRef.current) {
        suppressRestartRef.current = false;
        return;
      }
      scriptRunner.goToScene(scene.id);
    }
  }, [sceneFingerprint, scene.id, scriptRunner]);

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
      
      // Advance dialogue
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        scriptRunner.advance();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scriptRunner, onClose]);

  return (
    <div className="fixed inset-0 bg-diesel-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-diesel-border">
        <div className="flex items-center gap-4">
          <h2 className="text-diesel-gold font-bold uppercase tracking-wider text-sm">
            Preview: {scene.name}
          </h2>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={scriptRunner.toggleAutoPlay}
              className={`
                flex items-center gap-1 px-3 py-1 border text-xs font-bold uppercase
                ${scriptRunner.state.isAutoPlay 
                  ? 'border-diesel-gold bg-diesel-gold/20 text-diesel-gold' 
                  : 'border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold'
                }
              `}
            >
              {scriptRunner.state.isAutoPlay ? <Pause size={12} /> : <Play size={12} />}
              Auto
            </button>
            
            <button
              onClick={() => scriptRunner.goToScene(scene.id)}
              className="flex items-center gap-1 px-3 py-1 border border-diesel-border text-diesel-steel hover:border-diesel-rust hover:text-diesel-rust text-xs font-bold uppercase"
            >
              <RotateCcw size={12} />
              Restart
            </button>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-2 text-diesel-steel hover:text-diesel-paper transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Stage Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-4xl relative">
          <Stage
            scene={scene}
            game={game}
            background={background}
            hideElement={scriptRunner.state.hiddenElements}
            elementOverrides={scriptRunner.state.elementOverrides}
            activeEffects={scriptRunner.state.activeEffects}
            sliders={Array.from(scriptRunner.state.activeSliders.values())}
            gauges={Array.from(scriptRunner.state.activeGauges.values())}
            worldState={scriptRunner.state.worldState}
            onSliderChange={scriptRunner.setVariable}
          />
          <StageDialogueLayer
            scene={scene}
            dialogue={
              scriptRunner.state.activeDialogue &&
              scriptRunner.state.activeDialogue.actorName.trim().toLowerCase() !== 'narrator'
                ? scriptRunner.state.activeDialogue
                : null
            }
            choices={scriptRunner.state.choices}
            elementOverrides={scriptRunner.state.elementOverrides}
            onAdvance={scriptRunner.advance}
            onSelectChoice={scriptRunner.selectChoice}
            onEditText={onUpdateScript ? handleEditText : undefined}
          />
          {/* Narration as a comic caption overlaying the stage top */}
          {scriptRunner.state.activeDialogue &&
            scriptRunner.state.activeDialogue.actorName.trim().toLowerCase() === 'narrator' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[94%]" style={{ zIndex: 320 }}>
              <DialogueBox
                dialogue={scriptRunner.state.activeDialogue}
                actor={dialogueActor}
                onAdvance={scriptRunner.advance}
              />
            </div>
          )}
        </div>
      </div>

      {/* Below-stage area */}
      <div className="px-4 pb-4">
        
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
      
      {/* Footer hint */}
      <div className="text-center py-2 border-t border-diesel-border">
        <p className="text-diesel-steel/50 text-xs">
          Press SPACE to advance • ESC to close • 1-9 for choices
        </p>
      </div>
    </div>
  );
};
