import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AssetLibrary, 
  GameData,
  LibraryActor, LibraryScene, LibraryDrop, LibraryItem, LibrarySfx, LibraryPage, LibraryGame 
} from '@/types';
import {
  loadLibraryFromDB,
  saveLibraryToDB,
  exportLibrary,
  importLibraryFromPicker,
  removeActorFromLibrary,
  removeSceneFromLibrary,
  removeDropFromLibrary,
  removeItemFromLibrary,
  removeSfxFromLibrary,
  removePageFromLibrary,
  removeGameFromLibrary,
  exportGameFromLibrary,
  addLibraryActorToGame,
  addLibrarySceneToGame,
  addLibraryDropToGame,
  addLibraryItemToGame,
  addLibrarySfxToGame,
  addLibraryPageToGame,
  getLibraryCount,
} from '@/utils/library';
import { loadGameFromDB, saveGameToDB } from '@/utils/db';
import { DramatonLogo } from '@/components/DramatonLogo';
import { 
  ChevronRight, ChevronDown, ChevronLeft, User, Video, Monitor, Package, Music, 
  Search, Download, Upload, Trash2, Plus, Archive, ArrowLeft, FileCode, Gamepad2, FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Gear, 
  Rivet, 
  ArtDecoDivider,
  IndustrialPanel,
} from '@/components/DieselpunkDecorations';

type AssetType = 'actor' | 'scene' | 'drop' | 'item' | 'sfx' | 'page' | 'game';

interface SelectedAsset {
  type: AssetType;
  libraryId: string;
}

const Library = () => {
  const { confirm } = useConfirmDialog();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [library, setLibrary] = useState<AssetLibrary | null>(null);
  const [game, setGame] = useState<GameData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    games: true,
    actors: true,
    scenes: true,
    drops: true,
    items: true,
    sfx: true,
    pages: true,
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch username
  useEffect(() => {
    const fetchUsername = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.username) {
          setUsername(profile.username);
        }
      }
    };
    fetchUsername();
  }, [user]);

  // Reset image index when selection changes
  useEffect(() => {
    setImageIndex(0);
  }, [selectedAsset?.libraryId]);

  // Load library and game once username is available
  useEffect(() => {
    if (username) {
      loadLibraryFromDB(username).then(setLibrary);
    }
    loadGameFromDB().then(setGame);
  }, [username]);

  // Save library whenever it changes
  useEffect(() => {
    if (library && username) {
      saveLibraryToDB(library, username);
    }
  }, [library, username]);

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
      case 'page': {
        const page = (library.pages ?? []).find(p => p.libraryId === selectedAsset.libraryId);
        if (page) updatedGame = addLibraryPageToGame(game, page);
        break;
      }
    }

    setGame(updatedGame);
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
      case 'game':
        updatedLibrary = removeGameFromLibrary(library, selectedAsset.libraryId);
        break;
    }

    setLibrary(updatedLibrary);
    setSelectedAsset(null);
    toast.success('Asset removed from library');
  };

  const handleExport = async () => {
    const saved = await exportLibrary(library);
    if (saved) {
      toast.success('Library exported!');
    }
  };

  const handleImport = async () => {
    try {
      const importedLibrary = await importLibraryFromPicker();
      if (!importedLibrary) return; // User cancelled
      
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
  };

  const filteredActors = library.actors.filter(a => matchesSearch(a.name));
  const filteredScenes = library.scenes.filter(s => matchesSearch(s.name));
  const filteredDrops = library.drops.filter(d => matchesSearch(d.name));
  const filteredItems = library.items.filter(i => matchesSearch(i.name));
  const filteredSfx = library.sfx.filter(s => matchesSearch(s.name));
  const filteredPages = (library.pages ?? []).filter(p => matchesSearch(p.name));
  const filteredGames = (library.games ?? []).filter(g => matchesSearch(g.title));

  const handleExportGame = async (libraryGame: LibraryGame) => {
    const saved = await exportGameFromLibrary(libraryGame);
    if (saved) {
      toast.success(`Exported "${libraryGame.title}" as .dram file!`);
    }
  };

  const handleLoadGame = async (libraryGame: LibraryGame) => {
    const shouldLoad = await confirm({
      title: 'Load Game',
      description: `Load "${libraryGame.title}" and replace your current game? Make sure to save first!`,
      confirmText: 'Load Game',
      cancelText: 'Cancel',
    });
    
    if (!shouldLoad) return;
    
    await saveGameToDB(libraryGame.gameData);
    toast.success(`Loaded "${libraryGame.title}"!`);
    navigate('/');
  };

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
              {username ? `${username}'s Library` : 'Asset Library'}
            </h1>
            <span className="text-xs text-diesel-steel bg-diesel-black px-2 py-0.5 rounded border border-diesel-border">
              {getLibraryCount(library)} assets
            </span>
          </div>
          {game ? (
            <>
              <div className="w-px h-5 bg-diesel-border mx-2" />
              <span className="text-sm text-diesel-paper">
                Game: <span className="text-diesel-gold font-medium">{game.info.title}</span>
              </span>
            </>
          ) : (
            <>
              <div className="w-px h-5 bg-diesel-border mx-2" />
              <span className="text-sm text-diesel-steel italic">No game loaded</span>
            </>
          )}
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
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-diesel-panel border border-diesel-border text-diesel-steel text-xs font-bold uppercase hover:text-diesel-paper hover:border-diesel-paper transition-colors"
          >
            <Upload size={14} />
            Import
          </button>
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
            {/* Games Section - Special rendering */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('games')}
                className="w-full flex items-center gap-2 py-2 px-1 text-diesel-rust font-bold text-sm uppercase tracking-widest hover:opacity-80 transition-opacity"
              >
                {expandedSections.games ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Gamepad2 size={14} />
                <span className="flex-1 text-left">Saved Games</span>
                <span className="text-diesel-steel">({filteredGames.length})</span>
              </button>
              {expandedSections.games && (
                <div className="space-y-2 ml-4 mt-2">
                  {filteredGames.length > 0 ? (
                    filteredGames.map(g => {
                      const isSelected = selectedAsset?.libraryId === g.libraryId;
                      return (
                        <button
                          key={g.libraryId}
                          onClick={() => setSelectedAsset({ type: 'game', libraryId: g.libraryId })}
                          className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                            isSelected 
                              ? 'bg-diesel-rust/20 border border-diesel-rust' 
                              : 'bg-diesel-black border border-diesel-border hover:border-diesel-paper'
                          }`}
                        >
                          <Gamepad2 size={16} className="text-diesel-rust" />
                          <div className="flex-1 min-w-0">
                            <div className="text-diesel-paper font-medium truncate">{g.title}</div>
                            <div className="text-xs text-diesel-steel truncate">
                              by {g.author} • {new Date(g.addedAt).toLocaleDateString()}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleLoadGame(g); }}
                                className="p-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green hover:bg-diesel-green/30 transition-colors"
                                title="Load game"
                              >
                                <FolderOpen size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleExportGame(g); }}
                                className="p-1.5 bg-diesel-panel border border-diesel-border text-diesel-steel hover:text-diesel-paper hover:border-diesel-paper transition-colors"
                                title="Export as .dram file"
                              >
                                <Download size={14} />
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
                    })
                  ) : (
                    <p className="text-sm text-diesel-steel/50 italic py-3">No saved games in library</p>
                  )}
                </div>
              )}
            </div>

            {renderSection('Actors', 'actors', <User size={14} />, 'text-diesel-gold', filteredActors, 'actor')}
            {renderSection('Scenes', 'scenes', <Video size={14} />, 'text-diesel-rust', filteredScenes, 'scene')}
            {renderSection('Drops', 'drops', <Monitor size={14} />, 'text-diesel-paper', filteredDrops, 'drop')}
            {renderSection('Items', 'items', <Package size={14} />, 'text-diesel-gold', filteredItems, 'item')}
            {renderSection('SFX', 'sfx', <Music size={14} />, 'text-diesel-green', filteredSfx, 'sfx')}
            {renderSection('Pages', 'pages', <FileCode size={14} />, 'text-diesel-paper', filteredPages, 'page')}

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
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedAsset ? (
            <>
              {/* Preview takes up main space */}
              <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                {(() => {
                  switch (selectedAsset.type) {
                    case 'actor': {
                      const actor = library.actors.find(a => a.libraryId === selectedAsset.libraryId);
                      if (!actor) break;
                      
                      // Collect all available images
                      const allImages: { image: string; label: string }[] = [];
                      if (actor.referenceImageCloseUp) allImages.push({ image: actor.referenceImageCloseUp, label: 'Close-up Ref' });
                      if (actor.referenceImageFullBody) allImages.push({ image: actor.referenceImageFullBody, label: 'Full Body Ref' });
                      if (actor.image) allImages.push({ image: actor.image, label: 'Main' });
                      actor.graphics?.forEach((g, i) => {
                        if (g.image) allImages.push({ image: g.image, label: `${g.pose} / ${g.expression}` });
                      });
                      
                      if (allImages.length === 0) break;
                      
                      const safeIndex = Math.min(imageIndex, allImages.length - 1);
                      const currentImage = allImages[safeIndex];
                      
                      return (
                        <div className="h-full max-h-[70vh] aspect-[3/4] bg-diesel-black border border-diesel-border overflow-hidden relative">
                          <img src={currentImage.image} alt={actor.name} className="w-full h-full object-contain" />
                          
                          {/* Image label */}
                          <div className="absolute top-2 left-2 px-2 py-1 bg-diesel-black/80 text-diesel-gold text-xs uppercase tracking-wider">
                            {currentImage.label}
                          </div>
                          
                          {/* Navigation - only show if multiple images */}
                          {allImages.length > 1 && (
                            <>
                              <button
                                onClick={() => setImageIndex(i => (i - 1 + allImages.length) % allImages.length)}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-diesel-black/80 border border-diesel-border text-diesel-paper hover:bg-diesel-panel transition-colors"
                              >
                                <ChevronLeft size={20} />
                              </button>
                              <button
                                onClick={() => setImageIndex(i => (i + 1) % allImages.length)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-diesel-black/80 border border-diesel-border text-diesel-paper hover:bg-diesel-panel transition-colors"
                              >
                                <ChevronRight size={20} />
                              </button>
                              
                              {/* Page indicator */}
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-diesel-black/80 text-diesel-steel text-xs">
                                {safeIndex + 1} / {allImages.length}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }
                    case 'drop': {
                      const drop = library.drops.find(d => d.libraryId === selectedAsset.libraryId);
                      if (drop?.image) {
                        return (
                          <div className="h-full max-h-[70vh] aspect-video bg-diesel-black border border-diesel-border overflow-hidden">
                            <img src={drop.image} alt={drop.name} className="w-full h-full object-cover" />
                          </div>
                        );
                      }
                      break;
                    }
                    case 'item': {
                      const item = library.items.find(i => i.libraryId === selectedAsset.libraryId);
                      if (item?.visualAsset) {
                        return (
                          <div className="h-full max-h-[50vh] aspect-square bg-diesel-black border border-diesel-border overflow-hidden">
                            <img src={item.visualAsset} alt={item.name} className="w-full h-full object-contain" />
                          </div>
                        );
                      }
                      break;
                    }
                    case 'scene': {
                      const scene = library.scenes.find(s => s.libraryId === selectedAsset.libraryId);
                      const drop = scene?.dropId ? library.drops.find(d => d.libraryId === scene.dropId || d.id === scene.dropId) : null;
                      if (drop?.image) {
                        return (
                          <div className="h-full max-h-[70vh] aspect-video bg-diesel-black border border-diesel-border overflow-hidden relative">
                            <img src={drop.image} alt={scene.name} className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 px-2 py-1 bg-diesel-black/70 text-diesel-gold text-xs uppercase tracking-wider">
                              Scene Preview
                            </div>
                          </div>
                        );
                      }
                      break;
                    }
                    case 'page': {
                      const page = (library.pages ?? []).find(p => p.libraryId === selectedAsset.libraryId);
                      if (page) {
                        return (
                          <div className="h-full max-h-[70vh] w-full max-w-2xl bg-diesel-black border border-diesel-border overflow-auto p-4 flex items-center justify-center">
                            <div className="text-center">
                              <FileCode size={64} className="mx-auto text-diesel-paper opacity-50 mb-4" />
                              <h3 className="text-diesel-paper text-lg font-bold">{page.name}</h3>
                              <p className="text-diesel-steel text-sm">Page Asset</p>
                            </div>
                          </div>
                        );
                      }
                      break;
                    }
                    case 'game': {
                      const libraryGame = (library.games ?? []).find(g => g.libraryId === selectedAsset.libraryId);
                      if (libraryGame) {
                        return (
                          <div className="h-full max-h-[70vh] w-full max-w-2xl bg-diesel-black border border-diesel-border overflow-auto p-6">
                            <div className="text-center mb-6">
                              <Gamepad2 size={64} className="mx-auto text-diesel-rust opacity-50 mb-4" />
                              <h3 className="text-diesel-paper text-xl font-bold">{libraryGame.title}</h3>
                              <p className="text-diesel-steel text-sm">by {libraryGame.author}</p>
                              <p className="text-diesel-steel text-xs mt-1">
                                Saved: {new Date(libraryGame.addedAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center text-xs">
                              <div className="bg-diesel-panel p-3 border border-diesel-border">
                                <div className="text-diesel-gold text-lg font-bold">{libraryGame.gameData.actors?.length ?? 0}</div>
                                <div className="text-diesel-steel">Actors</div>
                              </div>
                              <div className="bg-diesel-panel p-3 border border-diesel-border">
                                <div className="text-diesel-rust text-lg font-bold">{libraryGame.gameData.scenes?.length ?? 0}</div>
                                <div className="text-diesel-steel">Scenes</div>
                              </div>
                              <div className="bg-diesel-panel p-3 border border-diesel-border">
                                <div className="text-diesel-paper text-lg font-bold">{libraryGame.gameData.drops?.length ?? 0}</div>
                                <div className="text-diesel-steel">Drops</div>
                              </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                              <button
                                onClick={() => handleLoadGame(libraryGame)}
                                className="flex-1 py-3 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase hover:bg-diesel-green/30 transition-colors flex items-center justify-center gap-2"
                              >
                                <FolderOpen size={18} />
                                Load Game
                              </button>
                              <button
                                onClick={() => handleExportGame(libraryGame)}
                                className="py-3 px-4 bg-diesel-panel border border-diesel-border text-diesel-steel font-bold uppercase hover:text-diesel-paper hover:border-diesel-paper transition-colors flex items-center justify-center gap-2"
                                title="Export as .dram file"
                              >
                                <Download size={18} />
                                Export
                              </button>
                            </div>
                          </div>
                        );
                      }
                      break;
                    }
                  }
                  // Fallback to larger icon
                  return (
                    <div className="w-48 h-48 bg-diesel-black border border-diesel-border flex items-center justify-center">
                      {selectedAsset.type === 'actor' && <User size={64} className="text-diesel-gold opacity-50" />}
                      {selectedAsset.type === 'scene' && <Video size={64} className="text-diesel-rust opacity-50" />}
                      {selectedAsset.type === 'drop' && <Monitor size={64} className="text-diesel-paper opacity-50" />}
                      {selectedAsset.type === 'item' && <Package size={64} className="text-diesel-gold opacity-50" />}
                      {selectedAsset.type === 'sfx' && <Music size={64} className="text-diesel-green opacity-50" />}
                      {selectedAsset.type === 'page' && <FileCode size={64} className="text-diesel-paper opacity-50" />}
                      {selectedAsset.type === 'game' && <Gamepad2 size={64} className="text-diesel-rust opacity-50" />}
                    </div>
                  );
                })()}
              </div>
              
              {/* Action bar at bottom */}
              <div className="shrink-0 border-t border-diesel-border bg-diesel-dark p-4">
                <div className="max-w-xl mx-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-diesel-paper uppercase tracking-wider">
                        {(() => {
                          switch (selectedAsset.type) {
                            case 'actor': return library.actors.find(a => a.libraryId === selectedAsset.libraryId)?.name;
                            case 'scene': return library.scenes.find(s => s.libraryId === selectedAsset.libraryId)?.name;
                            case 'drop': return library.drops.find(d => d.libraryId === selectedAsset.libraryId)?.name;
                            case 'item': return library.items.find(i => i.libraryId === selectedAsset.libraryId)?.name;
                            case 'sfx': return library.sfx.find(s => s.libraryId === selectedAsset.libraryId)?.name;
                            case 'page': return (library.pages ?? []).find(p => p.libraryId === selectedAsset.libraryId)?.name;
                            case 'game': return (library.games ?? []).find(g => g.libraryId === selectedAsset.libraryId)?.title;
                          }
                        })()}
                      </h3>
                      <p className="text-diesel-steel text-sm">
                        {selectedAsset.type === 'game' ? 'Saved Game' : `${selectedAsset.type.charAt(0).toUpperCase() + selectedAsset.type.slice(1)} Asset`}
                        {selectedAsset.type !== 'game' && !game && <span className="text-diesel-rust ml-2">• No game loaded</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {selectedAsset.type === 'game' ? (
                        <>
                          <button
                            onClick={() => {
                              const libraryGame = (library.games ?? []).find(g => g.libraryId === selectedAsset.libraryId);
                              if (libraryGame) handleExportGame(libraryGame);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-diesel-panel border border-diesel-border text-diesel-steel font-bold uppercase text-sm hover:text-diesel-paper hover:border-diesel-paper transition-colors"
                          >
                            <Download size={16} />
                            Export
                          </button>
                          <button
                            onClick={() => {
                              const libraryGame = (library.games ?? []).find(g => g.libraryId === selectedAsset.libraryId);
                              if (libraryGame) handleLoadGame(libraryGame);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase text-sm hover:bg-diesel-green/30 transition-colors"
                          >
                            <FolderOpen size={16} />
                            Load Game
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleAddToGame}
                          disabled={!game}
                          className="flex items-center gap-2 px-4 py-2 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase text-sm hover:bg-diesel-green/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={16} />
                          Add to Game
                        </button>
                      )}
                      <button
                        onClick={handleDeleteFromLibrary}
                        className="flex items-center gap-2 px-4 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust font-bold uppercase text-sm hover:bg-diesel-rust/30 transition-colors"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-diesel-steel">
                <DramatonLogo className="w-24 h-24 mx-auto mb-6 opacity-20" />
                <p className="text-lg mb-2">Select an asset to view details</p>
                <p className="text-sm opacity-60">
                  Click on any asset in the sidebar to manage it
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
