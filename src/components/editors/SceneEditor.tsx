import { useState, useRef, useCallback } from 'react';
import { GameData, Scene, StageElement, SelectionState, Actor, ActorGraphic } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { SCENE_TYPES, POSES, EXPRESSIONS, ANGLES } from '@/constants';
import { Plus, Trash2, Video, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, MessageSquare, User, Package, X, Sparkles, Wand2, Check, Lock, ZoomIn } from 'lucide-react';
import DieselpunkLoader from '@/components/DieselpunkLoader';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SceneEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
  styleGuide?: string | null;
}

// Actor generator state for scene editor
interface ActorGeneratorState {
  active: boolean;
  actorId: string | null;
  elementId: string | null; // null when adding new, set when editing existing
  dropX: number;
  dropY: number;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showScript, setShowScript] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Actor generator state
  const [actorGenerator, setActorGenerator] = useState<ActorGeneratorState>({
    active: false, actorId: null, elementId: null, dropX: 50, dropY: 50
  });
  const [genPose, setGenPose] = useState('Neutral');
  const [genExpression, setGenExpression] = useState('Neutral');
  const [genAngle, setGenAngle] = useState(0);
  const [genPrompt, setGenPrompt] = useState('');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [styleLock, setStyleLock] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Combine default poses/expressions with custom ones from settings
  const allPoses = [...POSES, ...(game.info.customPoses || [])];
  const allExpressions = [...EXPRESSIONS, ...(game.info.customExpressions || [])];

  const selectedScene = selection.id 
    ? game.scenes.find(s => s.id === selection.id) 
    : null;
  
  const selectedElement = selectedScene?.stage?.find(e => e.id === selectedElementId);
  const generatorActor = actorGenerator.actorId ? game.actors.find(a => a.id === actorGenerator.actorId) : null;

  const createScene = () => {
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      name: 'New Scene',
      sceneType: 'Dialogue',
      stage: [],
      script: '',
    };
    onChange({ ...game, scenes: [...game.scenes, newScene] });
    onSelect('scene', newScene.id);
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    onChange({
      ...game,
      scenes: game.scenes.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  const deleteScene = (id: string) => {
    onChange({ ...game, scenes: game.scenes.filter(s => s.id !== id) });
    onSelect('scene', null);
  };

  const updateActor = (actorId: string, updates: Partial<Actor>) => {
    onChange({
      ...game,
      actors: game.actors.map(a => a.id === actorId ? { ...a, ...updates } : a),
    });
  };

  // Opens actor generator instead of immediately adding
  const handleAddActor = (actorId: string) => {
    const actor = game.actors.find(a => a.id === actorId);
    if (!actor) return;
    
    // If actor has graphics, show picker mode; otherwise go to generator
    setActorGenerator({ active: true, actorId, elementId: null, dropX: 50, dropY: 50 });
    setGenPrompt('');
    setGeneratedPreview(null);
    setSelectedElementId(null);
  };

  // Called when user selects a graphic from the library or commits a generated one
  const addActorWithGraphic = (graphic: ActorGraphic) => {
    if (!actorGenerator.actorId || !selectedScene) return;

    if (actorGenerator.elementId) {
      // Editing existing element
      updateStageElement(selectedScene.id, actorGenerator.elementId, {
        pose: graphic.pose,
        expression: graphic.expression,
        spriteAngle: graphic.angle,
      });
    } else {
      // Adding new element
      const scene = game.scenes.find(s => s.id === selectedScene.id);
      if (!scene) return;
      
      const newElement: StageElement = {
        id: `element_${Date.now()}`,
        assetId: actorGenerator.actorId,
        type: 'ACTOR',
        x: actorGenerator.dropX,
        y: actorGenerator.dropY,
        scale: 1,
        zIndex: (scene.stage?.length || 0) + 1,
        rotation: 0,
        pose: graphic.pose,
        expression: graphic.expression,
        spriteAngle: graphic.angle,
      };
      updateScene(selectedScene.id, { stage: [...(scene.stage || []), newElement] });
      setSelectedElementId(newElement.id);
    }
    
    closeGenerator();
  };

  const closeGenerator = () => {
    setActorGenerator({ active: false, actorId: null, elementId: null, dropX: 50, dropY: 50 });
    setGeneratedPreview(null);
    setGenPrompt('');
    setEditPrompt('');
  };

  const addStageElement = (sceneId: string, type: StageElement['type'], assetId?: string) => {
    const scene = game.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    const newElement: StageElement = {
      id: `element_${Date.now()}`,
      assetId: assetId || '',
      type,
      x: 50,
      y: 50,
      scale: 1,
      zIndex: (scene.stage?.length || 0) + 1,
      rotation: 0,
      ...(type === 'BALLOON' ? { balloonType: 'SPEECH', text: '' } : {}),
    };
    updateScene(sceneId, { stage: [...(scene.stage || []), newElement] });
    setSelectedElementId(newElement.id);
  };

  const updateStageElement = (sceneId: string, elementId: string, updates: Partial<StageElement>) => {
    const scene = game.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    updateScene(sceneId, {
      stage: scene.stage?.map(e => e.id === elementId ? { ...e, ...updates } : e),
    });
  };

  const deleteStageElement = (sceneId: string, elementId: string) => {
    const scene = game.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    updateScene(sceneId, {
      stage: scene.stage?.filter(e => e.id !== elementId),
    });
    setSelectedElementId(null);
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

  // Build prompt for generator
  const buildGeneratorPrompt = (actor: Actor): string => {
    const isCloseup = genPose === 'Closeup';
    const frameInstruction = isCloseup 
      ? 'CLOSE-UP SHOT focusing on face and upper shoulders' 
      : 'FULL BODY SHOT from head to toe';
    
    const angleDescription = getAngleDescription(genAngle);
    
    let prompt = `IDENTITY: Generate a character portrait of \"${actor.name}\".\n\nPOSE & EXPRESSION:\n- Pose: ${genPose}\n- Expression: ${genExpression}\n- Camera Angle: ${angleDescription}\n\nFRAMING: ${frameInstruction}\n\nART STYLE: Match the provided style reference exactly. This is for a visual novel game - clean lines, dramatic lighting, high quality character art.\n\nCRITICAL BACKGROUND INSTRUCTION: The character MUST be rendered on a SOLID BRIGHT GREEN BACKGROUND (#00FF00). This is essential for chroma-key compositing. No gradients, no shadows on background, pure solid green (#00FF00) everywhere except the character.\n\nNEGATIVE: No text, no watermarks, no multiple characters, no complex backgrounds.`;

    if (styleLock) {
      prompt += '\n\nMANDATORY ART STYLE: Bold black outline, simple flat fill colors, NO shading or gradients, only a few light interior lines for details.';
    }
    
    return prompt;
  };

  // Chroma-key background removal
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
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });
  };

  // Generate a new pose preview
  const handleGeneratePreview = async () => {
    if (!generatorActor) return;
    
    setIsGenerating(true);
    toast.info('Generating character graphic...');
    
    const finalPrompt = genPrompt.trim() || buildGeneratorPrompt(generatorActor);

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
            referenceImageCloseUp: generatorActor.referenceImageCloseUp,
            referenceImageFullBody: generatorActor.referenceImageFullBody,
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
        toast.success('Preview generated!');
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

  // Commit preview to library AND add to stage
  const handleCommitToStage = () => {
    if (!generatorActor || !generatedPreview) return;
    
    const newGraphic: ActorGraphic = {
      id: `graphic_${Date.now()}`,
      pose: genPose,
      expression: genExpression,
      angle: genAngle,
      image: generatedPreview,
      generatedPrompt: genPrompt.trim() || buildGeneratorPrompt(generatorActor),
    };
    
    // Add to actor's library
    updateActor(generatorActor.id, { 
      graphics: [...generatorActor.graphics, newGraphic] 
    });
    
    // Add to stage
    addActorWithGraphic(newGraphic);
    
    toast.success('Pose added to library and stage!');
  };

  // Reset prompt to auto-generated
  const resetPrompt = () => {
    if (generatorActor) {
      setGenPrompt(buildGeneratorPrompt(generatorActor));
    }
  };

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(elementId);
    setDragging(elementId);
    closeGenerator();

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const element = selectedScene?.stage?.find(el => el.id === elementId);
      if (element) {
        const elementX = (element.x / 100) * rect.width;
        const elementY = (element.y / 100) * rect.height;
        setDragOffset({
          x: e.clientX - rect.left - elementX,
          y: e.clientY - rect.top - elementY,
        });
      }
    }
  }, [selectedScene]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current || !selectedScene) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100));

    updateStageElement(selectedScene.id, dragging, { x, y });
  }, [dragging, dragOffset, selectedScene]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedElementId(null);
      closeGenerator();
    }
  }, []);

  // Get background drop image
  const backgroundDrop = selectedScene?.dropId
    ? game.drops.find(d => d.id === selectedScene.dropId)
    : null;

  // Scene List View
  if (!selectedScene) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-diesel-steel">
            {game.scenes.length} scene{game.scenes.length !== 1 ? 's' : ''} defined
          </p>
          <button
            onClick={createScene}
            className="flex items-center gap-2 px-3 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
          >
            <Plus size={14} />
            New Scene
          </button>
        </div>
        
        <div className="space-y-2">
          {game.scenes.map((scene, idx) => (
            <button
              key={scene.id}
              onClick={() => onSelect('scene', scene.id)}
              className="w-full flex items-center gap-3 p-3 bg-diesel-black border border-diesel-border hover:border-diesel-rust transition-colors text-left"
            >
              <div className="w-10 h-10 bg-diesel-panel border border-diesel-border flex items-center justify-center text-diesel-rust">
                <Video size={20} />
              </div>
              <div className="flex-1">
                <div className="text-diesel-paper font-bold">{scene.name}</div>
                <div className="text-xs text-diesel-steel">
                  {scene.sceneType || 'Dialogue'} • {scene.stage?.length || 0} elements
                </div>
              </div>
              <span className="text-xs text-diesel-steel font-mono">#{idx + 1}</span>
              <ChevronRight size={16} className="text-diesel-steel" />
            </button>
          ))}
        </div>
        
        {game.scenes.length === 0 && (
          <div className="text-center py-12 text-diesel-steel">
            <Video size={48} className="mx-auto mb-4 opacity-30" />
            <p>No scenes yet. Create your first scene!</p>
          </div>
        )}
      </div>
    );
  }

  // Scene Detail View - Full-Width Stage Builder
  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Controls */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {/* Back Button */}
        <button
          onClick={() => onSelect('scene', null)}
          className="flex items-center gap-2 text-sm text-diesel-steel hover:text-diesel-rust transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Scenes
        </button>

        {/* Actor Generator Panel - Shows when adding/editing actor */}
        {actorGenerator.active && generatorActor && (
          <section className="bg-diesel-black border-2 border-diesel-gold p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-diesel-gold uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={12} />
                Generate: {generatorActor.name}
              </h3>
              <button onClick={closeGenerator} className="p-1 text-diesel-steel hover:text-diesel-paper">
                <X size={14} />
              </button>
            </div>
            
            {/* Existing Graphics */}
            {generatorActor.graphics.length > 0 && (
              <div className="mb-3">
                <label className="text-[10px] text-diesel-steel uppercase mb-1 block">Existing Poses</label>
                <div className="grid grid-cols-4 gap-1 max-h-24 overflow-y-auto">
                  {generatorActor.graphics.map(graphic => (
                    <button
                      key={graphic.id}
                      onClick={() => addActorWithGraphic(graphic)}
                      className="aspect-square bg-diesel-panel border border-diesel-border hover:border-diesel-gold overflow-hidden"
                      title={`${graphic.pose} • ${graphic.expression}`}
                    >
                      {graphic.image ? (
                        <img src={graphic.image} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <User size={12} className="w-full h-full p-1 text-diesel-steel" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Divider */}
            <div className="border-t border-diesel-border my-3" />
            
            {/* Style Lock */}
            <button
              onClick={() => setStyleLock(!styleLock)}
              className={`flex items-center gap-2 w-full mb-2 py-1.5 px-2 border text-[10px] font-bold uppercase transition-colors ${
                styleLock 
                  ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold' 
                  : 'bg-diesel-panel border-diesel-border text-diesel-steel hover:border-diesel-paper'
              }`}
            >
              <Lock size={10} />
              <span className="flex-1 text-left">Style Lock</span>
              <span>{styleLock ? 'ON' : 'OFF'}</span>
            </button>
            
            {/* Parameter Selectors */}
            <div className="grid grid-cols-3 gap-1 mb-2">
              <div>
                <label className="text-[9px] text-diesel-steel uppercase mb-0.5 block">Pose</label>
                <select
                  value={genPose}
                  onChange={(e) => { setGenPose(e.target.value); setGenPrompt(''); }}
                  className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-[10px] p-1"
                >
                  {allPoses.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-diesel-steel uppercase mb-0.5 block">Expression</label>
                <select
                  value={genExpression}
                  onChange={(e) => { setGenExpression(e.target.value); setGenPrompt(''); }}
                  className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-[10px] p-1"
                >
                  {allExpressions.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-diesel-steel uppercase mb-0.5 block">Angle</label>
                <select
                  value={genAngle}
                  onChange={(e) => { setGenAngle(Number(e.target.value)); setGenPrompt(''); }}
                  className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-[10px] p-1"
                >
                  {ANGLES.map(a => <option key={a} value={a}>{a}°</option>)}
                </select>
              </div>
            </div>
            
            {/* Prompt Editor */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[9px] text-diesel-gold uppercase">Prompt to Nano Banana</label>
                <button onClick={resetPrompt} className="text-[9px] text-diesel-steel hover:text-diesel-paper">
                  Reset
                </button>
              </div>
              <textarea
                value={genPrompt || buildGeneratorPrompt(generatorActor)}
                onChange={(e) => setGenPrompt(e.target.value)}
                className="w-full h-20 bg-diesel-dark border border-diesel-border text-diesel-paper p-1.5 text-[9px] font-mono resize-none focus:outline-none focus:border-diesel-gold"
              />
            </div>
            
            {/* Generate Button */}
            <button
              onClick={handleGeneratePreview}
              disabled={isGenerating}
              className="w-full py-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase text-[10px] hover:bg-diesel-green/30 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Sparkles size={12} />
              Generate Preview
            </button>
            
            {/* Loading State */}
            {isGenerating && (
              <div className="mt-4 flex justify-center">
                <DieselpunkLoader size="sm" message="GENERATING..." />
              </div>
            )}
            
            {/* Preview & Edit Area */}
            {generatedPreview && !isGenerating && (
              <div className="mt-3 border-t border-diesel-border pt-3">
                {/* Preview Image */}
                <div className="aspect-square bg-diesel-panel border border-diesel-border relative group mb-2">
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
                    <ZoomIn size={10} />
                  </button>
                </div>
                
                {/* Edit Controls */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] text-diesel-gold uppercase mb-0.5 block">Fine-tune with AI</label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="e.g., Make the eyes bigger..."
                      className="w-full h-12 bg-diesel-dark border border-diesel-border text-diesel-paper p-1.5 text-[10px] resize-none focus:outline-none focus:border-diesel-gold"
                    />
                  </div>
                  
                  {/* Editing Loading State */}
                  {isEditing ? (
                    <div className="flex justify-center py-2">
                      <DieselpunkLoader size="sm" message="EDITING..." />
                    </div>
                  ) : (
                    <button
                      onClick={handleEditPreview}
                      disabled={!editPrompt.trim()}
                      className="w-full py-1.5 bg-diesel-panel border border-diesel-paper text-diesel-paper text-[10px] font-bold uppercase hover:bg-diesel-paper/20 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Wand2 size={10} />
                      Edit
                    </button>
                  )}
                  
                  {/* Commit Button */}
                  <button
                    onClick={handleCommitToStage}
                    disabled={isEditing}
                    className="w-full py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Check size={12} />
                    Commit to Library & Stage
                  </button>
                  
                  {/* Discard */}
                  <button
                    onClick={() => { setGeneratedPreview(null); setEditPrompt(''); }}
                    disabled={isEditing}
                    className="w-full py-1 text-diesel-rust text-[10px] hover:underline disabled:opacity-50"
                  >
                    Discard Preview
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Scene Info - Only show when not in generator mode */}
        {!actorGenerator.active && (
          <>
            <section className="bg-diesel-black border border-diesel-border p-3">
              <h3 className="text-xs font-bold text-diesel-rust uppercase tracking-widest mb-3">Scene Info</h3>
              <CyberInput
                label="Name"
                value={selectedScene.name}
                onChange={(e) => updateScene(selectedScene.id, { name: e.target.value })}
              />
              <div className="flex flex-col gap-1 mb-3">
                <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Type</label>
                <select
                  value={selectedScene.sceneType || 'Dialogue'}
                  onChange={(e) => updateScene(selectedScene.id, { sceneType: e.target.value })}
                  className="bg-diesel-panel border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
                >
                  {SCENE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Background</label>
                <select
                  value={selectedScene.dropId || ''}
                  onChange={(e) => updateScene(selectedScene.id, { dropId: e.target.value || undefined })}
                  className="bg-diesel-panel border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
                >
                  <option value="">No background</option>
                  {game.drops.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </section>

            {/* Asset Palette */}
            <section className="bg-diesel-black border border-diesel-border p-3">
              <h3 className="text-xs font-bold text-diesel-rust uppercase tracking-widest mb-3">Add to Stage</h3>
              
              {/* Actors */}
              <div className="mb-3">
                <div className="flex items-center gap-1 text-xs text-diesel-steel mb-2">
                  <User size={12} />
                  <span className="uppercase tracking-wider">Actors</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {game.actors.map(actor => (
                    <button
                      key={actor.id}
                      onClick={() => handleAddActor(actor.id)}
                      className="px-2 py-1 bg-diesel-panel border border-diesel-border text-xs text-diesel-paper hover:border-diesel-gold transition-colors flex items-center gap-1"
                    >
                      {actor.graphics[0]?.image && (
                        <img src={actor.graphics[0].image} alt="" className="w-4 h-4 rounded object-cover" />
                      )}
                      {actor.name}
                    </button>
                  ))}
                  {game.actors.length === 0 && (
                    <span className="text-xs text-diesel-steel italic">No actors</span>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="mb-3">
                <div className="flex items-center gap-1 text-xs text-diesel-steel mb-2">
                  <Package size={12} />
                  <span className="uppercase tracking-wider">Items</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {game.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addStageElement(selectedScene.id, 'ITEM', item.id)}
                      className="px-2 py-1 bg-diesel-panel border border-diesel-border text-xs text-diesel-paper hover:border-diesel-gold transition-colors flex items-center gap-1"
                    >
                      {item.visualAsset && (
                        <img src={item.visualAsset} alt="" className="w-4 h-4 rounded object-contain" />
                      )}
                      {item.name}
                    </button>
                  ))}
                  {game.items.length === 0 && (
                    <span className="text-xs text-diesel-steel italic">No items</span>
                  )}
                </div>
              </div>

              {/* Balloon */}
              <button
                onClick={() => addStageElement(selectedScene.id, 'BALLOON')}
                className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-diesel-gold/10 border border-dashed border-diesel-gold/50 text-diesel-gold text-xs uppercase font-bold hover:bg-diesel-gold/20 transition-colors"
              >
                <MessageSquare size={14} />
                Add Balloon
              </button>
            </section>

            {/* Selected Element Properties */}
            {selectedElement && (
              <section className="bg-diesel-black border-2 border-diesel-gold p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-diesel-gold uppercase tracking-widest">
                    {selectedElement.type === 'ACTOR' ? 'Actor' : selectedElement.type === 'ITEM' ? 'Item' : 'Balloon'}
                  </h3>
                  <button
                    onClick={() => deleteStageElement(selectedScene.id, selectedElement.id)}
                    className="p-1 text-diesel-rust hover:bg-diesel-rust/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Type-specific properties */}
                {selectedElement.type === 'ACTOR' && (
                  <div className="mb-3">
                    <label className="text-xs text-diesel-steel">Actor</label>
                    <select
                      value={selectedElement.assetId || ''}
                      onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { assetId: e.target.value })}
                      className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 mt-1"
                    >
                      <option value="">Select Actor</option>
                      {game.actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}

                {selectedElement.type === 'ITEM' && (
                  <div className="mb-3">
                    <label className="text-xs text-diesel-steel">Item</label>
                    <select
                      value={selectedElement.assetId || ''}
                      onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { assetId: e.target.value })}
                      className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 mt-1"
                    >
                      <option value="">Select Item</option>
                      {game.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                )}

                {selectedElement.type === 'BALLOON' && (
                  <div className="space-y-2 mb-3">
                    <div>
                      <label className="text-xs text-diesel-steel">Type</label>
                      <select
                        value={selectedElement.balloonType || 'SPEECH'}
                        onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { balloonType: e.target.value as 'SPEECH' | 'THOUGHT' })}
                        className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 mt-1"
                      >
                        <option value="SPEECH">Speech</option>
                        <option value="THOUGHT">Thought</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-diesel-steel">Text</label>
                      <textarea
                        value={selectedElement.text || ''}
                        onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { text: e.target.value })}
                        placeholder="Balloon text..."
                        className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 mt-1 h-16 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Common properties */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-xs text-diesel-steel">X %</label>
                    <input
                      type="number"
                      value={selectedElement.x.toFixed(1)}
                      onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { x: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-1 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-diesel-steel">Y %</label>
                    <input
                      type="number"
                      value={selectedElement.y.toFixed(1)}
                      onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { y: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-1 text-center"
                    />
                  </div>
                </div>
                <CyberSlider
                  label="Scale"
                  value={selectedElement.scale}
                  min={0.1}
                  max={3}
                  step={0.1}
                  onChange={(v) => updateStageElement(selectedScene.id, selectedElement.id, { scale: v })}
                />
                <CyberSlider
                  label="Rotation"
                  value={selectedElement.rotation}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={(v) => updateStageElement(selectedScene.id, selectedElement.id, { rotation: v })}
                />
                <div>
                  <label className="text-xs text-diesel-steel">Z-Index</label>
                  <input
                    type="number"
                    value={selectedElement.zIndex}
                    onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { zIndex: parseInt(e.target.value) || 0 })}
                    className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-1 text-center"
                  />
                </div>
              </section>
            )}

            {/* Script Section */}
            <section className="bg-diesel-black border border-diesel-border p-3">
              <button
                onClick={() => setShowScript(!showScript)}
                className="flex items-center justify-between w-full text-xs font-bold text-diesel-rust uppercase tracking-widest"
              >
                Script
                {showScript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showScript && (
                <textarea
                  value={selectedScene.script || ''}
                  onChange={(e) => updateScene(selectedScene.id, { script: e.target.value })}
                  placeholder="Write your scene script here..."
                  className="mt-2 w-full h-32 bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 font-mono resize-none focus:outline-none focus:border-diesel-rust"
                />
              )}
            </section>

            {/* Delete Scene */}
            <button
              onClick={() => deleteScene(selectedScene.id)}
              className="flex items-center justify-center gap-2 py-2 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete Scene
            </button>
          </>
        )}
      </div>

      {/* Right Panel - Visual Stage Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex items-center justify-center bg-diesel-dark/50 border border-diesel-border overflow-hidden">
          <div
            ref={canvasRef}
            className="relative w-full max-w-4xl bg-diesel-panel cursor-crosshair"
            style={{ aspectRatio: '16/9' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
          >
            {/* Background Drop */}
            {backgroundDrop?.image ? (
              <img
                src={backgroundDrop.image}
                alt={backgroundDrop.name}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-diesel-steel text-sm bg-diesel-black">
                <span className="opacity-50">No background selected</span>
              </div>
            )}

            {/* Stage Elements */}
            {selectedScene.stage?.map(element => {
              const actor = element.type === 'ACTOR' ? game.actors.find(a => a.id === element.assetId) : null;
              const item = element.type === 'ITEM' ? game.items.find(i => i.id === element.assetId) : null;
              
              // Find the matching graphic based on pose/expression/angle stored on the element
              const actorGraphic = actor?.graphics.find(g => 
                g.pose === element.pose && 
                g.expression === element.expression && 
                g.angle === element.spriteAngle
              ) || actor?.graphics[0]; // Fallback to first graphic

              return (
                <div
                  key={element.id}
                  className={`absolute cursor-move select-none transition-shadow ${
                    selectedElementId === element.id ? 'ring-2 ring-diesel-gold ring-offset-2 ring-offset-transparent' : ''
                  } ${dragging === element.id ? 'z-50' : ''}`}
                  style={{
                    left: `${element.x}%`,
                    top: `${element.y}%`,
                    transform: `translate(-50%, -50%) scale(${element.scale}) rotate(${element.rotation}deg)`,
                    zIndex: dragging === element.id ? 1000 : element.zIndex,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, element.id)}
                  onDoubleClick={() => {
                    if (element.type === 'ACTOR' && actor) {
                      // Double-click opens generator for editing
                      setActorGenerator({ 
                        active: true, 
                        actorId: actor.id, 
                        elementId: element.id,
                        dropX: element.x,
                        dropY: element.y
                      });
                      setGenPrompt('');
                      setGeneratedPreview(null);
                      setSelectedElementId(null);
                    }
                  }}
                >
                  {element.type === 'ACTOR' && (
                    actorGraphic?.image ? (
                      <img
                        src={actorGraphic.image}
                        alt={actor?.name}
                        className="max-w-32 max-h-40 object-contain pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-16 h-20 bg-diesel-gold/20 border-2 border-diesel-gold/50 flex items-center justify-center">
                        <User size={24} className="text-diesel-gold/70" />
                      </div>
                    )
                  )}

                  {element.type === 'ITEM' && (
                    item?.visualAsset ? (
                      <img
                        src={item.visualAsset}
                        alt={item.name}
                        className="max-w-24 max-h-24 object-contain pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-diesel-gold/20 border-2 border-diesel-gold/50 flex items-center justify-center">
                        <Package size={20} className="text-diesel-gold/70" />
                      </div>
                    )
                  )}

                  {element.type === 'BALLOON' && (
                    <div
                      className={`px-3 py-2 max-w-48 text-sm ${
                        element.balloonType === 'THOUGHT'
                          ? 'bg-diesel-paper/90 rounded-full border-2 border-dashed border-diesel-steel text-diesel-black'
                          : 'bg-diesel-paper/90 border-2 border-diesel-steel text-diesel-black'
                      }`}
                    >
                      {element.text || (
                        <span className="text-diesel-steel italic">Empty balloon</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
