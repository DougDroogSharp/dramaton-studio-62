import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GameData, createDefaultGame, Button, Page, Actor, Item, StageElement } from '@/types';
import { Stage } from '@/components/Stage';
import { DialogueBox } from '@/components/theater/DialogueBox';
import { ChoicePanel } from '@/components/theater/ChoicePanel';
import { TheaterControls } from '@/components/theater/TheaterControls';
import { TheaterProgressBar } from '@/components/theater/TheaterProgressBar';
import { CollectionPanel } from '@/components/theater/CollectionPanel';
import { SearchOverlay } from '@/components/theater/SearchOverlay';
import { DialogueHistory } from '@/components/theater/DialogueHistory';
import { useScriptRunner } from '@/hooks/useScriptRunner';
import { loadGameFromDB } from '@/utils/db';
import { loadPublishedGame } from '@/utils/cloudPublish';
import { DramatonLogo } from '@/components/DramatonLogo';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { isValidExternalUrl, sanitizeGameUrl, fetchWithTimeout } from '@/utils/urlSanitize';
import { X } from 'lucide-react';
import { StageButtonStrip } from '@/components/theater/StageButtonStrip';
import { toast } from 'sonner';
import { PlayerNameDialog } from '@/components/PlayerNameDialog';
import { SecurityDialog } from '@/components/SecurityDialog';
import { loadPlayerData, savePlayerData, updatePlayerName, markSecurityDialogSeen, incrementGamesPlayed, PlayerData } from '@/utils/playerStore';
import { parseScript } from '@/utils/scriptParser';
import { estimateSceneDuration } from '@/utils/sceneDuration';

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
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [showCollection, setShowCollection] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDialogueHistory, setShowDialogueHistory] = useState(false);
  // Player state
  const [player, setPlayer] = useState<PlayerData>(() => loadPlayerData());
  const [showPlayerNameDialog, setShowPlayerNameDialog] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  
  // Helper to navigate back to editor with last selection
  const navigateToEditor = useCallback(() => {
    // Try to restore last editor selection from sessionStorage
    const stored = sessionStorage.getItem('dramaton_last_editor');
    if (stored) {
      try {
        const lastSelection = JSON.parse(stored);
        // Navigate with state so Index can restore selection
        navigate('/', { state: { restoreSelection: lastSelection } });
        return;
      } catch (e) {
        console.error('Failed to parse stored selection:', e);
      }
    }
    navigate('/');
  }, [navigate]);
  
  // Audio refs for lifecycle management
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const ambienceRef = useRef<HTMLAudioElement | null>(null);
  const sfxRefs = useRef<HTMLAudioElement[]>([]);
  
  // Load game data
  useEffect(() => {
    const loadGame = async () => {
      setIsLoading(true);
      
      // Try to load from various sources (priority: slug > URL > base64 > IndexedDB)
      const slug = searchParams.get('slug');
      const gameUrl = searchParams.get('game');
      const gameData = searchParams.get('data');
      const sceneParam = searchParams.get('scene'); // Specific scene to jump to
      
      let isEditorPreview = false;
      
      if (slug) {
        // Load from cloud database by slug
        try {
          const published = await loadPublishedGame(slug);
          if (published) {
            setGame(published);
          } else {
            console.error('Game not found for slug:', slug);
          }
        } catch (e) {
          console.error('Failed to load game from cloud:', e);
        }
      } else if (gameUrl) {
        // Load from URL - sanitize first
        const safeUrl = sanitizeGameUrl(gameUrl);
        if (!safeUrl) {
          console.error('Invalid game URL protocol (only https/http allowed):', gameUrl);
        } else {
          try {
            const response = await fetchWithTimeout(safeUrl, {}, 10000);
            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`);
            }
            const data = await response.json();
            setGame(data);
          } catch (e) {
            console.error('Failed to load game from URL:', e);
          }
        }
      } else if (gameData) {
        // Load from base64-encoded data in URL
        try {
          const decoded = JSON.parse(atob(gameData));
          setGame(decoded);
        } catch (e) {
          console.error('Failed to decode game data:', e);
        }
      } else {
        // Try to load from IndexedDB (editor autosave) - this is editor preview mode
        const saved = await loadGameFromDB();
        if (saved) {
          setGame(saved);
          // Only auto-start if there are scenes to play
          if (saved.scenes && saved.scenes.length > 0) {
            isEditorPreview = true;
          }
        }
      }
      
      // Auto-start for editor preview mode (skip title screen)
      if (isEditorPreview || sceneParam) {
        setHasStarted(true);
      }
      
      setIsLoading(false);
    };
    
    loadGame();
  }, [searchParams]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      bgmRef.current?.pause();
      ambienceRef.current?.pause();
      sfxRefs.current.forEach(audio => audio.pause());
    };
  }, []);

  // Update volume on existing audio when mute changes
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.muted = isMuted;
    }
    if (ambienceRef.current) {
      ambienceRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle audio commands from script runner
  const handleAudioCommand = useCallback((
    type: 'bgm' | 'ambience' | 'sfx',
    name: string,
    options: { loop?: boolean; volume?: number }
  ) => {
    // Find audio track in current scene
    const scene = game?.scenes.find(s => s.audioTracks?.some(t => t.name === name));
    const track = scene?.audioTracks?.find(t => t.name === name);
    
    if (!track) return;
    
    const audio = new Audio(track.url);
    audio.loop = options.loop ?? track.loop;
    audio.volume = (options.volume ?? track.volume);
    audio.muted = isMuted;
    
    if (type === 'bgm') {
      // Stop existing BGM before playing new one
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      bgmRef.current = audio;
      audio.play().catch(e => console.log('BGM autoplay blocked:', e));
    } else if (type === 'ambience') {
      // Stop existing ambience before playing new one
      if (ambienceRef.current) {
        ambienceRef.current.pause();
        ambienceRef.current = null;
      }
      ambienceRef.current = audio;
      audio.play().catch(e => console.log('Ambience autoplay blocked:', e));
    } else {
      // SFX: just play (they're short), track for cleanup
      sfxRefs.current.push(audio);
      audio.onended = () => {
        sfxRefs.current = sfxRefs.current.filter(a => a !== audio);
      };
      audio.play().catch(e => console.log('SFX autoplay blocked:', e));
    }
  }, [game, isMuted]);

  // Get starting scene - prioritize scene param, then titleSceneId, then first scene
  // Validate that the requested scene actually exists in game data
  const sceneParam = searchParams.get('scene');
  const requestedSceneExists = sceneParam && game?.scenes.some(s => s.id === sceneParam);
  const startSceneId = (requestedSceneExists ? sceneParam : null) 
    || game?.info.titleSceneId 
    || game?.scenes[0]?.id 
    || '';
  
  // Script runner hook
  const scriptRunner = useScriptRunner({
    game: game || createDefaultGame(),
    startSceneId,
    onAudioCommand: handleAudioCommand,
  });

  // Clear SFX on scene change
  useEffect(() => {
    sfxRefs.current.forEach(audio => audio.pause());
    sfxRefs.current = [];
  }, [scriptRunner.currentScene?.id]);

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
    
    // Show internal page if specified
    if (button.pageId) {
      const page = game?.pages?.find(p => p.id === button.pageId);
      if (page) {
        setActivePage(page);
        return; // Don't do other actions when showing a page
      }
    }
    
    // Open external page if specified - SANITIZE URL first
    if (button.pageUrl) {
      if (isValidExternalUrl(button.pageUrl)) {
        window.open(button.pageUrl, '_blank', 'noopener,noreferrer');
      } else {
        console.warn('Blocked unsafe URL:', button.pageUrl);
      }
    }
    
    // Navigate to target scene if specified
    if (button.targetSceneId) {
      scriptRunner.goToScene(button.targetSceneId);
    }
  }, [game, isMuted, playDefaultClickSound, scriptRunner]);

  // Handle element click (actor/item with attached page or collectible)
  const handleElementClick = useCallback((element: StageElement, actor?: Actor, item?: Item) => {
    // Handle collectible items first
    if (item?.isCollectible) {
      const wasCollected = scriptRunner.collectItem(item.id);
      if (wasCollected) {
        playDefaultClickSound();
        
        // Show collection toast with effects
        const effectText = item.effects.length > 0 
          ? item.effects.map(e => {
              const val = e.value;
              if (typeof val === 'number') {
                return `${e.variable} ${val >= 0 ? '+' : ''}${val}`;
              }
              return `${e.variable} = ${val}`;
            }).join(', ')
          : '';
        
        toast.success(`Collected: ${item.name}`, {
          description: effectText || 'Added to collection',
        });
        
        // If item has a page, show it after collection
        if (item.pageId) {
          const page = game?.pages?.find(p => p.id === item.pageId);
          if (page) {
            // Small delay before showing page
            setTimeout(() => setActivePage(page), 500);
          }
        }
      }
      return;
    }
    
    // Handle non-collectible items/actors with pages
    const pageId = actor?.pageId || item?.pageId;
    if (pageId) {
      const page = game?.pages?.find(p => p.id === pageId);
      if (page) {
        playDefaultClickSound();
        setActivePage(page);
      }
    }
  }, [game, playDefaultClickSound, scriptRunner]);

  // Handle starting the game (moved up for keyboard handler access)
  const handleStartGame = useCallback(() => {
    // Show player name dialog if they haven't chosen a name yet
    if (!player.hasChosenName && !player.hasSeenSecurityDialog) {
      setShowPlayerNameDialog(true);
    } else {
      incrementGamesPlayed();
      setHasStarted(true);
    }
  }, [player]);

  // Handle player name save
  const handleSavePlayerName = useCallback((name: string) => {
    const updated = updatePlayerName(name);
    setPlayer(updated);
    markSecurityDialogSeen();
    incrementGamesPlayed();
    setHasStarted(true);
  }, []);

  // Keyboard controls - work on title screen AND during gameplay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Title screen controls
      if (!hasStarted) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleStartGame();
          return;
        }
        // Toggle mute works on title screen too
        if (e.key === 'm' || e.key === 'M') {
          setIsMuted(prev => !prev);
          return;
        }
        // Escape to go back to editor from title
        if (e.key === 'Escape') {
          navigateToEditor();
          return;
        }
        return;
      }
      
      // Gameplay controls (after started)
      
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
      
      // Toggle dialogue history
      if (e.key === 'h' || e.key === 'H') {
        setShowDialogueHistory(prev => !prev);
      }
      
      // Escape to open menu during gameplay
      if (e.key === 'Escape') {
        setShowMenu(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, scriptRunner, navigateToEditor, handleStartGame]);

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
            onClick={navigateToEditor}
            className="px-6 py-3 bg-diesel-rust/20 border-2 border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
          >
            Go to Editor
          </button>
        </div>
      </div>
    );
  }

  // No scenes in game
  if (!game.scenes || game.scenes.length === 0) {
    return (
      <div className="min-h-screen bg-diesel-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <DramatonLogo className="w-24 h-24 mx-auto text-diesel-gold" />
          <h1 className="text-2xl text-diesel-paper font-bold mt-8 mb-4">No Scenes Yet</h1>
          <p className="text-diesel-steel mb-8">
            This game doesn't have any scenes to play. Create some scenes in the editor first!
          </p>
          <button
            onClick={navigateToEditor}
            className="px-6 py-3 bg-diesel-rust/20 border-2 border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
          >
            Go to Editor
          </button>
        </div>
      </div>
    );
  }

  // Title screen (before starting)
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-diesel-black flex items-center justify-center">
        <div 
          className="text-center max-w-2xl mx-auto p-8 cursor-pointer"
          onClick={handleStartGame}
        >
          <DramatonLogo className="w-32 h-32 mx-auto text-diesel-gold" />
          
          <h1 className="text-4xl md:text-6xl text-diesel-paper font-bold mt-12 mb-4 tracking-wider">
            {game.info.title}
          </h1>
          
          <p className="text-diesel-steel text-lg mb-8">
            by {game.info.author}
          </p>
          
          {/* Player greeting */}
          <p className="text-diesel-gold text-sm mb-8">
            Welcome, <span className="font-bold">{player.name}</span>
            {player.hasChosenName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlayerNameDialog(true);
                }}
                className="ml-2 text-diesel-steel hover:text-diesel-gold text-xs underline"
              >
                (change)
              </button>
            )}
          </p>
          
          <div className="animate-pulse">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartGame();
              }}
              className="px-8 py-4 bg-diesel-gold/20 border-2 border-diesel-gold text-diesel-gold font-bold uppercase text-xl hover:bg-diesel-gold/30 transition-colors"
            >
              Start Game
            </button>
          </div>
          
          <p className="text-diesel-steel/50 text-sm mt-8">
            Click anywhere or press SPACE to begin
          </p>
        </div>
        
        {/* Player Name Dialog */}
        <PlayerNameDialog
          open={showPlayerNameDialog}
          onOpenChange={setShowPlayerNameDialog}
          currentPlayer={player}
          onSaveName={handleSavePlayerName}
          onShowSecurity={() => {
            setShowPlayerNameDialog(false);
            setShowSecurityDialog(true);
          }}
        />
        
        {/* Security Dialog */}
        <SecurityDialog
          open={showSecurityDialog}
          onOpenChange={(open) => {
            setShowSecurityDialog(open);
            if (!open && !player.hasChosenName) {
              // Return to player name dialog after viewing security
              setShowPlayerNameDialog(true);
            }
          }}
        />
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

  // Handle case where scene couldn't be found
  if (!currentScene) {
    return (
      <div className="min-h-screen bg-diesel-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <DramatonLogo className="w-24 h-24 mx-auto text-diesel-gold" />
          <h1 className="text-2xl text-diesel-paper font-bold mt-8 mb-4">Scene Not Found</h1>
          <p className="text-diesel-steel mb-8">
            The requested scene could not be loaded. It may have been deleted or moved.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={navigateToEditor}
              className="px-6 py-3 bg-diesel-rust/20 border-2 border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
            >
              Go to Editor
            </button>
            <button
              onClick={() => {
                scriptRunner.goToScene(game.scenes[0]?.id || '');
              }}
              className="px-6 py-3 bg-diesel-gold/20 border-2 border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
            >
              Start from Beginning
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-diesel-black flex flex-col">
      {/* Stage Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl flex flex-col">
          {currentScene && (
            <Stage
              scene={currentScene}
              game={game}
              background={background}
              hideElement={scriptRunner.state.hiddenElements}
              elementOverrides={scriptRunner.state.elementOverrides}
              activeEffects={scriptRunner.state.activeEffects}
              activeButtons={Array.from(scriptRunner.state.activeButtons)}
              onButtonClick={handleButtonClick}
              onElementClick={handleElementClick}
              scriptMode={true}
            />
          )}
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
        
        {/* End of game message */}
        {scriptRunner.state.isComplete && !scriptRunner.state.activeDialogue && !scriptRunner.state.choices && (
          <div className="text-center py-8">
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
      
      {/* Progress Bar and Controls */}
      {(() => {
        // Calculate scene duration and progress
        const currentSceneScript = currentScene?.script || '';
        const commands = parseScript(currentSceneScript);
        const durationEstimate = estimateSceneDuration(commands);
        const currentIndex = scriptRunner.state.currentCommandIndex;
        const elapsedSeconds = durationEstimate.commandTimestamps[currentIndex] ?? 0;
        
        // Determine if paused (waiting for user input)
        const isPaused = !!(
          scriptRunner.state.activeDialogue ||
          scriptRunner.state.choices ||
          scriptRunner.state.isComplete
        );
        
        return (
          <>
            <TheaterProgressBar
              currentCommandIndex={currentIndex}
              totalCommands={commands.length}
              elapsedSeconds={elapsedSeconds}
              totalSeconds={durationEstimate.totalSeconds}
              isPaused={isPaused}
              hasChoices={durationEstimate.hasChoices}
            />
            <TheaterControls
              isAutoPlay={scriptRunner.state.isAutoPlay}
              isMuted={isMuted}
              isPaused={isPaused}
              onToggleAutoPlay={scriptRunner.toggleAutoPlay}
              onToggleMute={() => setIsMuted(!isMuted)}
              onOpenMenu={() => setShowMenu(true)}
              onOpenSettings={() => setShowSettings(true)}
              onOpenCollection={() => setShowCollection(true)}
              onOpenSearch={() => setShowSearch(true)}
              collectedCount={scriptRunner.state.collectedItems.size}
              onPlay={scriptRunner.advance}
              onStepBack={scriptRunner.stepBack}
              canStepBack={scriptRunner.canStepBack}
              onRestart={() => {
                if (currentScene) {
                  scriptRunner.goToScene(currentScene.id);
                }
              }}
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
                  navigateToEditor();
                }
              }}
            />
          </>
        );
      })()}
      
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
                onClick={navigateToEditor}
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
      
      {/* Page overlay */}
      {activePage && (
        <div 
          className="fixed inset-0 bg-diesel-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setActivePage(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setActivePage(null)}
              className="absolute top-2 right-2 z-10 bg-diesel-black/80 text-diesel-paper rounded-full p-2 hover:bg-diesel-black transition-colors"
            >
              <X size={20} />
            </button>
            <iframe
              srcDoc={`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: sans-serif; }
    ${activePage.cssStyles || ''}
  </style>
</head>
<body>
  ${activePage.htmlContent}
</body>
</html>`}
              sandbox="allow-same-origin"
              className="w-full h-[80vh]"
              title={activePage.name}
            />
          </div>
        </div>
      )}
      
      {/* Collection panel */}
      {showCollection && game && (
        <CollectionPanel
          game={game}
          collectedIds={scriptRunner.state.collectedItems}
          worldState={scriptRunner.state.worldState}
          onClose={() => setShowCollection(false)}
        />
      )}
      
      {/* Search overlay */}
      {showSearch && game && (
        <SearchOverlay
          game={game}
          onClose={() => setShowSearch(false)}
          onNavigateToScene={(sceneId) => {
            scriptRunner.goToScene(sceneId);
            setShowSearch(false);
          }}
          onNavigateToPage={(pageId) => {
            const page = game.pages?.find(p => p.id === pageId);
            if (page) {
              setActivePage(page);
            }
            setShowSearch(false);
          }}
        />
      )}
      
      {/* Dialogue history overlay */}
      <DialogueHistory
        entries={scriptRunner.dialogueHistory}
        isOpen={showDialogueHistory}
        onClose={() => setShowDialogueHistory(false)}
      />
    </div>
  );
};

export default Theater;
