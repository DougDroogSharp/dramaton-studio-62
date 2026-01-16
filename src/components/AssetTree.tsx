import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Settings, User, Video, Monitor, Package, Music, Image, Wand2, FileText, Mic, Palette, Layers } from 'lucide-react';
import { GameData, SelectionState, Actor, Scene, Drop, Item, Sfx, ActorGraphic } from '@/types';

interface AssetTreeProps {
  game: GameData;
  onNavigate: (type: SelectionState['type'], id: string | null, subId?: string) => void;
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
}

const TreeNode = ({ label, icon, children, defaultOpen = false, onDoubleClick, depth = 0, count, color = 'text-diesel-paper' }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasChildren = Boolean(children);
  
  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  }, [hasChildren, isOpen]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.();
  }, [onDoubleClick]);

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`flex items-center gap-1 py-1 px-1 hover:bg-diesel-border/30 cursor-pointer transition-colors rounded ${color}`}
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
        <span className="text-xs font-medium truncate flex-1">{label}</span>
        {count !== undefined && <span className="text-[10px] text-diesel-steel opacity-60">({count})</span>}
      </div>
      {isOpen && hasChildren && (
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

export const AssetTree = ({ game, onNavigate }: AssetTreeProps) => {
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

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-diesel-dark border border-diesel-border rounded">
      {/* Header */}
      <div className="sticky top-0 bg-diesel-dark border-b border-diesel-border px-3 py-2 z-10">
        <h3 className="text-xs font-bold text-diesel-gold uppercase tracking-widest">Asset Tree</h3>
      </div>
      
      <div className="p-2">
        {/* Game Root */}
        <TreeNode
          label={game.info.title}
          icon={<Settings size={12} />}
          defaultOpen
          onDoubleClick={() => onNavigate('settings', null)}
          color="text-diesel-gold"
        >
          {/* Scenes */}
          <TreeNode
            label="Scenes"
            icon={<Video size={12} />}
            count={game.scenes.length}
            depth={1}
            defaultOpen={game.scenes.length <= 5}
            color="text-diesel-rust"
          >
            {game.scenes.map(scene => (
              <TreeNode
                key={scene.id}
                label={scene.name}
                icon={<Video size={10} />}
                depth={2}
                onDoubleClick={() => onNavigate('scene', scene.id)}
                color="text-diesel-rust"
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
                    depth={3}
                    color={
                      asset.type === 'actor' ? 'text-diesel-gold' :
                      asset.type === 'item' ? 'text-diesel-gold' :
                      asset.type === 'drop' ? 'text-diesel-paper' :
                      'text-diesel-green'
                    }
                  />
                ))}
                {/* Audio tracks */}
                {scene.audioTracks?.map(track => (
                  <LeafNode
                    key={track.id}
                    label={`${track.type}: ${track.name}`}
                    icon={<Mic size={8} />}
                    depth={3}
                    color="text-diesel-steel"
                  />
                ))}
              </TreeNode>
            ))}
          </TreeNode>

          {/* Actors */}
          <TreeNode
            label="Actors"
            icon={<User size={12} />}
            count={game.actors.length}
            depth={1}
            defaultOpen={game.actors.length <= 5}
            color="text-diesel-gold"
          >
            {game.actors.map(actor => (
              <TreeNode
                key={actor.id}
                label={actor.name}
                icon={<User size={10} />}
                depth={2}
                onDoubleClick={() => onNavigate('actor', actor.id)}
                color="text-diesel-gold"
              >
                {/* Actor graphics */}
                {actor.graphics.map((graphic, i) => (
                  <LeafNode
                    key={graphic.id}
                    label={`${graphic.pose} / ${graphic.expression} (${graphic.angle}°)`}
                    icon={<Palette size={8} />}
                    depth={3}
                  />
                ))}
                {/* Voice */}
                {actor.voiceId && (
                  <LeafNode label="Voice assigned" icon={<Mic size={8} />} depth={3} />
                )}
                {/* Reference images */}
                {actor.referenceImageCloseUp && (
                  <LeafNode label="Close-up reference" icon={<Image size={8} />} depth={3} />
                )}
                {actor.referenceImageFullBody && (
                  <LeafNode label="Full-body reference" icon={<Image size={8} />} depth={3} />
                )}
              </TreeNode>
            ))}
          </TreeNode>

          {/* Drops */}
          <TreeNode
            label="Drops"
            icon={<Monitor size={12} />}
            count={game.drops.length}
            depth={1}
            defaultOpen={game.drops.length <= 5}
            color="text-diesel-paper"
          >
            {game.drops.map(drop => (
              <TreeNode
                key={drop.id}
                label={drop.name}
                icon={<Monitor size={10} />}
                depth={2}
                onDoubleClick={() => onNavigate('drop', drop.id)}
                color="text-diesel-paper"
              >
                {drop.image && (
                  <LeafNode label="Generated image" icon={<Image size={8} />} depth={3} />
                )}
                {drop.referenceImage && (
                  <LeafNode label="Reference image" icon={<Image size={8} />} depth={3} />
                )}
                {drop.prompt && (
                  <LeafNode label={`Prompt: ${drop.prompt.slice(0, 30)}...`} icon={<FileText size={8} />} depth={3} />
                )}
              </TreeNode>
            ))}
          </TreeNode>

          {/* Items */}
          <TreeNode
            label="Items"
            icon={<Package size={12} />}
            count={game.items.length}
            depth={1}
            defaultOpen={game.items.length <= 5}
            color="text-diesel-gold"
          >
            {game.items.map(item => (
              <TreeNode
                key={item.id}
                label={item.name}
                icon={<Package size={10} />}
                depth={2}
                onDoubleClick={() => onNavigate('item', item.id)}
                color="text-diesel-gold"
              >
                <LeafNode label={`Category: ${item.category}`} icon={<Layers size={8} />} depth={3} />
                {item.visualAsset && (
                  <LeafNode label="Visual asset" icon={<Image size={8} />} depth={3} />
                )}
                {item.effects.length > 0 && (
                  <LeafNode label={`${item.effects.length} effect(s)`} icon={<Wand2 size={8} />} depth={3} />
                )}
              </TreeNode>
            ))}
          </TreeNode>

          {/* SFX */}
          <TreeNode
            label="SFX"
            icon={<Music size={12} />}
            count={game.sfx.length}
            depth={1}
            defaultOpen={game.sfx.length <= 5}
            color="text-diesel-green"
          >
            {game.sfx.map(sfx => (
              <TreeNode
                key={sfx.id}
                label={sfx.name}
                icon={<Music size={10} />}
                depth={2}
                onDoubleClick={() => onNavigate('sfx', sfx.id)}
                color="text-diesel-green"
              >
                <LeafNode label={`Type: ${sfx.type}`} icon={<Wand2 size={8} />} depth={3} />
                <LeafNode label={`Category: ${sfx.category}`} icon={<Layers size={8} />} depth={3} />
                {sfx.params.audioUrl && (
                  <LeafNode label="Audio generated" icon={<Mic size={8} />} depth={3} />
                )}
              </TreeNode>
            ))}
          </TreeNode>
        </TreeNode>
      </div>
    </div>
  );
};
