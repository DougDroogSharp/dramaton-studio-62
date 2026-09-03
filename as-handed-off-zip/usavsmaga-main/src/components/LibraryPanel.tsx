import { useState, useEffect, useRef } from 'react';
import { 
  AssetLibrary, 
  GameData,
  LibraryActor, LibraryScene, LibraryDrop, LibraryItem, LibrarySfx, LibraryPage 
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
  removePageFromLibrary,
  addLibraryActorToGame,
  addLibrarySceneToGame,
  addLibraryDropToGame,
  addLibraryItemToGame,
  addLibrarySfxToGame,
  addLibraryPageToGame,
  getLibraryCount,
} from '@/utils/library';
import { 
  X, ChevronRight, ChevronDown, User, Video, Monitor, Package, Music, 
  Search, Download, Upload, Trash2, Plus, Archive, FolderOpen, FileCode
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface LibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameData;
  onGameChange: (game: GameData) => void;
}

type AssetType = 'actor' | 'scene' | 'drop' | 'item' | 'sfx' | 'page';

interface SelectedAsset {
  type: AssetType;
  libraryId: string;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ 
  isOpen, 
  onClose, 
  game, 
  onGameChange 
}) => {
  const { confirm } = useConfirmDialog();
  const [library, setLibrary] = useState<AssetLibrary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    actors: true,
    scenes: true,
    drops: true,
    items: true,
    sfx: true,
    pages: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load library on mount
  useEffect(() => {
    if (isOpen) {
      loadLibraryFromDB().then(setLibrary);
    }
  }, [isOpen]);

  // Save library whenever it changes
  useEffect(() => {
    if (library) {
      saveLibraryToDB(library);
    }
  }, [library]);

  if (!isOpen || !library) return null;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const matchesSearch = (name: string) => {
    if (!searchQuery.trim()) return true;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const handleAddToGame = () => {
    if (!selectedAsset) return;

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
      case 'page': {
        const page = (library.pages ?? []).find(p => p.libraryId === selectedAsset.libraryId);
        if (page) updatedGame = addLibraryPageToGame(game, page);
        break;
      }
    }

    onGameChange(updatedGame);
    toast.success('Asset added to game!');
    setSelectedAsset(null);
  };

  const handleDeleteFromLibrary = async () => {
    if (!selectedAsset) return;
    
    const shouldDelete = await confirm({ 
      title: 'Remove Asset',
      description: 'Remove this asset from the library?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (!shouldDelete) return;

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
      case 'page':
        updatedLibrary = removePageFromLibrary(library, selectedAsset.libraryId);
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
        username: library.username,
        actors: [...library.actors, ...importedLibrary.actors],
        scenes: [...library.scenes, ...importedLibrary.scenes],
        drops: [...library.drops, ...importedLibrary.drops],
        items: [...library.items, ...importedLibrary.items],
        sfx: [...library.sfx, ...importedLibrary.sfx],
        episodes: [...(library.episodes ?? []), ...(importedLibrary.episodes ?? [])],
        pages: [...(library.pages ?? []), ...(importedLibrary.pages ?? [])],
        games: [...(library.games ?? []), ...(importedLibrary.games ?? [])],
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
  const filteredPages = (library.pages ?? []).filter(p => matchesSearch(p.name));
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
        className={`w-full flex items-center gap-2 p-2 text-left transition-colors text-sm ${
          isSelected 
            ? `bg-${color}/20 border border-${color}` 
            : 'bg-diesel-black border border-diesel-border hover:border-diesel-paper'
        }`}
      >
        <span className={`text-${color}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-diesel-paper font-medium truncate">{asset.name}</div>
          <div className="text-[10px] text-diesel-steel truncate">
            from: {asset.source}
          </div>
        </div>
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
    <div key={key}>
      <button
        onClick={() => toggleSection(key)}
        className={`w-full flex items-center gap-2 py-2 px-1 text-${color} font-bold text-xs uppercase tracking-widest`}
      >
        {expandedSections[key] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <span className="text-diesel-steel">({items.length})</span>
      </button>
      {expandedSections[key] && (
        <div className="space-y-1 ml-4 mb-3">
          {items.length > 0 ? (
            items.map(item => renderAssetItem(item, type, icon, color))
          ) : (
            <p className="text-xs text-diesel-steel/50 italic py-2">No {title.toLowerCase()} in library</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-y-0 right-0 w-80 max-w-full z-40 bg-diesel-dark border-l border-diesel-border shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-diesel-border flex items-center justify-between bg-diesel-panel">
        <div className="flex items-center gap-2">
          <Archive size={16} className="text-diesel-gold" />
          <h2 className="text-sm font-bold text-diesel-gold uppercase tracking-widest">
            Asset Library
          </h2>
          <span className="text-[10px] text-diesel-steel bg-diesel-black px-1.5 py-0.5 rounded">
            {getLibraryCount(library)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-diesel-steel hover:text-diesel-paper transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-diesel-border">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-diesel-steel" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter library..."
            className="w-full bg-diesel-black border border-diesel-border rounded pl-7 pr-2 py-1.5 text-xs text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50"
          />
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {renderSection('Actors', 'actors', <User size={12} />, 'diesel-gold', filteredActors, 'actor')}
        {renderSection('Scenes', 'scenes', <Video size={12} />, 'diesel-rust', filteredScenes, 'scene')}
        {renderSection('Drops', 'drops', <Monitor size={12} />, 'diesel-paper', filteredDrops, 'drop')}
        {renderSection('Items', 'items', <Package size={12} />, 'diesel-gold', filteredItems, 'item')}
        {renderSection('SFX', 'sfx', <Music size={12} />, 'diesel-green', filteredSfx, 'sfx')}
        {renderSection('Pages', 'pages', <FileCode size={12} />, 'diesel-paper', filteredPages, 'page')}

        {getLibraryCount(library) === 0 && !searchQuery && (
          <div className="text-center py-8 text-diesel-steel">
            <Archive size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-2">Library is empty</p>
            <p className="text-xs opacity-60">
              Save assets from your game editors to reuse them across projects
            </p>
          </div>
        )}
      </div>

      {/* Selected Asset Actions */}
      {selectedAsset && (
        <div className="p-3 border-t border-diesel-border bg-diesel-panel space-y-2">
          <button
            onClick={handleAddToGame}
            className="w-full flex items-center justify-center gap-2 py-2 bg-diesel-green/20 border border-diesel-green text-diesel-green text-xs font-bold uppercase hover:bg-diesel-green/30 transition-colors"
          >
            <Plus size={14} />
            Add to Current Game
          </button>
          <button
            onClick={handleDeleteFromLibrary}
            className="w-full flex items-center justify-center gap-2 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-xs font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
          >
            <Trash2 size={14} />
            Remove from Library
          </button>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 border-t border-diesel-border flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-diesel-panel border border-diesel-border text-diesel-steel text-xs font-bold uppercase hover:text-diesel-paper hover:border-diesel-paper transition-colors"
        >
          <Download size={12} />
          Export
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-diesel-panel border border-diesel-border text-diesel-steel text-xs font-bold uppercase hover:text-diesel-paper hover:border-diesel-paper transition-colors"
        >
          <Upload size={12} />
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
  );
};
