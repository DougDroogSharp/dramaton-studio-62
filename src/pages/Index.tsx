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
import { 
  Gear, 
  Rivet, 
  PipeHorizontal, 
  PipeVertical, 
  SteamVent, 
  CornerBracket, 
  Gauge, 
  ArtDecoDivider,
  IndustrialPanel 
} from '@/components/DieselpunkDecorations';

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
        {/* Background gears - slow rotating */}
        <Gear 
          size={300} 
          teeth={16} 
          className="absolute -top-20 -left-20 text-diesel-border opacity-20 animate-[spin_60s_linear_infinite]" 
        />
        <Gear 
          size={200} 
          teeth={12} 
          className="absolute top-40 -left-10 text-diesel-border opacity-15 animate-[spin_45s_linear_infinite_reverse]" 
        />
        <Gear 
          size={250} 
          teeth={14} 
          className="absolute -bottom-20 -right-20 text-diesel-border opacity-20 animate-[spin_50s_linear_infinite]" 
        />
        <Gear 
          size={180} 
          teeth={10} 
          className="absolute bottom-40 -right-10 text-diesel-border opacity-15 animate-[spin_40s_linear_infinite_reverse]" 
        />
        
        {/* Pipes */}
        <div className="absolute top-0 left-20">
          <PipeVertical height={200} className="opacity-40" />
        </div>
        <div className="absolute top-0 right-24">
          <PipeVertical height={150} className="opacity-40" />
        </div>
        <div className="absolute bottom-0 left-32">
          <PipeVertical height={180} className="opacity-40" />
        </div>
        <div className="absolute bottom-0 right-16">
          <PipeVertical height={220} className="opacity-40" />
        </div>
        
        {/* Steam vents */}
        <div className="absolute top-20 left-16 opacity-60">
          <SteamVent />
        </div>
        <div className="absolute top-32 right-20 opacity-60">
          <SteamVent />
        </div>
        
        {/* Gauges */}
        <div className="absolute top-8 left-1/4 opacity-70">
          <Gauge value={0.75} label="STEAM" />
        </div>
        <div className="absolute top-8 right-1/4 opacity-70">
          <Gauge value={0.45} label="FLUX" />
        </div>
        
        {/* Corner rivets pattern */}
        <div className="absolute top-4 left-4 flex gap-8">
          <Rivet size={16} />
          <Rivet size={16} />
          <Rivet size={16} />
        </div>
        <div className="absolute top-4 right-4 flex gap-8">
          <Rivet size={16} />
          <Rivet size={16} />
          <Rivet size={16} />
        </div>
        <div className="absolute bottom-4 left-4 flex gap-8">
          <Rivet size={16} />
          <Rivet size={16} />
          <Rivet size={16} />
        </div>
        <div className="absolute bottom-4 right-4 flex gap-8">
          <Rivet size={16} />
          <Rivet size={16} />
          <Rivet size={16} />
        </div>
        
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
          }}
        />
        
        {/* Main content */}
        <div className="relative z-20 flex flex-col items-center">
          {/* Logo with glow */}
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-diesel-rust/30 rounded-full" />
            <DramatonLogo className="relative w-36 h-36 text-diesel-rust mb-4 animate-pulse drop-shadow-[0_0_30px_hsl(15,70%,45%,0.5)]" />
          </div>
          
          {/* Art deco divider */}
          <ArtDecoDivider width={400} className="text-diesel-gold mb-4" />
          
          {/* Title with glitch effect */}
          <h1 className="text-5xl md:text-6xl font-bold text-diesel-paper tracking-widest mb-2 glitch-text">
            DRAMA<span className="text-diesel-rust drop-shadow-[0_0_10px_hsl(15,70%,45%,0.8)]">TON</span>
          </h1>
          <p className="text-diesel-steel text-xs tracking-[0.4em] mb-8 uppercase font-mono">
            ▸ Dieselpunk Narrative Architect v2.5 ◂
          </p>
          
          {/* Industrial Panel */}
          <IndustrialPanel className="w-[420px] max-w-[90vw]" glowing>
            {/* Resume button */}
            {hasAutoSave && (
              <button
                onClick={handleResumeGame}
                className="w-full py-3 mb-5 bg-diesel-green/20 border-2 border-diesel-green text-diesel-green font-bold uppercase tracking-widest hover:bg-diesel-green/30 transition-all hover:shadow-[0_0_20px_hsl(120,50%,45%,0.3)] flex items-center justify-center gap-3"
              >
                <span className="text-xl">▶</span>
                Resume Session
              </button>
            )}
            
            {/* New game inputs */}
            <CyberInput
              label="Protocol Designation"
              value={startTitle}
              onChange={(e) => setStartTitle(e.target.value)}
              placeholder="Enter your game title..."
            />
            <CyberInput
              label="Architect Identity"
              value={startAuthor}
              onChange={(e) => setStartAuthor(e.target.value)}
              placeholder="Your name or studio..."
            />
            
            {/* Create button */}
            <button
              onClick={handleStartGame}
              className="w-full py-3 mt-4 bg-diesel-rust/20 border-2 border-diesel-rust text-diesel-rust font-bold uppercase tracking-widest hover:bg-diesel-rust/30 transition-all hover:shadow-[0_0_20px_hsl(15,70%,45%,0.3)] flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Initialize New Protocol
            </button>
            
            {/* Load button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 mt-3 bg-diesel-panel border-2 border-diesel-border text-diesel-steel font-bold uppercase tracking-widest hover:text-diesel-paper hover:border-diesel-paper transition-all flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              Load Archive (.dram)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dram,.json"
              onChange={handleLoadFile}
              className="hidden"
            />
          </IndustrialPanel>
          
          {/* Footer with blinking status */}
          <div className="mt-8 flex items-center gap-4 text-diesel-steel/60 text-xs tracking-widest font-mono">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-diesel-green rounded-full animate-pulse" />
              CORE: ONLINE
            </span>
            <span className="text-diesel-border">│</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-diesel-gold rounded-full animate-pulse" />
              NARRATIVE ENGINE: READY
            </span>
          </div>
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
      <div className="h-10 bg-diesel-dark border-b border-diesel-border flex items-center justify-between shrink-0">
        <div className="flex items-center h-full">
          {/* Logo - compact */}
          <div className="flex items-center px-2 h-full border-r border-diesel-border">
            <DramatonLogo className="w-5 h-5 text-diesel-rust" />
          </div>
          
          {/* Navigation tabs - compact */}
          {navItems.map(item => (
            <button
              key={item.type}
              onClick={() => handleSelect(item.type, null)}
              className={`h-full px-2 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors border-r border-diesel-border ${
                selection.type === item.type 
                  ? `bg-diesel-panel ${item.color}` 
                  : 'text-diesel-steel hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={12} />
              <span className="hidden sm:inline">{item.label}</span>
              {item.count !== undefined && <span className="text-[9px] opacity-60 hidden md:inline">({item.count})</span>}
            </button>
          ))}
        </div>
        
        {/* Toolbar actions - compact */}
        <div className="flex items-center h-full">
          <button onClick={handleSave} className="p-1.5 text-diesel-steel hover:text-white" title="Save to file">
            <Save size={14} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-diesel-steel hover:text-white" title="Load game">
            <FolderOpen size={14} />
          </button>
          <button onClick={handleUndo} disabled={history.length === 0} className="p-1.5 text-diesel-steel hover:text-white disabled:opacity-30" title="Undo">
            <Undo2 size={14} />
          </button>
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-1.5 ${voiceEnabled ? 'text-diesel-green' : 'text-diesel-steel opacity-50'}`} title="Toggle voice">
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
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
        {/* Settings page: Two-panel layout with preview */}
        {selection.type === 'settings' ? (
          <>
            {/* Editor Panel */}
            <div className="w-full md:w-3/5 lg:w-1/2 xl:w-3/5 bg-diesel-panel border-r border-diesel-border overflow-y-auto custom-scrollbar p-6">
              <h2 className="text-2xl font-bold text-diesel-gold border-b border-diesel-gold/30 pb-2 mb-6">
                GAME SETTINGS
              </h2>
              <SettingsEditor game={game} onChange={setGame} />
            </div>
            
            {/* Preview Panel */}
            <div className="hidden md:flex md:w-2/5 lg:w-1/2 xl:w-2/5 bg-diesel-black items-center justify-center relative">
              {(() => {
                const titleScene = game.info.titleSceneId 
                  ? game.scenes.find(s => s.id === game.info.titleSceneId) 
                  : null;
                const titleDrop = titleScene?.dropId 
                  ? game.drops.find(d => d.id === titleScene.dropId) 
                  : null;
                
                return (
                  <div className="w-full h-full relative bg-diesel-black">
                    {titleDrop?.image ? (
                      <img 
                        src={titleDrop.image} 
                        alt="Title Scene" 
                        className="absolute inset-0 w-full h-full object-contain opacity-60" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-diesel-dark to-diesel-black" />
                    )}
                    
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
          </>
        ) : (
          /* Full-width layout for all other editors */
          <div className="w-full bg-diesel-panel overflow-y-auto custom-scrollbar p-6">
            <h2 className="text-2xl font-bold text-diesel-gold border-b border-diesel-gold/30 pb-2 mb-6">
              {selection.type === 'actor' && 'ACTOR EDITOR'}
              {selection.type === 'scene' && 'SCENE EDITOR'}
              {selection.type === 'drop' && 'DROP EDITOR'}
              {selection.type === 'item' && 'ITEM EDITOR'}
              {selection.type === 'sfx' && 'SFX EDITOR'}
            </h2>
            
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
        )}
      </div>
      
      {/* Pacing Protocol Overlay */}
      {isRestPeriod && (
        <div className="fixed inset-0 z-50 bg-diesel-black/95 flex items-center justify-center backdrop-blur-sm overflow-hidden">
          {/* Background gears */}
          <Gear 
            size={400} 
            teeth={20} 
            className="absolute -top-32 -left-32 text-diesel-rust opacity-10 animate-[spin_120s_linear_infinite]" 
          />
          <Gear 
            size={350} 
            teeth={18} 
            className="absolute -bottom-32 -right-32 text-diesel-rust opacity-10 animate-[spin_100s_linear_infinite_reverse]" 
          />
          
          <IndustrialPanel className="max-w-lg" glowing>
            <div className="text-center">
              {/* Warning symbol */}
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 blur-2xl bg-diesel-rust/40 rounded-full animate-pulse" />
                <DramatonLogo className="relative w-28 h-28 mx-auto text-diesel-rust animate-pulse drop-shadow-[0_0_30px_hsl(15,70%,45%,0.6)]" />
              </div>
              
              <ArtDecoDivider width={300} className="text-diesel-rust mx-auto mb-4" />
              
              <h2 className="text-3xl font-bold text-diesel-rust mb-4 tracking-widest glitch-text">
                ⚠ PACING PROTOCOL ⚠
              </h2>
              
              <p className="text-diesel-steel mb-6 leading-relaxed">
                Mandatory rest period in effect.<br />
                Editor access will resume at the top of the hour.
              </p>
              
              {/* Timer display with gauges */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <Gauge value={(60 - minutes) / 30} label="TIME" className="opacity-80" />
                <div className="text-6xl font-mono text-diesel-gold drop-shadow-[0_0_20px_hsl(40,50%,55%,0.5)]">
                  {60 - minutes}<span className="text-2xl text-diesel-steel">min</span>
                </div>
                <Gauge value={0.1} label="WORK" className="opacity-80" />
              </div>
              
              <p className="text-diesel-steel/60 text-xs font-mono">
                ▸ REST ENFORCED FOR MEDICAL NECESSITY ◂<br />
                Work window: :00 to :30 each hour
              </p>
            </div>
          </IndustrialPanel>
        </div>
      )}
    </div>
  );
};

export default Index;
