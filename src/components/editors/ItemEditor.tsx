import { useState } from 'react';
import { GameData, Item, ItemEffect, UnlockCondition, SelectionState, ItemCategory, AcquisitionType, Operator } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { ITEM_CATEGORIES, ACQUISITION_TYPES, OPERATORS } from '@/constants';
import { Plus, Trash2, Package, ChevronRight, Upload } from 'lucide-react';

interface ItemEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({ game, selection, onChange, onSelect }) => {
  const selectedItem = selection.id 
    ? game.items.find(i => i.id === selection.id) 
    : null;

  const createItem = () => {
    const newItem: Item = {
      id: `item_${Date.now()}`,
      name: 'New Item',
      category: 'misc',
      acquisition: 'pickup',
      effects: [],
    };
    onChange({ ...game, items: [...game.items, newItem] });
    onSelect('item', newItem.id);
  };

  const updateItem = (id: string, updates: Partial<Item>) => {
    onChange({
      ...game,
      items: game.items.map(i => i.id === id ? { ...i, ...updates } : i),
    });
  };

  const deleteItem = (id: string) => {
    onChange({ ...game, items: game.items.filter(i => i.id !== id) });
    onSelect('item', null);
  };

  const addEffect = (itemId: string) => {
    const item = game.items.find(i => i.id === itemId);
    if (!item) return;
    
    const newEffect: ItemEffect = {
      variable: '',
      value: '',
    };
    updateItem(itemId, { effects: [...item.effects, newEffect] });
  };

  const updateEffect = (itemId: string, idx: number, updates: Partial<ItemEffect>) => {
    const item = game.items.find(i => i.id === itemId);
    if (!item) return;
    
    const effects = [...item.effects];
    effects[idx] = { ...effects[idx], ...updates };
    updateItem(itemId, { effects });
  };

  const deleteEffect = (itemId: string, idx: number) => {
    const item = game.items.find(i => i.id === itemId);
    if (!item) return;
    
    updateItem(itemId, { effects: item.effects.filter((_, i) => i !== idx) });
  };

  const handleImageUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateItem(itemId, { visualAsset: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  // Item List View
  if (!selectedItem) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-diesel-steel">
            {game.items.length} item{game.items.length !== 1 ? 's' : ''} defined
          </p>
          <button
            onClick={createItem}
            className="flex items-center gap-2 px-3 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-sm font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
          >
            <Plus size={14} />
            New Item
          </button>
        </div>
        
        <div className="space-y-2">
          {game.items.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect('item', item.id)}
              className="w-full flex items-center gap-3 p-3 bg-diesel-black border border-diesel-border hover:border-diesel-gold transition-colors text-left"
            >
              <div className="w-10 h-10 bg-diesel-panel border border-diesel-border flex items-center justify-center">
                {item.visualAsset ? (
                  <img src={item.visualAsset} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={20} className="text-diesel-steel" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-diesel-paper font-bold">{item.name}</div>
                <div className="text-xs text-diesel-steel capitalize">
                  {item.category} • {item.acquisition}
                </div>
              </div>
              <ChevronRight size={16} className="text-diesel-steel" />
            </button>
          ))}
        </div>
        
        {game.items.length === 0 && (
          <div className="text-center py-12 text-diesel-steel">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p>No items yet. Create your first item!</p>
          </div>
        )}
      </div>
    );
  }

  // Item Detail View
  return (
    <div className="space-y-6">
      <button
        onClick={() => onSelect('item', null)}
        className="text-sm text-diesel-steel hover:text-diesel-gold flex items-center gap-1"
      >
        ← Back to Items
      </button>
      
      {/* Basic Info */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Item Info
        </h3>
        <CyberInput
          label="Name"
          value={selectedItem.name}
          onChange={(e) => updateItem(selectedItem.id, { name: e.target.value })}
        />
        <div className="flex flex-col gap-1 mb-2">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Description</label>
          <textarea
            value={selectedItem.description || ''}
            onChange={(e) => updateItem(selectedItem.id, { description: e.target.value })}
            placeholder="Item description..."
            className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 h-20 resize-none focus:outline-none focus:border-diesel-gold"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Category</label>
            <select
              value={selectedItem.category}
              onChange={(e) => updateItem(selectedItem.id, { category: e.target.value as ItemCategory })}
              className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold"
            >
              {ITEM_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Acquisition</label>
            <select
              value={selectedItem.acquisition}
              onChange={(e) => updateItem(selectedItem.id, { acquisition: e.target.value as AcquisitionType })}
              className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold"
            >
              {ACQUISITION_TYPES.map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Visual */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Visual
        </h3>
        {selectedItem.visualAsset ? (
          <div className="relative group">
            <img 
              src={selectedItem.visualAsset} 
              alt={selectedItem.name} 
              className="w-32 h-32 object-contain bg-diesel-panel border border-diesel-border"
            />
            <button
              onClick={() => updateItem(selectedItem.id, { visualAsset: undefined })}
              className="absolute top-1 right-1 p-1 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 w-32 h-32 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
            <Upload size={20} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(selectedItem.id, e)}
              className="hidden"
            />
          </label>
        )}
      </section>

      {/* Effects */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest border-b border-diesel-border pb-2 flex-1">
            Effects ({selectedItem.effects.length})
          </h3>
          <button
            onClick={() => addEffect(selectedItem.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
        
        <div className="space-y-2">
          {selectedItem.effects.map((effect, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-diesel-black p-2 border border-diesel-border">
              <input
                type="text"
                placeholder="Variable"
                value={effect.variable}
                onChange={(e) => updateEffect(selectedItem.id, idx, { variable: e.target.value })}
                className="flex-1 bg-diesel-panel border border-diesel-border text-diesel-paper p-1 text-sm"
              />
              <span className="text-diesel-gold">=</span>
              <input
                type="text"
                placeholder="Value"
                value={String(effect.value)}
                onChange={(e) => updateEffect(selectedItem.id, idx, { value: e.target.value })}
                className="w-24 bg-diesel-panel border border-diesel-border text-diesel-paper p-1 text-sm"
              />
              <button
                onClick={() => deleteEffect(selectedItem.id, idx)}
                className="text-diesel-rust hover:text-red-400 p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Unlock Condition */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Unlock Condition (Optional)
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Variable"
            value={selectedItem.unlockCondition?.variable || ''}
            onChange={(e) => updateItem(selectedItem.id, { 
              unlockCondition: { 
                variable: e.target.value, 
                operator: selectedItem.unlockCondition?.operator || '==',
                threshold: selectedItem.unlockCondition?.threshold || ''
              } 
            })}
            className="flex-1 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm"
          />
          <select
            value={selectedItem.unlockCondition?.operator || '=='}
            onChange={(e) => updateItem(selectedItem.id, { 
              unlockCondition: { 
                ...selectedItem.unlockCondition!,
                operator: e.target.value as Operator
              } 
            })}
            className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm"
          >
            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <input
            type="text"
            placeholder="Threshold"
            value={String(selectedItem.unlockCondition?.threshold || '')}
            onChange={(e) => updateItem(selectedItem.id, { 
              unlockCondition: { 
                ...selectedItem.unlockCondition!,
                threshold: e.target.value
              } 
            })}
            className="w-24 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm"
          />
        </div>
      </section>

      {/* Delete Item */}
      <button
        onClick={() => deleteItem(selectedItem.id)}
        className="w-full py-2 mt-6 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
      >
        Delete Item
      </button>
    </div>
  );
};
