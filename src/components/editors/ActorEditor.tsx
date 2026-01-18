import { useState, useMemo } from 'react';
import { GameData, Actor, ActorGraphic, SelectionState, AssetStatus } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { VoiceBrowser } from '@/components/VoiceBrowser';
import { POSES, EXPRESSIONS, ANGLES } from '@/constants';
import { Plus, Trash2, Upload, User, Image, Mic, ChevronRight, Sparkles, Camera, X, ZoomIn, Lock, Wand2, Check, Archive } from 'lucide-react';
import DieselpunkLoader from '@/components/DieselpunkLoader';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { estimateGenerationTokens } from '@/utils/tokenEstimate';
import { TokenEstimateDisplay } from '@/components/TokenEstimateDisplay';
import { loadLibraryFromDB, saveLibraryToDB, addActorToLibrary } from '@/utils/library';
import { StatusSelector } from '@/components/StatusBadge';
import { NotesSection } from '@/components/NotesSection';
import { computeActorStatus, promoteStatus } from '@/utils/statusPromotion';

interface ActorEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
  styleGuide?: string | null;
}

export const ActorEditor: React.FC<ActorEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
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
  
  // Custom poses/expressions state
  const [newPose, setNewPose] = useState('');
  const [newExpression, setNewExpression] = useState('');

  // Combine default poses/expressions with custom ones from settings
  const allPoses = [...POSES, ...(game.info.customPoses || [])];
  const allExpressions = [...EXPRESSIONS, ...(game.info.customExpressions || [])];
  
  // Build full prompt for a graphic
  const buildGraphicPrompt = (actor: Actor, graphic: ActorGraphic): string => {
    // Closeup = face/shoulders shot, everything else = full body
    const isCloseup = graphic.pose === 'Closeup';
    const frameInstruction = isCloseup 
      ? 'CLOSE-UP SHOT focusing on face and upper shoulders' 
      : 'FULL BODY SHOT from head to toe';
    
    const angleDescription = getAngleDescription(graphic.angle);
    
    let prompt = `IDENTITY: Generate a character portrait of "${actor.name}".

POSE & EXPRESSION:
- Pose: ${graphic.pose}
- Expression: ${graphic.expression}
- Camera Angle: ${angleDescription}

FRAMING: ${frameInstruction}

ART STYLE: Match the provided style reference exactly. This is for a visual novel game - clean lines, dramatic lighting, high quality character art.

CRITICAL BACKGROUND INSTRUCTION: The character MUST be rendered on a SOLID BRIGHT GREEN BACKGROUND (#00FF00). This is essential for chroma-key compositing. No gradients, no shadows on background, pure solid green (#00FF00) everywhere except the character.

NEGATIVE: No text, no watermarks, no multiple characters, no complex backgrounds.`;

    if (styleLock) {
      prompt += `

MANDATORY ART STYLE (STRICTLY ENFORCE):
- BOLD BLACK OUTLINES around all shapes
- SIMPLE FLAT COLOR FILLS only - solid colors, NO variation within each area
- ABSOLUTELY NO SHADING, NO gradients, NO soft shadows, NO lighting effects
- Only a FEW THIN INTERIOR DETAIL LINES for features
- Each color area = ONE SOLID COLOR with hard edges
NEGATIVE: No shading, no gradients, no 3D lighting.`;
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
      status: 'new',
      note: '',
    };
    onChange({ ...game, actors: [...game.actors, newActor] });
    onSelect('actor', newActor.id);
  };

  const updateActor = (id: string, updates: Partial<Actor>) => {
    const currentActor = game.actors.find(a => a.id === id);
    if (!currentActor) return;
    
    const updatedActor = { ...currentActor, ...updates };
    const computedStatus = computeActorStatus(updatedActor);
    const newStatus = promoteStatus(currentActor.status || 'new', computedStatus);
    
    onChange({
      ...game,
      actors: game.actors.map(a => a.id === id ? { ...updatedActor, status: newStatus } : a),
    });
  };

  const deleteActor = (id: string) => {
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

  const MAX_REFERENCE_SIZE_KB = 100; // Target max size in KB for reference images
  const MAX_DIMENSION = 512; // Max width/height for reference images
  
  const compressImage = (file: File, maxSizeKB: number, maxDimension: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Scale down if needed
        if (width > maxDimension || height > maxDimension) {
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
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        while (result.length / 1024 > maxSizeKB && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
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
          // Check if it's a greenish pixel (likely background)
          if (data[idx + 1] > data[idx] && data[idx + 1] > data[idx + 2]) {
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
            count++;
          }
        }
        
        // If we found green corners, use average; otherwise default to bright green
        if (count > 0) {
          bgR = Math.round(bgR / count);
          bgG = Math.round(bgG / count);
          bgB = Math.round(bgB / count);
        } else {
          bgR = 0; bgG = 255; bgB = 0;
        }
        
        // Tolerance for background matching
        const tolerance = 80;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Check if pixel matches background color within tolerance
          const diffR = Math.abs(r - bgR);
          const diffG = Math.abs(g - bgG);
          const diffB = Math.abs(b - bgB);
          
          if (diffR < tolerance && diffG < tolerance && diffB < tolerance) {
            // Also check that green is dominant (for green screen)
            if (g > r * 0.8 && g > b * 0.8) {
              data[i + 3] = 0; // Set alpha to 0 (transparent)
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

  // Build prompt for generator (uses generator state, not a stored graphic)
  const buildGeneratorPrompt = (actor: Actor): string => {
    const isCloseup = genPose === 'Closeup';
    const frameInstruction = isCloseup 
      ? 'CLOSE-UP SHOT focusing on face and upper shoulders' 
      : 'FULL BODY SHOT from head to toe';
    
    const angleDescription = getAngleDescription(genAngle);
    
    let prompt = `IDENTITY: Generate a character portrait of "${actor.name}".

POSE & EXPRESSION:
- Pose: ${genPose}
- Expression: ${genExpression}
- Camera Angle: ${angleDescription}

FRAMING: ${frameInstruction}

ART STYLE: Match the provided style reference exactly. This is for a visual novel game - clean lines, dramatic lighting, high quality character art.

CRITICAL BACKGROUND INSTRUCTION: The character MUST be rendered on a SOLID BRIGHT GREEN BACKGROUND (#00FF00). This is essential for chroma-key compositing. No gradients, no shadows on background, pure solid green (#00FF00) everywhere except the character.

NEGATIVE: No text, no watermarks, no multiple characters, no complex backgrounds.`;

    if (styleLock) {
      prompt += `

MANDATORY ART STYLE (STRICTLY ENFORCE):
- BOLD BLACK OUTLINES around all shapes
- SIMPLE FLAT COLOR FILLS only - solid colors, NO variation within each area
- ABSOLUTELY NO SHADING, NO gradients, NO soft shadows, NO lighting effects
- Only a FEW THIN INTERIOR DETAIL LINES for features
- Each color area = ONE SOLID COLOR with hard edges
NEGATIVE: No shading, no gradients, no 3D lighting.`;
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
            referenceImageCloseUp: selectedActor.referenceImageCloseUp,
            referenceImageFullBody: selectedActor.referenceImageFullBody,
            styleGuide,
            enforceStyleGuide: styleLock && !genPrompt.trim(),
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
        setGeneratedPreview(transparentImage);
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
            existingImage: generatedPreview,
            editMode: true,
            styleGuide,
            enforceStyleGuide: styleLock,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Edit failed');
      }

      const data = await response.json();
      if (data.imageUrl) {
        toast.info('Removing background...');
        const transparentImage = await removeBackgroundGlobal(data.imageUrl);
        setGeneratedPreview(transparentImage);
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
    };
    
    updateActor(selectedActor.id, { 
      graphics: [...selectedActor.graphics, newGraphic] 
    });
    
    // Reset generator
    setGeneratedPreview(null);
    setGenPrompt('');
    setEditPrompt('');
    toast.success('Pose added to library!');
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
          {game.actors.map(actor => (
            <button
              key={actor.id}
              onClick={() => onSelect('actor', actor.id)}
              className="w-full flex items-center gap-3 p-3 bg-diesel-black border border-diesel-border hover:border-diesel-gold transition-colors text-left"
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
              <ChevronRight size={16} className="text-diesel-steel" />
            </button>
          ))}
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
      
      {/* Basic Info */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-diesel-border pb-2">
          <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest">
            Character Info
          </h3>
          <StatusSelector 
            status={selectedActor.status || 'new'} 
            onChange={(status) => updateActor(selectedActor.id, { status })} 
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

      {/* Pose Generator */}
      <section className="bg-diesel-black border border-diesel-gold/50 p-4">
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-3 border-b border-diesel-gold/30 pb-2">
          <Sparkles size={14} className="inline mr-2" />
          Pose Generator
        </h3>
        
        {/* Parameter Selectors */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-diesel-steel uppercase mb-1 block">Pose</label>
            <select
              value={genPose}
              onChange={(e) => { setGenPose(e.target.value); setGenPrompt(''); }}
              className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-xs p-2"
            >
              {allPoses.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-diesel-steel uppercase mb-1 block">Expression</label>
            <select
              value={genExpression}
              onChange={(e) => { setGenExpression(e.target.value); setGenPrompt(''); }}
              className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-xs p-2"
            >
              {allExpressions.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-diesel-steel uppercase mb-1 block">Angle</label>
            <select
              value={genAngle}
              onChange={(e) => { setGenAngle(Number(e.target.value)); setGenPrompt(''); }}
              className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-xs p-2"
            >
              {ANGLES.map(a => <option key={a} value={a}>{a}°</option>)}
            </select>
          </div>
        </div>
        
        {/* Style Lock + Generate Button Row */}
        {/* Token Estimate */}
        {(() => {
          const prompt = genPrompt.trim() || buildGeneratorPrompt(selectedActor);
          const estimate = estimateGenerationTokens({
            prompt,
            styleGuide: styleLock ? styleGuide : null,
            referenceImageCloseUp: selectedActor.referenceImageCloseUp,
            referenceImageFullBody: selectedActor.referenceImageFullBody,
            styleLock,
          });
          return <TokenEstimateDisplay estimate={estimate} />;
        })()}
        
        <div className="flex gap-2 mb-3 mt-2">
          <button
            onClick={() => setStyleLock(!styleLock)}
            className={`flex items-center gap-2 px-3 py-2 border text-xs font-bold uppercase transition-colors ${
              styleLock 
                ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold' 
                : 'bg-diesel-panel border-diesel-border text-diesel-steel hover:border-diesel-paper'
            }`}
            title="When ON, generated images follow the project style guide"
          >
            <Lock size={12} />
            <span>Style Lock</span>
            <span className={`text-[10px] ${styleLock ? 'text-diesel-gold' : 'text-diesel-steel'}`}>
              {styleLock ? 'ON' : 'OFF'}
            </span>
          </button>
          <button
            onClick={handleGeneratePreview}
            disabled={isGenerating}
            className="flex-1 py-2 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase text-sm hover:bg-diesel-green/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            Generate
          </button>
        </div>
        
        {/* Loading State */}
        {isGenerating && (
          <div className="border-t border-diesel-border pt-4 flex justify-center">
            <DieselpunkLoader size="md" message="GENERATING..." />
          </div>
        )}
        
        {/* Preview & Edit Area */}
        {generatedPreview && !isGenerating && (
          <div className="border-t border-diesel-border pt-3">
            <div className="flex gap-3">
              {/* Preview Image */}
              <div className="w-1/2">
                <div className="aspect-square bg-diesel-panel border border-diesel-border relative group">
                  <img 
                    src={generatedPreview} 
                    alt="Preview" 
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => setPreviewImage(generatedPreview)}
                  />
                  <button
                    onClick={() => setPreviewImage(generatedPreview)}
                    className="absolute top-1 right-1 p-1 bg-diesel-panel/80 border border-diesel-border text-diesel-steel hover:text-diesel-gold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>
              </div>
              
              {/* Edit Controls */}
              <div className="w-1/2 flex flex-col gap-2">
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Fine-tune: e.g., bigger eyes, add scar..."
                  className="flex-1 bg-diesel-dark border border-diesel-border text-diesel-paper p-2 text-xs resize-none focus:outline-none focus:border-diesel-gold"
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
          </div>
        )}
        
        {/* Prompt Editor - Below Preview */}
        <div className="mt-3 border-t border-diesel-border pt-3">
          <div className="flex items-center justify-end mb-1">
            <button 
              onClick={resetPrompt}
              className="text-[10px] text-diesel-steel hover:text-diesel-paper"
            >
              Reset Prompt
            </button>
          </div>
          <textarea
            value={genPrompt || buildGeneratorPrompt(selectedActor)}
            onChange={(e) => setGenPrompt(e.target.value)}
            className="w-full h-24 bg-diesel-dark border border-diesel-border text-diesel-paper p-2 text-[10px] font-mono resize-none focus:outline-none focus:border-diesel-gold"
          />
        </div>
      </section>

      {/* Pose Library */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Pose Library ({selectedActor.graphics.length})
        </h3>
        
        {selectedActor.graphics.length === 0 ? (
          <div className="text-center py-8 text-diesel-steel">
            <User size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No poses yet. Use the generator above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {selectedActor.graphics.map((graphic) => (
              <div key={graphic.id} className="bg-diesel-black border border-diesel-border group relative">
                {/* Label */}
                <div className="absolute top-0 left-0 right-0 bg-diesel-black/80 px-1 py-0.5 text-[9px] text-diesel-paper z-10 truncate">
                  {graphic.pose} • {graphic.expression} • {graphic.angle}°
                </div>
                
                {/* Image */}
                <div className="aspect-square pt-4">
                  {graphic.image ? (
                    <img 
                      src={graphic.image} 
                      alt={`${graphic.pose} ${graphic.expression}`}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setPreviewImage(graphic.image)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-diesel-steel">
                      <User size={24} />
                    </div>
                  )}
                </div>
                
                {/* Delete on hover */}
                <button
                  onClick={() => deleteGraphic(selectedActor.id, graphic.id)}
                  className="absolute top-5 right-1 p-1 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reference Images */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Reference Images (for AI Generation)
        </h3>
        <p className="text-xs text-diesel-steel mb-4">
          Upload reference photos to help the AI generate consistent character graphics.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {/* Close-up reference */}
          <div>
            <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold mb-2 block">Face / Close-up</label>
            {selectedActor.referenceImageCloseUp ? (
              <div className="relative group aspect-square">
                <img 
                  src={selectedActor.referenceImageCloseUp} 
                  alt="Close-up reference" 
                  className="w-full h-full object-cover border border-diesel-border"
                />
                <button
                  onClick={() => updateActor(selectedActor.id, { referenceImageCloseUp: undefined })}
                  className="absolute top-1 right-1 p-1 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 aspect-square border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
                <Camera size={24} />
                <span className="text-xs text-center">Upload Face<br/>Reference</span>
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
            <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold mb-2 block">Full Body</label>
            {selectedActor.referenceImageFullBody ? (
              <div className="relative group aspect-square">
                <img 
                  src={selectedActor.referenceImageFullBody} 
                  alt="Full body reference" 
                  className="w-full h-full object-cover border border-diesel-border"
                />
                <button
                  onClick={() => updateActor(selectedActor.id, { referenceImageFullBody: undefined })}
                  className="absolute top-1 right-1 p-1 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 aspect-square border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
                <User size={24} />
                <span className="text-xs text-center">Upload Body<br/>Reference</span>
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
      </section>

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

      {/* Actions */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={async () => {
            const library = await loadLibraryFromDB();
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
          className="flex-1 py-2 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
        >
          Delete Actor
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
