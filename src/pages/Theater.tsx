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
import { AbilityPanel } from '@/components/theater/AbilityPanel';
import { AbilityOnboarding } from '@/components/theater/AbilityOnboarding';
import { EndCard } from '@/components/theater/EndCard';
import { MeterRow } from '@/components/theater/MeterPanel';
import { StageConsole } from '@/components/theater/StageConsole';
import { AbilityBar } from '@/components/theater/AbilityBar';
import { metersFor } from '@/utils/meters';
import { useSpokenShow } from '@/hooks/useSpokenShow';
import { primeSpeech } from '@/utils/speech';
import { AbilitySettings, loadAbilitySettings, saveAbilitySettings, hasOnboarded, markOnboarded } from '@/utils/accessibility';

const Theater: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();
  
  const [game, setGame] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Ability settings: the player describes what they need; the runner
  // adapts pacing, timing and motion. Persisted per browser.
  const [ability, setAbility] = useState<AbilitySettings>(() => loadAbilitySettings());
  const updateAbility = useCallback((next: AbilitySettings) => {
    setAbility(next);
    saveAbilitySettings(next);
    // If the player is relying on audio, sound must be ON — otherwise
    // choosing "I cannot see the screen" hands them silence.
    if (next.presentation === 'sound' || next.describeAction) setIsMuted(false);
  }, []);
  const [hasStarted, setHasStarted] = useState(false);
  // The model showing its work: the console shelf reads out the
  // variables this scene has moved. On by default — it costs no
  // layout, because the shelf reserves its height either way.
  const [showMeters, setShowMeters] = useState(true);
  // Pause freezes the whole show: the script, the auto-advance clock,
  // the TICK simulation, and the voice mid-sentence.
  const [isPaused, setIsPaused] = useState(false);
  // Onboarding is the front door, not a buried menu: every player is
  // asked how they want to play before the first game.
  const [showOnboarding, setShowOnboarding] = useState(() => !hasOnboarded());
  const [onboardingFirstRun, setOnboardingFirstRun] = useState(() => !hasOnboarded());
  const finishOnboarding = useCallback(() => {
    markOnboarded();
    setShowOnboarding(false);
  }, []);
  
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

  // Every sound the show starts has an owner. Before this, each command
  // did `new Audio(url).play()` and dropped the handle on the floor:
  // nothing could stop it, so music from a previous scene played under
  // the next one, a repeated [BGM] stacked a second copy on top of the
  // first, and hitting mute silenced only sounds that had not started yet.
  //
  // BGM and AMBIENCE are channels: one clip each, and a new clip on a
  // channel replaces the one playing. SFX are one-shots, held only long
  // enough to stop them on the way out.
  const channelsRef = useRef<{ bgm: HTMLAudioElement | null; ambience: HTMLAudioElement | null }>({
    bgm: null, ambience: null,
  });
  const sfxRef = useRef<Set<HTMLAudioElement>>(new Set());

  const stopAudio = useCallback((what: 'all' | 'sfx' = 'all') => {
    for (const a of sfxRef.current) { a.pause(); a.src = ''; }
    sfxRef.current.clear();
    if (what === 'sfx') return;
    for (const key of ['bgm', 'ambience'] as const) {
      const a = channelsRef.current[key];
      if (a) { a.pause(); a.src = ''; }
      channelsRef.current[key] = null;
    }
  }, []);

  const handleAudioCommand = useCallback((
    type: 'bgm' | 'ambience' | 'sfx',
    name: string,
    options: { loop?: boolean; volume?: number }
  ) => {
    if (isMuted) return;

    // Find audio track in current scene
    const scene = game?.scenes.find(s => s.audioTracks?.some(t => t.name === name));
    const track = scene?.audioTracks?.find(t => t.name === name);
    if (!track) return;

    const audio = new Audio(track.url);
    audio.loop = options.loop ?? track.loop;
    audio.volume = options.volume ?? track.volume;

    if (type === 'sfx') {
      sfxRef.current.add(audio);
      audio.addEventListener('ended', () => sfxRef.current.delete(audio), { once: true });
    } else {
      const previous = channelsRef.current[type];
      if (previous) { previous.pause(); previous.src = ''; }
      channelsRef.current[type] = audio;
    }

    // Browsers reject play() when the tab has no user gesture yet. That
    // is not an error worth crashing or logging on every scene.
    void audio.play().catch(() => {});
  }, [game, isMuted]);

  // Pause holds the score rather than discarding it, so resuming picks
  // up mid-bar. Mute, by contrast, stops for good.
  useEffect(() => {
    const clips = [channelsRef.current.bgm, channelsRef.current.ambience];
    for (const a of clips) {
      if (!a) continue;
      if (isPaused) a.pause();
      else if (!isMuted) void a.play().catch(() => {});
    }
  }, [isPaused, isMuted]);

  // Mute stops what is already sounding, not just what has yet to start.
  useEffect(() => {
    if (isMuted) stopAudio('all');
  }, [isMuted, stopAudio]);

  // Leaving the theater takes the sound with it.
  useEffect(() => () => stopAudio('all'), [stopAudio]);

  // Get starting scene
  const startSceneId = game?.info.titleSceneId || game?.scenes[0]?.id || '';
  
  // Script runner hook
  const scriptRunner = useScriptRunner({
    game: game || createDefaultGame(),
    startSceneId,
    onAudioCommand: handleAudioCommand,
    ability,
    paused: isPaused,
  });

  // Read the show aloud when the player is relying on audio.
  useSpokenShow({
    dialogue: scriptRunner.state.activeDialogue,
    ambient: scriptRunner.state.ambientNarration,
    choices: scriptRunner.state.choices?.options ?? null,
    ability,
    muted: isMuted || isPaused,
    narratorVoice: ability.narratorVoice,
    active: hasStarted,
  });

  // A scene's one-shot sounds belong to that scene. Music and ambience
  // deliberately carry across the cut — that is what a score is for, and
  // the only way to change either is to play a new clip on its channel.
  useEffect(() => {
    stopAudio('sfx');
  }, [scriptRunner.state.currentSceneId, stopAudio]);

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
        sfxRef.current.add(audio);
        audio.addEventListener('ended', () => sfxRef.current.delete(audio), { once: true });
        void audio.play().catch(() => {});
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

  // Scanning choice input: options highlight one at a time and any
  // single input takes the highlighted one. This is what makes the
  // game playable with one switch, one key, a sound, or a blink —
  // and it is the only way to choose when the balloons are hidden.
  const [scanIndex, setScanIndex] = useState(0);
  const choiceCount = scriptRunner.state.choices?.options.length ?? 0;
  const scanning = ability.scanChoices && choiceCount > 1;
  // A new choice always starts at the first option, whether it is being
  // scanned automatically or steered with the arrow keys.
  useEffect(() => {
    setScanIndex(0);
  }, [choiceCount, scriptRunner.state.currentSceneId, scriptRunner.state.currentCommandIndex]);
  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(
      () => setScanIndex(i => (i + 1) % choiceCount),
      Math.max(1, ability.scanSeconds) * 1000,
    );
    return () => clearInterval(id);
  }, [scanning, choiceCount, ability.scanSeconds, scriptRunner.state.currentSceneId, scriptRunner.state.currentCommandIndex]);

  // Keyboard controls
  useEffect(() => {
    if (!hasStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Scanning: ANY key takes the highlighted option
      if (scanning) {
        e.preventDefault();
        scriptRunner.selectChoice(scanIndex);
        return;
      }

      // Arrow keys move the highlight, Enter/Space takes it. Works
      // alongside the mouse and the number keys — every input method
      // reaches every choice.
      if (scriptRunner.state.choices) {
        const count = scriptRunner.state.choices.options.length;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          setScanIndex(i => (i + 1) % count);
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setScanIndex(i => (i - 1 + count) % count);
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scriptRunner.selectChoice(Math.min(scanIndex, count - 1));
          return;
        }
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
      
      // Toggle auto-play
      if (e.key === 'a' || e.key === 'A') {
        scriptRunner.toggleAutoPlay();
      }
      
      // Toggle mute
      if (e.key === 'p' || e.key === 'P') {
        setIsPaused(prev => !prev);
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        setIsMuted(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, scriptRunner, scanning, scanIndex]);

  // Meter rows: only variables this scene has actually moved AND that
  // we can explain. An unmoved or unexplained gauge is noise.
  //
  // This MUST stay above the early returns below. It used to sit down
  // beside the render that uses it, which meant the title screen ran
  // one fewer hook than the playing screen — so the click on START
  // crashed React with "Rendered more hooks than during the previous
  // render." Hooks run unconditionally or not at all.
  const meterRows: MeterRow[] = React.useMemo(() => {
    if (!game) return [];
    const known = metersFor(game.meters);
    const rows: MeterRow[] = [];
    for (const [variable, move] of scriptRunner.state.meterMoves) {
      const meaning = known.get(variable);
      if (meaning) rows.push({ meaning, from: move.from, to: move.to, seq: move.seq });
    }
    return rows;
  }, [scriptRunner.state.meterMoves, game]);

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
    // START is a real user gesture, and that is the only moment a
    // browser will let the speech engine be opened. Without this the
    // opening line is silent and the player has to toggle mute twice to
    // hear anything — which worked only because the second press was
    // itself a gesture with a speak() directly behind it.
    primeSpeech();
    scriptRunner.resetNarratonHistory();
    if (startSceneId) scriptRunner.goToScene(startSceneId);
    setHasStarted(true);
  };

  // Title screen (before starting)
  // The access question comes before the title card — everyone answers
  // it, so nobody has to go looking for a special menu.
  if (showOnboarding) {
    return (
      <AbilityOnboarding
        settings={ability}
        onChange={updateAbility}
        onDone={finishOnboarding}
        firstRun={onboardingFirstRun}
      />
    );
  }

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
          
          <p className="text-diesel-steel text-lg mb-2">
            by {game.info.author}
          </p>

          {/* WHICH BUILD IS THIS.
              Quiet enough to ignore, present enough to read out over the
              phone. When the same game is being played on a PC, an iPad
              and an iPhone and one of them is holding a cached copy,
              "it's broken" is unanswerable without this. */}
          <p className="text-diesel-steel/45 text-xs tracking-wider mb-10 font-mono">
            {game.info.version ?? 'unversioned build'}
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
  
  // The scene's caption, lifted off the picture and onto the plate.
  // Convention: a BALLOON element whose id ends in _sign is a dateline,
  // not a label on something in the scene.
  const sceneCaption = currentScene?.stage
    ?.find(e => e.type === 'BALLOON' && /_sign$/i.test(e.id))?.text ?? null;

  // Find actor for dialogue
  const dialogueActor = scriptRunner.state.activeDialogue?.actorId
    ? game.actors.find(a => a.id === scriptRunner.state.activeDialogue?.actorId)
    : undefined;

  // The face on the plate. Prefer the graphic this line is actually
  // being acted with, so the icon matches what the sprite is doing;
  // fall back to the actor's first graphic, then to their initial.
  const speakerPortrait = (() => {
    if (!dialogueActor?.graphics?.length) return undefined;
    const d = scriptRunner.state.activeDialogue;
    const match = dialogueActor.graphics.find(g =>
      (!d?.expression || g.expression === d.expression) &&
      (!d?.pose || g.pose === d.pose));
    return (match ?? dialogueActor.graphics[0])?.image;
  })();

  return (
    // h-screen, not min-h-screen. The transport controls are the LAST
    // child of this column, so if the column is allowed to grow past the
    // window they slide off the bottom edge and the player has no pause,
    // no mute, no settings and no way back — which is what happened once
    // the plate and ability rail made the console taller. Pinning the
    // column to the viewport makes the stage area (flex-1, min-h-0) take
    // the squeeze instead, and the controls stay where a thumb expects.
    <div className="h-screen bg-diesel-black flex flex-col overflow-hidden">
      {/* Screen-reader channel. Everything the player needs to follow
          the show without seeing it lands here: who is speaking and
          what they said, the ambient narration a running simulation
          emits, and the current choice list. Visually hidden, polite
          so it never interrupts itself mid-sentence. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {scriptRunner.state.activeDialogue && (
          <p>
            {scriptRunner.state.activeDialogue.actorName}: {scriptRunner.state.activeDialogue.text}
          </p>
        )}
        {scriptRunner.state.ambientNarration && (
          <p key={scriptRunner.state.ambientNarration.id}>
            {scriptRunner.state.ambientNarration.text}
          </p>
        )}
        {scriptRunner.state.choices && (
          scanning ? (
            // Scanning reads one option at a time; the key is the
            // announcement, so each sweep step re-announces.
            <p key={`scan-${scanIndex}`}>
              {scriptRunner.state.choices.options[scanIndex]?.text}. Press any key to choose this.
            </p>
          ) : (
            <p>
              {scriptRunner.state.choices.options.length === 1
                ? scriptRunner.state.choices.options[0].text
                : `Choose: ${scriptRunner.state.choices.options
                    .map((o, i) => `${i + 1}. ${o.text}`)
                    .join('. ')}`}
            </p>
          )
        )}
      </div>

      {/* End-of-game area (narration overlays the stage as a caption,
          so the stage never jumps when it appears/disappears) */}
      <div className="px-4 pt-1 pb-1">
        {/* End of game message */}
        {scriptRunner.state.isComplete && !scriptRunner.state.activeDialogue && !scriptRunner.state.choices && (
          <EndCard
            game={game}
            onReturnToTitle={() => {
              scriptRunner.goToScene(startSceneId);
              setHasStarted(false);
            }}
          />
        )}
      </div>

      {/* Stage Area — width capped so the 16:9 stage always fits the viewport */}
      {/* overflow-y-auto so a tall console on a short window scrolls
          instead of vanishing off the bottom */}
      <div className="flex-1 flex items-stretch justify-center p-2 [@media(min-aspect-ratio:1/1)]:p-3 min-h-0 overflow-hidden">
        <div
          className="w-full h-full relative"
          style={{
            // The stage never resizes. The console below it reserves
            // its height whether or not it has anything to show, so
            // toggling the instruments moves nothing on screen.
            //
            // On a wide screen the console stands BESIDE the stage, so
            // the stage is no longer paying for the console's height and
            // this no longer subtracts it. The old formula reserved
            // vertical room for a stacked console and, once the plate and
            // ability rail were added, squeezed the picture to a strip.
            //
            // Cap the width so the cabinet does not sprawl across an
            // ultrawide monitor; 96rem leaves the stage about 74rem after
            // the 22rem console, which is a generous 16:9.
            maxWidth: '150rem',
          }}
        >
        <StageConsole
          meterRows={meterRows}
          worldState={scriptRunner.state.worldState}
          moneyFormat={game.info.moneyFormat}
          showMeters={showMeters && ability.presentation !== 'sound'}
          frame={game.info.frame}
          // Everything spoken lands on the plate now — narration and
          // character dialogue alike. No balloons over the stage.
          narration={
            ability.presentation === 'sound' ? null :
            scriptRunner.state.activeDialogue?.displayedText ??
            scriptRunner.state.ambientNarration?.text ??
            null
          }
          narrationKey={scriptRunner.state.ambientNarration?.id ?? scriptRunner.state.currentCommandIndex}
          location={ability.presentation === 'sound' ? null : sceneCaption}
          speaker={
            ability.presentation === 'sound' || !scriptRunner.state.activeDialogue ||
            scriptRunner.state.activeDialogue.actorName.trim().toLowerCase() === 'narrator'
              ? null
              : {
                  name: scriptRunner.state.activeDialogue.actorName,
                  imageUrl: speakerPortrait,
                }
          }
          choices={ability.presentation === 'sound' ? null : scriptRunner.state.choices?.options ?? null}
          onSelectChoice={scriptRunner.selectChoice}
          scanIndex={choiceCount > 1 ? scanIndex : null}
          onAdvance={scriptRunner.advance}
          frameMood={scriptRunner.state.frameMood}
          abilityBar={<AbilityBar settings={ability} onChange={updateAbility} />}
          reduceMotion={ability.reduceMotion}
          drawerTitle="Settings"
          onCloseDrawer={() => setShowSettings(false)}
          drawer={showSettings ? (
            <div className="space-y-5">
              <button
                onClick={() => {
                  setOnboardingFirstRun(false);
                  setShowSettings(false);
                  setShowOnboarding(true);
                }}
                className="w-full px-3 py-2 border border-diesel-gold/60 text-diesel-gold text-xs uppercase tracking-widest hover:bg-diesel-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-diesel-gold"
              >
                Change how you play
              </button>

              <AbilityPanel settings={ability} onChange={updateAbility} />

              <div className="space-y-3 border-t border-diesel-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-diesel-paper text-sm">Sound</span>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`px-4 py-1.5 border text-xs uppercase ${isMuted ? 'border-diesel-rust text-diesel-rust' : 'border-diesel-green text-diesel-green'}`}
                  >
                    {isMuted ? 'Muted' : 'On'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-diesel-paper text-sm">Auto-play</span>
                  <button
                    onClick={scriptRunner.toggleAutoPlay}
                    className={`px-4 py-1.5 border text-xs uppercase ${scriptRunner.state.isAutoPlay ? 'border-diesel-green text-diesel-green' : 'border-diesel-steel text-diesel-steel'}`}
                  >
                    {scriptRunner.state.isAutoPlay ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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
          {/* Nothing overlays the stage any more. Dialogue, narration and
              choices all live on the console's plate below, which reserves
              its height so nothing moves when a line arrives — and the art
              is never covered by a balloon. */}
          {/* Quote pop-up card */}
          {activeQuote && <QuoteCard quote={activeQuote} onDismiss={dismissQuote} />}
        </StageConsole>
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
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(v => !v)}
        showMeters={showMeters}
        onToggleMeters={() => setShowMeters(v => !v)}
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
      {/* Settings now rise as a drawer out of the console, over the
          stage — see StageConsole. No modal blanks the show. */}
    </div>
  );
};

export default Theater;
