import { useState } from 'react';
import { GameData, Drop, SelectionState } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { Plus, Trash2, Monitor, ChevronRight, Upload, Image, Sparkles, Loader2, Wand2, RotateCcw, Layers, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface DropEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
  styleGuide?: string | null;
}

// Image compression utility
const compressImage = (file: File, maxSize: number = 512, maxFileSize: number = 100000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels to meet file size
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        while (result.length > maxFileSize && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const DropEditor: React.FC<DropEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [showEditMode, setShowEditMode] = useState(false);
  const [styleLock, setStyleLock] = useState(true); // Default ON for style adherence
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [fullPromptOverride, setFullPromptOverride] = useState('');
  
  const selectedDrop = selection.id 
    ? game.drops.find(d => d.id === selection.id) 
    : null;
    
  // Build the full prompt that will be sent to the AI
  const buildFullPrompt = (drop: Drop): string => {
    let prompt = `Background scene for a visual novel/game: ${drop.prompt}. Wide aspect ratio, suitable as a backdrop. No characters or text.`;
    if (styleLock) {
      prompt += '\n\nMANDATORY ART STYLE: Bold black outline, simple flat fill colors, NO shading or gradients, only a few light interior lines for details. Think clean vector illustration or cel-shaded animation style.';
    }
    return prompt;
  };

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

  const handleReferenceUpload = async (dropId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const compressed = await compressImage(file);
      updateDrop(dropId, { referenceImage: compressed });
      toast.success('Reference image uploaded');
    } catch (error) {
      toast.error('Failed to process reference image');
    }
  };

  const handleGenerate = async (dropId: string) => {
    const drop = game.drops.find(d => d.id === dropId);
    if (!drop?.prompt) {
      toast.error('Please enter a generation prompt first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Use override prompt if provided, otherwise build from description
      const finalPrompt = fullPromptOverride.trim() || buildFullPrompt(drop);
      
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
            prompt: finalPrompt,
            styleGuide: styleGuide || undefined,
            referenceImage: drop.referenceImage || undefined,
            enforceStyleGuide: styleLock && !fullPromptOverride.trim(), // Only enforce if not using override
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      
      if (data?.imageUrl) {
        // Save to edit history if there was a previous image
        const history = drop.image 
          ? [...(drop.editHistory || []), drop.image].slice(-5) // Keep last 5
          : drop.editHistory;
        
        updateDrop(dropId, { 
          image: data.imageUrl,
          editHistory: history,
          generatedPrompt: finalPrompt, // Store the full prompt used
        });
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

  const handleEditWithAI = async (dropId: string) => {
    const drop = game.drops.find(d => d.id === dropId);
    if (!drop?.image) {
      toast.error('No image to edit');
      return;
    }
    if (!editPrompt.trim()) {
      toast.error('Please enter edit instructions');
      return;
    }
    
    setIsEditing(true);
    
    try {
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
            prompt: editPrompt,
            existingImage: drop.image,
            editMode: true,
            styleGuide: styleGuide || undefined,
            enforceStyleGuide: styleLock,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit image');
      }

      const data = await response.json();
      
      if (data?.imageUrl) {
        // Save current image to history
        const history = [...(drop.editHistory || []), drop.image].slice(-5);
        
        updateDrop(dropId, { 
          image: data.imageUrl,
          editHistory: history,
          lastEditPrompt: editPrompt,
        });
        setEditPrompt('');
        setShowEditMode(false);
        toast.success('Image edited successfully!');
      } else {
        throw new Error(data?.message || 'No image returned');
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to edit image');
    } finally {
      setIsEditing(false);
    }
  };

  const handleRestoreFromHistory = (dropId: string, historyIndex: number) => {
    const drop = game.drops.find(d => d.id === dropId);
    if (!drop?.editHistory?.[historyIndex]) return;
    
    const restoredImage = drop.editHistory[historyIndex];
    const newHistory = [
      ...drop.editHistory.slice(0, historyIndex),
      ...drop.editHistory.slice(historyIndex + 1),
      drop.image, // Current image goes to history
    ].filter(Boolean).slice(-5) as string[];
    
    updateDrop(dropId, {
      image: restoredImage,
      editHistory: newHistory,
    });
    toast.success('Image restored from history');
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
          <div className="space-y-3">
            <div className="relative group">
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
            
            {/* AI Edit Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditMode(!showEditMode)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 border text-sm font-bold uppercase transition-colors ${
                  showEditMode 
                    ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold' 
                    : 'bg-diesel-panel border-diesel-border text-diesel-paper hover:border-diesel-gold'
                }`}
              >
                <Wand2 size={16} />
                Edit with AI
              </button>
            </div>
            
            {/* AI Edit Interface */}
            {showEditMode && (
              <div className="p-3 bg-diesel-panel border border-diesel-gold/50 space-y-3">
                <p className="text-xs text-diesel-gold">
                  Describe how you want to modify the current image:
                </p>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Examples:&#10;• Make it nighttime with stars&#10;• Add rain and puddles&#10;• Make the lighting warmer&#10;• Add fog in the background"
                  className="w-full h-20 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm resize-none focus:outline-none focus:border-diesel-gold"
                />
                <button
                  onClick={() => handleEditWithAI(selectedDrop.id)}
                  disabled={!editPrompt.trim() || isEditing}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-sm font-bold uppercase hover:bg-diesel-gold/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isEditing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Wand2 size={16} />
                  )}
                  {isEditing ? 'Applying Edit...' : 'Apply Edit'}
                </button>
                {selectedDrop.lastEditPrompt && (
                  <p className="text-xs text-diesel-steel">
                    Last edit: "{selectedDrop.lastEditPrompt}"
                  </p>
                )}
              </div>
            )}
            
            {/* Edit History */}
            {selectedDrop.editHistory && selectedDrop.editHistory.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-diesel-steel">
                  <RotateCcw size={12} />
                  <span>Previous versions ({selectedDrop.editHistory.length})</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedDrop.editHistory.map((histImg, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRestoreFromHistory(selectedDrop.id, idx)}
                      className="flex-shrink-0 w-20 h-12 border border-diesel-border hover:border-diesel-gold transition-colors overflow-hidden"
                      title="Click to restore this version"
                    >
                      <img src={histImg} alt={`Version ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
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

      {/* Composition Reference */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2 flex items-center gap-2">
          <Layers size={14} />
          Composition Reference
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Upload a reference image to guide the AI on layout, perspective, and composition.
        </p>
        
        {selectedDrop.referenceImage ? (
          <div className="relative group mb-3">
            <img 
              src={selectedDrop.referenceImage} 
              alt="Composition reference" 
              className="w-full aspect-video object-cover border border-diesel-border opacity-75"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label className="px-3 py-2 bg-diesel-panel border border-diesel-border text-diesel-paper text-sm cursor-pointer hover:border-diesel-gold">
                Replace
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleReferenceUpload(selectedDrop.id, e)}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => updateDrop(selectedDrop.id, { referenceImage: undefined })}
                className="px-3 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-sm hover:bg-diesel-rust/30"
              >
                Remove
              </button>
            </div>
            <div className="absolute top-2 left-2 px-2 py-1 bg-diesel-black/80 text-diesel-gold text-xs">
              REFERENCE
            </div>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 aspect-video border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-paper hover:text-diesel-paper cursor-pointer transition-colors">
            <Layers size={24} />
            <span>Upload Reference Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleReferenceUpload(selectedDrop.id, e)}
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
        
        {/* Style Lock Toggle */}
        <button
          onClick={() => setStyleLock(!styleLock)}
          className={`flex items-center gap-2 w-full mb-3 py-2 px-3 border text-sm font-bold uppercase transition-colors ${
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
          <p className="text-xs text-diesel-gold/70 mb-3 -mt-1">
            Bold black outline, simple fill colors, no shading, light interior detail lines
          </p>
        )}
        
        <div className="flex flex-col gap-1 mb-3">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Description</label>
          <textarea
            value={selectedDrop.prompt}
            onChange={(e) => updateDrop(selectedDrop.id, { prompt: e.target.value })}
            placeholder="Describe the background you want to generate..."
            className="w-full h-16 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm resize-none focus:outline-none focus:border-diesel-gold"
          />
        </div>
        
        {/* Full Prompt Editor */}
        <div className="mb-3">
          <button
            onClick={() => {
              if (!showFullPrompt && selectedDrop.prompt) {
                setFullPromptOverride(buildFullPrompt(selectedDrop));
              }
              setShowFullPrompt(!showFullPrompt);
            }}
            className="text-xs text-diesel-steel hover:text-diesel-paper mb-2 flex items-center gap-1"
          >
            {showFullPrompt ? '▼' : '▶'} Full Prompt {showFullPrompt ? '(editable)' : '(click to edit)'}
          </button>
          
          {showFullPrompt && (
            <div className="space-y-2">
              <textarea
                value={fullPromptOverride || buildFullPrompt(selectedDrop)}
                onChange={(e) => setFullPromptOverride(e.target.value)}
                className="w-full h-32 bg-diesel-black border border-diesel-gold/50 text-diesel-paper p-2 text-xs font-mono resize-none focus:outline-none focus:border-diesel-gold"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setFullPromptOverride(buildFullPrompt(selectedDrop))}
                  className="text-xs text-diesel-steel hover:text-diesel-paper px-2 py-1 border border-diesel-border"
                >
                  Reset to Default
                </button>
                {fullPromptOverride && (
                  <span className="text-xs text-diesel-gold">✓ Using custom prompt</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Show last generated prompt if available */}
        {selectedDrop.generatedPrompt && !showFullPrompt && (
          <div className="mb-3 p-2 bg-diesel-panel border border-diesel-border">
            <div className="text-xs text-diesel-steel mb-1">Last generated with:</div>
            <div className="text-xs text-diesel-paper font-mono max-h-16 overflow-y-auto">
              {selectedDrop.generatedPrompt}
            </div>
          </div>
        )}
        
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
          {isGenerating ? 'Generating...' : (selectedDrop.image ? 'Regenerate with AI' : 'Generate with AI')}
        </button>
        <div className="text-xs text-diesel-steel mt-2 space-y-1">
          <p>{styleGuide ? '✓ Style guide active' : 'Tip: Add a style guide in Settings for consistent visuals'}</p>
          {selectedDrop.referenceImage && <p>✓ Composition reference active</p>}
        </div>
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
