import { useState, useMemo } from 'react';
import { GameData, Drop, SelectionState, AssetStatus } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { DraggableImagePreview } from '@/components/DraggableImagePreview';
import { AIGeneratorControls } from '@/components/AIGeneratorControls';
import { Plus, Trash2, Monitor, ChevronRight, Loader2, Wand2, RotateCcw, Layers, Lock, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { estimateGenerationTokens } from '@/utils/tokenEstimate';
import { trackGeneration } from '@/utils/aiUsageTracker';
import { loadLibraryFromDB, saveLibraryToDB, addDropToLibrary, findDuplicateDrop, updateDropInLibrary } from '@/utils/library';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { NotesSection } from '@/components/NotesSection';
import { supabase } from '@/integrations/supabase/client';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface DropEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
  styleGuide?: string | null;
}

// QUALITY MODE: Higher resolution = better AI scene matching
const compressImage = (file: File, maxSize: number = 1024, maxFileSize: number = 400000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      const img = new window.Image();
      
      img.onload = () => {
        // Smart passthrough: if already under limits, use original unchanged
        const needsResize = img.width > maxSize || img.height > maxSize;
        const needsCompress = file.size > maxFileSize;
        
        if (!needsResize && !needsCompress) {
          // Passthrough - preserves original quality and PNG transparency
          resolve(originalDataUrl);
          return;
        }
        
        // Compression needed
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions
        if (needsResize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
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
        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        while (result.length > maxFileSize && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = originalDataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const DropEditor: React.FC<DropEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
  const { confirm } = useConfirmDialog();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [showEditMode, setShowEditMode] = useState(false);
  const [styleLock, setStyleLock] = useState(true);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [fullPromptOverride, setFullPromptOverride] = useState('');
  
  const selectedDrop = selection.id 
    ? game.drops.find(d => d.id === selection.id) 
    : null;
    
  // Standard resolution for all drops (16:9 aspect ratio)
  const DROP_RESOLUTION = { width: 1280, height: 720 };
  
  // OPTIMIZED: Shorter prompts = fewer tokens = lower cost
  const buildFullPrompt = (drop: Drop): string => {
    let prompt = `Background: ${drop.prompt}. 16:9 landscape, 1280x720 proportions. No characters/text.`;
    if (styleLock) {
      prompt += ' Style: bold outlines, flat colors, no shading.';
    }
    return prompt;
  };

  const createDrop = () => {
    const newDrop: Drop = {
      id: `drop_${Date.now()}`,
      name: 'New Background',
      prompt: '',
      status: 'new',
      note: '',
    };
    onChange({ ...game, drops: [...game.drops, newDrop] });
    onSelect('drop', newDrop.id);
  };

  // Update drop with auto-promotion to 'work' when content changes
  const updateDrop = (id: string, updates: Partial<Drop>) => {
    const currentDrop = game.drops.find(d => d.id === id);
    if (!currentDrop) return;
    
    const updatedDrop = { ...currentDrop, ...updates };
    
    // Auto-promote to 'work' if currently 'new' and content is being edited
    let newStatus = updatedDrop.status || 'new';
    if (!('status' in updates) && newStatus === 'new') {
      const hasContent = 
        updatedDrop.name !== 'New Background' ||
        updatedDrop.image ||
        updatedDrop.referenceImage ||
        (updatedDrop.prompt && updatedDrop.prompt.trim().length > 0);
      if (hasContent) {
        newStatus = 'work';
      }
    }
    
    onChange({
      ...game,
      drops: game.drops.map(d => d.id === id ? { ...updatedDrop, status: newStatus } : d),
    });
  };

  // Manual status change - allows setting any status directly
  const setDropStatus = (id: string, status: AssetStatus) => {
    onChange({
      ...game,
      drops: game.drops.map(d => d.id === id ? { ...d, status } : d),
    });
  };

  const deleteDrop = async (id: string) => {
    // Check if this drop is used in any scenes
    const scenesUsingDrop = game.scenes.filter(scene => scene.dropId === id);
    
    if (scenesUsingDrop.length > 0) {
      const sceneNames = scenesUsingDrop.map(s => s.name).join(', ');
      const shouldProceed = await confirm({
        title: 'Drop Used in Scenes',
        description: `This background is used in ${scenesUsingDrop.length} scene(s): ${sceneNames}. Deleting it will remove the background from these scenes.`,
        confirmText: 'Delete Anyway',
        cancelText: 'Cancel',
        variant: 'destructive',
      });
      
      if (!shouldProceed) return;
      
      // Remove the drop reference from all scenes
      const updatedScenes = game.scenes.map(scene => 
        scene.dropId === id ? { ...scene, dropId: undefined } : scene
      );
      
      onChange({ 
        ...game, 
        drops: game.drops.filter(d => d.id !== id),
        scenes: updatedScenes,
      });
    } else {
      onChange({ ...game, drops: game.drops.filter(d => d.id !== id) });
    }
    
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
      
      // Auto-regenerate if there's a prompt
      const drop = game.drops.find(d => d.id === dropId);
      if (drop?.prompt) {
        toast.info('Regenerating with new reference...');
        setTimeout(() => handleGenerate(dropId), 100);
      }
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use AI generation');
        setIsGenerating(false);
        return;
      }

      // Use override prompt if provided, otherwise build from description
      const finalPrompt = fullPromptOverride.trim() || buildFullPrompt(drop);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            styleGuide: styleGuide || undefined,
            referenceImage: drop.referenceImage || undefined,
            enforceStyleGuide: styleLock && !fullPromptOverride.trim(),
            aspectRatio: "16:9",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      
      if (data?.imageUrl) {
        // Track usage
        const tokenEstimate = estimateGenerationTokens({
          prompt: finalPrompt,
          styleGuide,
          referenceImage: drop.referenceImage,
          styleLock,
        });
        trackGeneration({ estimatedInputTokens: tokenEstimate.total });
        
        // Save to edit history if there was a previous image
        const history = drop.image 
          ? [...(drop.editHistory || []), drop.image].slice(-5)
          : drop.editHistory;
        
        updateDrop(dropId, { 
          image: data.imageUrl,
          editHistory: history,
          generatedPrompt: finalPrompt,
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use AI generation');
        setIsEditing(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prompt: editPrompt,
            existingImage: drop.image,
            editMode: true,
            styleGuide: styleGuide || undefined,
            enforceStyleGuide: styleLock,
            isCharacter: false,
            aspectRatio: "16:9",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit image');
      }

      const data = await response.json();
      
      if (data?.imageUrl) {
        // Track edit usage
        const tokenEstimate = estimateGenerationTokens({
          prompt: editPrompt,
          styleGuide,
          styleLock,
        });
        trackGeneration({ estimatedInputTokens: tokenEstimate.total + 1000 });
        
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
        
        <div className="grid grid-cols-4 gap-2">
          {game.drops.map(drop => {
            const statusBorderColor = drop.status === 'done' 
              ? 'border-diesel-green/50 hover:border-diesel-green' 
              : drop.status === 'work' 
                ? 'border-diesel-rust/50 hover:border-diesel-rust' 
                : 'border-diesel-border hover:border-diesel-paper';
            
            return (
              <div
                key={drop.id}
                className={`relative flex flex-col bg-diesel-black border ${statusBorderColor} transition-colors overflow-hidden group`}
              >
                <button
                  onClick={() => onSelect('drop', drop.id)}
                  className="flex flex-col text-left w-full"
                >
                  <div className="aspect-video bg-diesel-panel flex items-center justify-center overflow-hidden">
                    {drop.image ? (
                      <img src={drop.image} alt={drop.name} className="w-full h-full object-cover" />
                    ) : (
                      <Monitor size={20} className="text-diesel-steel opacity-30" />
                    )}
                  </div>
                  <div className="p-1.5 flex items-center justify-between gap-1">
                    <div className="text-diesel-paper font-bold text-xs truncate">{drop.name}</div>
                    <StatusBadge status={drop.status || 'new'} size="sm" />
                  </div>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = await confirm({
                      title: 'Delete Drop',
                      description: `Delete drop "${drop.name}"?`,
                      confirmText: 'Delete',
                      variant: 'destructive',
                    });
                    if (confirmed) {
                      deleteDrop(drop.id);
                    }
                  }}
                  className="absolute top-1 right-1 p-1 bg-diesel-black/80 border border-diesel-rust/50 text-diesel-rust opacity-0 group-hover:opacity-100 transition-opacity hover:bg-diesel-rust hover:text-diesel-paper"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
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
    <div className="flex flex-col h-full gap-2 overflow-hidden">
      {/* Header Row */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <button
          onClick={() => onSelect('drop', null)}
          className="flex items-center gap-2 text-sm text-diesel-steel hover:text-diesel-paper transition-colors"
        >
          ← Back to Drops
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-diesel-gold text-xs">{game.info.title}</span>
          <span className="text-diesel-steel">/</span>
          <span className="text-diesel-paper font-bold">{selectedDrop.name}</span>
          <StatusSelector 
            status={selectedDrop.status || 'new'} 
            onChange={(status) => setDropStatus(selectedDrop.id, status)} 
          />
        </div>
      </div>

      {/* COMMON CONTROLS - ABOVE PREVIEW */}
      <AIGeneratorControls
        styleLock={styleLock}
        onStyleLockChange={setStyleLock}
        tokenEstimate={selectedDrop.prompt ? (() => {
          const prompt = fullPromptOverride || buildFullPrompt(selectedDrop);
          return estimateGenerationTokens({
            prompt,
            styleGuide: styleLock ? styleGuide : null,
            referenceImage: selectedDrop.referenceImage,
            styleLock,
          }).total;
        })() : undefined}
        isGenerating={isGenerating}
        onGenerate={() => handleGenerate(selectedDrop.id)}
        generateDisabled={!selectedDrop.prompt}
        editMode={{
          enabled: !!selectedDrop.image,
          active: showEditMode,
          onToggle: () => setShowEditMode(!showEditMode),
        }}
        onUpload={(e) => handleImageUpload(selectedDrop.id, e)}
        onClear={() => updateDrop(selectedDrop.id, { image: undefined, editHistory: [] })}
        hasClearableContent={!!selectedDrop.image}
      />

      {/* PREVIEW AREA */}
      <div className="my-2">
        {selectedDrop.image ? (
          <DraggableImagePreview
            src={selectedDrop.image}
            alt={selectedDrop.name}
            containerClassName="w-full aspect-video border border-diesel-border"
            objectFit="cover"
            isLoading={isGenerating || isEditing}
            loadingOverlay={
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-diesel-black/60 backdrop-blur-sm">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-2 border-diesel-gold/30 rounded-full animate-ping" />
                  </div>
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-transparent border-t-diesel-gold rounded-full animate-spin" />
                    <Loader2 className="w-6 h-6 text-diesel-gold animate-spin" />
                  </div>
                </div>
                <p className="mt-2 text-diesel-gold text-xs font-bold uppercase tracking-wider animate-pulse">
                  {isEditing ? 'Editing...' : 'Generating...'}
                </p>
              </div>
            }
          />
        ) : (
          <div className="w-full aspect-video max-h-48 bg-diesel-dark/50 border border-diesel-border flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-diesel-steel">
              <Monitor size={32} className="opacity-30 mb-2" />
              <span className="text-xs">No image yet</span>
              <span className="text-[10px] text-diesel-steel/50 mt-1">16:9 aspect ratio</span>
            </div>
          </div>
        )}
      </div>

      {/* TYPE-SPECIFIC CONTROLS - BELOW PREVIEW */}
      <div className="flex items-center gap-2 py-2 border-b border-diesel-border">
        <button
          onClick={async () => {
            const library = await loadLibraryFromDB();
            const duplicateCheck = findDuplicateDrop(library, selectedDrop);
            
            if (duplicateCheck.isDuplicate) {
              const action = await confirm({
                title: 'Duplicate Found',
                description: `"${selectedDrop.name}" already exists in your library with identical content.`,
                confirmText: 'Rename Existing',
                cancelText: 'Skip',
              });
              
              if (action) {
                const newName = window.prompt('Enter a new name:', duplicateCheck.existingItem.name + ' (old)');
                if (newName && newName.trim()) {
                  const renamedLibrary = updateDropInLibrary(library, duplicateCheck.existingItem.libraryId, { name: newName.trim() });
                  const updated = addDropToLibrary(renamedLibrary, selectedDrop, game.info.title);
                  await saveLibraryToDB(updated);
                  toast.success(`Saved "${selectedDrop.name}" to library!`);
                }
              }
              return;
            }
            
            const updated = addDropToLibrary(library, selectedDrop, game.info.title);
            await saveLibraryToDB(updated);
            toast.success(`"${selectedDrop.name}" saved to library!`);
          }}
          className="flex items-center gap-1.5 px-2 py-1.5 border border-diesel-paper text-diesel-paper text-xs font-bold uppercase hover:bg-diesel-paper/20 transition-colors"
        >
          <Archive size={12} />
          Library
        </button>
        <button
          onClick={() => deleteDrop(selectedDrop.id)}
          className="flex items-center gap-1.5 px-2 py-1.5 border border-diesel-rust text-diesel-rust text-xs font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      {/* Details - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        {/* AI Edit Interface */}
        {showEditMode && selectedDrop.image && (
          <section className="p-3 bg-diesel-panel border border-diesel-gold/50 space-y-2">
            <p className="text-xs text-diesel-gold">Describe how to modify the image:</p>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Examples: Make it nighttime, add rain, warmer lighting..."
              className="w-full h-16 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm resize-none focus:outline-none focus:border-diesel-gold"
            />
            <button
              onClick={() => handleEditWithAI(selectedDrop.id)}
              disabled={!editPrompt.trim() || isEditing}
              className="flex items-center justify-center gap-2 w-full py-1.5 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 disabled:opacity-50 transition-colors"
            >
              {isEditing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {isEditing ? 'Applying...' : 'Apply Edit'}
            </button>
          </section>
        )}
        
        {/* Edit History */}
        {selectedDrop.editHistory && selectedDrop.editHistory.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs text-diesel-steel">
              <div className="flex items-center gap-2">
                <RotateCcw size={12} />
                <span>Previous versions ({selectedDrop.editHistory.length})</span>
              </div>
              <button
                onClick={() => {
                  updateDrop(selectedDrop.id, { editHistory: [] });
                  toast.success('History cleared');
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-diesel-green border border-diesel-green/50 hover:bg-diesel-green/20 transition-colors"
              >
                <Lock size={10} />
                Commit
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectedDrop.editHistory.map((histImg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRestoreFromHistory(selectedDrop.id, idx)}
                  className="flex-shrink-0 w-16 h-10 border border-diesel-border hover:border-diesel-gold transition-colors overflow-hidden"
                  title="Click to restore"
                >
                  <img src={histImg} alt={`Version ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Name & Notes */}
        <section className="space-y-2">
          <CyberInput
            label="Name"
            value={selectedDrop.name}
            onChange={(e) => updateDrop(selectedDrop.id, { name: e.target.value })}
          />
          <NotesSection 
            note={selectedDrop.note || ''} 
            onChange={(note) => updateDrop(selectedDrop.id, { note })} 
          />
        </section>

        {/* AI Generation */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-diesel-paper uppercase tracking-widest border-b border-diesel-border pb-1">
            AI Generation
          </h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Description</label>
            <textarea
              value={selectedDrop.prompt}
              onChange={(e) => updateDrop(selectedDrop.id, { prompt: e.target.value })}
              placeholder="Describe the background..."
              className="w-full h-16 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm resize-none focus:outline-none focus:border-diesel-gold"
            />
          </div>
          
          {/* Full Prompt Editor */}
          <button
            onClick={() => {
              if (!showFullPrompt && selectedDrop.prompt) {
                setFullPromptOverride(buildFullPrompt(selectedDrop));
              }
              setShowFullPrompt(!showFullPrompt);
            }}
            className="text-xs text-diesel-steel hover:text-diesel-paper flex items-center gap-1"
          >
            {showFullPrompt ? '▼' : '▶'} Full Prompt
          </button>
          
          {showFullPrompt && (
            <div className="space-y-2">
              <textarea
                value={fullPromptOverride || buildFullPrompt(selectedDrop)}
                onChange={(e) => setFullPromptOverride(e.target.value)}
                className="w-full h-24 bg-diesel-black border border-diesel-gold/50 text-diesel-paper p-2 text-xs font-mono resize-none focus:outline-none focus:border-diesel-gold"
              />
              <button
                onClick={() => setFullPromptOverride(buildFullPrompt(selectedDrop))}
                className="text-xs text-diesel-steel hover:text-diesel-paper px-2 py-1 border border-diesel-border"
              >
                Reset to Default
              </button>
            </div>
          )}
          
          {/* Token estimate moved to unified controls above */}
          
          <div className="text-xs text-diesel-steel">
            {styleGuide ? '✓ Style guide active' : 'Tip: Add a style guide in Settings'}
            {selectedDrop.referenceImage && ' • ✓ Reference active'}
          </div>
        </section>

        {/* Composition Reference */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-diesel-paper uppercase tracking-widest border-b border-diesel-border pb-1 flex items-center gap-2">
            <Layers size={12} />
            Composition Reference
          </h3>
          
          {selectedDrop.referenceImage ? (
            <div className="relative group inline-block">
              <img 
                src={selectedDrop.referenceImage} 
                alt="Reference" 
                className="w-20 h-12 object-cover border border-diesel-border opacity-75"
              />
              <button
                onClick={() => updateDrop(selectedDrop.id, { referenceImage: undefined })}
                className="absolute top-0.5 right-0.5 p-0.5 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={8} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 w-20 h-12 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-paper cursor-pointer transition-colors">
              <Layers size={12} />
              <span className="text-xs">Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleReferenceUpload(selectedDrop.id, e)}
                className="hidden"
              />
            </label>
          )}
        </section>
      </div>
    </div>
  );
};
