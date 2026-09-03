import React from 'react';
import { GameData, Item } from '@/types';
import { Package, Lock, X, CheckCircle } from 'lucide-react';

interface CollectionPanelProps {
  game: GameData;
  collectedIds: Set<string>;
  worldState: Record<string, string | number | boolean>;
  onClose: () => void;
}

export const CollectionPanel: React.FC<CollectionPanelProps> = ({
  game,
  collectedIds,
  worldState,
  onClose,
}) => {
  // Get all collectible items
  const collectibleItems = game.items.filter(item => item.isCollectible);
  
  // Separate collected vs uncollected
  const collectedItems = collectibleItems.filter(i => collectedIds.has(i.id));
  const uncollectedItems = collectibleItems.filter(i => !collectedIds.has(i.id));

  // Check if an earned item is unlocked (conditions met but not yet collected)
  const isUnlocked = (item: Item): boolean => {
    if (!item.unlockCondition) return true;
    
    const { variable, operator, threshold } = item.unlockCondition;
    const currentValue = worldState[variable];
    
    if (currentValue === undefined) return false;
    
    switch (operator) {
      case '==': return currentValue === threshold;
      case '!=': return currentValue !== threshold;
      case '>': return Number(currentValue) > Number(threshold);
      case '<': return Number(currentValue) < Number(threshold);
      case '>=': return Number(currentValue) >= Number(threshold);
      case '<=': return Number(currentValue) <= Number(threshold);
      default: return false;
    }
  };

  // Format effect display
  const formatEffect = (effect: { variable: string; value: string | number | boolean }) => {
    const value = effect.value;
    if (typeof value === 'number') {
      return `${effect.variable} ${value >= 0 ? '+' : ''}${value}`;
    }
    return `${effect.variable} = ${value}`;
  };

  // Get key world state variables (those affected by collectibles)
  const collectibleVariables = new Set<string>();
  collectibleItems.forEach(item => {
    item.effects.forEach(effect => collectibleVariables.add(effect.variable));
    if (item.unlockCondition) {
      collectibleVariables.add(item.unlockCondition.variable);
    }
  });

  return (
    <div 
      className="fixed inset-0 bg-diesel-black/95 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-diesel-panel border-2 border-diesel-gold w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-diesel-border">
          <div className="flex items-center gap-3">
            <Package size={24} className="text-diesel-gold" />
            <h2 className="text-xl font-bold text-diesel-paper uppercase tracking-wider">
              Collection
            </h2>
            <span className="text-sm text-diesel-steel">
              {collectedItems.length} / {collectibleItems.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-diesel-steel hover:text-diesel-paper transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* World State Variables */}
          {collectibleVariables.size > 0 && (
            <div className="bg-diesel-black/50 border border-diesel-border p-3">
              <h3 className="text-xs font-bold text-diesel-gold uppercase tracking-wider mb-2">
                Progress
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(collectibleVariables).map(variable => (
                  <div 
                    key={variable}
                    className="flex items-center gap-2 px-2 py-1 bg-diesel-panel border border-diesel-border"
                  >
                    <span className="text-xs text-diesel-steel">{variable}:</span>
                    <span className="text-sm font-bold text-diesel-paper">
                      {worldState[variable] !== undefined ? String(worldState[variable]) : '0'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collected Items */}
          {collectedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-diesel-green uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle size={14} />
                Collected ({collectedItems.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {collectedItems.map(item => (
                  <div 
                    key={item.id}
                    className="bg-diesel-black border border-diesel-green/30 p-2 flex flex-col items-center text-center"
                  >
                    <div className="w-12 h-12 bg-diesel-panel border border-diesel-border flex items-center justify-center mb-1">
                      {item.visualAsset ? (
                        <img src={item.visualAsset} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <Package size={16} className="text-diesel-green" />
                      )}
                    </div>
                    <span className="text-xs text-diesel-paper font-bold truncate w-full">
                      {item.name}
                    </span>
                    {item.effects.length > 0 && (
                      <span className="text-[9px] text-diesel-green">
                        {item.effects.map(e => formatEffect(e)).join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uncollected Items */}
          {uncollectedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-diesel-steel uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lock size={14} />
                Not Yet Collected ({uncollectedItems.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {uncollectedItems.map(item => {
                  const unlocked = isUnlocked(item);
                  const isEarned = item.acquisition === 'earned';
                  
                  return (
                    <div 
                      key={item.id}
                      className={`bg-diesel-black border p-2 flex flex-col items-center text-center ${
                        unlocked 
                          ? 'border-diesel-gold/30' 
                          : 'border-diesel-border opacity-60'
                      }`}
                    >
                      <div className="w-12 h-12 bg-diesel-panel border border-diesel-border flex items-center justify-center mb-1 relative">
                        {item.visualAsset ? (
                          <img 
                            src={item.visualAsset} 
                            alt={item.name} 
                            className={`w-full h-full object-contain ${!unlocked ? 'grayscale' : ''}`} 
                          />
                        ) : (
                          <Package size={16} className="text-diesel-steel" />
                        )}
                        {isEarned && !unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-diesel-black/60">
                            <Lock size={12} className="text-diesel-rust" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-diesel-steel font-bold truncate w-full">
                        {unlocked ? item.name : '???'}
                      </span>
                      {isEarned && item.unlockCondition && !unlocked && (
                        <span className="text-[9px] text-diesel-rust">
                          {item.unlockCondition.variable} {item.unlockCondition.operator} {item.unlockCondition.threshold}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {collectibleItems.length === 0 && (
            <div className="text-center py-8 text-diesel-steel">
              <Package size={48} className="mx-auto mb-4 opacity-30" />
              <p>No collectibles in this game.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-diesel-border">
          <button
            onClick={onClose}
            className="w-full py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
