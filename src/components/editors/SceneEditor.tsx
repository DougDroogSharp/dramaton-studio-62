import { useState, useRef, useCallback } from 'react'; // Scene Editor
import { GameData, Scene, StageElement, SelectionState, Actor, ActorGraphic, SceneAudio, AssetStatus } from '@/types';
import { identityLine, pickIdentityRef } from '@/utils/actorIdentity';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { SCENE_TYPES, POSES, EXPRESSIONS, ANGLES } from '@/constants';
import { Plus, Trash2, Video, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, MessageSquare, User, Package, X, Sparkles, Wand2, Check, Lock, ZoomIn, Music, Upload, Play, Pause, Volume2, Archive, Eye, FileText } from 'lucide-react';
import DieselpunkLoader from '@/components/DieselpunkLoader';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { loadLibraryFromDB, saveLibraryToDB, addSceneToLibrary } from '@/utils/library';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { NotesSection } from '@/components/NotesSection';
import { ScenePreview } from '@/components/theater/ScenePreview';
import { Stage } from '@/components/Stage';
import { DramScriptEditor } from '@/components/editors/DramScriptEditor';
import { SceneTextPanel } from '@/components/editors/SceneTextPanel';
import { NarratonEditor } from '@/components/editors/NarratonEditor';

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
  const [showAudio, setShowAudio] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Button dragging state
  const [selectedButtonId, setSelectedButtonId] = useState<string | null>(null);
  const [draggingButton, setDraggingButton] = useState<string | null>(null);
  const [buttonDragOffset, setButtonDragOffset] = useState({ x: 0, y: 0 });
  
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
  const [showScenePreview, setShowScenePreview] = useState(false);
  const [showAllText, setShowAllText] = useState(false);
  // Combine default poses/expressions with custom ones from settings
  const allPoses = [...POSES, ...(game.info.customPoses || [])];
  const allExpressions = [...EXPRESSIONS, ...(game.info.customExpressions || [])];

  const selectedScene = selection.id 
    ? game.scenes.find(s => s.id === selection.id) 
    : null;
  
  const selectedElement = selectedScene?.stage?.find(e => e.id === selectedElementId);
  const generatorActor = actorGenerator.actorId ? game.actors.find(a => a.id === actorGenerator.actorId) : null;

  // New scenes must choose a backdrop up front (changeable later in
  // Scene Info); the picker dialog calls this with the choice.
  const [showBackdropPicker, setShowBackdropPicker] = useState(false);

  const createScene = (dropId: string | null) => {
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      name: 'New Scene',
      sceneType: 'AGENCY',
      // Scene.dropId is optional, not nullable; null means "none chosen".
      dropId: dropId ?? undefined,
      stage: [],
      script: '',
      status: 'new',
      note: '',
    };
    onChange({ ...game, scenes: [...game.scenes, newScene] });
    onSelect('scene', newScene.id);
    setShowBackdropPicker(false);
  };

  // Update scene with auto-promotion to 'work' when content changes
  const updateScene = (id: string, updates: Partial<Scene>) => {
    const currentScene = game.scenes.find(s => s.id === id);
    if (!currentScene) return;
    
    const updatedScene = { ...currentScene, ...updates };
    
    // Auto-promote to 'work' if currently 'new' and content is being edited
    let newStatus = updatedScene.status || 'new';
    if (!('status' in updates) && newStatus === 'new') {
      const hasContent = 
        updatedScene.name !== 'New Scene' ||
        updatedScene.dropId ||
        (updatedScene.script && updatedScene.script.trim().length > 0) ||
        (updatedScene.stage && updatedScene.stage.length > 0);
      if (hasContent) {
        newStatus = 'work';
      }
    }
    
    onChange({
      ...game,
      scenes: game.scenes.map(s => s.id === id ? { ...updatedScene, status: newStatus } : s),
    });
  };

  // Manual status change - allows setting any status directly
  const setSceneStatus = (id: string, status: AssetStatus) => {
    onChange({
      ...game,
      scenes: game.scenes.map(s => s.id === id ? { ...s, status } : s),
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

  // Audio track handlers
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedScene) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newAudio: SceneAudio = {
        id: `audio_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'bgm',
        url: ev.target?.result as string,
        loop: true,
        volume: 0.7,
      };
      
      updateScene(selectedScene.id, { 
        audioTracks: [...(selectedScene.audioTracks || []), newAudio] 
      });
      toast.success(`Added audio: ${newAudio.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updateAudioTrack = (trackId: string, updates: Partial<SceneAudio>) => {
    if (!selectedScene) return;
    updateScene(selectedScene.id, {
      audioTracks: selectedScene.audioTracks?.map(t => 
        t.id === trackId ? { ...t, ...updates } : t
      ),
    });
  };

  const deleteAudioTrack = (trackId: string) => {
    if (!selectedScene) return;
    stopAudio();
    updateScene(selectedScene.id, {
      audioTracks: selectedScene.audioTracks?.filter(t => t.id !== trackId),
    });
  };

  const playAudio = (track: SceneAudio) => {
    stopAudio();
    const audio = new Audio(track.url);
    audio.loop = track.loop;
    audio.volume = track.volume;
    audio.play();
    audioRef.current = audio;
    setPlayingAudioId(track.id);
    
    audio.onended = () => {
      if (!track.loop) {
        setPlayingAudioId(null);
      }
    };
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudioId(null);
  };

  // Generate DRAM script command for audio
  const getAudioScriptCommand = (track: SceneAudio): string => {
    const loopFlag = track.loop ? ' loop' : '';
    return `[${track.type.toUpperCase()}: "${track.name}"${loopFlag} vol=${Math.round(track.volume * 100)}%]`;
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
    
    let prompt = `${identityLine(actor)}\n\nPOSE & EXPRESSION:\n- Pose: ${genPose}\n- Expression: ${genExpression}\n- Camera Angle: ${angleDescription}\n\nFRAMING: ${frameInstruction}\n\nART STYLE: Match the provided style reference images exactly.\n\nCRITICAL BACKGROUND INSTRUCTION: The character MUST be rendered on a SOLID BRIGHT GREEN BACKGROUND (#00FF00). This is essential for chroma-key compositing. No gradients, no shadows on background, pure solid green (#00FF00) everywhere except the character.\n\nNEGATIVE: No text, no watermarks, no multiple characters, no complex backgrounds.`;

    if (styleLock && !game.info.stylePack) {
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
        '/api/flux-generate', // local Flux bridge (vite-plugin-flux)
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stylePack: game.info.stylePack,
            prompt: finalPrompt,
            referenceImageCloseUp: generatorActor.referenceImageCloseUp,
            // Identity lock: the actor's own sprite beats the uploaded
            // photo, so a new expression is the same person.
            referenceImageFullBody: pickIdentityRef(generatorActor, genPose),
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
        '/api/flux-generate', // local Flux bridge (vite-plugin-flux)
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stylePack: game.info.stylePack,
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
    setDraggingButton(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedElementId(null);
      setSelectedButtonId(null);
      closeGenerator();
    }
  }, []);

  // Button drag handlers
  const handleButtonMouseDown = useCallback((e: React.MouseEvent, buttonId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedButtonId(buttonId);
    setDraggingButton(buttonId);
    setSelectedElementId(null);
    closeGenerator();

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const button = game.buttons.find(b => b.id === buttonId);
      if (button) {
        const buttonX = (button.x / 100) * rect.width;
        const buttonY = (button.y / 100) * rect.height;
        setButtonDragOffset({
          x: e.clientX - rect.left - buttonX,
          y: e.clientY - rect.top - buttonY,
        });
      }
    }
  }, [game.buttons]);

  const handleButtonMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingButton || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left - buttonDragOffset.x) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top - buttonDragOffset.y) / rect.height) * 100));

    // Update button position in game data
    onChange({
      ...game,
      buttons: game.buttons.map(b => b.id === draggingButton ? { ...b, x, y } : b),
    });
  }, [draggingButton, buttonDragOffset, game, onChange]);

  // Combined mouse move handler
  const handleCombinedMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      handleMouseMove(e);
    } else if (draggingButton) {
      handleButtonMouseMove(e);
    }
  }, [dragging, draggingButton, handleMouseMove, handleButtonMouseMove]);

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
            onClick={() => setShowBackdropPicker(true)}
            className="flex items-center gap-2 px-3 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/30 transition-colors"
          >
            <Plus size={14} />
            New Scene
          </button>
        </div>

        {/* Backdrop picker: every new scene starts with a chosen backdrop */}
        <Dialog open={showBackdropPicker} onOpenChange={setShowBackdropPicker}>
          <DialogContent className="max-w-2xl bg-diesel-dark border-diesel-border">
            <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-1">
              Choose a Backdrop
            </h3>
            <p className="text-xs text-diesel-steel mb-3">
              Every scene starts on a backdrop. You can change it later in Scene Info.
            </p>
            <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {game.drops.map(drop => (
                <button
                  key={drop.id}
                  onClick={() => createScene(drop.id)}
                  className="group border border-diesel-border hover:border-diesel-gold transition-colors text-left"
                >
                  <div className="aspect-video bg-diesel-black overflow-hidden">
                    {drop.image ? (
                      <img src={drop.image} alt={drop.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-diesel-steel text-xs">
                        (no image yet)
                      </div>
                    )}
                  </div>
                  <p className="p-1.5 text-xs text-diesel-paper truncate group-hover:text-diesel-gold">
                    {drop.name}
                  </p>
                </button>
              ))}
              <button
                onClick={() => createScene(null)}
                className="border border-dashed border-diesel-border hover:border-diesel-steel transition-colors"
              >
                <div className="aspect-video flex items-center justify-center text-diesel-steel text-xs">
                  (None — no backdrop)
                </div>
                <p className="p-1.5 text-xs text-diesel-steel">Empty black stage</p>
              </button>
            </div>
            {game.drops.length === 0 && (
              <p className="text-diesel-rust text-xs mt-2">
                No drops yet — create backdrops in the DR tab, or start with none.
              </p>
            )}
          </DialogContent>
        </Dialog>
        
        <div className="space-y-2">
          {game.scenes.map((scene, idx) => {
            const statusBorderColor = scene.status === 'done' 
              ? 'border-diesel-green/50 hover:border-diesel-green' 
              : scene.status === 'work' 
                ? 'border-diesel-rust/50 hover:border-diesel-rust' 
                : 'border-diesel-border hover:border-diesel-rust';
            
            return (
              <button
                key={scene.id}
                onClick={() => onSelect('scene', scene.id)}
                className={`w-full flex items-center gap-3 p-3 bg-diesel-black border ${statusBorderColor} transition-colors text-left`}
              >
                <div className="w-10 h-10 bg-diesel-panel border border-diesel-border flex items-center justify-center text-diesel-rust">
                  <Video size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-diesel-paper font-bold">{scene.name}</div>
                  <div className="text-xs text-diesel-steel">
                    {scene.sceneType || 'AGENCY'} • {scene.stage?.length || 0} elements
                  </div>
                </div>
                <StatusBadge status={scene.status || 'new'} size="sm" />
                <span className="text-xs text-diesel-steel font-mono">#{idx + 1}</span>
                <ChevronRight size={16} className="text-diesel-steel" />
              </button>
            );
          })}
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

  // Generate script header comment
  const generateScriptHeader = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const statusLabel = selectedScene.status === 'done' ? 'COMPLETE' : selectedScene.status === 'work' ? 'IN PROGRESS' : 'DRAFT';
    return `# Scene: ${selectedScene.name}\n# Last edited: ${dateStr} at ${timeStr}\n# Status: ${statusLabel}\n\n`;
  };

  // Initialize script with header if empty
  const handleScriptChange = (value: string) => {
    updateScene(selectedScene.id, { script: value });
  };

  // Ensure script has header
  const ensureScriptHeader = () => {
    if (!selectedScene.script || selectedScene.script.trim() === '') {
      updateScene(selectedScene.id, { script: generateScriptHeader() });
    }
  };

  // Scene Detail View - Redesigned Layout
  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header Row */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <button
          onClick={() => onSelect('scene', null)}
          className="flex items-center gap-2 text-sm text-diesel-steel hover:text-diesel-rust transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Scenes
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-diesel-paper font-bold">{selectedScene.name}</span>
          <StatusSelector 
            status={selectedScene.status || 'new'} 
            onChange={(status) => setSceneStatus(selectedScene.id, status)} 
          />
          <button
            onClick={() => setShowAllText(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
            title="Every line of text in this scene, in one editable list"
          >
            <FileText size={14} />
            All Text
          </button>
          <button
            onClick={() => setShowScenePreview(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green text-xs font-bold uppercase hover:bg-diesel-green/30 transition-colors"
            title="Preview this scene"
          >
            <Eye size={14} />
            Preview
          </button>
        </div>
      </div>

      {/* Stage Preview - Large at top */}
      <div className="flex-shrink-0 h-[40%] min-h-[200px] bg-diesel-dark/50 border border-diesel-border">
        <Stage
          scene={selectedScene}
          game={game}
          background={backgroundDrop ?? undefined}
          editable={true}
          selectedElementId={selectedElementId}
          draggingId={dragging}
          onElementSelect={setSelectedElementId}
          onElementMouseDown={handleMouseDown}
          onElementDoubleClick={(element, actor) => {
            if (element.type === 'ACTOR' && actor) {
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
          onMouseMove={handleCombinedMouseMove}
          onMouseUp={handleMouseUp}
          onCanvasClick={handleCanvasClick}
          canvasRef={canvasRef}
          selectedButtonId={selectedButtonId}
          draggingButtonId={draggingButton}
          onButtonSelect={setSelectedButtonId}
          onButtonMouseDown={handleButtonMouseDown}
        />
      </div>

      {/* Two Columns Below Stage */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Left Column - Scene Controls */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
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
              
              {/* Generate Button */}
              <button
                onClick={handleGeneratePreview}
                disabled={isGenerating}
                className="w-full py-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase text-[10px] hover:bg-diesel-green/30 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Sparkles size={12} />
                Generate Preview
              </button>
              
              {isGenerating && (
                <div className="mt-4 flex justify-center">
                  <DieselpunkLoader size="sm" message="GENERATING..." />
                </div>
              )}
              
              {/* Preview & Commit */}
              {generatedPreview && !isGenerating && (
                <div className="mt-3 border-t border-diesel-border pt-3">
                  <div className="flex gap-2">
                    <div className="w-1/2 aspect-square bg-diesel-panel border border-diesel-border relative group">
                      <img 
                        src={generatedPreview} 
                        alt="Preview" 
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => setPreviewImage(generatedPreview)}
                      />
                    </div>
                    <div className="w-1/2 flex flex-col gap-2">
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Fine-tune..."
                        className="flex-1 bg-diesel-dark border border-diesel-border text-diesel-paper p-1.5 text-[10px] resize-none focus:outline-none focus:border-diesel-gold"
                      />
                      {isEditing ? (
                        <div className="flex justify-center py-2">
                          <DieselpunkLoader size="sm" message="EDITING..." />
                        </div>
                      ) : (
                        <button
                          onClick={handleEditPreview}
                          disabled={!editPrompt.trim()}
                          className="py-1.5 bg-diesel-panel border border-diesel-paper text-diesel-paper text-[10px] font-bold uppercase hover:bg-diesel-paper/20 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Wand2 size={10} />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={handleCommitToStage}
                        disabled={isEditing}
                        className="py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Check size={12} />
                        Commit
                      </button>
                    </div>
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
                <div className="mt-3">
                  <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Scene Type</label>
                  <div className="flex gap-1 mt-1">
                    {SCENE_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => updateScene(selectedScene.id, { sceneType: type })}
                        className={`flex-1 py-1.5 border text-[10px] font-bold uppercase transition-colors ${
                          (selectedScene.sceneType || 'AGENCY') === type
                            ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold'
                            : 'bg-diesel-panel border-diesel-border text-diesel-steel hover:border-diesel-paper'
                        }`}
                        title={type === 'AGENCY' ? 'The player acts' : 'The player watches, but reacts'}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 mb-3">
                  <NotesSection 
                    note={selectedScene.note || ''} 
                    onChange={(note) => updateScene(selectedScene.id, { note })} 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Background Drop</label>
                  <select
                    value={selectedScene.dropId === null ? '__none__' : (selectedScene.dropId || '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__none__') {
                        updateScene(selectedScene.id, { dropId: undefined });
                      } else if (value === '') {
                        // Not selected yet
                      } else {
                        updateScene(selectedScene.id, { dropId: value });
                      }
                    }}
                    className={`bg-diesel-panel border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold ${
                      selectedScene.dropId === undefined ? 'border-diesel-rust' : 'border-diesel-border'
                    }`}
                  >
                    {selectedScene.dropId === undefined && (
                      <option value="">-- Select a drop --</option>
                    )}
                    <option value="__none__">(None - No background)</option>
                    {game.drops.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {selectedScene.dropId === undefined && (
                    <p className="text-diesel-rust text-[10px] mt-1">Please select a drop or "(None)"</p>
                  )}
                </div>
              </section>

              {/* Narraton selection metadata */}
              <NarratonEditor
                scene={selectedScene}
                subplots={game.subplots ?? []}
                worldStateVars={Object.keys(game.info.worldState)}
                onChange={(patch) => updateScene(selectedScene.id, patch)}
              />

              {/* Stage Elements */}
              <section className="bg-diesel-black border border-diesel-border p-3">
                <h3 className="text-xs font-bold text-diesel-rust uppercase tracking-widest mb-3">Add to Stage</h3>
                <div className="space-y-2">
                  {game.actors.length > 0 && (
                    <div>
                      <label className="text-[10px] text-diesel-steel uppercase mb-1 block">Actors</label>
                      <div className="flex flex-wrap gap-1">
                        {game.actors.map(actor => (
                          <button
                            key={actor.id}
                            onClick={() => handleAddActor(actor.id)}
                            className="px-2 py-1 bg-diesel-gold/10 border border-diesel-gold/50 text-diesel-gold text-[10px] hover:bg-diesel-gold/20"
                          >
                            {actor.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {game.items.length > 0 && (
                    <div>
                      <label className="text-[10px] text-diesel-steel uppercase mb-1 block">Items</label>
                      <div className="flex flex-wrap gap-1">
                        {game.items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => addStageElement(selectedScene.id, 'ITEM', item.id)}
                            className="px-2 py-1 bg-diesel-paper/10 border border-diesel-paper/50 text-diesel-paper text-[10px] hover:bg-diesel-paper/20"
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => addStageElement(selectedScene.id, 'BALLOON')}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-diesel-paper/10 border border-diesel-paper/50 text-diesel-paper text-xs uppercase font-bold hover:bg-diesel-paper/20"
                  >
                    <MessageSquare size={12} />
                    Add Balloon
                  </button>
                </div>
              </section>

              {/* Selected Element Properties */}
              {selectedElement && (
                <section className="bg-diesel-black border border-diesel-gold p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-diesel-gold uppercase tracking-widest">Element Properties</h3>
                    <button
                      onClick={() => deleteStageElement(selectedScene.id, selectedElement.id)}
                      className="p-1 text-diesel-rust hover:bg-diesel-rust/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
                </section>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const library = await loadLibraryFromDB();
                    const updated = addSceneToLibrary(library, selectedScene, game.info.title);
                    await saveLibraryToDB(updated);
                    toast.success(`"${selectedScene.name}" saved to library!`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
                >
                  <Archive size={14} />
                  Library
                </button>
                <button
                  onClick={() => deleteScene(selectedScene.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Large DramScript Panel */}
        <div className="flex-1 flex flex-col min-h-0 bg-diesel-black border-2 border-diesel-rust">
          <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-diesel-rust bg-diesel-rust/10">
            <h3 className="text-xs font-bold text-diesel-rust uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14} />
              DramScript
            </h3>
            {selectedScene.audioTracks && selectedScene.audioTracks.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedScene.audioTracks.map(track => (
                  <button
                    key={track.id}
                    onClick={() => {
                      const cmd = getAudioScriptCommand(track);
                      const currentScript = selectedScene.script || '';
                      updateScene(selectedScene.id, { script: currentScript + (currentScript ? '\n' : '') + cmd });
                    }}
                    className="px-1.5 py-0.5 bg-diesel-green/20 border border-diesel-green/50 text-diesel-green text-[10px] hover:bg-diesel-green/30"
                    title={`Insert ${track.type.toUpperCase()} command`}
                  >
                    {track.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <DramScriptEditor
              script={selectedScene.script || ''}
              onChange={handleScriptChange}
              game={game}
              onFocus={() => {
                if (!selectedScene.script || selectedScene.script.trim() === '') {
                  updateScene(selectedScene.id, { script: generateScriptHeader() });
                }
              }}
              placeholder={`# Your DramScript here...\n\nDetective: "The clues are all here."\n[ENTER Detective x=50 y=70]`}
            />
          </div>
        </div>
      </div>

      {/* Image Preview */}
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

      {/* All Text - every string in the scene, in one editable list */}
      {showAllText && selectedScene && (
        <SceneTextPanel
          scene={selectedScene}
          game={game}
          onSceneChange={(updates) => updateScene(selectedScene.id, updates)}
          onButtonLabelChange={(buttonId, label) => {
            onChange({
              ...game,
              buttons: game.buttons.map(b => b.id === buttonId ? { ...b, label } : b),
            });
          }}
          onClose={() => setShowAllText(false)}
        />
      )}

      {/* Scene Preview Modal */}
      {showScenePreview && selectedScene && (
        <ScenePreview
          scene={selectedScene}
          game={game}
          onClose={() => setShowScenePreview(false)}
          onUpdateScript={(newScript) => updateScene(selectedScene.id, { script: newScript })}
        />
      )}
    </div>
  );
};