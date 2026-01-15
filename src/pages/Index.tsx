import { useState, useEffect, useRef } from 'react';
import { GameData, SelectionState, createDefaultGame } from '@/types';
import { DramatonLogo } from '@/components/DramatonLogo';
import { CyberInput } from '@/components/CyberInput';
import { loadGameFromDB, saveGameToDB } from '@/utils/db';
import { Settings, User, Video, Monitor, Package, Music, Save, Volume2, VolumeX, Undo2, Upload, FolderOpen } from 'lucide-react';
import { SettingsEditor } from '@/components/editors/SettingsEditor';
import { ActorEditor } from '@/components/editors/ActorEditor';
import { SceneEditor } from '@/components/editors/SceneEditor';
import { DropEditor } from '@/components/editors/DropEditor';
import { ItemEditor } from '@/components/editors/ItemEditor';
import { SfxEditor } from '@/components/editors/SfxEditor';

const Index = () => {
  // Startup state
  const [isStarted, setIsStarted] = useState(false);
  const [startTitle, setStartTitle] = useState('Untitled Protocol');
  const [startAuthor, setStartAuthor] = useState('Unknown Architect');
  const [hasAutoSave, setHasAutoSave] = useState(false);
  
  // Editor state
  const [game, setGame] = useState<GameData>(createDefaultGame());
  const [selection, setSelection] = useState<SelectionState>({ type: 'settings', id: null });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [history, setHistory] = useState<GameData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Pacing Protocol State
  const [minutes, setMinutes] = useState(new Date().getMinutes());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for autosave on mount and start pacing protocol timer
  useEffect(() => {
    loadGameFromDB().then((saved) => {
      if (saved) {
        setHasAutoSave(true);
        setStartTitle(saved.info.title);
        setStartAuthor(saved.info.author);
      }
    });
    
    // Pacing Protocol timer - check every 10 seconds
    const timer = setInterval(() => {
      setMinutes(new Date().getMinutes());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Autosave when editing (respects Pacing Protocol)
  useEffect(() => {
    if (isLoaded && game.info.enableAutosave) {
      const timer = setTimeout(() => {
        // Check Pacing Protocol dynamically
        const currentMinutes = new Date().getMinutes();
        const isResting = currentMinutes > 30; // 31-59 is rest time
        
        if (!isResting) {
          saveGameToDB(game);
        } else {
          console.log("Autosave skipped: Pacing Protocol Active");
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [game, isLoaded]);
  
  // Derive rest period status
  const isRestPeriod = minutes > 30; // 31-59 is rest time

  const handleStartGame = () => {
    const newGame = createDefaultGame();
    newGame.info.title = startTitle;
    newGame.info.author = startAuthor;
    setGame(newGame);
    setIsStarted(true);
    setIsLoaded(true);
  };

  const handleResumeGame = async () => {
    const saved = await loadGameFromDB();
    if (saved) {
      setGame(saved);
      setIsStarted(true);
      setIsLoaded(true);
    }
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as GameData;
        setGame(data);
        setIsStarted(true);
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to parse game file:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleSelect = (type: SelectionState['type'], id: string | null) => {
    setSelection({ type, id });
  };

  const handleUndo = () => {
    if (history.length > 0) {
      setGame(history[history.length - 1]);
      setHistory(h => h.slice(0, -1));
    }
  };

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${game.info.title.replace(/\s+/g, '_')}.dram`;
    a.click();
  };

  const navItems = [
    { type: 'settings' as const, icon: Settings, label: 'Settings', color: 'text-diesel-gold' },
    { type: 'actor' as const, icon: User, label: 'Actors', color: 'text-diesel-gold', count: game.actors.length },
    { type: 'scene' as const, icon: Video, label: 'Scenes', color: 'text-diesel-rust', count: game.scenes.length },
    { type: 'drop' as const, icon: Monitor, label: 'Drops', color: 'text-diesel-paper', count: game.drops.length },
    { type: 'item' as const, icon: Package, label: 'Items', color: 'text-diesel-gold', count: game.items.length },
    { type: 'sfx' as const, icon: Music, label: 'SFX', color: 'text-diesel-green', count: game.sfx.length },
  ];

  // ═══════════════════════════════════════════════════════════════
  // SPLASH SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (!isStarted) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-diesel-black overflow-hidden relative">
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          }}
        />
        
        {/* Main content */}
        <div className="relative z-20 flex flex-col items-center">
          {/* Logo */}
          <DramatonLogo className="w-32 h-32 text-diesel-rust mb-6 animate-pulse" />
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-diesel-paper tracking-wider mb-2">
            DRAMA<span className="text-diesel-rust">TON</span> 2.0
          </h1>
          <p className="text-diesel-steel text-sm tracking-[0.3em] mb-10 uppercase">
            Dieselpunk Narrative Architect v2.5
          </p>
          
          {/* Startup Panel */}
          <div className="bg-diesel-panel border border-diesel-border p-8 w-[400px] max-w-[90vw] shadow-diesel-glow">
            {/* Resume button - only if autosave exists */}
            {hasAutoSave && (
              <button
                onClick={handleResumeGame}
                className="w-full py-3 mb-6 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase tracking-widest hover:bg-diesel-green/30 transition-colors"
              >
                Resume Session
              </button>
            )}
            
            {/* New game inputs */}
            <CyberInput
              label="Game Title"
              value={startTitle}
              onChange={(e) => setStartTitle(e.target.value)}
              placeholder="Enter your game title..."
            />
            <CyberInput
              label="Creator's Name"
              value={startAuthor}
              onChange={(e) => setStartAuthor(e.target.value)}
              placeholder="Your name or studio..."
            />
            
            {/* Create button */}
            <button
              onClick={handleStartGame}
              className="w-full py-3 mt-4 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust font-bold uppercase tracking-widest hover:bg-diesel-rust/30 transition-colors"
            >
              Create New Game
            </button>
            
            {/* Load button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 mt-3 bg-diesel-panel border border-diesel-border text-diesel-steel font-bold uppercase tracking-widest hover:text-diesel-paper hover:border-diesel-paper transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              Load Game (.dram)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dram,.json"
              onChange={handleLoadFile}
              className="hidden"
            />
          </div>
          
          {/* Footer */}
          <p className="text-diesel-steel/50 text-xs mt-8 tracking-widest">
            SYSTEM STATUS: <span className="text-diesel-green">OPERATIONAL</span>
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN EDITOR
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="h-screen w-screen flex flex-col bg-diesel-black overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-12 bg-diesel-dark border-b border-diesel-border flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center h-full gap-1">
          {/* Logo */}
          <div className="flex items-center gap-2 px-3 h-full border-r border-diesel-border">
            <DramatonLogo className="w-6 h-6 text-diesel-rust" />
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold text-diesel-paper leading-none">DRAMATON</span>
              <span className="text-[10px] text-diesel-gold font-mono leading-none">v2.5</span>
            </div>
          </div>
          
          {/* Navigation tabs */}
          {navItems.map(item => (
            <button
              key={item.type}
              onClick={() => handleSelect(item.type, null)}
              className={`h-full px-3 flex items-center gap-1.5 text-xs font-bold uppercase transition-colors border-r border-diesel-border ${
                selection.type === item.type 
                  ? `bg-diesel-panel ${item.color}` 
                  : 'text-diesel-steel hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={14} />
              <span className="hidden lg:inline">{item.label}</span>
              {item.count !== undefined && <span className="text-[10px] opacity-60">({item.count})</span>}
            </button>
          ))}
        </div>
        
        {/* Toolbar actions */}
        <div className="flex items-center h-full gap-2 px-2">
          <button onClick={handleSave} className="p-2 text-diesel-steel hover:text-white" title="Save to file">
            <Save size={16} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-diesel-steel hover:text-white" title="Load game">
            <FolderOpen size={16} />
          </button>
          <button onClick={handleUndo} disabled={history.length === 0} className="p-2 text-diesel-steel hover:text-white disabled:opacity-30" title="Undo">
            <Undo2 size={16} />
          </button>
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2 ${voiceEnabled ? 'text-diesel-green' : 'text-diesel-steel opacity-50'}`} title="Toggle voice">
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".dram,.json"
            onChange={handleLoadFile}
            className="hidden"
          />
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="w-full md:w-3/5 lg:w-1/2 xl:w-3/5 bg-diesel-panel border-r border-diesel-border overflow-y-auto custom-scrollbar p-6">
          <h2 className="text-2xl font-bold text-diesel-gold border-b border-diesel-gold/30 pb-2 mb-6">
            {selection.type === 'settings' && 'GAME SETTINGS'}
            {selection.type === 'actor' && 'ACTOR EDITOR'}
            {selection.type === 'scene' && 'SCENE EDITOR'}
            {selection.type === 'drop' && 'DROP EDITOR'}
            {selection.type === 'item' && 'ITEM EDITOR'}
            {selection.type === 'sfx' && 'SFX EDITOR'}
          </h2>
          
          {selection.type === 'settings' && (
            <SettingsEditor game={game} onChange={setGame} />
          )}
          {selection.type === 'actor' && (
            <ActorEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} styleGuide={game.info.styleGuide} />
          )}
          {selection.type === 'scene' && (
            <SceneEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} />
          )}
          {selection.type === 'drop' && (
            <DropEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} styleGuide={game.info.styleGuide} />
          )}
          {selection.type === 'item' && (
            <ItemEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} styleGuide={game.info.styleGuide} />
          )}
          {selection.type === 'sfx' && (
            <SfxEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} />
          )}
        </div>
        
        {/* Preview Panel - Smaller */}
        <div className="hidden md:flex md:w-2/5 lg:w-1/2 xl:w-2/5 bg-diesel-black items-center justify-center relative">
          {/* Scene preview when a scene is selected */}
          {selection.type === 'scene' && selection.id && (() => {
            const scene = game.scenes.find(s => s.id === selection.id);
            const drop = scene?.dropId ? game.drops.find(d => d.id === scene.dropId) : null;
            return (
              <div className="w-full h-full relative overflow-hidden">
                {drop?.image ? (
                  <img src={drop.image} alt={drop.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-diesel-dark" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-diesel-steel text-sm">Scene: {scene?.name}</p>
                </div>
              </div>
            );
          })()}
          
          {/* Default preview */}
          {!(selection.type === 'scene' && selection.id) && (() => {
            const titleScene = game.info.titleSceneId 
              ? game.scenes.find(s => s.id === game.info.titleSceneId) 
              : null;
            const titleDrop = titleScene?.dropId 
              ? game.drops.find(d => d.id === titleScene.dropId) 
              : null;
            
            return (
              <div className="w-full h-full relative bg-diesel-black">
                {/* Title scene background - preserve aspect ratio */}
                {titleDrop?.image ? (
                  <img 
                    src={titleDrop.image} 
                    alt="Title Scene" 
                    className="absolute inset-0 w-full h-full object-contain opacity-60" 
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-diesel-dark to-diesel-black" />
                )}
                
                {/* Content overlay - smaller */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-diesel-steel">
                    <DramatonLogo className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <h1 className="text-sm font-bold text-diesel-gold mb-0.5 drop-shadow-lg">{game.info.title}</h1>
                    <p className="text-[10px] drop-shadow-md">by {game.info.author}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-diesel-panel/70 backdrop-blur-sm p-2 border border-diesel-border">
                        <div className="text-lg font-bold text-diesel-gold">{game.actors.length}</div>
                        <div className="text-diesel-steel">Actors</div>
                      </div>
                      <div className="bg-diesel-panel/70 backdrop-blur-sm p-2 border border-diesel-border">
                        <div className="text-lg font-bold text-diesel-rust">{game.scenes.length}</div>
                        <div className="text-diesel-steel">Scenes</div>
                      </div>
                      <div className="bg-diesel-panel/70 backdrop-blur-sm p-2 border border-diesel-border">
                        <div className="text-lg font-bold text-diesel-green">{game.items.length}</div>
                        <div className="text-diesel-steel">Items</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      
      {/* Pacing Protocol Overlay */}
      {isRestPeriod && (
        <div className="fixed inset-0 z-50 bg-diesel-black/95 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center p-8 border border-diesel-rust bg-diesel-dark/90 max-w-lg">
            <DramatonLogo className="w-24 h-24 mx-auto mb-6 text-diesel-rust animate-pulse" />
            <h2 className="text-3xl font-bold text-diesel-rust mb-4 tracking-widest">
              PACING PROTOCOL ACTIVE
            </h2>
            <p className="text-diesel-steel mb-6 leading-relaxed">
              Mandatory rest period in effect.<br />
              Editor access will resume at the top of the hour.
            </p>
            <div className="text-5xl font-mono text-diesel-gold mb-4">
              {60 - minutes} min
            </div>
            <p className="text-diesel-steel/60 text-xs">
              This 30-minute rest is enforced for medical necessity.<br />
              Work resumes from :00 to :30 each hour.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
