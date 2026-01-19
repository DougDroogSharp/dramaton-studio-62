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
import { loadLibraryFromDB, saveLibraryToDB, addEpisodeToLibrary } from '@/utils/library';

interface EpisodeEditorProps {
  game: GameData;
  selectedId: string | null;
  onUpdate: (game: GameData) => void;
  onSelect: (id: string | null) => void;
}

export const EpisodeEditor = ({ game, selectedId, onUpdate, onSelect }: EpisodeEditorProps) => {
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

  const handleDelete = () => {
    if (!episode) return;
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
                  <label
                    key={scene.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isIncluded 
                        ? 'bg-diesel-purple/20 border border-diesel-purple/30' 
                        : 'hover:bg-diesel-border/30 border border-transparent'
                    }`}
                  >
                    <Checkbox
                      checked={isIncluded}
                      onCheckedChange={() => handleToggleScene(scene.id)}
                      className="border-diesel-steel data-[state=checked]:bg-diesel-purple data-[state=checked]:border-diesel-purple"
                    />
                    <Video size={12} className="text-diesel-rust" />
                    <span className="text-sm text-diesel-paper flex-1">{scene.name}</span>
                    <StatusBadge status={scene.status || 'new'} size="sm" />
                  </label>
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
