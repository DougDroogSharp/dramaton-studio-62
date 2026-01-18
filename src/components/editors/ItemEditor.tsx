import { useState } from 'react';
import { GameData, Item, ItemEffect, UnlockCondition, SelectionState, ItemCategory, AcquisitionType, Operator, AssetStatus } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { ITEM_CATEGORIES, ACQUISITION_TYPES, OPERATORS } from '@/constants';
import { Plus, Trash2, Package, ChevronRight, Upload, Lock, Sparkles, Loader2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { loadLibraryFromDB, saveLibraryToDB, addItemToLibrary } from '@/utils/library';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { NotesSection } from '@/components/NotesSection';

interface ItemEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
  styleGuide?: string | null;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
  const [styleLock, setStyleLock] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');
  
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
      status: 'new',
      note: '',
    };
    onChange({ ...game, items: [...game.items, newItem] });
    onSelect('item', newItem.id);
  };

  // Update item with auto-promotion to 'work' when content changes
  const updateItem = (id: string, updates: Partial<Item>) => {
    const currentItem = game.items.find(i => i.id === id);
    if (!currentItem) return;
    
    const updatedItem = { ...currentItem, ...updates };
    
    // Auto-promote to 'work' if currently 'new' and content is being edited
    let newStatus = updatedItem.status || 'new';
    if (!('status' in updates) && newStatus === 'new') {
      const hasContent = 
        updatedItem.name !== 'New Item' ||
        updatedItem.visualAsset ||
        (updatedItem.description && updatedItem.description.trim().length > 0);
      if (hasContent) {
        newStatus = 'work';
      }
    }
    
    onChange({
      ...game,
      items: game.items.map(i => i.id === id ? { ...updatedItem, status: newStatus } : i),
    });
  };

  // Manual status change - allows setting any status directly
  const setItemStatus = (id: string, status: AssetStatus) => {
    onChange({
      ...game,
      items: game.items.map(i => i.id === id ? { ...i, status } : i),
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

  // Chroma-key background removal function
  const removeBackgroundGlobal = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Sample corner pixels to detect background color
        const corners = [
          { x: 0, y: 0 },
          { x: canvas.width - 1, y: 0 },
          { x: 0, y: canvas.height - 1 },
          { x: canvas.width - 1, y: canvas.height - 1 }
        ];
        
        let bgR = 0, bgG = 0, bgB = 0, count = 0;
        for (const corner of corners) {
          const idx = (corner.y * canvas.width + corner.x) * 4;
          if (data[idx + 1] > data[idx] && data[idx + 1] > data[idx + 2]) {
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
            count++;
          }
        }
        
        if (count > 0) {
          bgR = Math.round(bgR / count);
          bgG = Math.round(bgG / count);
          bgB = Math.round(bgB / count);
        } else {
          bgR = 0; bgG = 255; bgB = 0;
        }
        
        const tolerance = 80;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const diffR = Math.abs(r - bgR);
          const diffG = Math.abs(g - bgG);
          const diffB = Math.abs(b - bgB);
          
          if (diffR < tolerance && diffG < tolerance && diffB < tolerance) {
            if (g > r * 0.8 && g > b * 0.8) {
              data[i + 3] = 0;
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image for background removal'));
      img.src = imageDataUrl;
    });
  };

  const generateItemImage = async (itemId: string) => {
    const item = game.items.find(i => i.id === itemId);
    if (!item) return;

    const prompt = generationPrompt.trim() || `${item.name} - ${item.category} item`;
    
    setIsGenerating(true);
    toast.info('Generating item image...');

    try {
      let fullPrompt = `Game item icon: ${prompt}. 
      
FRAMING: Centered object, square aspect ratio, suitable for inventory UI.

CRITICAL BACKGROUND INSTRUCTION: The item MUST be rendered on a SOLID BRIGHT GREEN BACKGROUND (#00FF00). This is essential for chroma-key compositing. No gradients, no shadows on background, pure solid green (#00FF00) everywhere except the item.

NEGATIVE: No text, no watermarks, no hands holding the item, no complex backgrounds.`;

      if (styleLock) {
        fullPrompt += '\n\nMANDATORY ART STYLE: Bold black outline, simple flat fill colors, NO shading or gradients, only a few light interior lines for details.';
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            styleGuide: styleGuide || undefined,
            enforceStyleGuide: styleLock,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      if (data.imageUrl) {
        toast.info('Removing background...');
        const transparentImage = await removeBackgroundGlobal(data.imageUrl);
        updateItem(itemId, { visualAsset: transparentImage });
        toast.success('Item image generated!');
      } else {
        throw new Error('No image returned from generation');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
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
          {game.items.map(item => {
            const statusBorderColor = item.status === 'done' 
              ? 'border-diesel-green/50 hover:border-diesel-green' 
              : item.status === 'work' 
                ? 'border-diesel-rust/50 hover:border-diesel-rust' 
                : 'border-diesel-border hover:border-diesel-gold';
            
            return (
              <button
                key={item.id}
                onClick={() => onSelect('item', item.id)}
                className={`w-full flex items-center gap-3 p-3 bg-diesel-black border ${statusBorderColor} transition-colors text-left`}
              >
                <div className="w-10 h-10 bg-diesel-panel border border-diesel-border flex items-center justify-center">
                  {item.visualAsset ? (
                    <img src={item.visualAsset} alt={item.name} className="w-full h-full object-contain" />
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
                <StatusBadge status={item.status || 'new'} size="sm" />
                <ChevronRight size={16} className="text-diesel-steel" />
              </button>
            );
          })}
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
      <div className="flex justify-between items-center">
        <button
          onClick={() => onSelect('item', null)}
          className="text-sm text-diesel-steel hover:text-diesel-gold flex items-center gap-1"
        >
          ← Back to Items
        </button>
        <button
          onClick={createItem}
          className="flex items-center gap-2 px-3 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
        >
          <Plus size={12} />
          Add Item
        </button>
      </div>
      
      {/* Basic Info */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-diesel-border pb-2">
          <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest">
            Item Info
          </h3>
          <StatusSelector 
            status={selectedItem.status || 'new'} 
            onChange={(status) => setItemStatus(selectedItem.id, status)} 
          />
        </div>
        <CyberInput
          label="Name"
          value={selectedItem.name}
          onChange={(e) => updateItem(selectedItem.id, { name: e.target.value })}
        />
        <div className="mt-3 mb-3">
          <NotesSection 
            note={selectedItem.note || ''} 
            onChange={(note) => updateItem(selectedItem.id, { note })} 
          />
        </div>
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
        
        {/* Style Lock Toggle */}
        <button
          onClick={() => setStyleLock(!styleLock)}
          className={`flex items-center gap-2 w-full mb-4 py-2 px-3 border text-sm font-bold uppercase transition-colors ${
            styleLock 
              ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold' 
              : 'bg-diesel-panel border-diesel-border text-diesel-steel hover:border-diesel-paper'
          }`}
        >
          <Lock size={14} />
          <span className="flex-1 text-left">Adhere to Style Guide</span>
          <span className={`text-xs ${styleLock ? 'text-diesel-gold' : 'text-diesel-steel'}`}>
            {styleLock ? 'ON' : 'OFF'}
          </span>
        </button>
        {styleLock && (
          <p className="text-xs text-diesel-gold/70 mb-4 -mt-2">
            Bold black outline, simple fill colors, no shading, light interior detail lines
          </p>
        )}
        
        {selectedItem.visualAsset ? (
          <div className="relative group mb-4">
            <img 
              src={selectedItem.visualAsset} 
              alt={selectedItem.name} 
              className="w-32 h-32 object-contain bg-diesel-panel border border-diesel-border"
              style={{ imageRendering: 'auto' }}
            />
            <button
              onClick={() => updateItem(selectedItem.id, { visualAsset: undefined })}
              className="absolute top-1 right-1 p-1 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 w-32 h-32 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors mb-4">
            <Upload size={20} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(selectedItem.id, e)}
              className="hidden"
            />
          </label>
        )}
        
        {/* AI Generation */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder={`Generation prompt (default: "${selectedItem.name} - ${selectedItem.category} item")`}
            value={generationPrompt}
            onChange={(e) => setGenerationPrompt(e.target.value)}
            className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button
            onClick={() => generateItemImage(selectedItem.id)}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 w-full py-2 bg-diesel-green/20 border border-diesel-green text-diesel-green text-sm font-bold uppercase hover:bg-diesel-green/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {isGenerating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
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

      {/* Actions */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={async () => {
            const library = await loadLibraryFromDB();
            const updated = addItemToLibrary(library, selectedItem, game.info.title);
            await saveLibraryToDB(updated);
            toast.success(`"${selectedItem.name}" saved to library!`);
          }}
          className="flex-1 py-2 border border-diesel-gold text-diesel-gold text-sm font-bold uppercase hover:bg-diesel-gold/20 transition-colors flex items-center justify-center gap-2"
        >
          <Archive size={14} />
          Save to Library
        </button>
        <button
          onClick={() => deleteItem(selectedItem.id)}
          className="flex-1 py-2 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
        >
          Delete Item
        </button>
      </div>
    </div>
  );
};
