import { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Settings, User, Video, Monitor, Package, Music, Image, Wand2, FileText, Mic, Palette, Layers, Search, X, MousePointer2, FileCode } from 'lucide-react';
import { GameData, SelectionState, Actor, Scene, Drop, Item, Sfx, ActorGraphic, AssetStatus, Button, Episode, Page } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { getCategoryStatus, getCategoryColor } from '@/utils/statusPromotion';

// Get text color based on status
const getStatusColor = (status?: AssetStatus): string => {
  switch (status) {
    case 'done': return 'text-diesel-green';
    case 'work': return 'text-diesel-rust';
    case 'new': return 'text-diesel-steel';
    default: return 'text-diesel-paper';
  }
};

interface AssetTreeProps {
  game: GameData;
  onNavigate: (type: SelectionState['type'], id: string | null, subId?: string) => void;
  onUpdateStatus?: (type: 'actor' | 'scene' | 'drop' | 'item' | 'sfx', id: string, status: AssetStatus) => void;
}

interface TreeNodeProps {
  label: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  onDoubleClick?: () => void;
  depth?: number;
  count?: number;
  color?: string;
  highlight?: boolean;
  status?: AssetStatus;
  onStatusChange?: (status: AssetStatus) => void;
  isCurrent?: boolean;
  useStatusColor?: boolean; // New prop to enable status-based coloring
}

const TreeNode = ({ label, icon, children, defaultOpen = false, onDoubleClick, depth = 0, count, color = 'text-diesel-paper', highlight = false, status, onStatusChange, isCurrent = false, useStatusColor = false }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || highlight);
  const hasChildren = Boolean(children);
  
  // Auto-expand when highlighted
  useState(() => {
    if (highlight && !isOpen) setIsOpen(true);
  });
  
  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  }, [hasChildren, isOpen]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.();
  }, [onDoubleClick]);

  // Determine the text color - use status color if enabled and status exists
  const textColor = useStatusColor && status ? getStatusColor(status) : color;

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`flex items-center gap-1 py-1 px-1 hover:bg-diesel-border/30 cursor-pointer transition-colors rounded ${textColor} ${highlight ? 'bg-diesel-gold/20 ring-1 ring-diesel-gold/50' : ''} ${isCurrent ? 'ring-1 ring-diesel-cyan/60 bg-diesel-cyan/10' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <span className="w-4 h-4 flex items-center justify-center text-diesel-steel">
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="w-4" />
        )}
        {icon && <span className="w-4 h-4 flex items-center justify-center opacity-70">{icon}</span>}
        {status && (
          <StatusBadge 
            status={status} 
            onChange={onStatusChange} 
            size="sm" 
          />
        )}
        <span className="text-xs font-medium truncate flex-1">{label}</span>
        {isCurrent && <span className="text-[9px] text-diesel-cyan font-bold uppercase">ACTIVE</span>}
        {count !== undefined && <span className="text-[10px] text-diesel-steel opacity-60">({count})</span>}
      </div>
      {(isOpen || highlight) && hasChildren && (
        <div>{children}</div>
      )}
    </div>
  );
};

// Leaf node for non-expandable items
const LeafNode = ({ label, icon, depth = 0, color = 'text-diesel-steel' }: { label: string; icon?: React.ReactNode; depth?: number; color?: string }) => (
  <div
    className={`flex items-center gap-1 py-0.5 px-1 ${color}`}
    style={{ paddingLeft: `${depth * 12 + 4}px` }}
  >
    <span className="w-4" />
    {icon && <span className="w-3 h-3 flex items-center justify-center opacity-50">{icon}</span>}
    <span className="text-[10px] truncate opacity-70">{label}</span>
  </div>
);

export const AssetTree = ({ game, onNavigate, onUpdateStatus }: AssetTreeProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Helper to check if a name matches search
  const matchesSearch = useCallback((name: string) => {
    if (!searchQuery.trim()) return false;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);
  
  // Check if search query matches a status
  const statusSearch = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q === 'new' || q === 'work' || q === 'done') {
      return q as AssetStatus;
    }
    return null;
  }, [searchQuery]);
  
  // Compute which items match the search
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return { scenes: [], actors: [], drops: [], items: [], sfx: [], episodes: [], pages: [] };
    
    const q = searchQuery.toLowerCase();
    
    // If searching by status
    if (statusSearch) {
      return {
        scenes: (game?.scenes ?? []).filter(s => (s.status || 'new') === statusSearch).map(s => s.id),
        actors: (game?.actors ?? []).filter(a => (a.status || 'new') === statusSearch).map(a => a.id),
        drops: (game?.drops ?? []).filter(d => (d.status || 'new') === statusSearch).map(d => d.id),
        items: (game?.items ?? []).filter(i => (i.status || 'new') === statusSearch).map(i => i.id),
        sfx: (game?.sfx ?? []).filter(s => (s.status || 'new') === statusSearch).map(s => s.id),
        episodes: (game?.episodes ?? []).filter(e => (e.status || 'new') === statusSearch).map(e => e.id),
        pages: (game?.pages ?? []).filter(p => (p.status || 'new') === statusSearch).map(p => p.id),
      };
    }
    
    return {
      scenes: (game?.scenes ?? []).filter(s => s.name.toLowerCase().includes(q)).map(s => s.id),
      actors: (game?.actors ?? []).filter(a => a.name.toLowerCase().includes(q)).map(a => a.id),
      drops: (game?.drops ?? []).filter(d => d.name.toLowerCase().includes(q)).map(d => d.id),
      items: (game?.items ?? []).filter(i => i.name.toLowerCase().includes(q)).map(i => i.id),
      sfx: (game?.sfx ?? []).filter(s => s.name.toLowerCase().includes(q)).map(s => s.id),
      episodes: (game?.episodes ?? []).filter(e => e.name.toLowerCase().includes(q)).map(e => e.id),
      pages: (game?.pages ?? []).filter(p => p.name.toLowerCase().includes(q)).map(p => p.id),
    };
  }, [searchQuery, statusSearch, game]);
  
  const hasMatches = searchQuery.trim() && (
    searchMatches.scenes.length > 0 ||
    searchMatches.actors.length > 0 ||
    searchMatches.drops.length > 0 ||
    searchMatches.items.length > 0 ||
    searchMatches.sfx.length > 0 ||
    searchMatches.episodes.length > 0 ||
    searchMatches.pages.length > 0
  );
  
  const totalMatches = searchMatches.scenes.length + searchMatches.actors.length + 
    searchMatches.drops.length + searchMatches.items.length + searchMatches.sfx.length +
    searchMatches.episodes.length + searchMatches.pages.length;

  // Helper to find buttons used in a scene's script
  const getSceneButtons = useCallback((scene: Scene): Button[] => {
    if (!scene.script) return [];
    
    const buttonIds = new Set<string>();
    const buttonRegex = /\[BUTTON\s+(\w+)\]/gi;
    let match;
    
    while ((match = buttonRegex.exec(scene.script)) !== null) {
      buttonIds.add(match[1]);
    }
    
    return game.buttons.filter(b => buttonIds.has(b.id));
  }, [game.buttons]);

  // Get scenes for an episode
  const getEpisodeScenes = useCallback((episode: Episode): Scene[] => {
    return episode.sceneIds
      .map(id => game.scenes.find(s => s.id === id))
      .filter((s): s is Scene => s !== undefined);
  }, [game.scenes]);

  // Get actors used in episode scenes
  const getEpisodeActors = useCallback((episode: Episode): Actor[] => {
    const actorIds = new Set<string>();
    const scenes = getEpisodeScenes(episode);
    
    scenes.forEach(scene => {
      scene.stage?.forEach(el => {
        if (el.type === 'ACTOR') {
          actorIds.add(el.assetId);
        }
      });
    });
    
    return game.actors.filter(a => actorIds.has(a.id));
  }, [game.actors, getEpisodeScenes]);

  // Get drops used in episode scenes
  const getEpisodeDrops = useCallback((episode: Episode): Drop[] => {
    const dropIds = new Set<string>();
    const scenes = getEpisodeScenes(episode);
    
    scenes.forEach(scene => {
      if (scene.dropId) {
        dropIds.add(scene.dropId);
      }
    });
    
    return game.drops.filter(d => dropIds.has(d.id));
  }, [game.drops, getEpisodeScenes]);

  // Get items used in episode scenes
  const getEpisodeItems = useCallback((episode: Episode): Item[] => {
    const itemIds = new Set<string>();
    const scenes = getEpisodeScenes(episode);
    
    scenes.forEach(scene => {
      scene.stage?.forEach(el => {
        if (el.type === 'ITEM') {
          itemIds.add(el.assetId);
        }
      });
    });
    
    return game.items.filter(i => itemIds.has(i.id));
  }, [game.items, getEpisodeScenes]);

  // Get SFX used in episode scenes
  const getEpisodeSfx = useCallback((episode: Episode): Sfx[] => {
    const sfxIds = new Set<string>();
    const scenes = getEpisodeScenes(episode);
    
    scenes.forEach(scene => {
      scene.stage?.forEach(el => {
        el.activeSfx?.forEach(id => sfxIds.add(id));
      });
    });
    
    return game.sfx.filter(s => sfxIds.has(s.id));
  }, [game.sfx, getEpisodeScenes]);

  // Helper to find things used in a scene
  const getSceneAssets = (scene: Scene) => {
    const assets: { type: 'actor' | 'item' | 'drop' | 'sfx'; id: string; name: string }[] = [];
    
    // Drop
    if (scene.dropId) {
      const drop = game.drops.find(d => d.id === scene.dropId);
      if (drop) assets.push({ type: 'drop', id: drop.id, name: drop.name });
    }
    
    // Stage elements
    scene.stage?.forEach(el => {
      if (el.type === 'ACTOR') {
        const actor = game.actors.find(a => a.id === el.assetId);
        if (actor && !assets.find(a => a.type === 'actor' && a.id === actor.id)) {
          assets.push({ type: 'actor', id: actor.id, name: actor.name });
        }
      } else if (el.type === 'ITEM') {
        const item = game.items.find(i => i.id === el.assetId);
        if (item && !assets.find(a => a.type === 'item' && a.id === item.id)) {
          assets.push({ type: 'item', id: item.id, name: item.name });
        }
      }
      // SFX on stage elements
      el.activeSfx?.forEach(sfxId => {
        const sfx = game.sfx.find(s => s.id === sfxId);
        if (sfx && !assets.find(a => a.type === 'sfx' && a.id === sfx.id)) {
          assets.push({ type: 'sfx', id: sfx.id, name: sfx.name });
        }
      });
    });
    
    return assets;
  };

  const currentEpisodeId = game.info.currentEpisodeId;

  return (
    <div className="h-full flex flex-col bg-diesel-dark border border-diesel-border rounded">
      {/* Header with search */}
      <div className="sticky top-0 bg-diesel-dark border-b border-diesel-border px-3 py-2 z-10 space-y-2">
        <h3 className="text-xs font-bold text-diesel-gold uppercase tracking-widest">Asset Tree</h3>
        
        {/* Search input */}
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-diesel-steel" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter assets..."
            className="w-full bg-diesel-panel border border-diesel-border rounded pl-7 pr-7 py-1 text-xs text-diesel-paper placeholder:text-diesel-steel/50 focus:outline-none focus:border-diesel-gold/50"
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
        
        {/* Match count */}
        {searchQuery.trim() && (
          <div className="text-[10px] text-diesel-steel">
            {totalMatches > 0 ? (
              <span className="text-diesel-gold">{totalMatches} match{totalMatches !== 1 ? 'es' : ''}</span>
            ) : (
              <span className="text-diesel-rust">No matches</span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {/* Game Root */}
        <TreeNode
          label={game.info.title}
          icon={<Settings size={12} />}
          defaultOpen
          onDoubleClick={() => onNavigate('settings', null)}
          color="text-diesel-gold"
        >
          {/* Episodes as top-level organizational units */}
          {(game?.episodes ?? []).map(episode => {
            const episodeScenes = getEpisodeScenes(episode);
            const episodeActors = getEpisodeActors(episode);
            const episodeDrops = getEpisodeDrops(episode);
            const episodeItems = getEpisodeItems(episode);
            const episodeSfx = getEpisodeSfx(episode);
            const isCurrentEpisode = episode.id === currentEpisodeId;
            
            return (
              <TreeNode
                key={episode.id}
                label={episode.name}
                icon={<Layers size={12} />}
                depth={1}
                defaultOpen={isCurrentEpisode || searchMatches.episodes.includes(episode.id)}
                onDoubleClick={() => onNavigate('episode', episode.id)}
                highlight={searchMatches.episodes.includes(episode.id)}
                status={episode.status || 'new'}
                isCurrent={isCurrentEpisode}
                useStatusColor
              >
                {/* Scenes in this episode */}
                <TreeNode
                  label="Scenes"
                  icon={<Video size={12} />}
                  count={episodeScenes.length}
                  depth={2}
                  defaultOpen={episodeScenes.length <= 5 || searchMatches.scenes.some(id => episode.sceneIds.includes(id))}
                  color={getCategoryColor(getCategoryStatus(episodeScenes))}
                  highlight={searchMatches.scenes.some(id => episode.sceneIds.includes(id))}
                  onDoubleClick={() => onNavigate('scene', null)}
                >
                  {episodeScenes.map(scene => (
                    <TreeNode
                      key={scene.id}
                      label={scene.name}
                      icon={<Video size={10} />}
                      depth={3}
                      onDoubleClick={() => onNavigate('scene', scene.id)}
                      highlight={searchMatches.scenes.includes(scene.id)}
                      status={scene.status || 'new'}
                      onStatusChange={onUpdateStatus ? (s) => onUpdateStatus('scene', scene.id, s) : undefined}
                      useStatusColor
                    >
                      {/* Scene contents */}
                      {getSceneAssets(scene).map(asset => (
                        <LeafNode
                          key={`${asset.type}-${asset.id}`}
                          label={asset.name}
                          icon={
                            asset.type === 'actor' ? <User size={8} /> :
                            asset.type === 'item' ? <Package size={8} /> :
                            asset.type === 'drop' ? <Monitor size={8} /> :
                            <Music size={8} />
                          }
                          depth={4}
                          color={
                            asset.type === 'actor' ? 'text-diesel-gold' :
                            asset.type === 'item' ? 'text-diesel-gold' :
                            asset.type === 'drop' ? 'text-diesel-paper' :
                            'text-diesel-green'
                          }
                        />
                      ))}
                      {/* Buttons used in this scene */}
                      {getSceneButtons(scene).map(button => (
                        <LeafNode
                          key={`button-${button.id}`}
                          label={button.name}
                          icon={<MousePointer2 size={8} />}
                          depth={4}
                          color="text-diesel-cyan"
                        />
                      ))}
                      {/* Audio tracks */}
                      {scene.audioTracks?.map(track => (
                        <LeafNode
                          key={track.id}
                          label={`${track.type}: ${track.name}`}
                          icon={<Mic size={8} />}
                          depth={4}
                          color="text-diesel-steel"
                        />
                      ))}
                    </TreeNode>
                  ))}
                </TreeNode>

                {/* Actors used in this episode */}
                {episodeActors.length > 0 && (
                  <TreeNode
                    label="Actors"
                    icon={<User size={12} />}
                    count={episodeActors.length}
                    depth={2}
                    defaultOpen={false}
                    color={getCategoryColor(getCategoryStatus(episodeActors))}
                    highlight={searchMatches.actors.some(id => episodeActors.some(a => a.id === id))}
                    onDoubleClick={() => onNavigate('actor', null)}
                  >
                    {episodeActors.map(actor => (
                      <TreeNode
                        key={actor.id}
                        label={actor.name}
                        icon={<User size={10} />}
                        depth={3}
                        onDoubleClick={() => onNavigate('actor', actor.id)}
                        highlight={searchMatches.actors.includes(actor.id)}
                        status={actor.status || 'new'}
                        onStatusChange={onUpdateStatus ? (s) => onUpdateStatus('actor', actor.id, s) : undefined}
                        useStatusColor
                      >
                        {/* Actor graphics */}
                        {actor.graphics.map((graphic, i) => (
                          <LeafNode
                            key={graphic.id}
                            label={`${graphic.pose} / ${graphic.expression} (${graphic.angle}°)`}
                            icon={<Palette size={8} />}
                            depth={4}
                          />
                        ))}
                        {/* Voice */}
                        {actor.voiceId && (
                          <LeafNode label="Voice assigned" icon={<Mic size={8} />} depth={4} />
                        )}
                      </TreeNode>
                    ))}
                  </TreeNode>
                )}

                {/* Drops used in this episode */}
                {episodeDrops.length > 0 && (
                  <TreeNode
                    label="Drops"
                    icon={<Monitor size={12} />}
                    count={episodeDrops.length}
                    depth={2}
                    defaultOpen={false}
                    color={getCategoryColor(getCategoryStatus(episodeDrops))}
                    highlight={searchMatches.drops.some(id => episodeDrops.some(d => d.id === id))}
                    onDoubleClick={() => onNavigate('drop', null)}
                  >
                    {episodeDrops.map(drop => (
                      <TreeNode
                        key={drop.id}
                        label={drop.name}
                        icon={<Monitor size={10} />}
                        depth={3}
                        onDoubleClick={() => onNavigate('drop', drop.id)}
                        highlight={searchMatches.drops.includes(drop.id)}
                        status={drop.status || 'new'}
                        onStatusChange={onUpdateStatus ? (s) => onUpdateStatus('drop', drop.id, s) : undefined}
                        useStatusColor
                      />
                    ))}
                  </TreeNode>
                )}

                {/* Items used in this episode */}
                {episodeItems.length > 0 && (
                  <TreeNode
                    label="Items"
                    icon={<Package size={12} />}
                    count={episodeItems.length}
                    depth={2}
                    defaultOpen={false}
                    color={getCategoryColor(getCategoryStatus(episodeItems))}
                    highlight={searchMatches.items.some(id => episodeItems.some(i => i.id === id))}
                    onDoubleClick={() => onNavigate('item', null)}
                  >
                    {episodeItems.map(item => (
                      <TreeNode
                        key={item.id}
                        label={item.name}
                        icon={<Package size={10} />}
                        depth={3}
                        onDoubleClick={() => onNavigate('item', item.id)}
                        highlight={searchMatches.items.includes(item.id)}
                        status={item.status || 'new'}
                        onStatusChange={onUpdateStatus ? (s) => onUpdateStatus('item', item.id, s) : undefined}
                        useStatusColor
                      />
                    ))}
                  </TreeNode>
                )}

                {/* SFX used in this episode */}
                {episodeSfx.length > 0 && (
                  <TreeNode
                    label="SFX"
                    icon={<Music size={12} />}
                    count={episodeSfx.length}
                    depth={2}
                    defaultOpen={false}
                    color={getCategoryColor(getCategoryStatus(episodeSfx))}
                    highlight={searchMatches.sfx.some(id => episodeSfx.some(s => s.id === id))}
                    onDoubleClick={() => onNavigate('sfx', null)}
                  >
                    {episodeSfx.map(sfx => (
                      <TreeNode
                        key={sfx.id}
                        label={sfx.name}
                        icon={<Music size={10} />}
                        depth={3}
                        onDoubleClick={() => onNavigate('sfx', sfx.id)}
                        highlight={searchMatches.sfx.includes(sfx.id)}
                        status={sfx.status || 'new'}
                        onStatusChange={onUpdateStatus ? (s) => onUpdateStatus('sfx', sfx.id, s) : undefined}
                        useStatusColor
                      />
                    ))}
                  </TreeNode>
                )}
              </TreeNode>
            );
          })}

          {/* Global Assets Section - Assets not tied to any episode */}
          <TreeNode
            label="All Assets"
            icon={<Package size={12} />}
            depth={1}
            defaultOpen
            color="text-diesel-steel"
          >
            {/* All Scenes */}
            <TreeNode
              label="Scenes"
              icon={<Video size={12} />}
              count={game?.scenes?.length ?? 0}
              depth={2}
              defaultOpen
              color={getCategoryColor(getCategoryStatus(game?.scenes ?? []))}
              highlight={searchMatches.scenes.length > 0}
              onDoubleClick={() => onNavigate('scene', null)}
            >
              {(game?.scenes ?? []).map(scene => (
                <LeafNode
                  key={scene.id}
                  label={scene.name}
                  icon={<Video size={8} />}
                  depth={3}
                  color="text-diesel-paper"
                />
              ))}
            </TreeNode>

            {/* All Actors */}
            <TreeNode
              label="Actors"
              icon={<User size={12} />}
              count={game?.actors?.length ?? 0}
              depth={2}
              defaultOpen
              color={getCategoryColor(getCategoryStatus(game?.actors ?? []))}
              highlight={searchMatches.actors.length > 0}
              onDoubleClick={() => onNavigate('actor', null)}
            >
              {(game?.actors ?? []).map(actor => (
                <LeafNode
                  key={actor.id}
                  label={actor.name}
                  icon={<User size={8} />}
                  depth={3}
                  color="text-diesel-gold"
                />
              ))}
            </TreeNode>

            {/* All Drops */}
            <TreeNode
              label="Drops"
              icon={<Monitor size={12} />}
              count={game?.drops?.length ?? 0}
              depth={2}
              defaultOpen
              color={getCategoryColor(getCategoryStatus(game?.drops ?? []))}
              highlight={searchMatches.drops.length > 0}
              onDoubleClick={() => onNavigate('drop', null)}
            >
              {(game?.drops ?? []).map(drop => (
                <LeafNode
                  key={drop.id}
                  label={drop.name}
                  icon={<Monitor size={8} />}
                  depth={3}
                  color="text-diesel-paper"
                />
              ))}
            </TreeNode>

            {/* All Items */}
            <TreeNode
              label="Items"
              icon={<Package size={12} />}
              count={game?.items?.length ?? 0}
              depth={2}
              defaultOpen
              color={getCategoryColor(getCategoryStatus(game?.items ?? []))}
              highlight={searchMatches.items.length > 0}
              onDoubleClick={() => onNavigate('item', null)}
            >
              {(game?.items ?? []).map(item => (
                <LeafNode
                  key={item.id}
                  label={item.name}
                  icon={<Package size={8} />}
                  depth={3}
                  color="text-diesel-gold"
                />
              ))}
            </TreeNode>

            {/* All SFX */}
            <TreeNode
              label="SFX"
              icon={<Music size={12} />}
              count={game?.sfx?.length ?? 0}
              depth={2}
              defaultOpen
              color={getCategoryColor(getCategoryStatus(game?.sfx ?? []))}
              highlight={searchMatches.sfx.length > 0}
              onDoubleClick={() => onNavigate('sfx', null)}
            >
              {(game?.sfx ?? []).map(sfx => (
                <LeafNode
                  key={sfx.id}
                  label={sfx.name}
                  icon={<Music size={8} />}
                  depth={3}
                  color="text-diesel-green"
                />
              ))}
            </TreeNode>

            {/* All Buttons */}
            <TreeNode
              label="Buttons"
              icon={<MousePointer2 size={12} />}
              count={game?.buttons?.length ?? 0}
              depth={2}
              defaultOpen
              color="text-diesel-cyan"
              onDoubleClick={() => onNavigate('button', null)}
            >
              {(game?.buttons ?? []).map(button => (
                <LeafNode
                  key={button.id}
                  label={button.name}
                  icon={<MousePointer2 size={8} />}
                  depth={3}
                  color="text-diesel-cyan"
                />
              ))}
            </TreeNode>

            {/* All Pages */}
            <TreeNode
              label="Pages"
              icon={<FileCode size={12} />}
              count={game?.pages?.length ?? 0}
              depth={2}
              defaultOpen
              color="text-diesel-purple"
              highlight={searchMatches.pages.length > 0}
              onDoubleClick={() => onNavigate('page', null)}
            >
              {(game?.pages ?? []).map(page => (
                <LeafNode
                  key={page.id}
                  label={page.name}
                  icon={<FileCode size={8} />}
                  depth={3}
                  color="text-diesel-purple"
                />
              ))}
            </TreeNode>
          </TreeNode>
        </TreeNode>
      </div>
    </div>
  );
};
