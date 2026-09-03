import { useState, useEffect } from 'react';
import { Episode, Scene, GameData, AssetStatus, AssetLibrary } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { NotesSection } from '@/components/NotesSection';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Layers, Video, Search, X, Library, Save } from 'lucide-react';
import { toast } from 'sonner';
import { loadLibraryFromDB, saveLibraryToDB, addEpisodeToLibrary, findDuplicateEpisode, updateActorInLibrary } from '@/utils/library';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface EpisodeEditorProps {
  game: GameData;
  selectedId: string | null;
  onUpdate: (game: GameData) => void;
  onSelect: (id: string | null) => void;
  onNavigateToScene?: (sceneId: string) => void;
}

export const EpisodeEditor = ({ game, selectedId, onUpdate, onSelect, onNavigateToScene }: EpisodeEditorProps) => {
  const { confirm } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [library, setLibrary] = useState<AssetLibrary | null>(null);
  
  const episodes = game.episodes ?? [];
  const episode = selectedId ? episodes.find(e => e.id === selectedId) : null;

  // Load library on mount
  useEffect(() => {
    loadLibraryFromDB().then(setLibrary);
  }, []);

  const handleCreate = () => {
    const id = `episode_${Date.now()}`;
    const newEpisode: Episode = {
      id,
      name: 'New Episode',
      sceneIds: [],
      status: 'new',
    };
    onUpdate({
      ...game,
      episodes: [...episodes, newEpisode],
    });
    onSelect(id);
    toast.success('Episode created');
  };

  const handleDelete = async () => {
    if (!episode) return;
    const shouldDelete = await confirm({
      title: 'Delete Episode',
      description: `Delete "${episode.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!shouldDelete) return;
    onUpdate({
      ...game,
      episodes: episodes.filter(e => e.id !== episode.id),
    });
    onSelect(null);
    toast.success('Episode deleted');
  };

  const handleUpdateEpisode = (updates: Partial<Episode>) => {
    if (!episode) return;
    onUpdate({
      ...game,
      episodes: episodes.map(e => 
        e.id === episode.id ? { ...e, ...updates } : e
      ),
    });
  };

  const handleAddToLibrary = async () => {
    if (!episode || !library) return;
    
    const duplicateCheck = findDuplicateEpisode(library, episode);
    
    if (duplicateCheck.isDuplicate) {
      const action = await confirm({
        title: 'Duplicate Found',
        description: `"${episode.name}" already exists in your library with similar content. What would you like to do?`,
        confirmText: 'Rename Existing',
        cancelText: 'Skip',
      });
      
      if (action) {
        const newName = window.prompt('Enter a new name for the existing library item:', duplicateCheck.existingItem.name + ' (old)');
        if (newName && newName.trim()) {
          // Update existing episode name (reuse actor update since pattern is same)
          const renamedLibrary = {
            ...library,
            episodes: (library.episodes ?? []).map(e => 
              e.libraryId === duplicateCheck.existingItem.libraryId 
                ? { ...e, name: newName.trim() } 
                : e
            ),
          };
          const updatedLibrary = addEpisodeToLibrary(renamedLibrary, episode, game.info.title);
          await saveLibraryToDB(updatedLibrary);
          setLibrary(updatedLibrary);
          toast.success(`Renamed existing to "${newName}" and saved new "${episode.name}"!`);
        }
      }
      return;
    }
    
    const updatedLibrary = addEpisodeToLibrary(library, episode, game.info.title);
    await saveLibraryToDB(updatedLibrary);
    setLibrary(updatedLibrary);
    toast.success(`Added "${episode.name}" to library`);
  };

  const handleToggleScene = (sceneId: string) => {
    if (!episode) return;
    const isIncluded = episode.sceneIds.includes(sceneId);
    const newSceneIds = isIncluded
      ? episode.sceneIds.filter(id => id !== sceneId)
      : [...episode.sceneIds, sceneId];
    handleUpdateEpisode({ sceneIds: newSceneIds });
  };

  const handleCreateScene = () => {
    if (!episode) return;
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      name: 'New Scene',
      sceneType: 'Dialogue',
      stage: [],
      script: '',
      status: 'new',
      note: '',
    };
    onUpdate({
      ...game,
      scenes: [...(game.scenes ?? []), newScene],
      episodes: episodes.map(e =>
        e.id === episode.id
          ? { ...e, sceneIds: [...e.sceneIds, newScene.id] }
          : e
      ),
    });
    toast.success('Scene created and added to episode');
  };

  const handleDeleteScene = async (sceneId: string) => {
    const scene = game.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const shouldDelete = await confirm({
      title: 'Delete Scene',
      description: `Delete "${scene.name}"? This will remove it from all episodes and cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!shouldDelete) return;
    onUpdate({
      ...game,
      scenes: game.scenes.filter(s => s.id !== sceneId),
      episodes: episodes.map(e => ({
        ...e,
        sceneIds: e.sceneIds.filter(id => id !== sceneId),
      })),
    });
    toast.success(`Deleted "${scene.name}"`);
  };

  // Filter scenes by search
  const filteredScenes = (game.scenes ?? []).filter(scene =>
    !searchQuery.trim() || scene.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Episode list view
  if (!episode) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="text-diesel-purple" size={20} />
            <h2 className="text-lg font-bold text-diesel-paper uppercase tracking-wider">Episodes</h2>
          </div>
          <Button
            onClick={handleCreate}
            size="sm"
            className="bg-diesel-purple/20 border border-diesel-purple text-diesel-purple hover:bg-diesel-purple/30"
          >
            <Plus size={14} className="mr-1" />
            New Episode
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {episodes.length === 0 ? (
            <div className="text-center text-diesel-steel py-8">
              <Layers size={48} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No episodes yet</p>
              <p className="text-xs opacity-70">Create an episode to organize your scenes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {episodes.map(ep => (
                <div
                  key={ep.id}
                  onClick={() => onSelect(ep.id)}
                  className="p-3 bg-diesel-panel border border-diesel-border rounded cursor-pointer hover:border-diesel-purple/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ep.status || 'new'} size="sm" />
                    <span className="text-diesel-paper font-medium">{ep.name}</span>
                    <span className="text-diesel-steel text-xs ml-auto">
                      {ep.sceneIds.length} scene{ep.sceneIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {ep.description && (
                    <p className="text-diesel-steel text-xs mt-1 truncate">{ep.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Episode detail view
  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(null)}
            className="text-diesel-steel hover:text-diesel-paper text-xs"
          >
            ← Back
          </button>
          <StatusBadge
            status={episode.status || 'new'}
            onChange={(status) => handleUpdateEpisode({ status })}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={handleAddToLibrary}
            size="sm"
            variant="ghost"
            className="text-diesel-gold hover:text-diesel-gold hover:bg-diesel-gold/10"
            title="Add to Library"
          >
            <Library size={14} />
          </Button>
          <Button
            onClick={handleDelete}
            size="sm"
            variant="ghost"
            className="text-diesel-rust hover:text-diesel-rust hover:bg-diesel-rust/10"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Name */}
      <CyberInput
        label="Episode Name"
        value={episode.name}
        onChange={(e) => handleUpdateEpisode({ name: e.target.value })}
        className="mb-3"
      />

      {/* Description */}
      <div className="mb-4">
        <label className="text-[10px] text-diesel-steel uppercase tracking-widest mb-1 block">
          Description (optional)
        </label>
        <textarea
          value={episode.description || ''}
          onChange={(e) => handleUpdateEpisode({ description: e.target.value })}
          placeholder="Episode description..."
          className="w-full bg-diesel-panel border border-diesel-border rounded p-2 text-sm text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-purple/50 resize-none"
          rows={2}
        />
      </div>

        {/* Scene Selection */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-diesel-steel uppercase tracking-widest">
              Scenes in Episode ({episode.sceneIds.length})
            </label>
            <div className="flex items-center gap-1">
              {/* Add Existing Scene Dropdown */}
              {(game.scenes ?? []).filter(s => !episode.sceneIds.includes(s.id)).length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleToggleScene(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="h-6 px-2 text-xs bg-diesel-panel border border-diesel-border text-diesel-paper focus:outline-none focus:border-diesel-purple"
                  title="Add existing scene"
                >
                  <option value="">+ Add Existing</option>
                  {(game.scenes ?? [])
                    .filter(s => !episode.sceneIds.includes(s.id))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  }
                </select>
              )}
              <Button
                onClick={handleCreateScene}
                size="sm"
                variant="ghost"
                className="text-diesel-purple hover:text-diesel-purple hover:bg-diesel-purple/10 h-6 px-2"
                title="Create new scene"
              >
                <Plus size={12} className="mr-1" />
                <span className="text-xs">New</span>
              </Button>
            </div>
          </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-diesel-steel" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter scenes..."
            className="w-full bg-diesel-panel border border-diesel-border rounded pl-7 pr-7 py-1.5 text-xs text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-purple/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-diesel-steel hover:text-diesel-paper"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Scene list with checkboxes */}
        <ScrollArea className="flex-1 border border-diesel-border rounded bg-diesel-dark">
          <div className="p-2 space-y-1">
            {filteredScenes.length === 0 ? (
              <div className="text-center text-diesel-steel py-4 text-xs">
                {game.scenes.length === 0 ? 'No scenes in project' : 'No matching scenes'}
              </div>
            ) : (
              filteredScenes.map(scene => {
                const isIncluded = episode.sceneIds.includes(scene.id);
                return (
                  <div
                    key={scene.id}
                    className={`flex items-center gap-2 p-2 rounded transition-colors ${
                      isIncluded 
                        ? 'bg-diesel-purple/20 border border-diesel-purple/30' 
                        : 'hover:bg-diesel-border/30 border border-transparent'
                    }`}
                  >
                    <Checkbox
                      checked={isIncluded}
                      onCheckedChange={() => handleToggleScene(scene.id)}
                      className="border-diesel-steel data-[state=checked]:bg-diesel-purple data-[state=checked]:border-diesel-purple cursor-pointer"
                    />
                    <Video size={12} className="text-diesel-rust" />
                    <span 
                      className="text-sm text-diesel-paper flex-1 cursor-pointer hover:text-diesel-gold hover:underline"
                      onClick={() => onNavigateToScene?.(scene.id)}
                      title="Click to edit this scene"
                    >
                      {scene.name}
                    </span>
                    <StatusBadge status={scene.status || 'new'} size="sm" />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScene(scene.id);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-diesel-rust hover:text-diesel-rust hover:bg-diesel-rust/10 h-6 w-6 p-0"
                      title="Delete scene"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <NotesSection
          note={episode.note || ''}
          onChange={(note) => handleUpdateEpisode({ note })}
        />
      </div>
    </div>
  );
};
