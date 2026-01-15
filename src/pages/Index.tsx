import { useState, useEffect } from 'react';
import { GameData, SelectionState, createDefaultGame } from '@/types';
import { DramatonLogo } from '@/components/DramatonLogo';
import { loadGameFromDB, saveGameToDB } from '@/utils/db';
import { Settings, User, Video, Monitor, Package, Music, Save, Volume2, VolumeX, Undo2 } from 'lucide-react';

const Index = () => {
  const [game, setGame] = useState<GameData>(createDefaultGame());
  const [selection, setSelection] = useState<SelectionState>({ type: 'settings', id: null });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [history, setHistory] = useState<GameData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadGameFromDB().then((saved) => {
      if (saved) setGame(saved);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded && game.info.enableAutosave) {
      const timer = setTimeout(() => saveGameToDB(game), 2000);
      return () => clearTimeout(timer);
    }
  }, [game, isLoaded]);

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

  return (
    <div className="h-screen w-screen flex flex-col bg-diesel-black overflow-hidden">
      <div className="h-12 bg-diesel-dark border-b border-diesel-border flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center h-full gap-1">
          <div className="flex items-center gap-2 px-3 h-full border-r border-diesel-border">
            <DramatonLogo className="w-6 h-6 text-diesel-rust" />
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold text-diesel-paper leading-none">DRAMATON</span>
              <span className="text-[10px] text-diesel-gold font-mono leading-none">v2.5</span>
            </div>
          </div>
          {navItems.map(item => (
            <button
              key={item.type}
              onClick={() => handleSelect(item.type, null)}
              className={`h-full px-3 flex items-center gap-1.5 text-xs font-bold uppercase transition-colors border-r border-diesel-border ${
                selection.type === item.type ? `bg-diesel-panel ${item.color}` : 'text-diesel-steel hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={14} />
              <span className="hidden lg:inline">{item.label}</span>
              {item.count !== undefined && <span className="text-[10px] opacity-60">({item.count})</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center h-full gap-2 px-2">
          <button onClick={handleSave} className="p-2 text-diesel-steel hover:text-white"><Save size={16} /></button>
          <button onClick={handleUndo} disabled={history.length === 0} className="p-2 text-diesel-steel hover:text-white disabled:opacity-30"><Undo2 size={16} /></button>
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2 ${voiceEnabled ? 'text-diesel-green' : 'text-diesel-steel opacity-50'}`}>
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-1/2 lg:w-2/5 bg-diesel-panel border-r border-diesel-border overflow-y-auto custom-scrollbar p-6">
          <h2 className="text-2xl font-bold text-diesel-gold border-b border-diesel-gold/30 pb-2 mb-6">
            {selection.type === 'settings' ? 'GAME SETTINGS' : selection.type.toUpperCase() + ' EDITOR'}
          </h2>
          {selection.type === 'settings' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Game Title</label>
                <input className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold" value={game.info.title} onChange={(e) => setGame(prev => ({ ...prev, info: { ...prev.info, title: e.target.value } }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Author</label>
                <input className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold" value={game.info.author} onChange={(e) => setGame(prev => ({ ...prev, info: { ...prev.info, author: e.target.value } }))} />
              </div>
              <p className="text-xs text-diesel-steel mt-8">🎭 Phase 1 complete! Foundation ready. Say "continue" for full editors.</p>
            </div>
          )}
          {selection.type !== 'settings' && <p className="text-diesel-steel text-sm">Full {selection.type} editor coming in next phase.</p>}
        </div>
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
