import { useState } from 'react';
import { GameData, Actor, ActorGraphic, SelectionState } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { VoiceBrowser } from '@/components/VoiceBrowser';
import { POSES, EXPRESSIONS, ANGLES } from '@/constants';
import { Plus, Trash2, Upload, User, Image, Mic, ChevronRight, Play, Sparkles, Loader2, Camera, AlertTriangle, X, ZoomIn, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ActorEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
  styleGuide?: string | null;
}

export const ActorEditor: React.FC<ActorEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
  const [showVoiceBrowser, setShowVoiceBrowser] = useState(false);
  const [generatingGraphic, setGeneratingGraphic] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [styleLock, setStyleLock] = useState(true); // Default ON for style adherence
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptOverride, setPromptOverride] = useState<Record<string, string>>({});

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
      prompt += '\n\nMANDATORY ART STYLE: Bold black outline, simple flat fill colors, NO shading or gradients, only a few light interior lines for details.';
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
    };
    onChange({ ...game, actors: [...game.actors, newActor] });
    onSelect('actor', newActor.id);
  };

  const updateActor = (id: string, updates: Partial<Actor>) => {
    onChange({
      ...game,
      actors: game.actors.map(a => a.id === id ? { ...a, ...updates } : a),
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

  const generateGraphic = async (actorId: string, graphicId: string) => {
    const actor = game.actors.find(a => a.id === actorId);
    const graphic = actor?.graphics.find(g => g.id === graphicId);
    if (!actor || !graphic) return;

    setGeneratingGraphic(graphicId);
    toast.info('Generating character graphic...');

    try {
      // Use override prompt if provided, otherwise build from settings
      const finalPrompt = promptOverride[graphicId]?.trim() || buildGraphicPrompt(actor, graphic);

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
            referenceImageCloseUp: actor.referenceImageCloseUp,
            referenceImageFullBody: actor.referenceImageFullBody,
            styleGuide,
            enforceStyleGuide: styleLock && !promptOverride[graphicId]?.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      if (data.imageUrl) {
        // Apply chroma-key background removal
        toast.info('Removing background...');
        const transparentImage = await removeBackgroundGlobal(data.imageUrl);
        updateGraphic(actorId, graphicId, { 
          image: transparentImage,
          generatedPrompt: finalPrompt, // Store the full prompt used
        });
        toast.success('Character graphic generated!');
      } else {
        throw new Error('No image returned from generation');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingGraphic(null);
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
      <button
        onClick={() => onSelect('actor', null)}
        className="text-sm text-diesel-steel hover:text-diesel-gold flex items-center gap-1"
      >
        ← Back to Actors
      </button>
      
      {/* Basic Info */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Character Info
        </h3>
        <CyberInput
          label="Name"
          value={selectedActor.name}
          onChange={(e) => updateActor(selectedActor.id, { name: e.target.value })}
        />
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

      {/* Graphics */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest border-b border-diesel-border pb-2 flex-1">
            Graphics ({selectedActor.graphics.length})
          </h3>
          <button
            onClick={() => addGraphic(selectedActor.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
        
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
        
        <div className="space-y-4">
          {selectedActor.graphics.map((graphic, idx) => (
            <div key={graphic.id} className="bg-diesel-black border border-diesel-border p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs text-diesel-steel font-mono">#{idx + 1}</span>
                <button
                  onClick={() => deleteGraphic(selectedActor.id, graphic.id)}
                  className="text-diesel-rust hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                <select
                  value={graphic.pose}
                  onChange={(e) => updateGraphic(selectedActor.id, graphic.id, { pose: e.target.value })}
                  className="bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 focus:outline-none focus:border-diesel-gold"
                >
                  {allPoses.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={graphic.expression}
                  onChange={(e) => updateGraphic(selectedActor.id, graphic.id, { expression: e.target.value })}
                  className="bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 focus:outline-none focus:border-diesel-gold"
                >
                  {allExpressions.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select
                  value={graphic.angle}
                  onChange={(e) => updateGraphic(selectedActor.id, graphic.id, { angle: Number(e.target.value) })}
                  className="bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 focus:outline-none focus:border-diesel-gold"
                >
                  {ANGLES.map(a => <option key={a} value={a}>{a}°</option>)}
                </select>
              </div>
              
              {/* Full Prompt Editor Toggle */}
              <div className="mb-3">
                <button
                  onClick={() => {
                    if (editingPromptId !== graphic.id) {
                      setPromptOverride(prev => ({
                        ...prev,
                        [graphic.id]: buildGraphicPrompt(selectedActor, graphic)
                      }));
                      setEditingPromptId(graphic.id);
                    } else {
                      setEditingPromptId(null);
                    }
                  }}
                  className="text-xs text-diesel-steel hover:text-diesel-paper flex items-center gap-1"
                >
                  {editingPromptId === graphic.id ? '▼' : '▶'} Full Prompt
                </button>
                
                {editingPromptId === graphic.id && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={promptOverride[graphic.id] || buildGraphicPrompt(selectedActor, graphic)}
                      onChange={(e) => setPromptOverride(prev => ({ ...prev, [graphic.id]: e.target.value }))}
                      className="w-full h-40 bg-diesel-black border border-diesel-gold/50 text-diesel-paper p-2 text-xs font-mono resize-none focus:outline-none focus:border-diesel-gold"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setPromptOverride(prev => ({ ...prev, [graphic.id]: buildGraphicPrompt(selectedActor, graphic) }))}
                        className="text-xs text-diesel-steel hover:text-diesel-paper px-2 py-1 border border-diesel-border"
                      >
                        Reset
                      </button>
                      {promptOverride[graphic.id] && promptOverride[graphic.id] !== buildGraphicPrompt(selectedActor, graphic) && (
                        <span className="text-xs text-diesel-gold">✓ Custom prompt</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Show last generated prompt if available */}
                {graphic.generatedPrompt && editingPromptId !== graphic.id && (
                  <div className="mt-2 p-2 bg-diesel-panel border border-diesel-border">
                    <div className="text-xs text-diesel-steel mb-1">Generated with:</div>
                    <div className="text-xs text-diesel-paper font-mono max-h-12 overflow-y-auto">
                      {graphic.generatedPrompt.slice(0, 150)}...
                    </div>
                  </div>
                )}
              </div>
              
              {graphic.image ? (
                <div className="relative group">
                  <img 
                    src={graphic.image} 
                    alt="Graphic" 
                    className="w-full h-32 object-contain bg-diesel-panel cursor-pointer" 
                    onClick={() => setPreviewImage(graphic.image)}
                  />
                  <button
                    onClick={() => setPreviewImage(graphic.image)}
                    className="absolute top-1 left-1 p-1 bg-diesel-panel/80 border border-diesel-border text-diesel-steel hover:text-diesel-gold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                    <div className="pointer-events-auto flex gap-2">
                      <label className="px-2 py-1 bg-diesel-panel border border-diesel-border text-diesel-paper text-xs cursor-pointer hover:border-diesel-gold">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(selectedActor.id, graphic.id, e)}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={() => generateGraphic(selectedActor.id, graphic.id)}
                        disabled={generatingGraphic === graphic.id}
                        className="px-2 py-1 bg-diesel-green/50 border border-diesel-green text-white text-xs hover:bg-diesel-green disabled:opacity-50"
                      >
                        {generatingGraphic === graphic.id ? 'Gen...' : 'Regen'}
                      </button>
                      <button
                        onClick={() => updateGraphic(selectedActor.id, graphic.id, { image: '' })}
                        className="px-2 py-1 bg-diesel-rust/50 border border-diesel-rust text-white text-xs hover:bg-diesel-rust"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 h-24 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
                    <Image size={20} />
                    <span className="text-sm">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(selectedActor.id, graphic.id, e)}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => generateGraphic(selectedActor.id, graphic.id)}
                    disabled={generatingGraphic === graphic.id}
                    className="flex-1 flex items-center justify-center gap-2 h-24 border border-diesel-green text-diesel-green hover:bg-diesel-green/20 transition-colors disabled:opacity-50"
                  >
                    {generatingGraphic === graphic.id ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        <span className="text-sm">Generate</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Delete Actor */}
      <button
        onClick={() => deleteActor(selectedActor.id)}
        className="w-full py-2 mt-6 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
      >
        Delete Actor
      </button>

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
