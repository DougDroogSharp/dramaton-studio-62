import { GameData, Episode, AssetStatus } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { Plus, Trash2, Upload, X, Layers, ChevronDown, Edit3, Check, Shield, FolderOpen, FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addTestDataToGame } from '@/utils/testSceneGenerator';
import { SecurityDialog } from '@/components/SecurityDialog';
// OPTIMIZED: Compress style guide to 256px to reduce AI token costs (~75% savings)
const compressImage = (file: File, maxDimension: number = 256): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Scale down if needed
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Use JPEG for smaller file size
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface SettingsEditorProps {
  game: GameData;
  onChange: (game: GameData) => void;
  onRename?: (newTitle: string, newAuthor: string) => void;
  onLoadFile?: () => void;
  username?: string | null;
}

export const SettingsEditor: React.FC<SettingsEditorProps> = ({ game, onChange, onRename, onLoadFile, username }) => {
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [newEpisodeName, setNewEpisodeName] = useState('');
  const [showEpisodeDropdown, setShowEpisodeDropdown] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameAuthor, setRenameAuthor] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);

  const updateInfo = (updates: Partial<GameData['info']>) => {
    onChange({ ...game, info: { ...game.info, ...updates } });
  };

  const addWorldStateVar = () => {
    if (!newVarKey.trim()) return;
    const worldState = { ...game.info.worldState, [newVarKey]: newVarValue || '' };
    updateInfo({ worldState });
    setNewVarKey('');
    setNewVarValue('');
  };

  const removeWorldStateVar = (key: string) => {
    const worldState = { ...game.info.worldState };
    delete worldState[key];
    updateInfo({ worldState });
  };

  const openRenameDialog = () => {
    setRenameTitle(game.info.title);
    setRenameAuthor(game.info.author);
    setShowRenameDialog(true);
  };

  const startEditingTitle = () => {
    setEditingTitle(game.info.title);
    setIsEditingTitle(true);
  };

  const commitTitleChange = () => {
    const newTitle = editingTitle.trim();
    if (!newTitle) {
      toast.error('Please enter a game title');
      return;
    }
    
    const newAuthor = username || game.info.author;
    if (onRename) {
      onRename(newTitle, newAuthor);
    }
    setIsEditingTitle(false);
    toast.success('Game renamed and saved');
  };

  const cancelTitleEdit = () => {
    setIsEditingTitle(false);
    setEditingTitle('');
  };

  const handleRenameSubmit = () => {
    const newTitle = renameTitle.trim();
    // Author is always the username
    const newAuthor = username || game.info.author;
    
    if (!newTitle) {
      toast.error('Please enter a game title');
      return;
    }
    
    if (onRename) {
      onRename(newTitle, newAuthor);
    }
    setShowRenameDialog(false);
    toast.success('Game renamed and saved');
  };

  const handleSelectEpisode = (episodeId: string) => {
    updateInfo({ currentEpisodeId: episodeId });
    setShowEpisodeDropdown(false);
  };

  const handleCreateEpisode = () => {
    if (!newEpisodeName.trim()) {
      toast.error('Please enter an episode name');
      return;
    }
    
    const newEpisode: Episode = {
      id: `episode_${Date.now()}`,
      name: newEpisodeName.trim(),
      description: '',
      sceneIds: [],
      status: 'new' as AssetStatus,
    };
    
    onChange({
      ...game,
      episodes: [...game.episodes, newEpisode],
      info: { ...game.info, currentEpisodeId: newEpisode.id },
    });
    
    setNewEpisodeName('');
    toast.success(`Created episode: ${newEpisode.name}`);
  };

  const currentEpisode = game.episodes.find(e => e.id === game.info.currentEpisodeId);

  const handleStyleGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const originalSizeKB = file.size / 1024;
    
    try {
      toast.info('Compressing style guide...');
      const compressed = await compressImage(file, 512);
      const compressedSizeKB = compressed.length * 0.75 / 1024; // base64 overhead
      
      updateInfo({ styleGuide: compressed });
      toast.success(`Style guide uploaded (${Math.round(originalSizeKB)}KB → ~${Math.round(compressedSizeKB)}KB)`);
    } catch (err) {
      console.error('Compression failed:', err);
      // Fallback to uncompressed
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateInfo({ styleGuide: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info - Title and Author with Rename button */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Project Info
        </h3>
        
        {/* Title and author display with inline editing */}
        <div className="mb-4 p-3 bg-diesel-black/50 border border-diesel-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="mb-2">
                <span className="text-xs uppercase tracking-widest text-diesel-steel">Game Title</span>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitTitleChange();
                        if (e.key === 'Escape') cancelTitleEdit();
                      }}
                      autoFocus
                      className="flex-1 bg-diesel-black border border-diesel-gold text-diesel-gold text-lg font-bold p-1 focus:outline-none"
                    />
                    <button
                      onClick={commitTitleChange}
                      className="p-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green hover:bg-diesel-green/30 transition-colors"
                      title="Commit change"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelTitleEdit}
                      className="p-1.5 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust hover:bg-diesel-rust/30 transition-colors"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-diesel-gold">{game.info.title}</p>
                )}
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-diesel-steel">Author</span>
                <p className="text-sm text-diesel-paper">{username || game.info.author}</p>
              </div>
            </div>
            {!isEditingTitle && (
              <div className="flex gap-2">
                <button
                  onClick={startEditingTitle}
                  className="flex items-center gap-1 px-3 py-1.5 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-xs font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
                  title="Rename Game"
                >
                  <Edit3 size={12} />
                  Rename
                </button>
                {onLoadFile && (
                  <button
                    onClick={onLoadFile}
                    className="flex items-center gap-1 px-3 py-1.5 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
                    title="Load Game from File"
                  >
                    <FolderOpen size={12} />
                    Load
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-diesel-paper cursor-pointer">
            <input
              type="checkbox"
              checked={game.info.enableAutosave}
              onChange={(e) => updateInfo({ enableAutosave: e.target.checked })}
              className="accent-diesel-gold"
            />
            Enable Autosave
          </label>
          <label className="flex items-center gap-2 text-sm text-diesel-paper cursor-pointer">
            <input
              type="radio"
              name="gameMode"
              checked={game.info.gameMode === 'INTERACTIVE'}
              onChange={() => updateInfo({ gameMode: 'INTERACTIVE' })}
              className="accent-diesel-gold"
            />
            Interactive
          </label>
          <label className="flex items-center gap-2 text-sm text-diesel-paper cursor-pointer">
            <input
              type="radio"
              name="gameMode"
              checked={game.info.gameMode === 'AUTO_PLAY'}
              onChange={() => updateInfo({ gameMode: 'AUTO_PLAY' })}
              className="accent-diesel-gold"
            />
            Auto-Play
          </label>
          
          {/* Security Button */}
          <button
            onClick={() => setShowSecurityDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green text-xs font-bold uppercase hover:bg-diesel-green/30 transition-colors ml-auto"
          >
            <Shield size={12} />
            Security
          </button>
        </div>
      </section>


      {/* Starting Episode for Theater */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Starting Episode
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Select which episode plays first when the game starts in Theater mode.
        </p>
        
        <select
          value={game.info.startingEpisodeId || ''}
          onChange={(e) => updateInfo({ startingEpisodeId: e.target.value || undefined })}
          className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
        >
          <option value="">Use first episode</option>
          {game.episodes.map(episode => {
            const validSceneCount = episode.sceneIds.filter(id => game.scenes.some(s => s.id === id)).length;
            return (
              <option key={episode.id} value={episode.id}>
                {episode.name} ({validSceneCount} scene{validSceneCount !== 1 ? 's' : ''})
              </option>
            );
          })}
        </select>
      </section>

      {/* Current Episode Selector */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Current Episode
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Select the active episode for editing. All new scenes will be added to this episode.
        </p>
        
        {/* Episode dropdown */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowEpisodeDropdown(!showEpisodeDropdown)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-diesel-black border border-diesel-border text-diesel-paper hover:border-diesel-gold transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-diesel-purple" />
              <span className="font-medium">{currentEpisode?.name || 'No episode selected'}</span>
            </div>
            <ChevronDown size={16} className={`text-diesel-steel transition-transform ${showEpisodeDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showEpisodeDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-diesel-black border border-diesel-border z-10 max-h-48 overflow-y-auto">
              {game.episodes.map(episode => {
                const validSceneCount = episode.sceneIds.filter(id => game.scenes.some(s => s.id === id)).length;
                return (
                  <button
                    key={episode.id}
                    onClick={() => handleSelectEpisode(episode.id)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-diesel-border/30 transition-colors ${
                      episode.id === game.info.currentEpisodeId ? 'bg-diesel-purple/20 text-diesel-purple' : 'text-diesel-paper'
                    }`}
                  >
                    <Layers size={14} />
                    <span className="text-sm">{episode.name}</span>
                    <span className="text-xs text-diesel-steel ml-auto">({validSceneCount} scene{validSceneCount !== 1 ? 's' : ''})</span>
                  </button>
                );
              })}
              {game.episodes.length === 0 && (
                <div className="px-4 py-2 text-sm text-diesel-steel">No episodes yet</div>
              )}
            </div>
          )}
        </div>
        
        {/* Create new episode */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New episode name..."
            value={newEpisodeName}
            onChange={(e) => setNewEpisodeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateEpisode()}
            className="flex-1 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button
            onClick={handleCreateEpisode}
            className="px-3 bg-diesel-purple/20 border border-diesel-purple text-diesel-purple hover:bg-diesel-purple/30"
          >
            <Plus size={16} />
          </button>
        </div>
      </section>

      {/* Style Guide */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          AI Style Guide
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Upload a reference image to teach the AI your visual style for generated assets.
        </p>
        
        {game.info.styleGuide ? (
          <div className="relative group inline-block">
            <img
              src={game.info.styleGuide}
              alt="Style guide"
              className="w-24 h-24 object-cover border border-diesel-border"
            />
            <button
              onClick={() => updateInfo({ styleGuide: null })}
              className="absolute top-1 right-1 p-0.5 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
            <Upload size={16} />
            <span className="text-sm">Upload Style Reference</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleStyleGuideUpload}
              className="hidden"
            />
          </label>
        )}
      </section>

      {/* World State Variables */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          World State Variables
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Define global variables for game logic (flags, counters, states).
        </p>
        
        {/* Existing variables */}
        <div className="space-y-2 mb-4">
          {Object.entries(game.info.worldState).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 bg-diesel-black p-2 border border-diesel-border">
              <span className="text-diesel-gold font-mono text-sm flex-1">{key}</span>
              <span className="text-diesel-paper font-mono text-sm">{String(value)}</span>
              <button
                onClick={() => removeWorldStateVar(key)}
                className="text-diesel-rust hover:text-red-400 p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        
        {/* Add new variable */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Variable name"
            value={newVarKey}
            onChange={(e) => setNewVarKey(e.target.value)}
            className="flex-1 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <input
            type="text"
            placeholder="Value"
            value={newVarValue}
            onChange={(e) => setNewVarValue(e.target.value)}
            className="w-24 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button
            onClick={addWorldStateVar}
            className="px-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
          >
            <Plus size={16} />
          </button>
        </div>
      </section>

      {/* Developer Tools */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Developer Tools
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Testing utilities for new DramScript features.
        </p>
        
        <button
          onClick={() => {
            const updated = addTestDataToGame(game);
            onChange(updated);
            toast.success('Added test actors and scenes for POSE_MOVE & ZORDER');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-diesel-purple/20 border border-diesel-purple text-diesel-purple hover:bg-diesel-purple/30 transition-colors"
        >
          <FlaskConical size={16} />
          <span className="text-sm font-bold uppercase">Add Test Scenes</span>
        </button>
        <p className="text-[10px] text-diesel-steel mt-2">
          Creates test actors with animation frames and test scenes for POSE_MOVE and ZORDER commands.
        </p>
      </section>

      {/* Rename Dialog - Title only, author is always the username */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-diesel-panel border-diesel-border">
          <DialogHeader>
            <DialogTitle className="text-diesel-gold uppercase tracking-wider">Rename Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-diesel-steel mb-1">Game Title</label>
              <input
                type="text"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-3 text-lg font-bold focus:outline-none focus:border-diesel-gold"
                placeholder="Enter game title..."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-diesel-steel mb-1">Author</label>
              <div className="w-full bg-diesel-black/50 border border-diesel-border text-diesel-paper/70 p-2">
                {username || game.info.author}
              </div>
              <p className="text-[10px] text-diesel-steel mt-1">Author is set from your username</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRenameDialog(false)}
                className="flex-1 px-4 py-2 border border-diesel-border text-diesel-steel hover:border-diesel-paper hover:text-diesel-paper transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="flex-1 px-4 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
              >
                Rename & Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Security Dialog */}
      <SecurityDialog 
        open={showSecurityDialog} 
        onOpenChange={setShowSecurityDialog} 
      />
    </div>
  );
};
