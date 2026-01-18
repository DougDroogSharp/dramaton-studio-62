import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  AssetLibrary, 
  GameData,
  LibraryActor, LibraryScene, LibraryDrop, LibraryItem, LibrarySfx 
} from '@/types';
import {
  loadLibraryFromDB,
  saveLibraryToDB,
  exportLibrary,
  importLibrary,
  removeActorFromLibrary,
  removeSceneFromLibrary,
  removeDropFromLibrary,
  removeItemFromLibrary,
  removeSfxFromLibrary,
  addLibraryActorToGame,
  addLibrarySceneToGame,
  addLibraryDropToGame,
  addLibraryItemToGame,
  addLibrarySfxToGame,
  getLibraryCount,
} from '@/utils/library';
import { loadGameFromDB, saveGameToDB } from '@/utils/db';
import { DramatonLogo } from '@/components/DramatonLogo';
import { 
  ChevronRight, ChevronDown, User, Video, Monitor, Package, Music, 
  Search, Download, Upload, Trash2, Plus, Archive, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Gear, 
  Rivet, 
  ArtDecoDivider,
  IndustrialPanel,
} from '@/components/DieselpunkDecorations';

type AssetType = 'actor' | 'scene' | 'drop' | 'item' | 'sfx';

interface SelectedAsset {
  type: AssetType;
  libraryId: string;
}

const Library = () => {
  const [library, setLibrary] = useState<AssetLibrary | null>(null);
  const [game, setGame] = useState<GameData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    actors: true,
    scenes: true,
    drops: true,
    items: true,
    sfx: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load library and game on mount
  useEffect(() => {
    loadLibraryFromDB().then(setLibrary);
    loadGameFromDB().then(setGame);
  }, []);

  // Save library whenever it changes
  useEffect(() => {
    if (library) {
      saveLibraryToDB(library);
    }
  }, [library]);

  // Save game whenever it changes
  useEffect(() => {
    if (game) {
      saveGameToDB(game);
    }
  }, [game]);

  if (!library) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-diesel-black">
        <div className="text-diesel-steel animate-pulse">Loading library...</div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const matchesSearch = (name: string) => {
    if (!searchQuery.trim()) return true;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const handleAddToGame = () => {
    if (!selectedAsset || !game) {
      toast.error('No game loaded to add asset to');
      return;
    }

    let updatedGame = game;
    
    switch (selectedAsset.type) {
      case 'actor': {
        const actor = library.actors.find(a => a.libraryId === selectedAsset.libraryId);
        if (actor) updatedGame = addLibraryActorToGame(game, actor);
        break;
      }
      case 'scene': {
        const scene = library.scenes.find(s => s.libraryId === selectedAsset.libraryId);
        if (scene) updatedGame = addLibrarySceneToGame(game, scene);
        break;
      }
      case 'drop': {
        const drop = library.drops.find(d => d.libraryId === selectedAsset.libraryId);
        if (drop) updatedGame = addLibraryDropToGame(game, drop);
        break;
      }
      case 'item': {
        const item = library.items.find(i => i.libraryId === selectedAsset.libraryId);
        if (item) updatedGame = addLibraryItemToGame(game, item);
        break;
      }
      case 'sfx': {
        const sfx = library.sfx.find(s => s.libraryId === selectedAsset.libraryId);
        if (sfx) updatedGame = addLibrarySfxToGame(game, sfx);
        break;
      }
    }

    setGame(updatedGame);
    toast.success('Asset added to game!');
    setSelectedAsset(null);
  };

  const handleDeleteFromLibrary = () => {
    if (!selectedAsset) return;
    
    if (!confirm('Remove this asset from the library?')) return;

    let updatedLibrary = library;
    
    switch (selectedAsset.type) {
      case 'actor':
        updatedLibrary = removeActorFromLibrary(library, selectedAsset.libraryId);
        break;
      case 'scene':
        updatedLibrary = removeSceneFromLibrary(library, selectedAsset.libraryId);
        break;
      case 'drop':
        updatedLibrary = removeDropFromLibrary(library, selectedAsset.libraryId);
        break;
      case 'item':
        updatedLibrary = removeItemFromLibrary(library, selectedAsset.libraryId);
        break;
      case 'sfx':
        updatedLibrary = removeSfxFromLibrary(library, selectedAsset.libraryId);
        break;
    }

    setLibrary(updatedLibrary);
    setSelectedAsset(null);
    toast.success('Asset removed from library');
  };

  const handleExport = () => {
    exportLibrary(library);
    toast.success('Library exported!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedLibrary = await importLibrary(file);
      // Merge with existing library
      const mergedLibrary: AssetLibrary = {
        version: Math.max(library.version, importedLibrary.version),
        actors: [...library.actors, ...importedLibrary.actors],
        scenes: [...library.scenes, ...importedLibrary.scenes],
        drops: [...library.drops, ...importedLibrary.drops],
        items: [...library.items, ...importedLibrary.items],
        sfx: [...library.sfx, ...importedLibrary.sfx],
      };
      setLibrary(mergedLibrary);
      toast.success(`Imported ${getLibraryCount(importedLibrary)} assets!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredActors = library.actors.filter(a => matchesSearch(a.name));
  const filteredScenes = library.scenes.filter(s => matchesSearch(s.name));
  const filteredDrops = library.drops.filter(d => matchesSearch(d.name));
  const filteredItems = library.items.filter(i => matchesSearch(i.name));
  const filteredSfx = library.sfx.filter(s => matchesSearch(s.name));

  const renderAssetItem = (
    asset: { libraryId: string; name: string; source: string; addedAt: number },
    type: AssetType,
    icon: React.ReactNode,
    color: string
  ) => {
    const isSelected = selectedAsset?.libraryId === asset.libraryId;
    return (
      <button
        key={asset.libraryId}
        onClick={() => setSelectedAsset({ type, libraryId: asset.libraryId })}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          isSelected 
            ? `bg-diesel-gold/20 border border-diesel-gold` 
            : 'bg-diesel-black border border-diesel-border hover:border-diesel-paper'
        }`}
      >
        <span className={color}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-diesel-paper font-medium truncate">{asset.name}</div>
          <div className="text-xs text-diesel-steel truncate">
            from: {asset.source}
          </div>
        </div>
        {isSelected && (
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleAddToGame(); }}
              className="p-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green hover:bg-diesel-green/30 transition-colors"
              title="Add to game"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteFromLibrary(); }}
              className="p-1.5 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust hover:bg-diesel-rust/30 transition-colors"
              title="Remove from library"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </button>
    );
  };

  const renderSection = (
    title: string,
    key: string,
    icon: React.ReactNode,
    color: string,
    items: any[],
    type: AssetType
  ) => (
    <div key={key} className="mb-4">
      <button
        onClick={() => toggleSection(key)}
        className={`w-full flex items-center gap-2 py-2 px-1 ${color} font-bold text-sm uppercase tracking-widest hover:opacity-80 transition-opacity`}
      >
        {expandedSections[key] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <span className="text-diesel-steel">({items.length})</span>
      </button>
      {expandedSections[key] && (
        <div className="space-y-2 ml-4 mt-2">
          {items.length > 0 ? (
            items.map(item => renderAssetItem(item, type, icon, color))
          ) : (
            <p className="text-sm text-diesel-steel/50 italic py-3">No {title.toLowerCase()} in library</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-diesel-black overflow-hidden relative">
      {/* Background decoration */}
      <Gear 
        size={400} 
        teeth={20} 
        className="absolute -top-32 -right-32 text-diesel-border opacity-10 animate-[spin_120s_linear_infinite]" 
      />
      <Gear 
        size={300} 
        teeth={16} 
        className="absolute -bottom-20 -left-20 text-diesel-border opacity-10 animate-[spin_100s_linear_infinite_reverse]" 
      />
      
      {/* Corner rivets */}
      <div className="absolute top-3 left-3 flex gap-6">
        <Rivet size={12} />
        <Rivet size={12} />
      </div>
      <div className="absolute top-3 right-3 flex gap-6">
        <Rivet size={12} />
        <Rivet size={12} />
      </div>
      
      {/* Header */}
      <div className="h-14 bg-diesel-dark border-b border-diesel-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <Link 
            to="/"
            className="flex items-center gap-2 text-diesel-steel hover:text-diesel-paper transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Editor</span>
          </Link>
          <div className="w-px h-6 bg-diesel-border" />
          <div className="flex items-center gap-2">
            <Archive size={20} className="text-diesel-gold" />
            <h1 className="text-lg font-bold text-diesel-gold uppercase tracking-widest">
              Asset Library
            </h1>
            <span className="text-xs text-diesel-steel bg-diesel-black px-2 py-0.5 rounded border border-diesel-border">
              {getLibraryCount(library)} assets
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-diesel-panel border border-diesel-border text-diesel-steel text-xs font-bold uppercase hover:text-diesel-paper hover:border-diesel-paper transition-colors"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-diesel-panel border border-diesel-border text-diesel-steel text-xs font-bold uppercase hover:text-diesel-paper hover:border-diesel-paper transition-colors"
          >
            <Upload size={14} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".dramlib,.json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar with search */}
        <div className="w-80 bg-diesel-dark border-r border-diesel-border flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-diesel-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-diesel-steel" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter library..."
                className="w-full bg-diesel-black border border-diesel-border rounded pl-9 pr-3 py-2 text-sm text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50"
              />
            </div>
          </div>
          
          {/* Asset List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {renderSection('Actors', 'actors', <User size={14} />, 'text-diesel-gold', filteredActors, 'actor')}
            {renderSection('Scenes', 'scenes', <Video size={14} />, 'text-diesel-rust', filteredScenes, 'scene')}
            {renderSection('Drops', 'drops', <Monitor size={14} />, 'text-diesel-paper', filteredDrops, 'drop')}
            {renderSection('Items', 'items', <Package size={14} />, 'text-diesel-gold', filteredItems, 'item')}
            {renderSection('SFX', 'sfx', <Music size={14} />, 'text-diesel-green', filteredSfx, 'sfx')}

            {getLibraryCount(library) === 0 && !searchQuery && (
              <div className="text-center py-12 text-diesel-steel">
                <Archive size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-base mb-2">Library is empty</p>
                <p className="text-sm opacity-60">
                  Save assets from your game editors to reuse them across projects
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Main panel - preview/info area */}
        <div className="flex-1 flex items-center justify-center p-8">
          {selectedAsset ? (
            <IndustrialPanel className="max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-diesel-black border border-diesel-border flex items-center justify-center">
                  {selectedAsset.type === 'actor' && <User size={28} className="text-diesel-gold" />}
                  {selectedAsset.type === 'scene' && <Video size={28} className="text-diesel-rust" />}
                  {selectedAsset.type === 'drop' && <Monitor size={28} className="text-diesel-paper" />}
                  {selectedAsset.type === 'item' && <Package size={28} className="text-diesel-gold" />}
                  {selectedAsset.type === 'sfx' && <Music size={28} className="text-diesel-green" />}
                </div>
                
                <h3 className="text-xl font-bold text-diesel-paper uppercase tracking-wider mb-2">
                  {(() => {
                    switch (selectedAsset.type) {
                      case 'actor': return library.actors.find(a => a.libraryId === selectedAsset.libraryId)?.name;
                      case 'scene': return library.scenes.find(s => s.libraryId === selectedAsset.libraryId)?.name;
                      case 'drop': return library.drops.find(d => d.libraryId === selectedAsset.libraryId)?.name;
                      case 'item': return library.items.find(i => i.libraryId === selectedAsset.libraryId)?.name;
                      case 'sfx': return library.sfx.find(s => s.libraryId === selectedAsset.libraryId)?.name;
                    }
                  })()}
                </h3>
                <p className="text-diesel-steel text-sm mb-6">
                  {selectedAsset.type.charAt(0).toUpperCase() + selectedAsset.type.slice(1)} Asset
                </p>
                
                <ArtDecoDivider width={200} className="text-diesel-gold mx-auto mb-6" />
                
                <div className="space-y-3">
                  <button
                    onClick={handleAddToGame}
                    disabled={!game}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase hover:bg-diesel-green/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    Add to Current Game
                  </button>
                  <button
                    onClick={handleDeleteFromLibrary}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
                  >
                    <Trash2 size={16} />
                    Remove from Library
                  </button>
                </div>
                
                {!game && (
                  <p className="text-diesel-steel text-xs mt-4 italic">
                    No active game session. Start or load a game first.
                  </p>
                )}
              </div>
            </IndustrialPanel>
          ) : (
            <div className="text-center text-diesel-steel">
              <DramatonLogo className="w-24 h-24 mx-auto mb-6 opacity-20" />
              <p className="text-lg mb-2">Select an asset to view details</p>
              <p className="text-sm opacity-60">
                Click on any asset in the sidebar to manage it
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
