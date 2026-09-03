import React from 'react';
import { GameData, Item } from '@/types';
import { Package, Lock, Unlock, Gift, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

interface CollectionEditorProps {
  game: GameData;
  onChange: (game: GameData) => void;
  onNavigateToItem?: (itemId: string) => void;
}

export const CollectionEditor: React.FC<CollectionEditorProps> = ({ 
  game, 
  onChange,
  onNavigateToItem 
}) => {
  // Get all collectible items
  const collectibleItems = game.items.filter(item => item.isCollectible);
  
  // Categorize by acquisition type
  const pickupItems = collectibleItems.filter(i => i.acquisition === 'pickup');
  const earnedItems = collectibleItems.filter(i => i.acquisition === 'earned');
  const purchasedItems = collectibleItems.filter(i => i.acquisition === 'purchased');

  // Format effect display
  const formatEffect = (effect: { variable: string; value: string | number | boolean }) => {
    const value = effect.value;
    if (typeof value === 'number') {
      return `${effect.variable} ${value >= 0 ? '+' : ''}${value}`;
    }
    return `${effect.variable} = ${value}`;
  };

  const renderItemCard = (item: Item) => (
    <div 
      key={item.id}
      onClick={() => onNavigateToItem?.(item.id)}
      className="flex items-start gap-3 p-3 bg-diesel-black border border-diesel-border hover:border-diesel-gold transition-colors cursor-pointer"
    >
      {/* Icon/Image */}
      <div className="w-12 h-12 bg-diesel-panel border border-diesel-border flex items-center justify-center shrink-0">
        {item.visualAsset ? (
          <img src={item.visualAsset} alt={item.name} className="w-full h-full object-contain" />
        ) : (
          <Package size={20} className="text-diesel-steel" />
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-diesel-paper font-bold truncate">{item.name}</span>
          {item.collectibleLabel && (
            <span className="text-[9px] px-1.5 py-0.5 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold uppercase font-bold">
              {item.collectibleLabel}
            </span>
          )}
        </div>
        
        {/* Effects */}
        {item.effects.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {item.effects.map((effect, idx) => (
              <span 
                key={idx} 
                className="text-[10px] px-1.5 py-0.5 bg-diesel-green/20 text-diesel-green border border-diesel-green/30"
              >
                {formatEffect(effect)}
              </span>
            ))}
          </div>
        )}
        
        {/* Unlock condition for earned items */}
        {item.acquisition === 'earned' && item.unlockCondition && (
          <div className="flex items-center gap-1 text-[10px] text-diesel-rust">
            <Lock size={10} />
            <span>
              {item.unlockCondition.variable} {item.unlockCondition.operator} {item.unlockCondition.threshold}
            </span>
          </div>
        )}
        
        {/* Page link indicator */}
        {item.pageId && (
          <div className="text-[10px] text-diesel-cyan mt-1">
            Opens page on collect
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <StatusBadge status={item.status || 'new'} size="sm" />
        <ChevronRight size={14} className="text-diesel-steel" />
      </div>
    </div>
  );

  const renderSection = (
    title: string, 
    icon: React.ReactNode, 
    items: Item[], 
    emptyMessage: string
  ) => (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3 border-b border-diesel-border pb-2">
        {icon}
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest">
          {title}
        </h3>
        <span className="text-xs text-diesel-steel">({items.length})</span>
      </div>
      
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map(renderItemCard)}
        </div>
      ) : (
        <p className="text-diesel-steel text-sm italic py-4 text-center">
          {emptyMessage}
        </p>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-diesel-black border border-diesel-border p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-diesel-gold">{collectibleItems.length}</div>
            <div className="text-xs text-diesel-steel uppercase">Total Collectibles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-diesel-green">{pickupItems.length}</div>
            <div className="text-xs text-diesel-steel uppercase">Pickup Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-diesel-rust">{earnedItems.length}</div>
            <div className="text-xs text-diesel-steel uppercase">Earned Items</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-diesel-panel/50 border border-diesel-border p-3 text-sm text-diesel-steel">
        <p className="mb-2">
          <strong className="text-diesel-gold">Collectibles</strong> are items players can pick up during gameplay. 
          Mark items as collectible in the <strong className="text-diesel-paper">Item Editor</strong>.
        </p>
        <p>
          When collected, item effects are applied to world state variables.
        </p>
      </div>

      {/* Pickup Items */}
      {renderSection(
        'Pickup Items',
        <Gift size={16} className="text-diesel-green" />,
        pickupItems,
        'No pickup items. Create items and mark them as collectible.'
      )}

      {/* Earned Items */}
      {renderSection(
        'Earned Items',
        <Lock size={16} className="text-diesel-rust" />,
        earnedItems,
        'No earned items. These unlock when conditions are met.'
      )}

      {/* Purchased Items */}
      {purchasedItems.length > 0 && renderSection(
        'Purchased Items',
        <Package size={16} className="text-diesel-cyan" />,
        purchasedItems,
        'No purchased items.'
      )}

      {/* Empty state */}
      {collectibleItems.length === 0 && (
        <div className="text-center py-12 text-diesel-steel">
          <Package size={48} className="mx-auto mb-4 opacity-30" />
          <p className="mb-2">No collectible items yet.</p>
          <p className="text-sm">
            Go to the <span className="text-diesel-gold">Item Editor</span> and check 
            <span className="text-diesel-paper"> "Collectible Item"</span> on any item.
          </p>
        </div>
      )}
    </div>
  );
};
