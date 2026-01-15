import { useState } from 'react';
import { GameData, Drop, SelectionState } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { Plus, Trash2, Monitor, ChevronRight, Upload, Image, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DropEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
  styleGuide?: string | null;
}

export const DropEditor: React.FC<DropEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const selectedDrop = selection.id 
    ? game.drops.find(d => d.id === selection.id) 
    : null;

  const createDrop = () => {
    const newDrop: Drop = {
      id: `drop_${Date.now()}`,
      name: 'New Background',
      prompt: '',
    };
    onChange({ ...game, drops: [...game.drops, newDrop] });
    onSelect('drop', newDrop.id);
  };

  const updateDrop = (id: string, updates: Partial<Drop>) => {
    onChange({
      ...game,
      drops: game.drops.map(d => d.id === id ? { ...d, ...updates } : d),
    });
  };

  const deleteDrop = (id: string) => {
    onChange({ ...game, drops: game.drops.filter(d => d.id !== id) });
    onSelect('drop', null);
  };

  const handleImageUpload = (dropId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateDrop(dropId, { image: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (dropId: string) => {
    const drop = game.drops.find(d => d.id === dropId);
    if (!drop?.prompt) {
      toast.error('Please enter a generation prompt first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            prompt: `Background scene for a visual novel/game: ${drop.prompt}. Wide aspect ratio, suitable as a backdrop. No characters or text.`,
            styleGuide: styleGuide || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      
      if (data?.imageUrl) {
        updateDrop(dropId, { image: data.imageUrl });
        toast.success('Background generated successfully!');
      } else {
        throw new Error(data?.message || 'No image returned');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // Drop List View
  if (!selectedDrop) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-diesel-steel">
            {game.drops.length} background{game.drops.length !== 1 ? 's' : ''} defined
          </p>
          <button
            onClick={createDrop}
            className="flex items-center gap-2 px-3 py-2 bg-diesel-paper/20 border border-diesel-paper text-diesel-paper text-sm font-bold uppercase hover:bg-diesel-paper/30 transition-colors"
          >
            <Plus size={14} />
            New Drop
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {game.drops.map(drop => (
            <button
              key={drop.id}
              onClick={() => onSelect('drop', drop.id)}
              className="flex flex-col bg-diesel-black border border-diesel-border hover:border-diesel-paper transition-colors text-left overflow-hidden"
            >
              <div className="aspect-video bg-diesel-panel flex items-center justify-center">
                {drop.image ? (
                  <img src={drop.image} alt={drop.name} className="w-full h-full object-cover" />
                ) : (
                  <Monitor size={32} className="text-diesel-steel opacity-30" />
                )}
              </div>
              <div className="p-2">
                <div className="text-diesel-paper font-bold text-sm truncate">{drop.name}</div>
              </div>
            </button>
          ))}
        </div>
        
        {game.drops.length === 0 && (
          <div className="text-center py-12 text-diesel-steel">
            <Monitor size={48} className="mx-auto mb-4 opacity-30" />
            <p>No backgrounds yet. Create your first drop!</p>
          </div>
        )}
      </div>
    );
  }

  // Drop Detail View
  return (
    <div className="space-y-6">
      <button
        onClick={() => onSelect('drop', null)}
        className="text-sm text-diesel-steel hover:text-diesel-paper flex items-center gap-1"
      >
        ← Back to Drops
      </button>
      
      {/* Basic Info */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Background Info
        </h3>
        <CyberInput
          label="Name"
          value={selectedDrop.name}
          onChange={(e) => updateDrop(selectedDrop.id, { name: e.target.value })}
        />
      </section>

      {/* Image */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Image
        </h3>
        
        {selectedDrop.image ? (
          <div className="relative group mb-4">
            <img 
              src={selectedDrop.image} 
              alt={selectedDrop.name} 
              className="w-full aspect-video object-cover border border-diesel-border"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label className="px-3 py-2 bg-diesel-panel border border-diesel-border text-diesel-paper text-sm cursor-pointer hover:border-diesel-gold">
                Replace
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(selectedDrop.id, e)}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => updateDrop(selectedDrop.id, { image: undefined })}
                className="px-3 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-sm hover:bg-diesel-rust/30"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 aspect-video border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-paper hover:text-diesel-paper cursor-pointer transition-colors mb-4">
            <Upload size={24} />
            <span>Upload Background Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(selectedDrop.id, e)}
              className="hidden"
            />
          </label>
        )}
      </section>

      {/* AI Generation */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          AI Generation
        </h3>
        <div className="flex flex-col gap-1 mb-3">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Generation Prompt</label>
          <textarea
            value={selectedDrop.prompt}
            onChange={(e) => updateDrop(selectedDrop.id, { prompt: e.target.value })}
            placeholder="Describe the background you want to generate...&#10;&#10;Example: A dark industrial factory interior with rusted machinery, steam pipes, and dim amber lighting. Dieselpunk aesthetic."
            className="w-full h-24 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm resize-none focus:outline-none focus:border-diesel-gold"
          />
        </div>
        <button
          onClick={() => handleGenerate(selectedDrop.id)}
          disabled={!selectedDrop.prompt || isGenerating}
          className="flex items-center justify-center gap-2 w-full py-2 bg-diesel-green/20 border border-diesel-green text-diesel-green text-sm font-bold uppercase hover:bg-diesel-green/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {isGenerating ? 'Generating...' : 'Generate with AI'}
        </button>
        <p className="text-xs text-diesel-steel mt-2">
          {styleGuide ? '✓ Style guide detected' : 'Tip: Add a style guide in Settings for consistent visuals'}
        </p>
      </section>

      {/* Delete Drop */}
      <button
        onClick={() => deleteDrop(selectedDrop.id)}
        className="w-full py-2 mt-6 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
      >
        Delete Background
      </button>
    </div>
  );
};
