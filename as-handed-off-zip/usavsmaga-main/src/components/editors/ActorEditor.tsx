import { useState, useMemo } from 'react';
import { GameData, Actor, ActorGraphic, SelectionState, AssetStatus, MouthPosition } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { VoiceBrowser } from '@/components/VoiceBrowser';
import { DraggableImagePreview } from '@/components/DraggableImagePreview';
import { AIGeneratorControls } from '@/components/AIGeneratorControls';
import { POSES, EXPRESSIONS, ANGLES } from '@/constants';
import { Plus, Trash2, User, Mic, ChevronRight, Sparkles, Camera, X, Lock, Wand2, Check, Archive } from 'lucide-react';
import DieselpunkLoader from '@/components/DieselpunkLoader';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { estimateGenerationTokens } from '@/utils/tokenEstimate';
import { trackGeneration } from '@/utils/aiUsageTracker';
import { loadLibraryFromDB, saveLibraryToDB, addActorToLibrary, findDuplicateActor, updateActorInLibrary } from '@/utils/library';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { NotesSection } from '@/components/NotesSection';
import { supabase } from '@/integrations/supabase/client';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';


interface ActorEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
  styleGuide?: string | null;
}

export const ActorEditor: React.FC<ActorEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
  const { confirm } = useConfirmDialog();
  const [showVoiceBrowser, setShowVoiceBrowser] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [styleLock, setStyleLock] = useState(true);
  
  // Generator state
  const [genPose, setGenPose] = useState('Neutral');
  const [genExpression, setGenExpression] = useState('Neutral');
  const [genAngle, setGenAngle] = useState(0);
  const [genPrompt, setGenPrompt] = useState('');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [generatedMouthPosition, setGeneratedMouthPosition] = useState<MouthPosition | null>(null);
  
  // Custom poses/expressions state
  const [newPose, setNewPose] = useState('');
  const [newExpression, setNewExpression] = useState('');

  // Combine default poses/expressions with custom ones from settings
  const allPoses = [...POSES, ...(game.info.customPoses || [])];
  const allExpressions = [...EXPRESSIONS, ...(game.info.customExpressions || [])];
  
  // OPTIMIZED: Shorter prompts = fewer tokens = lower cost
  const buildGraphicPrompt = (actor: Actor, graphic: ActorGraphic): string => {
    const isCloseup = graphic.pose === 'Closeup';
    const angleDescription = getAngleDescription(graphic.angle);
    
    let prompt = `Character "${actor.name}", ${graphic.pose} pose, ${graphic.expression} expression, ${angleDescription}.
${isCloseup ? 'Close-up (face/shoulders)' : 'Full body (head to toe)'}.
GREEN BACKGROUND (#00FF00) for chroma-key. No text/watermarks.`;

    if (styleLock) {
      prompt += '\nStyle: bold outlines, flat colors, no shading.';
    }
    
    return prompt;
  };
  
  const selectedActor = selection.id 
    ? game.actors.find(a => a.id === selection.id) 
    : null;

  const createActor = () => {
    const newActor: Actor = {
      id: `actor_${Date.now()}`,
      name: 'New Actor',
      graphics: [],
      animations: [],
      status: 'new',
      note: '',
    };
    onChange({ ...game, actors: [...game.actors, newActor] });
    onSelect('actor', newActor.id);
  };

  // Update actor with auto-promotion to 'work' when content changes
  const updateActor = (id: string, updates: Partial<Actor>) => {
    const currentActor = game.actors.find(a => a.id === id);
    if (!currentActor) return;
    
    const updatedActor = { ...currentActor, ...updates };
    
    // Auto-promote to 'work' if currently 'new' and content is being edited
    // (but not if status is explicitly being set)
    let newStatus = updatedActor.status || 'new';
    if (!('status' in updates) && newStatus === 'new') {
      // Check if any real content is being added
      const hasContent = 
        updatedActor.name !== 'New Actor' ||
        updatedActor.referenceImageCloseUp ||
        updatedActor.referenceImageFullBody ||
        updatedActor.voiceId ||
        updatedActor.graphics.length > 0;
      if (hasContent) {
        newStatus = 'work';
      }
    }
    
    onChange({
      ...game,
      actors: game.actors.map(a => a.id === id ? { ...updatedActor, status: newStatus } : a),
    });
  };

  // Manual status change - allows setting any status directly
  const setActorStatus = (id: string, status: AssetStatus) => {
    onChange({
      ...game,
      actors: game.actors.map(a => a.id === id ? { ...a, status } : a),
    });
  };

  const deleteActor = async (id: string) => {
    const actor = game.actors.find(a => a.id === id);
    if (!actor) return;
    const shouldDelete = await confirm({
      title: 'Delete Actor',
      description: `Delete "${actor.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!shouldDelete) return;
    onChange({ ...game, actors: game.actors.filter(a => a.id !== id) });
    onSelect('actor', null);
  };

  const addGraphic = (actorId: string) => {
    const actor = game.actors.find(a => a.id === actorId);
    if (!actor) return;
    
    const newGraphic: ActorGraphic = {
      id: `graphic_${Date.now()}`,
      pose: 'Neutral',
      expression: 'Neutral',
      angle: 0,
      image: '',
    };
    updateActor(actorId, { graphics: [...actor.graphics, newGraphic] });
  };

  const updateGraphic = (actorId: string, graphicId: string, updates: Partial<ActorGraphic>) => {
    const actor = game.actors.find(a => a.id === actorId);
    if (!actor) return;
    
    updateActor(actorId, {
      graphics: actor.graphics.map(g => g.id === graphicId ? { ...g, ...updates } : g),
    });
  };

  const deleteGraphic = (actorId: string, graphicId: string) => {
    const actor = game.actors.find(a => a.id === actorId);
    if (!actor) return;
    
    updateActor(actorId, {
      graphics: actor.graphics.filter(g => g.id !== graphicId),
    });
  };

  const handleImageUpload = (actorId: string, graphicId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateGraphic(actorId, graphicId, { image: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  // QUALITY MODE: Higher resolution = better AI character matching
  const MAX_REFERENCE_SIZE_KB = 400; // High quality for better AI recognition
  const MAX_DIMENSION = 1024; // Full detail for facial features and textures
  
  const compressImage = (file: File, maxSizeKB: number, maxDimension: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const originalDataUrl = e.target?.result as string;
        const img = new window.Image();
        
        img.onload = () => {
          // Smart passthrough: if already under limits, use original unchanged
          const fileSizeKB = file.size / 1024;
          const needsResize = img.width > maxDimension || img.height > maxDimension;
          const needsCompress = fileSizeKB > maxSizeKB;
          
          if (!needsResize && !needsCompress) {
            // Passthrough - preserves original quality and PNG transparency
            resolve(originalDataUrl);
            return;
          }
          
          // Compression needed
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          // Scale down if needed
          if (needsResize) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
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
          
          // Start with high quality and reduce until size is acceptable
          let quality = 0.9;
          let result = canvas.toDataURL('image/jpeg', quality);
          
          while (result.length / 1024 > maxSizeKB && quality > 0.3) {
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
  
  const handleReferenceUpload = async (actorId: string, field: 'referenceImageCloseUp' | 'referenceImageFullBody', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const originalSizeKB = file.size / 1024;
    
    try {
      toast.info('Compressing image...');
      const compressedImage = await compressImage(file, MAX_REFERENCE_SIZE_KB, MAX_DIMENSION);
      const compressedSizeKB = compressedImage.length / 1024;
      
      updateActor(actorId, { [field]: compressedImage });
      toast.success(`Reference image uploaded (${Math.round(originalSizeKB)}KB → ${Math.round(compressedSizeKB)}KB)`);
    } catch (error) {
      console.error('Compression error:', error);
      // Fallback to original if compression fails
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateActor(actorId, { [field]: ev.target?.result as string });
        toast.warning('Image uploaded without compression');
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to get angle description for prompts
  const getAngleDescription = (angle: number): string => {
    const descriptions: Record<number, string> = {
      0: 'Front view (facing camera)',
      45: 'Front-left three-quarter view',
      90: 'Left profile view',
      135: 'Back-left three-quarter view',
      180: 'Back view (facing away)',
      225: 'Back-right three-quarter view',
      270: 'Right profile view',
      315: 'Front-right three-quarter view'
    };
    return descriptions[angle] || `${angle} degrees rotation`;
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
        
        // Sample corner pixels to detect background color (any solid color)
        const corners = [
          { x: 0, y: 0 },
          { x: canvas.width - 1, y: 0 },
          { x: 0, y: canvas.height - 1 },
          { x: canvas.width - 1, y: canvas.height - 1 }
        ];
        
        // Get all corner colors
        const cornerColors: { r: number; g: number; b: number }[] = [];
        for (const corner of corners) {
          const idx = (corner.y * canvas.width + corner.x) * 4;
          cornerColors.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
          });
        }
        
        // Check if corners are similar (indicating solid background)
        const avgR = cornerColors.reduce((sum, c) => sum + c.r, 0) / 4;
        const avgG = cornerColors.reduce((sum, c) => sum + c.g, 0) / 4;
        const avgB = cornerColors.reduce((sum, c) => sum + c.b, 0) / 4;
        
        // Calculate variance to check if corners are similar
        const variance = cornerColors.reduce((sum, c) => {
          return sum + Math.abs(c.r - avgR) + Math.abs(c.g - avgG) + Math.abs(c.b - avgB);
        }, 0) / 4;
        
        // Only proceed if corners are reasonably similar (variance < 100)
        if (variance > 100) {
          // Corners are too different, likely no solid background
          resolve(imageDataUrl);
          return;
        }
        
        const bgR = Math.round(avgR);
        const bgG = Math.round(avgG);
        const bgB = Math.round(avgB);
        
        // Tolerance for background matching
        const tolerance = 60;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Check if pixel matches background color within tolerance
          const diffR = Math.abs(r - bgR);
          const diffG = Math.abs(g - bgG);
          const diffB = Math.abs(b - bgB);
          
          if (diffR < tolerance && diffG < tolerance && diffB < tolerance) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image for background removal'));
      img.src = imageDataUrl;
    });
  };

  // Detect mouth position using AI
  const detectMouthPosition = async (imageDataUrl: string): Promise<MouthPosition> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-mouth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ image: imageDataUrl }),
        }
      );
      
      if (!response.ok) {
        console.warn('Mouth detection failed, defaulting to center');
        return { x: 50, y: 50 };
      }
      
      const data = await response.json();
      return { x: data.x ?? 50, y: data.y ?? 50 };
    } catch (error) {
      console.error('Mouth detection error:', error);
      return { x: 50, y: 50 }; // Default to center on error
    }
  };

  // OPTIMIZED: Shorter prompts = fewer tokens = lower cost
  const buildGeneratorPrompt = (actor: Actor): string => {
    const isCloseup = genPose === 'Closeup';
    const angleDescription = getAngleDescription(genAngle);
    
    // Removed "Character " prefix for cleaner prompts
    let prompt = `"${actor.name}", ${genPose} pose, ${genExpression} expression, ${angleDescription}.
${isCloseup ? 'Close-up (face/shoulders)' : 'Full body (head to toe)'}.
GREEN BACKGROUND (#00FF00) for chroma-key. No text/watermarks.`;

    if (styleLock) {
      prompt += '\nStyle: bold outlines, flat colors, no shading.';
    }
    
    return prompt;
  };

  // Generate a new pose preview (doesn't add to library yet)
  const handleGeneratePreview = async () => {
    if (!selectedActor) return;
    
    setIsGenerating(true);
    toast.info('Generating character graphic...');
    
    // Use custom prompt if edited, otherwise build from parameters
    const finalPrompt = genPrompt.trim() || buildGeneratorPrompt(selectedActor);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use AI generation');
        setIsGenerating(false);
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
            prompt: finalPrompt,
            referenceImageCloseUp: selectedActor.referenceImageCloseUp,
            referenceImageFullBody: selectedActor.referenceImageFullBody,
            styleGuide,
            enforceStyleGuide: styleLock && !genPrompt.trim(),
            aspectRatio: "1:1",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      if (data.imageUrl) {
        // Track usage
        const tokenEstimate = estimateGenerationTokens({
          prompt: finalPrompt,
          styleGuide,
          referenceImageCloseUp: selectedActor.referenceImageCloseUp,
          referenceImageFullBody: selectedActor.referenceImageFullBody,
          styleLock,
        });
        trackGeneration({ estimatedInputTokens: tokenEstimate.total });
        
        toast.info('Removing background...');
        const transparentImage = await removeBackgroundGlobal(data.imageUrl);
        
        // Detect mouth position
        toast.info('Detecting mouth position...');
        const mouthPos = await detectMouthPosition(transparentImage);
        
        // Store mouth position temporarily for commit
        setGeneratedPreview(transparentImage);
        setGeneratedMouthPosition(mouthPos);
        toast.success('Preview generated! Edit or commit to library.');
      } else {
        throw new Error('No image returned');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit the current preview with AI
  const handleEditPreview = async () => {
    if (!generatedPreview || !editPrompt.trim()) {
      toast.error('Enter edit instructions');
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
            existingImage: generatedPreview,
            editMode: true,
            styleGuide,
            enforceStyleGuide: styleLock,
            isCharacter: true,
            aspectRatio: "1:1",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Edit failed');
      }

      const data = await response.json();
      if (data.imageUrl) {
        // Track edit usage
        const tokenEstimate = estimateGenerationTokens({
          prompt: editPrompt,
          styleGuide,
          styleLock,
        });
        trackGeneration({ estimatedInputTokens: tokenEstimate.total + 1000 });
        
        toast.info('Removing background...');
        const transparentImage = await removeBackgroundGlobal(data.imageUrl);
        
        // Detect mouth position after edit
        toast.info('Detecting mouth position...');
        const mouthPos = await detectMouthPosition(transparentImage);
        
        setGeneratedPreview(transparentImage);
        setGeneratedMouthPosition(mouthPos);
        setEditPrompt('');
        toast.success('Image edited!');
      }
    } catch (err) {
      console.error('Edit error:', err);
      toast.error(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setIsEditing(false);
    }
  };

  // Commit the preview to the pose library
  const handleCommitToLibrary = () => {
    if (!selectedActor || !generatedPreview) return;
    
    const newGraphic: ActorGraphic = {
      id: `graphic_${Date.now()}`,
      pose: genPose,
      expression: genExpression,
      angle: genAngle,
      image: generatedPreview,
      generatedPrompt: genPrompt.trim() || buildGeneratorPrompt(selectedActor),
      mouthPosition: generatedMouthPosition || undefined,
    };
    
    updateActor(selectedActor.id, { 
      graphics: [...selectedActor.graphics, newGraphic] 
    });
    
    // Reset generator
    setGeneratedPreview(null);
    setGeneratedMouthPosition(null);
    setGenPrompt('');
    setEditPrompt('');
    toast.success('Pose added to library!');
  };

  // Handle direct image upload for pose (goes to preview first)
  const handlePoseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      setGeneratedPreview(ev.target?.result as string);
      toast.success('Image loaded! Edit or commit to library.');
    };
    reader.readAsDataURL(file);
  };

  // Reset prompt to auto-generated
  const resetPrompt = () => {
    if (selectedActor) {
      setGenPrompt(buildGeneratorPrompt(selectedActor));
    }
  };

  // Actor List View
  if (!selectedActor) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-diesel-steel">
            {game.actors.length} actor{game.actors.length !== 1 ? 's' : ''} defined
          </p>
          <button
            onClick={createActor}
            className="flex items-center gap-2 px-3 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-sm font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
          >
            <Plus size={14} />
            New Actor
          </button>
        </div>
        
        <div className="space-y-2">
          {game.actors.map(actor => {
            const statusBorderColor = actor.status === 'done' 
              ? 'border-diesel-green/50 hover:border-diesel-green' 
              : actor.status === 'work' 
                ? 'border-diesel-rust/50 hover:border-diesel-rust' 
                : 'border-diesel-border hover:border-diesel-gold';
            
            return (
              <button
                key={actor.id}
                onClick={() => onSelect('actor', actor.id)}
                className={`w-full flex items-center gap-3 p-3 bg-diesel-black border ${statusBorderColor} transition-colors text-left`}
              >
                <div className="w-10 h-10 bg-diesel-panel border border-diesel-border flex items-center justify-center">
                  {actor.image ? (
                    <img src={actor.image} alt={actor.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-diesel-steel" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-diesel-paper font-bold">{actor.name}</div>
                  <div className="text-xs text-diesel-steel">
                    {actor.graphics.length} graphic{actor.graphics.length !== 1 ? 's' : ''}
                    {actor.voiceId && ' • Voice assigned'}
                  </div>
                </div>
                <StatusBadge status={actor.status || 'new'} size="sm" />
                <ChevronRight size={16} className="text-diesel-steel" />
              </button>
            );
          })}
        </div>
        
        {game.actors.length === 0 && (
          <div className="text-center py-12 text-diesel-steel">
            <User size={48} className="mx-auto mb-4 opacity-30" />
            <p>No actors yet. Create your first character!</p>
          </div>
        )}
      </div>
    );
  }

  // Actor Detail View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => onSelect('actor', null)}
          className="text-sm text-diesel-steel hover:text-diesel-gold flex items-center gap-1"
        >
          ← Back to Actors
        </button>
        <button
          onClick={createActor}
          className="flex items-center gap-2 px-3 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
        >
          <Plus size={12} />
          Add Actor
        </button>
      </div>

      {/* Pose Generator - First */}
      <section className="bg-diesel-black border border-diesel-gold/50 p-4">
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-3 border-b border-diesel-gold/30 pb-2">
          <Sparkles size={14} className="inline mr-2" />
          Pose Generator
        </h3>
        
        {/* COMMON CONTROLS - ABOVE PREVIEW */}
        <AIGeneratorControls
          styleLock={styleLock}
          onStyleLockChange={setStyleLock}
          tokenEstimate={(() => {
            const prompt = genPrompt.trim() || buildGeneratorPrompt(selectedActor);
            return estimateGenerationTokens({
              prompt,
              styleGuide: styleLock ? styleGuide : null,
              referenceImageCloseUp: selectedActor.referenceImageCloseUp,
              referenceImageFullBody: selectedActor.referenceImageFullBody,
              styleLock,
            }).total;
          })()}
          isGenerating={isGenerating}
          onGenerate={handleGeneratePreview}
          generateDisabled={!selectedActor.referenceImageCloseUp || !selectedActor.referenceImageFullBody}
          onUpload={handlePoseUpload}
          onClear={generatedPreview ? () => { setGeneratedPreview(null); setEditPrompt(''); } : undefined}
          hasClearableContent={!!generatedPreview}
        />
        
        {/* Reference images warning */}
        {(!selectedActor.referenceImageCloseUp || !selectedActor.referenceImageFullBody) && (
          <div className="text-diesel-rust text-xs mt-2 flex items-center gap-1">
            <span>⚠️</span>
            <span>Upload Face and Body reference images below to enable generation.</span>
          </div>
        )}
        
        {/* PREVIEW AREA */}
        <div className="my-3">
          {/* Loading State */}
          {isGenerating && (
            <div className="flex justify-center py-8 border border-diesel-border">
              <DieselpunkLoader size="md" message="GENERATING..." />
            </div>
          )}
          
          {/* Generated Preview with Edit Controls */}
          {generatedPreview && !isGenerating && (
            <div className="flex gap-3">
              {/* Preview Image */}
              <div className="w-1/2">
                <DraggableImagePreview
                  src={generatedPreview}
                  alt="Preview"
                  containerClassName="aspect-square border border-diesel-border"
                  onZoomClick={() => setPreviewImage(generatedPreview)}
                />
              </div>
              
              {/* Edit Controls */}
              <div className="w-1/2 flex flex-col gap-2">
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Fine-tune: e.g., bigger eyes, add scar..."
                  className="h-16 bg-diesel-dark border border-diesel-border text-diesel-paper p-2 text-xs resize-none focus:outline-none focus:border-diesel-gold"
                />
                
                {/* Editing Loading State */}
                {isEditing ? (
                  <div className="flex justify-center py-2">
                    <DieselpunkLoader size="sm" message="EDITING..." />
                  </div>
                ) : (
                  <button
                    onClick={handleEditPreview}
                    disabled={!editPrompt.trim()}
                    className="py-1.5 bg-diesel-panel border border-diesel-paper text-diesel-paper text-xs font-bold uppercase hover:bg-diesel-paper/20 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Wand2 size={12} />
                    Edit
                  </button>
                )}
                
                {/* Commit Button */}
                <button
                  onClick={handleCommitToLibrary}
                  disabled={isEditing}
                  className="py-1.5 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Check size={12} />
                  Commit
                </button>
                
                {/* Discard */}
                <button
                  onClick={() => { setGeneratedPreview(null); setEditPrompt(''); }}
                  disabled={isEditing}
                  className="py-1 text-diesel-rust text-[10px] hover:underline disabled:opacity-50"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          
          {/* Empty state when no preview */}
          {!generatedPreview && !isGenerating && (
            <div className="aspect-video max-h-40 bg-diesel-dark/50 border border-diesel-border flex items-center justify-center">
              <div className="text-center text-diesel-steel">
                <User size={32} className="mx-auto mb-2 opacity-30" />
                <span className="text-xs">Generated preview will appear here</span>
              </div>
            </div>
          )}
        </div>
        
        {/* TYPE-SPECIFIC CONTROLS - BELOW PREVIEW */}
        <div className="border-t border-diesel-border pt-3 space-y-3">
          {/* Pose / Expression / Angle selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase text-diesel-steel">Pose</label>
              <select
                value={genPose}
                onChange={(e) => { setGenPose(e.target.value); setGenPrompt(''); }}
                className="bg-diesel-panel border border-diesel-border text-diesel-paper text-[10px] py-1 px-2 min-w-[80px]"
              >
                {allPoses.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase text-diesel-steel">Expression</label>
              <select
                value={genExpression}
                onChange={(e) => { setGenExpression(e.target.value); setGenPrompt(''); }}
                className="bg-diesel-panel border border-diesel-border text-diesel-paper text-[10px] py-1 px-2 min-w-[80px]"
              >
                {allExpressions.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase text-diesel-steel">Angle</label>
              <select
                value={genAngle}
                onChange={(e) => { setGenAngle(Number(e.target.value)); setGenPrompt(''); }}
                className="bg-diesel-panel border border-diesel-border text-diesel-paper text-[10px] py-1 px-2 w-[60px]"
              >
                {ANGLES.map(a => <option key={a} value={a}>{a}°</option>)}
              </select>
            </div>
          </div>
          
          {/* Reference Images */}
          <div className="flex gap-3">
            {/* Close-up reference */}
            <div>
              <label className="text-[9px] uppercase text-diesel-steel mb-1 block">Face Ref</label>
              {selectedActor.referenceImageCloseUp ? (
                <div className="relative group w-14 h-14">
                  <img 
                    src={selectedActor.referenceImageCloseUp} 
                    alt="Close-up reference" 
                    className="w-full h-full object-cover border border-diesel-border"
                  />
                  <button
                    onClick={() => updateActor(selectedActor.id, { referenceImageCloseUp: undefined })}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={8} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-14 h-14 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleReferenceUpload(selectedActor.id, 'referenceImageCloseUp', e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Full body reference */}
            <div>
              <label className="text-[9px] uppercase text-diesel-steel mb-1 block">Body Ref</label>
              {selectedActor.referenceImageFullBody ? (
                <div className="relative group w-14 h-14">
                  <img 
                    src={selectedActor.referenceImageFullBody} 
                    alt="Full body reference" 
                    className="w-full h-full object-cover border border-diesel-border"
                  />
                  <button
                    onClick={() => updateActor(selectedActor.id, { referenceImageFullBody: undefined })}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={8} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-14 h-14 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
                  <User size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleReferenceUpload(selectedActor.id, 'referenceImageFullBody', e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
          
          {/* Prompt Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] uppercase text-diesel-steel">Prompt</label>
              <button 
                onClick={resetPrompt}
                className="text-[9px] text-diesel-steel hover:text-diesel-paper"
              >
                Reset
              </button>
            </div>
            <textarea
              value={genPrompt || buildGeneratorPrompt(selectedActor)}
              onChange={(e) => setGenPrompt(e.target.value)}
              className="w-full h-14 bg-diesel-dark border border-diesel-border text-diesel-paper p-2 text-[10px] font-mono resize-none focus:outline-none focus:border-diesel-gold"
            />
          </div>
        </div>
      </section>


      {/* Pose Library - Second */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Pose Library ({selectedActor.graphics.length})
        </h3>
        
        {selectedActor.graphics.length === 0 ? (
          <div className="text-center py-4 text-diesel-steel">
            <User size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No poses yet. Use the generator above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
            {selectedActor.graphics.map((graphic) => (
              <div key={graphic.id} className="bg-diesel-black border border-diesel-border group relative">
                {/* Label */}
                <div className="absolute top-0 left-0 right-0 bg-diesel-black/80 px-1 py-0.5 text-[8px] text-diesel-paper z-10 truncate">
                  {graphic.pose} • {graphic.expression}
                </div>
                
                {/* Image */}
                <div className="aspect-square pt-3">
                  {graphic.image ? (
                    <img 
                      src={graphic.image} 
                      alt={`${graphic.pose} ${graphic.expression}`}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setPreviewImage(graphic.image)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-diesel-steel">
                      <User size={16} />
                    </div>
                  )}
                </div>
                
                {/* Delete on hover */}
                <button
                  onClick={() => deleteGraphic(selectedActor.id, graphic.id)}
                  className="absolute top-4 right-0.5 p-0.5 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Basic Info - Now Third */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-diesel-border pb-2">
          <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest">
            Character Info
          </h3>
          <StatusSelector 
            status={selectedActor.status || 'new'} 
            onChange={(status) => setActorStatus(selectedActor.id, status)} 
          />
        </div>
        <CyberInput
          label="Name"
          value={selectedActor.name}
          onChange={(e) => updateActor(selectedActor.id, { name: e.target.value })}
        />
        <div className="mt-3">
          <NotesSection 
            note={selectedActor.note || ''} 
            onChange={(note) => updateActor(selectedActor.id, { note })} 
          />
        </div>
        
        {/* Page to display when clicked */}
        <div className="flex flex-col gap-1 mt-3">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Info Page (on click)</label>
          <select
            value={selectedActor.pageId || ''}
            onChange={(e) => updateActor(selectedActor.id, { pageId: e.target.value || undefined })}
            className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          >
            <option value="">None (not clickable)</option>
            {game.pages?.map(page => (
              <option key={page.id} value={page.id}>{page.name}</option>
            ))}
          </select>
          <p className="text-[10px] text-diesel-steel mt-1">When a page is attached, players can click this actor in Theater to view it.</p>
        </div>
      </section>

      {/* Voice Browser Modal */}
      {showVoiceBrowser && (
        <VoiceBrowser
          currentVoiceId={selectedActor.voiceId}
          onSelect={(voiceId, voiceName) => {
            updateActor(selectedActor.id, { voiceId });
            setShowVoiceBrowser(false);
          }}
          onClose={() => setShowVoiceBrowser(false)}
        />
      )}



      {/* Custom Poses */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Custom Poses
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Add custom poses beyond the defaults: {POSES.join(', ')}
        </p>
        
        {/* Existing custom poses */}
        {game.info.customPoses && game.info.customPoses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {game.info.customPoses.map((pose) => (
              <div key={pose} className="flex items-center gap-1 bg-diesel-black px-2 py-1 border border-diesel-border text-sm text-diesel-paper">
                <span>{pose}</span>
                <button
                  onClick={() => onChange({ ...game, info: { ...game.info, customPoses: game.info.customPoses?.filter(p => p !== pose) } })}
                  className="text-diesel-rust hover:text-red-400 ml-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add new pose */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New pose name"
            value={newPose}
            onChange={(e) => setNewPose(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newPose.trim()) {
                onChange({ ...game, info: { ...game.info, customPoses: [...(game.info.customPoses || []), newPose.trim()] } });
                setNewPose('');
              }
            }}
            className="flex-1 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button
            onClick={() => {
              if (newPose.trim()) {
                onChange({ ...game, info: { ...game.info, customPoses: [...(game.info.customPoses || []), newPose.trim()] } });
                setNewPose('');
              }
            }}
            className="px-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
          >
            <Plus size={16} />
          </button>
        </div>
      </section>

      {/* Custom Expressions */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Custom Expressions
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Add custom expressions beyond the defaults: {EXPRESSIONS.join(', ')}
        </p>
        
        {/* Existing custom expressions */}
        {game.info.customExpressions && game.info.customExpressions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {game.info.customExpressions.map((expr) => (
              <div key={expr} className="flex items-center gap-1 bg-diesel-black px-2 py-1 border border-diesel-border text-sm text-diesel-paper">
                <span>{expr}</span>
                <button
                  onClick={() => onChange({ ...game, info: { ...game.info, customExpressions: game.info.customExpressions?.filter(e => e !== expr) } })}
                  className="text-diesel-rust hover:text-red-400 ml-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add new expression */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New expression name"
            value={newExpression}
            onChange={(e) => setNewExpression(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newExpression.trim()) {
                onChange({ ...game, info: { ...game.info, customExpressions: [...(game.info.customExpressions || []), newExpression.trim()] } });
                setNewExpression('');
              }
            }}
            className="flex-1 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button
            onClick={() => {
              if (newExpression.trim()) {
                onChange({ ...game, info: { ...game.info, customExpressions: [...(game.info.customExpressions || []), newExpression.trim()] } });
                setNewExpression('');
              }
            }}
            className="px-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
          >
            <Plus size={16} />
          </button>
        </div>
      </section>

      {/* Voice Assignment */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Voice
        </h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <CyberInput
              label="Voice ID (ElevenLabs)"
              value={selectedActor.voiceId || ''}
              onChange={(e) => updateActor(selectedActor.id, { voiceId: e.target.value })}
              placeholder="Select from Voice Browser"
            />
          </div>
          <button
            onClick={() => setShowVoiceBrowser(true)}
            className="mb-2 px-3 py-2 bg-diesel-green/20 border border-diesel-green text-diesel-green text-xs font-bold uppercase hover:bg-diesel-green/30 flex items-center gap-1"
          >
            <Mic size={14} />
            Browse
          </button>
        </div>
      </section>

      {/* Actions - moved delete to button row in top section */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={async () => {
            const library = await loadLibraryFromDB();
            const duplicateCheck = findDuplicateActor(library, selectedActor);
            
            if (duplicateCheck.isDuplicate) {
              const action = await confirm({
                title: 'Duplicate Found',
                description: `"${selectedActor.name}" already exists in your library with identical content. What would you like to do?`,
                confirmText: 'Rename Existing',
                cancelText: 'Skip',
              });
              
              if (action) {
                // Prompt for new name
                const newName = window.prompt('Enter a new name for the existing library item:', duplicateCheck.existingItem.name + ' (old)');
                if (newName && newName.trim()) {
                  const renamedLibrary = updateActorInLibrary(library, duplicateCheck.existingItem.libraryId, { name: newName.trim() });
                  const updated = addActorToLibrary(renamedLibrary, selectedActor, game.info.title);
                  await saveLibraryToDB(updated);
                  toast.success(`Renamed existing to "${newName}" and saved new "${selectedActor.name}"!`);
                }
              }
              return;
            }
            
            const updated = addActorToLibrary(library, selectedActor, game.info.title);
            await saveLibraryToDB(updated);
            toast.success(`"${selectedActor.name}" saved to library!`);
          }}
          className="flex-1 py-2 border border-diesel-gold text-diesel-gold text-sm font-bold uppercase hover:bg-diesel-gold/20 transition-colors flex items-center justify-center gap-2"
        >
          <Archive size={14} />
          Save to Library
        </button>
        <button
          onClick={() => deleteActor(selectedActor.id)}
          className="flex items-center gap-2 px-4 py-2 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl bg-diesel-dark border-diesel-border p-0 overflow-hidden">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-2 right-2 z-10 p-2 bg-diesel-panel/80 border border-diesel-border text-diesel-steel hover:text-diesel-paper rounded-sm"
          >
            <X size={20} />
          </button>
          {previewImage && (
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-auto max-h-[80vh] object-contain bg-diesel-black"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
