import { useState, useEffect, useRef } from 'react';
import { GameData, SelectionState, createDefaultGame } from '@/types';
import { DramatonLogo } from '@/components/DramatonLogo';
import { CyberInput } from '@/components/CyberInput';
import { loadGameFromDB, saveGameToDB } from '@/utils/db';
import { Settings, User, Video, Monitor, Package, Music, Save, Volume2, VolumeX, Undo2, ChevronDown, Upload } from 'lucide-react';

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for autosave on mount
  useEffect(() => {
    loadGameFromDB().then((saved) => {
      if (saved) {
        setHasAutoSave(true);
        setStartTitle(saved.info.title);
        setStartAuthor(saved.info.author);
      }
    });
  }, []);

  // Autosave when editing
  useEffect(() => {
    if (isLoaded && game.info.enableAutosave) {
      const timer = setTimeout(() => saveGameToDB(game), 2000);
      return () => clearTimeout(timer);
    }
  }, [game, isLoaded]);

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
          <button onClick={handleUndo} disabled={history.length === 0} className="p-2 text-diesel-steel hover:text-white disabled:opacity-30" title="Undo">
            <Undo2 size={16} />
          </button>
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2 ${voiceEnabled ? 'text-diesel-green' : 'text-diesel-steel opacity-50'}`} title="Toggle voice">
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="w-full md:w-1/2 lg:w-2/5 bg-diesel-panel border-r border-diesel-border overflow-y-auto custom-scrollbar p-6">
          <h2 className="text-2xl font-bold text-diesel-gold border-b border-diesel-gold/30 pb-2 mb-6">
            {selection.type === 'settings' ? 'GAME SETTINGS' : selection.type.toUpperCase() + ' EDITOR'}
          </h2>
          
          {selection.type === 'settings' && (
            <div className="space-y-4">
              <CyberInput
                label="Game Title"
                value={game.info.title}
                onChange={(e) => setGame(prev => ({ ...prev, info: { ...prev.info, title: e.target.value } }))}
              />
              <CyberInput
                label="Author"
                value={game.info.author}
                onChange={(e) => setGame(prev => ({ ...prev, info: { ...prev.info, author: e.target.value } }))}
              />
              <p className="text-xs text-diesel-steel mt-8">🎭 Phase 1 complete! Foundation ready. Say "continue" for full editors.</p>
            </div>
          )}
          
          {selection.type !== 'settings' && (
            <p className="text-diesel-steel text-sm">Full {selection.type} editor coming in next phase.</p>
          )}
        </div>
        
        {/* Preview Panel */}
        <div className="hidden md:flex flex-1 bg-diesel-black items-center justify-center">
          <div className="text-center text-diesel-steel">
            <DramatonLogo className="w-32 h-32 mx-auto mb-6 opacity-20" />
            <h1 className="text-3xl font-bold text-diesel-gold mb-2">{game.info.title}</h1>
            <p className="text-sm">by {game.info.author}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
