import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { GameData, SelectionState, createDefaultGame, AssetStatus } from '@/types';
import { DramatonLogo } from '@/components/DramatonLogo';
import { CyberInput } from '@/components/CyberInput';
import { loadGameFromDB, saveGameToDB, clearGameFromDB } from '@/utils/db';
import { Settings, User, Video, Monitor, Package, Music, Save, Volume2, VolumeX, Undo2, Upload, FolderOpen, FilePlus2, Archive } from 'lucide-react';
import { SettingsEditor } from '@/components/editors/SettingsEditor';
import { ActorEditor } from '@/components/editors/ActorEditor';
import { SceneEditor } from '@/components/editors/SceneEditor';
import { DropEditor } from '@/components/editors/DropEditor';
import { ItemEditor } from '@/components/editors/ItemEditor';
import { SfxEditor } from '@/components/editors/SfxEditor';
import { AssetTree } from '@/components/AssetTree';
import Hourglass from '@/components/Hourglass';
import {
  Gear, 
  Rivet, 
  PipeHorizontal, 
  PipeVertical, 
  SteamVent, 
  CornerBracket, 
  Gauge, 
  ArtDecoDivider,
  IndustrialPanel,
  VacuumTube
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
  const [didSaveOnProtocolStart, setDidSaveOnProtocolStart] = useState(false);
  
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

  // Derive rest period status
  const isRestPeriod = minutes > 30; // 31-59 is rest time

  // Autosave when editing (respects Pacing Protocol)
  useEffect(() => {
    if (isLoaded && game.info.enableAutosave) {
      const timer = setTimeout(() => {
        // Check Pacing Protocol dynamically
        const currentMinutes = new Date().getMinutes();
        const isResting = currentMinutes > 30; // 31-59 is rest time
        
        if (!isResting) {
          saveGameToDB(game);
          setDidSaveOnProtocolStart(false); // Reset flag when not resting
        } else {
          console.log("Autosave skipped: Pacing Protocol Active");
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [game, isLoaded]);
  
  // Save once when Pacing Protocol starts
  useEffect(() => {
    if (isLoaded && game.info.enableAutosave && isRestPeriod && !didSaveOnProtocolStart) {
      saveGameToDB(game);
      setDidSaveOnProtocolStart(true);
      console.log("Auto-saved on Pacing Protocol start");
    }
    // Reset flag when rest period ends
    if (!isRestPeriod && didSaveOnProtocolStart) {
      setDidSaveOnProtocolStart(false);
    }
  }, [isRestPeriod, isLoaded, game, didSaveOnProtocolStart]);

  const handleStartGame = () => {
    // Validate title and author are not default/empty
    if (!startTitle.trim() || startTitle === 'Untitled Protocol') {
      alert('Please enter a unique game title before starting.');
      return;
    }
    if (!startAuthor.trim() || startAuthor === 'Unknown Architect') {
      alert('Please enter your name or studio as the author.');
      return;
    }
    
    const newGame = createDefaultGame();
    newGame.info.title = startTitle.trim();
    newGame.info.author = startAuthor.trim();
    setGame(newGame);
    setIsStarted(true);
    setIsLoaded(true);
    // Save immediately so autosave works
    saveGameToDB(newGame);
  };

  const handleNewGame = async () => {
    if (confirm('Start a new game? You will be prompted to save the current game.')) {
      // Offer to save current game
      if (confirm('Would you like to save the current game to a file before starting new?')) {
        handleSave();
      }
      // Clear IndexedDB so old game doesn't persist
      await clearGameFromDB();
      // Reset to splash screen with default placeholder values
      setIsStarted(false);
      setIsLoaded(false);
      setStartTitle('Untitled Protocol');
      setStartAuthor('Unknown Architect');
      setHasAutoSave(false);
      setHistory([]);
      setGame(createDefaultGame());
    }
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

  const handleUpdateStatus = (type: 'actor' | 'scene' | 'drop' | 'item' | 'sfx', id: string, status: AssetStatus) => {
    switch (type) {
      case 'actor':
        setGame(g => ({
          ...g,
          actors: g.actors.map(a => a.id === id ? { ...a, status } : a),
        }));
        break;
      case 'scene':
        setGame(g => ({
          ...g,
          scenes: g.scenes.map(s => s.id === id ? { ...s, status } : s),
        }));
        break;
      case 'drop':
        setGame(g => ({
          ...g,
          drops: g.drops.map(d => d.id === id ? { ...d, status } : d),
        }));
        break;
      case 'item':
        setGame(g => ({
          ...g,
          items: g.items.map(i => i.id === id ? { ...i, status } : i),
        }));
        break;
      case 'sfx':
        setGame(g => ({
          ...g,
          sfx: g.sfx.map(s => s.id === id ? { ...s, status } : s),
        }));
        break;
    }
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
    { type: 'actor' as const, icon: User, label: 'Actors', color: 'text-diesel-gold', count: game?.actors?.length ?? 0 },
    { type: 'scene' as const, icon: Video, label: 'Scenes', color: 'text-diesel-rust', count: game?.scenes?.length ?? 0 },
    { type: 'drop' as const, icon: Monitor, label: 'Drops', color: 'text-diesel-paper', count: game?.drops?.length ?? 0 },
    { type: 'item' as const, icon: Package, label: 'Items', color: 'text-diesel-gold', count: game?.items?.length ?? 0 },
    { type: 'sfx' as const, icon: Music, label: 'SFX', color: 'text-diesel-green', count: game?.sfx?.length ?? 0 },
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
        
        {/* Vacuum Tubes */}
        <div className="absolute left-8 top-1/3 -translate-y-1/2">
          <VacuumTube size={60} glowColor="orange" pulseSpeed={2.5} />
        </div>
        <div className="absolute left-20 top-1/3 -translate-y-1/2 mt-8">
          <VacuumTube size={50} glowColor="orange" pulseSpeed={3} />
        </div>
        <div className="absolute right-8 top-1/3 -translate-y-1/2">
          <VacuumTube size={60} glowColor="green" pulseSpeed={2} />
        </div>
        <div className="absolute right-20 top-1/3 -translate-y-1/2 mt-10">
          <VacuumTube size={45} glowColor="green" pulseSpeed={2.8} />
        </div>
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
          {/* Logo */}
          <div className="flex items-center px-2 h-full border-r border-diesel-border">
            <DramatonLogo className="w-5 h-5 text-diesel-rust" />
          </div>
          
          {/* New Game button */}
          <button 
            onClick={handleNewGame}
            className="h-full px-2 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors border-r border-diesel-border text-diesel-green hover:bg-diesel-green/20"
            title="New Game"
          >
            <FilePlus2 size={12} />
            <span className="hidden sm:inline">New</span>
          </button>
          
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
          
          {/* Library nav tab */}
          <Link 
            to="/library"
            className="h-full px-2 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors border-r border-diesel-border text-diesel-steel hover:text-diesel-gold hover:bg-diesel-gold/10"
          >
            <Archive size={12} />
            <span className="hidden sm:inline">Library</span>
          </Link>
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
            
            {/* Asset Tree Panel */}
            <div className="hidden md:flex md:w-2/5 lg:w-1/2 xl:w-2/5 bg-diesel-black p-4">
              <AssetTree game={game} onNavigate={handleSelect} onUpdateStatus={handleUpdateStatus} />
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
              <SceneEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} styleGuide={game.info.styleGuide} />
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
      
      {/* Pacing Protocol Overlay - Restful blue theme */}
      {isRestPeriod && (
        <div className="fixed inset-0 z-50 bg-[hsl(220,30%,8%)]/98 flex items-center justify-center backdrop-blur-sm overflow-hidden">
          {/* Background gears - hidden on mobile */}
          <Gear 
            size={400} 
            teeth={20} 
            className="hidden md:block absolute -top-32 -left-32 text-[hsl(210,40%,35%)] opacity-8 animate-[spin_180s_linear_infinite]" 
          />
          <Gear 
            size={350} 
            teeth={18} 
            className="hidden md:block absolute -bottom-32 -right-32 text-[hsl(210,40%,35%)] opacity-8 animate-[spin_200s_linear_infinite_reverse]" 
          />
          
          <div className="max-w-md mx-4 p-6 bg-[hsl(220,25%,12%)]/95 border border-[hsl(210,40%,30%)] rounded-sm shadow-[0_0_40px_hsl(210,50%,30%,0.2)]">
            <div className="text-center">
              {/* Compact header - cool blue tones */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="relative">
                  <div className="absolute inset-0 blur-xl bg-[hsl(210,50%,45%)]/30 rounded-full animate-[pulse_4s_ease-in-out_infinite]" />
                  <DramatonLogo className="relative w-16 h-16 text-[hsl(210,50%,55%)] animate-[pulse_4s_ease-in-out_infinite] drop-shadow-[0_0_20px_hsl(210,50%,50%,0.4)]" />
                </div>
                <h2 className="text-2xl font-bold text-[hsl(210,40%,65%)] tracking-widest">
                  REST PERIOD
                </h2>
              </div>
              
              <ArtDecoDivider width={250} className="text-[hsl(210,40%,40%)] mx-auto mb-3" />
              
              <p className="text-[hsl(210,20%,60%)] text-sm mb-4">
                Take a moment to breathe. Resume at top of hour.
              </p>
              
              {/* Timer display - hourglass beside countdown */}
              <div className="flex items-center justify-center gap-6 mb-4">
                {/* Hourglass */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-36 bg-[hsl(210,50%,50%)]/10 blur-xl rounded-full animate-[pulse_5s_ease-in-out_infinite]" />
                  </div>
                  <Hourglass remainingMinutes={Math.max(0, Math.min(30, 60 - minutes))} />
                </div>
                
                {/* Digital countdown - calm blue */}
                <div className="flex flex-col items-start">
                  <div className="text-7xl font-mono text-[hsl(210,50%,65%)] drop-shadow-[0_0_20px_hsl(210,50%,55%,0.4)] tabular-nums">
                    <span className="animate-[pulse_4s_ease-in-out_infinite]">{String(60 - minutes).padStart(2, '0')}</span>
                  </div>
                  <span className="text-lg text-[hsl(210,20%,55%)] font-mono uppercase tracking-wider">minutes</span>
                </div>
              </div>
              
              <p className="text-[hsl(210,20%,45%)] text-xs font-mono">
                Work window: :00 to :30 each hour
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
