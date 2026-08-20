import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GameData, createDefaultGame, Button, migrateGameData } from '@/types';
import { resolveValueString } from '@/utils/expression';
import { Stage } from '@/components/Stage';
import { DialogueBox } from '@/components/theater/DialogueBox';
import { StageDialogueLayer } from '@/components/theater/StageDialogueLayer';
import { QuoteCard } from '@/components/theater/QuoteCard';
import { useQuoteTriggers } from '@/hooks/useQuoteTriggers';
import { AudienceReactions } from '@/components/theater/AudienceReactions';
import { TheaterControls } from '@/components/theater/TheaterControls';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { loadGameFromDB } from '@/utils/db';
import { loadPublishedGame } from '@/utils/cloudPublish';
import { DramatonLogo } from '@/components/DramatonLogo';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

const Theater: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();
  
  const [game, setGame] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Load game data
  useEffect(() => {
    const loadGame = async () => {
      setIsLoading(true);
      
      // Try to load from various sources (priority: slug > URL > base64 > IndexedDB)
      const slug = searchParams.get('slug');
      const gameUrl = searchParams.get('game');
      const gameData = searchParams.get('data');
      
      if (slug) {
        // Load from cloud database by slug
        try {
          const published = await loadPublishedGame(slug);
          if (published) {
            setGame(migrateGameData(published));
          } else {
            console.error('Game not found for slug:', slug);
          }
        } catch (e) {
          console.error('Failed to load game from cloud:', e);
        }
      } else if (gameUrl) {
        // Load from URL
        try {
          // no-store: game files change constantly during development
          const response = await fetch(gameUrl, { cache: 'no-store' });
          const data = await response.json();
          setGame(migrateGameData(data));
        } catch (e) {
          console.error('Failed to load game from URL:', e);
        }
      } else if (gameData) {
        // Load from base64-encoded data in URL
        try {
          const decoded = JSON.parse(atob(gameData));
          setGame(migrateGameData(decoded));
        } catch (e) {
          console.error('Failed to decode game data:', e);
        }
      } else {
        // Try to load from IndexedDB (editor autosave)
        const saved = await loadGameFromDB();
        if (saved) {
          setGame(migrateGameData(saved));
        }
      }
      
      setIsLoading(false);
    };
    
    loadGame();
  }, [searchParams]);

  // Handle audio commands from script runner
  const handleAudioCommand = useCallback((
    type: 'bgm' | 'ambience' | 'sfx',
    name: string,
    options: { loop?: boolean; volume?: number }
  ) => {
    if (isMuted) return;
    
    // Find audio track in current scene
    const scene = game?.scenes.find(s => s.audioTracks?.some(t => t.name === name));
    const track = scene?.audioTracks?.find(t => t.name === name);
    
    if (track) {
      const audio = new Audio(track.url);
      audio.loop = options.loop ?? track.loop;
      audio.volume = (options.volume ?? track.volume) * (isMuted ? 0 : 1);
      audio.play();
    }
  }, [game, isMuted]);

  // Get starting scene
  const startSceneId = game?.info.titleSceneId || game?.scenes[0]?.id || '';
  
  // Script runner hook
  const scriptRunner = useScriptRunner({
    game: game || createDefaultGame(),
    startSceneId,
    onAudioCommand: handleAudioCommand,
  });

  // Quote pop-ups: worldState threshold crossings fire tagged quotes
  const { activeQuote, dismiss: dismissQuote } = useQuoteTriggers(
    game || createDefaultGame(),
    scriptRunner.state.worldState,
  );

  // Default button click sound (simple beep using Web Audio API)
  const playDefaultClickSound = useCallback(() => {
    if (isMuted) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.log('Could not play click sound:', e);
    }
  }, [isMuted]);

  // Handle button click
  const handleButtonClick = useCallback((button: Button) => {
    // Play SFX (custom or default)
    if (button.sfxId) {
      const sfx = game?.sfx.find(s => s.id === button.sfxId);
      if (sfx?.params?.audioUrl && !isMuted) {
        const audio = new Audio(sfx.params.audioUrl);
        audio.volume = 0.7;
        audio.play().catch(e => console.log('Failed to play button SFX:', e));
      } else {
        playDefaultClickSound();
      }
    } else {
      playDefaultClickSound();
    }
    
    // Apply worldState effects (SET semantics; expressions make
    // toggles: "1 - singleTax")
    if (button.effects?.length) {
      for (const effect of button.effects) {
        scriptRunner.setVariable(
          effect.variable,
          resolveValueString(effect.value, scriptRunner.state.worldState),
        );
      }
    }

    // Open external page if specified
    if (button.pageUrl) {
      window.open(button.pageUrl, '_blank', 'noopener,noreferrer');
    }

    // Navigate to target scene if specified
    if (button.targetSceneId) {
      scriptRunner.goToScene(button.targetSceneId);
    }
  }, [game, isMuted, playDefaultClickSound, scriptRunner]);

  // Keyboard controls
  useEffect(() => {
    if (!hasStarted) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
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
      
      // Toggle auto-play
      if (e.key === 'a' || e.key === 'A') {
        scriptRunner.toggleAutoPlay();
      }
      
      // Toggle mute
      if (e.key === 'm' || e.key === 'M') {
        setIsMuted(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, scriptRunner]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-diesel-black flex items-center justify-center">
        <div className="text-center">
          <DramatonLogo className="w-24 h-24 mx-auto text-diesel-gold" />
          <p className="text-diesel-steel mt-4 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // No game loaded
  if (!game) {
    return (
      <div className="min-h-screen bg-diesel-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <DramatonLogo className="w-24 h-24 mx-auto text-diesel-gold" />
          <h1 className="text-2xl text-diesel-paper font-bold mt-8 mb-4">No Game Loaded</h1>
          <p className="text-diesel-steel mb-8">
            No game data found. Please load a game from the editor or provide a game URL.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-diesel-rust/20 border-2 border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
          >
            Go to Editor
          </button>
        </div>
      </div>
    );
  }

  // Enter the start scene explicitly: the script runner initializes before the
  // game has loaded, so its internal currentSceneId starts out empty.
  const startShow = () => {
    scriptRunner.resetNarratonHistory();
    if (startSceneId) scriptRunner.goToScene(startSceneId);
    setHasStarted(true);
  };

  // Title screen (before starting)
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-diesel-black flex items-center justify-center">
        <div
          className="text-center max-w-2xl mx-auto p-8 cursor-pointer"
          onClick={startShow}
        >
          <DramatonLogo className="w-32 h-32 mx-auto text-diesel-gold" />
          
          <h1 className="text-4xl md:text-6xl text-diesel-paper font-bold mt-12 mb-4 tracking-wider">
            {game.info.title}
          </h1>
          
          <p className="text-diesel-steel text-lg mb-12">
            by {game.info.author}
          </p>
          
          <div className="animate-pulse">
            <button
              onClick={startShow}
              className="px-8 py-4 bg-diesel-gold/20 border-2 border-diesel-gold text-diesel-gold font-bold uppercase text-xl hover:bg-diesel-gold/30 transition-colors"
            >
              Start Game
            </button>
          </div>
          
          <p className="text-diesel-steel/50 text-sm mt-8">
            Click anywhere or press SPACE to begin
          </p>
        </div>
      </div>
    );
  }

  // Get current scene and background
  const currentScene = scriptRunner.currentScene;
  const background = currentScene?.dropId 
    ? game.drops.find(d => d.id === currentScene.dropId) 
    : undefined;
  
  // Find actor for dialogue
  const dialogueActor = scriptRunner.state.activeDialogue?.actorId
    ? game.actors.find(a => a.id === scriptRunner.state.activeDialogue?.actorId)
    : undefined;

  return (
    <div className="min-h-screen bg-diesel-black flex flex-col">
      {/* End-of-game area (narration overlays the stage as a caption,
          so the stage never jumps when it appears/disappears) */}
      <div className="px-4 pt-1 pb-1">
        {/* End of game message */}
        {scriptRunner.state.isComplete && !scriptRunner.state.activeDialogue && !scriptRunner.state.choices && (
          <div className="text-center py-4">
            <p className="text-diesel-gold text-xl uppercase tracking-wider mb-4">
              — The End —
            </p>
            <button
              onClick={() => {
                scriptRunner.goToScene(startSceneId);
                setHasStarted(false);
              }}
              className="px-6 py-3 bg-diesel-rust/20 border-2 border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
            >
              Return to Title
            </button>
          </div>
        )}
      </div>

      {/* Stage Area — width capped so the 16:9 stage always fits the viewport */}
      <div className="flex-1 flex items-start justify-center p-2 min-h-0">
        <div
          className="w-full relative"
          style={{ maxWidth: 'min(72rem, calc((100vh - 120px) * 16 / 9))' }}
        >
          {currentScene && (
            <Stage
              scene={currentScene}
              game={game}
              background={background}
              scriptBackdrop={scriptRunner.state.backdrop
                ? game.drops?.find(d => d.id === scriptRunner.state.backdrop!.dropId)
                : undefined}
              backdropDuration={scriptRunner.state.backdrop?.duration}
              camera={scriptRunner.state.camera}
              hideElement={scriptRunner.state.hiddenElements}
              elementOverrides={scriptRunner.state.elementOverrides}
              activeEffects={scriptRunner.state.activeEffects}
              activeButtons={Array.from(scriptRunner.state.activeButtons)}
              onButtonClick={handleButtonClick}
              sliders={Array.from(scriptRunner.state.activeSliders.values())}
              gauges={Array.from(scriptRunner.state.activeGauges.values())}
              worldState={scriptRunner.state.worldState}
              onSliderChange={scriptRunner.setVariable}
            />
          )}
          <StageDialogueLayer
            scene={currentScene}
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
          {/* Quote pop-up card */}
          {activeQuote && <QuoteCard quote={activeQuote} onDismiss={dismissQuote} />}
        </div>
      </div>

      {/* Controls */}
      <TheaterControls
        isAutoPlay={scriptRunner.state.isAutoPlay}
        isMuted={isMuted}
        onToggleAutoPlay={scriptRunner.toggleAutoPlay}
        onToggleMute={() => setIsMuted(!isMuted)}
        onOpenMenu={() => setShowMenu(true)}
        onOpenSettings={() => setShowSettings(true)}
        onGoHome={async () => {
          const shouldReturn = await confirm({ 
            title: 'Return to Title',
            description: 'Return to title screen? Progress will be lost.',
            confirmText: 'Return',
            cancelText: 'Stay',
            variant: 'destructive'
          });
          if (shouldReturn) {
            scriptRunner.goToScene(startSceneId);
            setHasStarted(false);
          }
        }}
        onBackToMenu={async () => {
          const shouldExit = await confirm({ 
            title: 'Exit to Menu',
            description: 'Exit to main menu? Progress will be lost.',
            confirmText: 'Exit',
            cancelText: 'Stay',
            variant: 'destructive'
          });
          if (shouldExit) {
            navigate('/');
          }
        }}
      />
      
      {/* Menu overlay (placeholder) */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-diesel-black/90 flex items-center justify-center z-50"
          onClick={() => setShowMenu(false)}
        >
          <div className="bg-diesel-panel border-2 border-diesel-gold p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl text-diesel-paper font-bold mb-6 text-center">Menu</h2>
            <div className="space-y-4">
              <button
                onClick={() => setShowMenu(false)}
                className="w-full py-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30"
              >
                Resume
              </button>
              <button
                onClick={() => {
                  scriptRunner.goToScene(startSceneId);
                  setHasStarted(false);
                  setShowMenu(false);
                }}
                className="w-full py-3 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30"
              >
                Return to Title
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 border border-diesel-border text-diesel-steel font-bold uppercase hover:border-diesel-paper hover:text-diesel-paper"
              >
                Exit to Editor
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Settings overlay (placeholder) */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-diesel-black/90 flex items-center justify-center z-50"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="bg-diesel-panel border-2 border-diesel-gold p-8 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl text-diesel-paper font-bold mb-6 text-center">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-diesel-paper">Sound</span>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`px-4 py-2 border ${isMuted ? 'border-diesel-rust text-diesel-rust' : 'border-diesel-green text-diesel-green'}`}
                >
                  {isMuted ? 'Muted' : 'On'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-diesel-paper">Auto-Play</span>
                <button
                  onClick={scriptRunner.toggleAutoPlay}
                  className={`px-4 py-2 border ${scriptRunner.state.isAutoPlay ? 'border-diesel-green text-diesel-green' : 'border-diesel-steel text-diesel-steel'}`}
                >
                  {scriptRunner.state.isAutoPlay ? 'On' : 'Off'}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-6 py-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Theater;
