import { useState, useRef, useCallback, useEffect } from 'react'; // Scene Editor
import { GameData, Scene, StageElement, SelectionState, Actor, ActorGraphic, SceneAudio, AssetStatus, MouthPosition } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { SCENE_TYPES, POSES, EXPRESSIONS, ANGLES } from '@/constants';
import { Plus, Trash2, Video, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, MessageSquare, MessageCircle, Type, User, Package, X, Sparkles, Wand2, Check, Lock, ZoomIn, Music, Upload, Play, Pause, Volume2, Archive, Eye, ArrowUp, ArrowDown, MousePointer2, CloudFog } from 'lucide-react';
import DieselpunkLoader from '@/components/DieselpunkLoader';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { loadLibraryFromDB, saveLibraryToDB, addSceneToLibrary, findDuplicateScene, updateSceneInLibrary } from '@/utils/library';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { NotesSection } from '@/components/NotesSection';
import { TagEditor } from '@/components/TagEditor';
import { ScenePreview } from '@/components/theater/ScenePreview';
import { Stage } from '@/components/Stage';
import { DramScriptEditor } from '@/components/editors/DramScriptEditor';
import { supabase } from '@/integrations/supabase/client';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Item } from '@/types';
import { ScriptError } from '@/hooks/useScriptRunner';
import { ScriptErrorDialog, formatItemName } from '@/components/theater/ScriptErrorDialog';

// Unified Thing Selector with submenus for Actors, Items, Comm Balloon, and Text Balloon
interface ThingSelectorProps {
  actors: Actor[];
  items: Item[];
  onSelectActor: (actorId: string, actorName: string) => void;
  onSelectItem: (itemId: string, itemName: string) => void;
  onSelectTalkBalloon: () => void;
  onSelectThoughtBalloon: () => void;
  onSelectTextBalloon: () => void;
  onCreateNewActor: () => void;
  onCreateNewItem: () => void;
}

const ThingSelector: React.FC<ThingSelectorProps> = ({
  actors, items, onSelectActor, onSelectItem, onSelectTalkBalloon, onSelectThoughtBalloon, onSelectTextBalloon,
  onCreateNewActor, onCreateNewItem
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'actors' | 'items' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center gap-1 px-2 py-1 border border-diesel-gold/50 text-diesel-gold text-[10px] font-bold uppercase hover:bg-diesel-gold/20 transition-colors"
      >
        <Plus size={12} />
        Add to Stage
        <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 bg-diesel-dark border border-diesel-border min-w-36 shadow-lg"
          style={{ zIndex: 9999 }}
        >
          {/* Actors submenu trigger */}
          <div 
            onMouseEnter={() => setActiveSubmenu('actors')}
            className="relative px-2 py-1.5 flex items-center justify-between text-diesel-paper text-[10px] hover:bg-diesel-gold/20 cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <User size={10} /> Actors
            </span>
            <ChevronRight size={10} />
            
            {activeSubmenu === 'actors' && (
              <div 
                className="absolute left-full top-0 ml-1 bg-diesel-dark border border-diesel-border min-w-32 max-h-48 overflow-y-auto custom-scrollbar shadow-lg"
                style={{ zIndex: 10000 }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateNewActor(); setIsOpen(false); setActiveSubmenu(null); }}
                  className="w-full px-2 py-1.5 text-left text-diesel-green text-[10px] hover:bg-diesel-green/20 border-b border-diesel-border flex items-center gap-1 font-bold"
                >
                  <Plus size={10} />
                  New Actor
                </button>
                {actors.map(actor => (
                  <button
                    key={actor.id}
                    onClick={(e) => { e.stopPropagation(); onSelectActor(actor.id, actor.name); setIsOpen(false); setActiveSubmenu(null); }}
                    className="w-full px-2 py-1.5 text-left text-diesel-paper text-[10px] hover:bg-diesel-gold/20"
                  >
                    {actor.name}
                  </button>
                ))}
                {actors.length === 0 && (
                  <div className="px-2 py-1.5 text-diesel-steel text-[10px] italic">No actors yet</div>
                )}
              </div>
            )}
          </div>
          
          {/* Items submenu trigger */}
          <div 
            onMouseEnter={() => setActiveSubmenu('items')}
            className="relative px-2 py-1.5 flex items-center justify-between text-diesel-paper text-[10px] hover:bg-diesel-gold/20 cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <Package size={10} /> Items
            </span>
            <ChevronRight size={10} />
            
            {activeSubmenu === 'items' && (
              <div 
                className="absolute left-full top-0 ml-1 bg-diesel-dark border border-diesel-border min-w-32 max-h-48 overflow-y-auto custom-scrollbar shadow-lg"
                style={{ zIndex: 10000 }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateNewItem(); setIsOpen(false); setActiveSubmenu(null); }}
                  className="w-full px-2 py-1.5 text-left text-diesel-green text-[10px] hover:bg-diesel-green/20 border-b border-diesel-border flex items-center gap-1 font-bold"
                >
                  <Plus size={10} />
                  New Item
                </button>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); onSelectItem(item.id, item.name); setIsOpen(false); setActiveSubmenu(null); }}
                    className="w-full px-2 py-1.5 text-left text-diesel-paper text-[10px] hover:bg-diesel-gold/20"
                  >
                    {item.name}
                  </button>
                ))}
                {items.length === 0 && (
                  <div className="px-2 py-1.5 text-diesel-steel text-[10px] italic">No items yet</div>
                )}
              </div>
            )}
          </div>
          
          {/* Talk Balloon - speech attached to actors */}
          <button 
            onClick={(e) => { e.stopPropagation(); onSelectTalkBalloon(); setIsOpen(false); setActiveSubmenu(null); }}
            onMouseEnter={() => setActiveSubmenu(null)}
            className="w-full px-2 py-1.5 text-left text-diesel-paper text-[10px] hover:bg-diesel-gold/20 flex items-center gap-1"
          >
            <MessageCircle size={10} /> Talk Balloon
          </button>
          
          {/* Thought Balloon - thought attached to actors */}
          <button 
            onClick={(e) => { e.stopPropagation(); onSelectThoughtBalloon(); setIsOpen(false); setActiveSubmenu(null); }}
            onMouseEnter={() => setActiveSubmenu(null)}
            className="w-full px-2 py-1.5 text-left text-diesel-paper text-[10px] hover:bg-diesel-gold/20 flex items-center gap-1"
          >
            <CloudFog size={10} /> Thought Balloon
          </button>
          
          {/* Text Balloon - standalone label/sign */}
          <button 
            onClick={(e) => { e.stopPropagation(); onSelectTextBalloon(); setIsOpen(false); setActiveSubmenu(null); }}
            onMouseEnter={() => setActiveSubmenu(null)}
            className="w-full px-2 py-1.5 text-left text-diesel-paper text-[10px] hover:bg-diesel-gold/20 flex items-center gap-1"
          >
            <Type size={10} /> Text Balloon
          </button>
        </div>
      )}
    </div>
  );
};

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

// Placement mode type for click-to-place workflow
interface PlacementMode {
  active: boolean;
  type: 'ACTOR' | 'ITEM' | 'BALLOON';
  assetId?: string;
  assetName?: string;
  balloonCategory?: 'COMM' | 'TEXT';
  balloonType?: 'SPEECH' | 'THOUGHT';
  // For COMM balloons: which target element we're attaching to
  targetElementId?: string;
  // For COMM balloons: step of placement (1 = select target, 2 = place balloon)
  step?: number;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({ game, selection, onChange, onSelect, styleGuide }) => {
  const { confirm } = useConfirmDialog();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null); // Track initial position
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
  
  // Placement mode state for click-to-place workflow
  const [placementMode, setPlacementMode] = useState<PlacementMode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
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
  const [previewStartCommand, setPreviewStartCommand] = useState<number | undefined>(undefined);
  const [generatedMouthPosition, setGeneratedMouthPosition] = useState<MouthPosition | null>(null);
  // Item quick generation state
  const [itemGenPrompt, setItemGenPrompt] = useState('');
  const [isGeneratingItem, setIsGeneratingItem] = useState(false);
  
  // Inline balloon editing state
  const [editingBalloonId, setEditingBalloonId] = useState<string | null>(null);
  
  // Script error state for missing actors/items
  const [scriptError, setScriptError] = useState<ScriptError | null>(null);
  
  // Tag relevance state - tracks if tags need regeneration
  const [tagNeedsRegeneration, setTagNeedsRegeneration] = useState(false);
  const [tagRegenReason, setTagRegenReason] = useState<string | undefined>(undefined);
  const tagCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI Suggestions state
  interface SceneSuggestion {
    title: string;
    description: string;
    category: 'dialogue' | 'staging' | 'atmosphere' | 'pacing' | 'interaction';
    script_snippet?: string;
  }
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SceneSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
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
      status: 'new',
      note: '',
    };
    
    // Add scene to game and also to the current episode if one is set
    const currentEpisodeId = game.info.currentEpisodeId;
    const updatedGame = {
      ...game,
      scenes: [...game.scenes, newScene],
      episodes: currentEpisodeId 
        ? game.episodes.map(ep => 
            ep.id === currentEpisodeId 
              ? { ...ep, sceneIds: [...ep.sceneIds, newScene.id] }
              : ep
          )
        : game.episodes,
    };
    
    onChange(updatedGame);
    onSelect('scene', newScene.id);
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

  const deleteScene = async (id: string) => {
    const scene = game.scenes.find(s => s.id === id);
    if (!scene) return;
    const shouldDelete = await confirm({
      title: 'Delete Scene',
      description: `Delete "${scene.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!shouldDelete) return;
    onChange({ ...game, scenes: game.scenes.filter(s => s.id !== id) });
    onSelect('scene', null);
  };

  const updateActor = (actorId: string, updates: Partial<Actor>) => {
    onChange({
      ...game,
      actors: game.actors.map(a => a.id === actorId ? { ...a, ...updates } : a),
    });
  };

  // Handle script error - create actor and navigate to actor editor
  const handleCreateActorFromError = (name: string, itemId: string) => {
    const newActor: Actor = {
      id: itemId, // Use the script ID as the actor ID for consistency
      name: name,
      graphics: [],
      animations: [],
      status: 'new',
      note: '',
    };
    onChange({ ...game, actors: [...game.actors, newActor] });
    setScriptError(null);
    setShowScenePreview(false);
    onSelect('actor', newActor.id);
    toast.success(`Created actor "${name}" - add graphics to use in scenes`);
  };

  // Handle script error - create item and navigate to item editor
  const handleCreateItemFromError = (name: string, itemId: string) => {
    const newItem: Item = {
      id: itemId, // Use the script ID as the item ID for consistency
      name: name,
      category: 'misc',
      acquisition: 'pickup',
      effects: [],
      status: 'new',
      note: '',
    };
    onChange({ ...game, items: [...game.items, newItem] });
    setScriptError(null);
    setShowScenePreview(false);
    onSelect('item', newItem.id);
    toast.success(`Created item "${name}" - add a visual asset to use in scenes`);
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

  // AI Suggestions handler
  const handleGetSuggestions = async () => {
    if (!selectedScene) return;
    setLoadingSuggestions(true);
    
    try {
      // Build scene context
      const backgroundDrop = game.drops.find(d => d.id === selectedScene.dropId);
      const sceneContext = {
        sceneName: selectedScene.name,
        sceneType: selectedScene.sceneType || 'Dialogue',
        background: backgroundDrop?.name || 'none',
        stageElements: selectedScene.stage?.map(el => ({
          type: el.type,
          name: el.type === 'ACTOR' 
            ? game.actors.find(a => a.id === el.assetId)?.name || 'Unknown Actor'
            : el.type === 'ITEM'
            ? game.items.find(i => i.id === el.assetId)?.name || 'Unknown Item'
            : 'Balloon',
          position: { x: el.x, y: el.y },
          pose: el.pose,
          expression: el.expression
        })) || [],
        currentScript: selectedScene.script || '',
        availableActors: game.actors.map(a => a.name),
        availableItems: game.items.map(i => i.name)
      };
      
      const { data, error } = await supabase.functions.invoke('scene-suggest', {
        body: { sceneContext }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
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
      
      // Calculate max z-index to place new element on top
      const maxZ = Math.max(0, ...(scene.stage?.map(e => e.zIndex) || [0]));
      
      const newElement: StageElement = {
        id: `element_${Date.now()}`,
        assetId: actorGenerator.actorId,
        type: 'ACTOR',
        x: actorGenerator.dropX,
        y: actorGenerator.dropY,
        scale: 1,
        zIndex: maxZ + 1, // Always on top
        rotation: 0,
        pose: graphic.pose,
        expression: graphic.expression,
        spriteAngle: graphic.angle,
      };
      
      // Generate ENTER command for DramScript
      const actor = game.actors.find(a => a.id === actorGenerator.actorId);
      let updatedScript = scene.script || '';
      if (actor) {
        const actorScriptId = actor.name.toLowerCase().replace(/\s+/g, '_');
        const enterCommand = `[ENTER ${actorScriptId} at ${Math.round(newElement.x)},${Math.round(newElement.y)}]`;
        if (updatedScript && !updatedScript.endsWith('\n')) {
          updatedScript += '\n';
        }
        updatedScript += enterCommand + '\n';
      }
      
      updateScene(selectedScene.id, { 
        stage: [...(scene.stage || []), newElement],
        script: updatedScript,
      });
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

  // Quick item image regeneration from scene editor
  const handleQuickItemGenerate = async (itemId: string) => {
    const item = game.items.find(i => i.id === itemId);
    if (!item) return;

    const prompt = itemGenPrompt.trim() || `${item.name} - ${item.category} item`;
    
    setIsGeneratingItem(true);
    toast.info('Generating item image...');

    try {
      let fullPrompt = `Game item icon: ${prompt}. 
      
FRAMING: Centered object, square aspect ratio, suitable for inventory UI.

CRITICAL BACKGROUND INSTRUCTION: The item MUST be rendered on a SOLID BRIGHT GREEN BACKGROUND (#00FF00). This is essential for chroma-key compositing. No gradients, no shadows on background, pure solid green (#00FF00) everywhere except the item.

NEGATIVE: No text, no watermarks, no hands holding the item, no complex backgrounds.`;

      if (styleLock) {
        fullPrompt += '\n\nMANDATORY ART STYLE: Bold black outline, simple flat fill colors, NO shading or gradients, only a few light interior lines for details.';
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use AI generation');
        setIsGeneratingItem(false);
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
            prompt: fullPrompt,
            styleGuide: styleGuide || undefined,
            enforceStyleGuide: styleLock,
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
        // Update item with new visual asset
        const updatedItems = game.items.map(i => 
          i.id === itemId ? { ...i, visualAsset: data.imageUrl } : i
        );
        onChange({ ...game, items: updatedItems });
        toast.success('Item image generated!');
        setItemGenPrompt('');
      }
    } catch (error) {
      console.error('Item generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGeneratingItem(false);
    }
  };

  const addStageElement = (sceneId: string, type: StageElement['type'], assetId?: string) => {
    const scene = game.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    // Calculate max z-index to place new element on top
    const maxZ = Math.max(0, ...(scene.stage?.map(e => e.zIndex) || [0]));
    
    const newElement: StageElement = {
      id: `element_${Date.now()}`,
      assetId: assetId || '',
      type,
      x: 50,
      y: 50,
      scale: 1,
      zIndex: maxZ + 1, // Always on top
      rotation: 0,
      ...(type === 'BALLOON' ? { balloonType: 'SPEECH', text: '' } : {}),
    };
    
    // Generate ENTER command for DramScript
    let enterCommand = '';
    if (type === 'ACTOR' && assetId) {
      const actor = game.actors.find(a => a.id === assetId);
      if (actor) {
        // Use actor name as ID (simplified, lowercase, underscored)
        const actorScriptId = actor.name.toLowerCase().replace(/\s+/g, '_');
        enterCommand = `[ENTER ${actorScriptId} at ${Math.round(newElement.x)},${Math.round(newElement.y)}]`;
      }
    } else if (type === 'ITEM' && assetId) {
      const item = game.items.find(i => i.id === assetId);
      if (item) {
        const itemScriptId = item.name.toLowerCase().replace(/\s+/g, '_');
        enterCommand = `[ENTER ${itemScriptId} at ${Math.round(newElement.x)},${Math.round(newElement.y)}]`;
      }
    }
    
    // Append ENTER command to script if generated
    let updatedScript = scene.script || '';
    if (enterCommand) {
      if (updatedScript && !updatedScript.endsWith('\n')) {
        updatedScript += '\n';
      }
      updatedScript += enterCommand + '\n';
    }
    
    updateScene(sceneId, { 
      stage: [...(scene.stage || []), newElement],
      script: updatedScript,
    });
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
    
    // Find the element being deleted to generate EXIT command
    const element = scene.stage?.find(e => e.id === elementId);
    let updatedScript = scene.script || '';
    
    if (element && (element.type === 'ACTOR' || element.type === 'ITEM')) {
      let assetName = '';
      if (element.type === 'ACTOR') {
        const actor = game.actors.find(a => a.id === element.assetId);
        if (actor) assetName = actor.name;
      } else if (element.type === 'ITEM') {
        const item = game.items.find(i => i.id === element.assetId);
        if (item) assetName = item.name;
      }
      
      if (assetName) {
        const scriptId = assetName.toLowerCase().replace(/\s+/g, '_');
        const exitCommand = `[EXIT ${scriptId}]`;
        if (updatedScript && !updatedScript.endsWith('\n')) {
          updatedScript += '\n';
        }
        updatedScript += exitCommand + '\n';
      }
    }
    
    updateScene(sceneId, {
      stage: scene.stage?.filter(e => e.id !== elementId),
      script: updatedScript,
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
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });
  };

  // Detect mouth position from image
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
      return {
        x: data.x ?? 50,
        y: data.y ?? 50,
      };
    } catch (err) {
      console.error('Mouth detection error:', err);
      return { x: 50, y: 50 };
    }
  };

  // Generate a new pose preview
  const handleGeneratePreview = async () => {
    if (!generatorActor) return;
    
    setIsGenerating(true);
    toast.info('Generating character graphic...');
    
    const finalPrompt = genPrompt.trim() || buildGeneratorPrompt(generatorActor);

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
            referenceImageCloseUp: generatorActor.referenceImageCloseUp,
            referenceImageFullBody: generatorActor.referenceImageFullBody,
            styleGuide,
            enforceStyleGuide: styleLock, // Always enforce when styleLock is ON
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
        
        // Detect mouth position
        toast.info('Detecting mouth position...');
        const mouthPos = await detectMouthPosition(transparentImage);
        
        setGeneratedPreview(transparentImage);
        setGeneratedMouthPosition(mouthPos);
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

  // Commit preview to library AND update on stage
  const handleCommitToStage = () => {
    if (!generatorActor || !generatedPreview || !selectedScene) return;
    
    const newGraphic: ActorGraphic = {
      id: `graphic_${Date.now()}`,
      pose: genPose,
      expression: genExpression,
      angle: genAngle,
      image: generatedPreview,
      generatedPrompt: genPrompt.trim() || buildGeneratorPrompt(generatorActor),
      mouthPosition: generatedMouthPosition || undefined,
    };
    
    // Build the updated actors array with the new graphic
    const updatedActors = game.actors.map(a => 
      a.id === generatorActor.id 
        ? { ...a, graphics: [...a.graphics, newGraphic] } 
        : a
    );
    
    // If we have an existing element on stage, update it with the new pose
    let updatedStage = selectedScene.stage || [];
    if (actorGenerator.elementId) {
      updatedStage = updatedStage.map(el => 
        el.id === actorGenerator.elementId
          ? { ...el, pose: newGraphic.pose, expression: newGraphic.expression, spriteAngle: newGraphic.angle }
          : el
      );
    } else {
      // Adding new element to stage
      const maxZ = Math.max(0, ...updatedStage.map(e => e.zIndex));
      const newElement: StageElement = {
        id: `element_${Date.now()}`,
        assetId: generatorActor.id,
        type: 'ACTOR',
        x: actorGenerator.dropX,
        y: actorGenerator.dropY,
        scale: 1,
        zIndex: maxZ + 1,
        rotation: 0,
        pose: newGraphic.pose,
        expression: newGraphic.expression,
        spriteAngle: newGraphic.angle,
      };
      updatedStage = [...updatedStage, newElement];
    }
    
    // Generate ENTER command for DramScript if adding new element
    let updatedScript = selectedScene.script || '';
    if (!actorGenerator.elementId) {
      const actorScriptId = generatorActor.name.toLowerCase().replace(/\s+/g, '_');
      const enterCommand = `[ENTER ${actorScriptId} at ${Math.round(actorGenerator.dropX)},${Math.round(actorGenerator.dropY)}]`;
      if (updatedScript && !updatedScript.endsWith('\n')) {
        updatedScript += '\n';
      }
      updatedScript += enterCommand + '\n';
    }
    
    // Update everything in one onChange call
    onChange({
      ...game,
      actors: updatedActors,
      scenes: game.scenes.map(s => 
        s.id === selectedScene.id 
          ? { ...s, stage: updatedStage, script: updatedScript }
          : s
      ),
    });
    
    toast.success('Pose added to library and applied to stage!');
    closeGenerator();
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
    
    // Handle COMM balloon target selection (step 1)
    if (placementMode?.balloonCategory === 'COMM' && placementMode.step === 1) {
      const element = selectedScene?.stage?.find(el => el.id === elementId);
      if (element && (element.type === 'ACTOR' || element.type === 'ITEM')) {
        // Get target name for feedback
        let targetName = 'element';
        if (element.type === 'ACTOR') {
          targetName = game.actors.find(a => a.id === element.assetId)?.name || 'Actor';
        } else if (element.type === 'ITEM') {
          targetName = game.items.find(i => i.id === element.assetId)?.name || 'Item';
        }
        
        // Move to step 2: place the balloon
        setPlacementMode({
          ...placementMode,
          step: 2,
          targetElementId: elementId,
          assetName: `Comm Balloon → ${targetName}`,
        });
        toast.info(`Attached to ${targetName}. Now click to place the balloon.`);
        return;
      } else {
        toast.error('Please select an actor or item');
        return;
      }
    }
    
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
        // Store initial position for duplicate check
        setDragStartPosition({ x: element.x, y: element.y });
      }
    }
  }, [selectedScene, placementMode, game.actors, game.items]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current || !selectedScene) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100));

    updateStageElement(selectedScene.id, dragging, { x, y });
  }, [dragging, dragOffset, selectedScene]);

  // Generate MOVE command for element transformations
  const generateMoveCommand = useCallback((scriptId: string, element: StageElement) => {
    if (!selectedScene) return;
    
    // Build MOVE command with all current values
    let moveCommand = `[MOVE ${scriptId} to ${Math.round(element.x)},${Math.round(element.y)}`;
    
    // Only add scale if not default (1.0)
    if (element.scale !== 1) {
      moveCommand += ` scale ${element.scale.toFixed(1)}`;
    }
    
    // Only add tilt if not default (0)
    if (element.rotation !== 0) {
      moveCommand += ` tilt ${Math.round(element.rotation)}`;
    }
    
    // Add default animation duration of 2 seconds
    moveCommand += ' over 2s';
    
    moveCommand += ']';
    
    // Append to scene script
    let updatedScript = selectedScene.script || '';
    if (updatedScript && !updatedScript.endsWith('\n')) {
      updatedScript += '\n';
    }
    updatedScript += moveCommand + '\n';
    
    updateScene(selectedScene.id, { script: updatedScript });
  }, [selectedScene]);

  // Get script ID for an element
  const getScriptIdForElement = useCallback((element: StageElement): string | null => {
    if (element.type === 'ACTOR') {
      const actor = game.actors.find(a => a.id === element.assetId);
      return actor ? actor.name.toLowerCase().replace(/\s+/g, '_') : null;
    } else if (element.type === 'ITEM') {
      const item = game.items.find(i => i.id === element.assetId);
      return item ? item.name.toLowerCase().replace(/\s+/g, '_') : null;
    }
    return null;
  }, [game.actors, game.items]);

  const handleMouseUp = useCallback(() => {
    // Generate MOVE command when drag ends - only if position actually changed
    if (dragging && selectedScene && dragStartPosition) {
      const element = selectedScene.stage?.find(e => e.id === dragging);
      if (element && (element.type === 'ACTOR' || element.type === 'ITEM')) {
        // Check if position actually changed (using rounded values to avoid floating point issues)
        const startX = Math.round(dragStartPosition.x);
        const startY = Math.round(dragStartPosition.y);
        const endX = Math.round(element.x);
        const endY = Math.round(element.y);
        
        if (startX !== endX || startY !== endY) {
          const scriptId = getScriptIdForElement(element);
          if (scriptId) {
            generateMoveCommand(scriptId, element);
          }
        }
      }
    }
    setDragging(null);
    setDraggingButton(null);
    setDragStartPosition(null);
  }, [dragging, selectedScene, dragStartPosition, getScriptIdForElement, generateMoveCommand]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Handle placement mode click
    if (placementMode && canvasRef.current && selectedScene) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const scene = game.scenes.find(s => s.id === selectedScene.id);
      if (!scene) return;
      
      // Handle COMM balloon step 1: target selection is done via element click, not canvas click
      // If we click on empty canvas during COMM step 1, ignore or show error
      if (placementMode.balloonCategory === 'COMM' && placementMode.step === 1) {
        toast.error('Please click on an actor or item to attach the balloon');
        return;
      }
      
      // Calculate max z-index to place new element on top
      const maxZ = Math.max(0, ...(scene.stage?.map(el => el.zIndex) || [0]));
      
      // Get actor graphic properties if placing an actor
      let actorGraphicProps: { pose?: string; expression?: string; spriteAngle?: number } = {};
      if (placementMode.type === 'ACTOR' && placementMode.assetId) {
        const actor = game.actors.find(a => a.id === placementMode.assetId);
        if (actor && actor.graphics.length > 0) {
          const firstGraphic = actor.graphics[0];
          actorGraphicProps = {
            pose: firstGraphic.pose,
            expression: firstGraphic.expression,
            spriteAngle: firstGraphic.angle,
          };
        }
      }
      
      // Build balloon properties
      const balloonProps: Partial<StageElement> = {};
      if (placementMode.type === 'BALLOON') {
        balloonProps.balloonType = placementMode.balloonType || 'SPEECH';
        balloonProps.text = '';
        balloonProps.balloonCategory = placementMode.balloonCategory;
        if (placementMode.balloonCategory === 'COMM' && placementMode.targetElementId) {
          balloonProps.targetElementId = placementMode.targetElementId;
        }
      }
      
      const newElement: StageElement = {
        id: `element_${Date.now()}`,
        assetId: placementMode.assetId || '',
        type: placementMode.type,
        x: Math.round(x),
        y: Math.round(y),
        scale: 1,
        zIndex: maxZ + 1,
        rotation: 0,
        ...balloonProps,
        ...actorGraphicProps,
      };
      
      // Generate ENTER command for actors/items or SAY command for COMM balloons
      let updatedScript = scene.script || '';
      
      // Generate SAY command for COMM balloons
      if (placementMode.type === 'BALLOON' && placementMode.balloonCategory === 'COMM' && placementMode.targetElementId) {
        const targetElement = scene.stage?.find(el => el.id === placementMode.targetElementId);
        if (targetElement) {
          const targetAsset = targetElement.type === 'ACTOR'
            ? game.actors.find(a => a.id === targetElement.assetId)
            : game.items.find(i => i.id === targetElement.assetId);
          if (targetAsset) {
            const scriptId = targetAsset.name.toLowerCase().replace(/\s+/g, '_');
            // Generate SAY or SAY (thinking) based on balloon type
            const thinkingModifier = placementMode.balloonType === 'THOUGHT' ? ' (thinking)' : '';
            const sayCommand = `[SAY ${scriptId}${thinkingModifier} "..."]`;
            if (updatedScript && !updatedScript.endsWith('\n')) {
              updatedScript += '\n';
            }
            updatedScript += sayCommand + '\n';
          }
        }
      }
      // Generate ENTER command for actors/items
      else if (placementMode.type !== 'BALLOON' && placementMode.assetName) {
        const scriptId = placementMode.assetName.toLowerCase().replace(/\s+/g, '_');
        const enterCommand = `[ENTER ${scriptId} at ${Math.round(x)},${Math.round(y)}]`;
        if (updatedScript && !updatedScript.endsWith('\n')) {
          updatedScript += '\n';
        }
        updatedScript += enterCommand + '\n';
      }
      
      updateScene(selectedScene.id, {
        stage: [...(scene.stage || []), newElement],
        script: updatedScript,
      });
      
      setSelectedElementId(newElement.id);
      setPlacementMode(null);
      toast.success(`${placementMode.assetName || placementMode.type} placed!`);
      return;
    }
    
    // Normal click behavior - deselect
    if (e.target === canvasRef.current) {
      setSelectedElementId(null);
      setSelectedButtonId(null);
      closeGenerator();
    }
  }, [placementMode, selectedScene, game.scenes]);

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

  // Track mouse position for placement mode cursor indicator
  useEffect(() => {
    if (!placementMode) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [placementMode]);

  // ESC key to cancel placement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placementMode) {
        setPlacementMode(null);
        toast.info('Placement cancelled');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placementMode]);

  // Enter placement mode for actor (without immediate graphic selection)
  const enterActorPlacementMode = (actorId: string, actorName: string) => {
    setPlacementMode({
      active: true,
      type: 'ACTOR',
      assetId: actorId,
      assetName: actorName,
    });
    setSelectedElementId(null);
    closeGenerator();
  };

  // Enter placement mode for item
  const enterItemPlacementMode = (itemId: string, itemName: string) => {
    setPlacementMode({
      active: true,
      type: 'ITEM',
      assetId: itemId,
      assetName: itemName,
    });
    setSelectedElementId(null);
  };

  // Enter placement mode for Talk balloon (speech attached to actor/item)
  const enterTalkBalloonPlacementMode = () => {
    setPlacementMode({
      active: true,
      type: 'BALLOON',
      balloonCategory: 'COMM',
      balloonType: 'SPEECH',
      assetName: 'Talk Balloon',
      step: 1, // First step: select target
    });
    setSelectedElementId(null);
    toast.info('Click on an actor or item to attach the talk balloon');
  };

  // Enter placement mode for Thought balloon (thought attached to actor/item)
  const enterThoughtBalloonPlacementMode = () => {
    setPlacementMode({
      active: true,
      type: 'BALLOON',
      balloonCategory: 'COMM',
      balloonType: 'THOUGHT',
      assetName: 'Thought Balloon',
      step: 1, // First step: select target
    });
    setSelectedElementId(null);
    toast.info('Click on an actor or item to attach the thought balloon');
  };

  // Enter placement mode for Text balloon (standalone label)
  const enterTextBalloonPlacementMode = () => {
    setPlacementMode({
      active: true,
      type: 'BALLOON',
      balloonCategory: 'TEXT',
      assetName: 'Text Balloon',
    });
    setSelectedElementId(null);
  };

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
                    {scene.sceneType || 'Dialogue'} • {scene.stage?.length || 0} elements
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
  
  // Handle text command changes - check if tags need regeneration
  const handleTextCommandChange = async (newText: string) => {
    const existingTags = selectedScene.tags || [];
    
    // Debounce the check
    if (tagCheckTimeoutRef.current) {
      clearTimeout(tagCheckTimeoutRef.current);
    }
    
    tagCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-tag-relevance', {
          body: { newText, existingTags, contentType: 'scene' },
        });
        
        if (!error && data?.needsRegeneration) {
          setTagNeedsRegeneration(true);
          setTagRegenReason(data.reason || 'New content detected');
        }
      } catch (err) {
        console.warn('Tag relevance check error:', err);
      }
    }, 1500);
  };

  // Ensure script has header
  const ensureScriptHeader = () => {
    if (!selectedScene.script || selectedScene.script.trim() === '') {
      updateScene(selectedScene.id, { script: generateScriptHeader() });
    }
  };

  // Scene Detail View - Redesigned Layout
  return (
    <div className="flex flex-col h-full gap-2 overflow-y-auto custom-scrollbar">
      {/* Title Row - Scene Editor label with name and background drop */}
      <div className="flex-shrink-0 flex items-center gap-3">
        <h2 className="text-sm font-bold text-diesel-rust uppercase tracking-widest">Scene Editor</h2>
        <CyberInput
          value={selectedScene.name}
          onChange={(e) => updateScene(selectedScene.id, { name: e.target.value })}
          className="flex-1 min-w-0 max-w-48"
          compact
        />
        
        {/* Background Drop Selector - moved to header row */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-diesel-gold uppercase">Drop:</span>
          <select
            value={selectedScene.dropId === null ? '__none__' : (selectedScene.dropId || '')}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '__none__') {
                updateScene(selectedScene.id, { dropId: null });
              } else if (value === '') {
                // Not selected yet
              } else {
                updateScene(selectedScene.id, { dropId: value });
              }
            }}
            className={`bg-diesel-panel border text-diesel-paper p-1 text-xs focus:outline-none focus:border-diesel-gold max-w-40 ${
              selectedScene.dropId === undefined ? 'border-diesel-rust' : 'border-diesel-border'
            }`}
          >
            {selectedScene.dropId === undefined && (
              <option value="">-- Select --</option>
            )}
            <option value="__none__">(None)</option>
            {game.drops.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        
        <NotesSection 
          note={selectedScene.note || ''} 
          onChange={(note) => updateScene(selectedScene.id, { note })}
          inline
        />
      </div>

      {/* Unified Control Strip */}
      <div className="flex-shrink-0 flex items-center gap-1.5 py-1.5 px-2 border border-diesel-border bg-diesel-dark/80 rounded-sm">
        {/* Back button */}
        <button
          onClick={() => onSelect('scene', null)}
          className="flex items-center justify-center w-8 h-8 text-diesel-steel hover:text-diesel-paper hover:bg-diesel-steel/20 transition-colors rounded-sm"
          title="Back to scene list"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-diesel-border" />

        {/* Status Selector */}
        <StatusSelector 
          status={selectedScene.status || 'new'} 
          onChange={(status) => setSceneStatus(selectedScene.id, status)} 
        />

        {/* Separator */}
        <div className="w-px h-6 bg-diesel-border" />

        {/* Placement Mode Status OR Add to Stage */}
        {placementMode ? (
          <div className="flex items-center gap-2 px-2 py-1 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-[10px] font-bold uppercase">
            <span>
              {placementMode.balloonCategory === 'COMM' && placementMode.step === 1
                ? 'Click an actor or item to attach balloon'
                : `Click stage to place ${placementMode.assetName}`}
            </span>
            <button 
              onClick={() => setPlacementMode(null)} 
              className="hover:text-diesel-paper"
              title="Cancel (ESC)"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <ThingSelector
            actors={game.actors}
            items={game.items}
            onSelectActor={enterActorPlacementMode}
            onSelectItem={enterItemPlacementMode}
            onSelectTalkBalloon={enterTalkBalloonPlacementMode}
            onSelectThoughtBalloon={enterThoughtBalloonPlacementMode}
            onSelectTextBalloon={enterTextBalloonPlacementMode}
            onCreateNewActor={() => onSelect('actor', null)}
            onCreateNewItem={() => onSelect('item', null)}
          />
        )}

        {/* Library */}
        <button
          onClick={async () => {
            const library = await loadLibraryFromDB();
            const duplicateCheck = findDuplicateScene(library, selectedScene);
            
            if (duplicateCheck.isDuplicate) {
              const action = await confirm({
                title: 'Duplicate Found',
                description: `"${selectedScene.name}" already exists in your library with identical content. What would you like to do?`,
                confirmText: 'Rename Existing',
                cancelText: 'Skip',
              });
              
              if (action) {
                const newName = window.prompt('Enter a new name for the existing library item:', duplicateCheck.existingItem.name + ' (old)');
                if (newName && newName.trim()) {
                  const renamedLibrary = updateSceneInLibrary(library, duplicateCheck.existingItem.libraryId, { name: newName.trim() });
                  const updated = addSceneToLibrary(renamedLibrary, selectedScene, game.info.title);
                  await saveLibraryToDB(updated);
                  toast.success(`Renamed existing to "${newName}" and saved new "${selectedScene.name}"!`);
                }
              }
              return;
            }
            
            const updated = addSceneToLibrary(library, selectedScene, game.info.title);
            await saveLibraryToDB(updated);
            toast.success(`"${selectedScene.name}" saved to library!`);
          }}
          className="flex items-center gap-1 px-2 py-1.5 border border-diesel-rust text-diesel-rust text-[11px] font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
        >
          <Archive size={12} />
          Library
        </button>

        {/* Delete Element */}
        <button
          onClick={async () => {
            if (!selectedElement) return;
            const elementName = selectedElement.type === 'ACTOR'
              ? game.actors.find(a => a.id === selectedElement.assetId)?.name || 'Actor'
              : selectedElement.type === 'ITEM'
              ? game.items.find(i => i.id === selectedElement.assetId)?.name || 'Item'
              : 'Balloon';
            
            const shouldDelete = await confirm({
              title: 'Remove from Stage',
              description: `Remove "${elementName}" from this scene?`,
              confirmText: 'Remove',
              cancelText: 'Cancel',
              variant: 'destructive',
            });
            if (shouldDelete) {
              deleteStageElement(selectedScene.id, selectedElement.id);
            }
          }}
          disabled={!selectedElement}
          className={`flex items-center gap-1 px-2 py-1.5 border text-[11px] font-bold uppercase transition-colors ${
            selectedElement 
              ? 'border-diesel-rust text-diesel-rust hover:bg-diesel-rust/20' 
              : 'border-diesel-border text-diesel-steel/40 cursor-not-allowed'
          }`}
          title={selectedElement ? 'Remove selected element from stage' : 'Select an element to delete'}
        >
          <Trash2 size={12} />
          Del Elem
        </button>

        {/* Delete Scene */}
        <button
          onClick={() => deleteScene(selectedScene.id)}
          className="flex items-center gap-1 px-2 py-1.5 border border-diesel-rust text-diesel-rust text-[11px] font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
        >
          <Trash2 size={12} />
          Del Scene
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* AI Suggest */}
        <button
          onClick={handleGetSuggestions}
          disabled={loadingSuggestions}
          className="flex items-center gap-1 px-2 py-1.5 border border-diesel-purple text-diesel-purple text-[11px] font-bold uppercase hover:bg-diesel-purple/20 transition-colors disabled:opacity-50"
          title="Get AI suggestions for this scene"
        >
          <Sparkles size={12} className={loadingSuggestions ? 'animate-pulse' : ''} />
          {loadingSuggestions ? '...' : 'Suggest'}
        </button>

        {/* Play Button */}
        <button
          onClick={() => {
            setPreviewStartCommand(undefined);
            setShowScenePreview(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green text-[11px] font-bold uppercase hover:bg-diesel-green/30 transition-colors"
          title="Play this scene's script"
        >
          <Play size={12} />
          Play
        </button>
      </div>

      {/* Stage Row - Element Properties on left, Stage Preview flush right */}
      <div className="flex-shrink-0 flex justify-end gap-4">
        {/* Element Properties Panel - Fixed position to left of Stage */}
        {selectedElement && !actorGenerator.active && (
          <div className="w-44 h-[288px] flex flex-col bg-diesel-black border border-diesel-gold p-2 overflow-y-auto custom-scrollbar flex-shrink-0">
            <h3 className="text-[9px] font-bold text-diesel-gold uppercase tracking-widest mb-1">Element</h3>
            
            {/* X/Y Position - Compact inline */}
            <div className="flex gap-1 mb-1">
              <div className="flex-1">
                <input
                  type="number"
                  value={selectedElement.x.toFixed(0)}
                  onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { x: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-[10px] p-0.5 text-center"
                  title="X %"
                />
              </div>
              <span className="text-diesel-steel text-[9px] self-center">,</span>
              <div className="flex-1">
                <input
                  type="number"
                  value={selectedElement.y.toFixed(0)}
                  onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { y: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-[10px] p-0.5 text-center"
                  title="Y %"
                />
              </div>
            </div>
            
            {/* Scale - Compact */}
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[8px] text-diesel-steel w-8">Scale</span>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={selectedElement.scale}
                onChange={(e) => updateStageElement(selectedScene.id, selectedElement.id, { scale: parseFloat(e.target.value) })}
                className="flex-1 h-2 accent-diesel-gold"
              />
              <span className="text-[9px] text-diesel-paper w-6 text-right">{selectedElement.scale.toFixed(1)}</span>
            </div>
            
            {/* Rotation - Compact with preset buttons */}
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[8px] text-diesel-steel w-8">Tilt</span>
              <div className="flex-1 flex gap-0.5">
                {[0, -45, 45, -90, 90].map(angle => (
                  <button
                    key={angle}
                    onClick={() => {
                      updateStageElement(selectedScene.id, selectedElement.id, { rotation: angle });
                      const scriptId = getScriptIdForElement(selectedElement);
                      if (scriptId) generateMoveCommand(scriptId, { ...selectedElement, rotation: angle });
                    }}
                    className={`flex-1 py-0.5 text-[7px] border ${
                      selectedElement.rotation === angle 
                        ? 'bg-diesel-gold/30 border-diesel-gold text-diesel-gold' 
                        : 'border-diesel-border text-diesel-steel hover:border-diesel-gold'
                    }`}
                  >
                    {angle === 0 ? '0' : angle > 0 ? `+${angle}` : angle}
                  </button>
                ))}
              </div>
            </div>

            {/* Z-depth - Icon buttons */}
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[8px] text-diesel-steel w-8">Depth</span>
              <div className="flex-1 flex gap-0.5">
                <button
                  onClick={() => updateStageElement(selectedScene.id, selectedElement.id, { zIndex: 1 })}
                  className="flex-1 py-0.5 border border-diesel-border text-diesel-steel hover:bg-diesel-steel/20"
                  title="Back"
                >
                  <ArrowDown size={10} className="mx-auto" />
                </button>
                <button
                  onClick={() => {
                    if (selectedElement.zIndex > 1) updateStageElement(selectedScene.id, selectedElement.id, { zIndex: selectedElement.zIndex - 1 });
                  }}
                  className="flex-1 py-0.5 border border-diesel-border text-diesel-steel hover:bg-diesel-steel/20"
                >
                  <ChevronDown size={10} className="mx-auto" />
                </button>
                <button
                  onClick={() => updateStageElement(selectedScene.id, selectedElement.id, { zIndex: selectedElement.zIndex + 1 })}
                  className="flex-1 py-0.5 border border-diesel-border text-diesel-steel hover:bg-diesel-steel/20"
                >
                  <ChevronUp size={10} className="mx-auto" />
                </button>
                <button
                  onClick={() => {
                    const maxZ = Math.max(...(selectedScene.stage?.map(e => e.zIndex) || [1]));
                    updateStageElement(selectedScene.id, selectedElement.id, { zIndex: maxZ + 1 });
                  }}
                  className="flex-1 py-0.5 border border-diesel-border text-diesel-steel hover:bg-diesel-steel/20"
                  title="Front"
                >
                  <ArrowUp size={10} className="mx-auto" />
                </button>
              </div>
            </div>

            {/* Balloon Type Toggle - for COMM balloon elements */}
            {selectedElement.type === 'BALLOON' && selectedElement.balloonCategory === 'COMM' && (
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[8px] text-diesel-steel w-8">Type</span>
                <div className="flex-1 flex gap-0.5">
                  <button
                    onClick={() => updateStageElement(selectedScene.id, selectedElement.id, { balloonType: 'SPEECH' })}
                    className={`flex-1 py-0.5 text-[8px] border ${
                      selectedElement.balloonType === 'SPEECH' || !selectedElement.balloonType
                        ? 'bg-diesel-gold/30 border-diesel-gold text-diesel-gold'
                        : 'border-diesel-border text-diesel-steel hover:border-diesel-gold'
                    }`}
                  >
                    Talk
                  </button>
                  <button
                    onClick={() => updateStageElement(selectedScene.id, selectedElement.id, { balloonType: 'THOUGHT' })}
                    className={`flex-1 py-0.5 text-[8px] border ${
                      selectedElement.balloonType === 'THOUGHT'
                        ? 'bg-diesel-gold/30 border-diesel-gold text-diesel-gold'
                        : 'border-diesel-border text-diesel-steel hover:border-diesel-gold'
                    }`}
                  >
                    Thought
                  </button>
                </div>
              </div>
            )}

            {/* Pose switcher for actors - fills remaining space */}
            {selectedElement.type === 'ACTOR' && (() => {
              const actor = game.actors.find(a => a.id === selectedElement.assetId);
              if (!actor || actor.graphics.length === 0) return null;
              return (
                <div className="flex-1 flex flex-col border-t border-diesel-border pt-1 mt-1 min-h-0">
                  <div className="grid grid-cols-4 gap-0.5 flex-1 overflow-y-auto">
                    {actor.graphics.map(graphic => (
                      <button
                        key={graphic.id}
                        onClick={() => updateStageElement(selectedScene.id, selectedElement.id, {
                          pose: graphic.pose,
                          expression: graphic.expression,
                          spriteAngle: graphic.angle
                        })}
                        className={`aspect-square bg-diesel-panel border hover:border-diesel-gold overflow-hidden ${
                          selectedElement.pose === graphic.pose && 
                          selectedElement.expression === graphic.expression &&
                          selectedElement.spriteAngle === graphic.angle
                            ? 'border-diesel-gold'
                            : 'border-diesel-border'
                        }`}
                        title={`${graphic.pose} • ${graphic.expression}`}
                      >
                        {graphic.image ? (
                          <img src={graphic.image} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <User size={8} className="w-full h-full p-0.5 text-diesel-steel" />
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setActorGenerator({
                        active: true,
                        actorId: actor.id,
                        elementId: selectedElement.id,
                        dropX: selectedElement.x,
                        dropY: selectedElement.y
                      });
                      setGenPrompt('');
                      setGeneratedPreview(null);
                    }}
                    className="mt-1 py-1 bg-diesel-green/20 border border-diesel-green text-diesel-green font-bold uppercase text-[8px] hover:bg-diesel-green/30 flex items-center justify-center gap-1"
                  >
                    <Sparkles size={8} /> New Pose
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Stage Preview - Fixed 16:9 size, flush right */}
          <div className={`w-[512px] h-[288px] bg-diesel-dark/50 border border-diesel-border overflow-hidden ${placementMode ? 'cursor-crosshair' : ''}`}>
            <Stage
              scene={selectedScene}
              game={game}
              background={backgroundDrop}
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
              editingBalloonId={editingBalloonId}
              onBalloonTextChange={(elementId, text) => {
                updateStageElement(selectedScene.id, elementId, { text });
              }}
              onBalloonEditStart={(elementId) => {
                setEditingBalloonId(elementId);
                setSelectedElementId(elementId);
              }}
              onBalloonEditEnd={() => setEditingBalloonId(null)}
            />
          </div>
      </div>

      {/* Main Content Area - DramScript full width with optional generator panel */}
      <div className="flex-1 flex gap-3 min-h-[400px]">
        {/* Side Panel - Only shows when generator active */}
        {actorGenerator.active && (
          <div className="w-56 flex-shrink-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
            {/* Actor Generator Panel - Shows when adding/editing actor */}
            {generatorActor && (
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
          </div>
        )}

        {/* DramScript Panel - Full width when no side panel */}
        <div className="flex-1 flex flex-col min-h-[400px] bg-diesel-black border-2 border-diesel-rust">
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
          <div className="flex-1 min-h-[350px] overflow-y-auto custom-scrollbar">
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
              onNavigateToAsset={(type, id) => {
                const typeMap: Record<string, SelectionState['type']> = {
                  actor: 'actor', scene: 'scene', button: 'button', sfx: 'sfx', drop: 'drop',
                };
                onSelect(typeMap[type] || 'settings', id);
              }}
              onPlayToCommand={(commandIndex) => {
                setPreviewStartCommand(commandIndex);
                setShowScenePreview(true);
              }}
              onTextCommandChange={handleTextCommandChange}
            />
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <TagEditor
        tags={selectedScene.tags || []}
        onTagsChange={(tags) => updateScene(selectedScene.id, { tags, tagsUpdatedAt: Date.now() })}
        contentType="scene"
        title={selectedScene.name}
        content={selectedScene.script || ''}
        actors={selectedScene.stage?.filter(e => e.type === 'ACTOR').map(e => {
          const actor = game.actors.find(a => a.id === e.assetId);
          return actor?.name || '';
        }).filter(Boolean)}
      />

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

      {/* Scene Preview Modal */}
      {showScenePreview && selectedScene && (
        <ScenePreview
          key={`preview-${selectedScene.id}-${previewStartCommand ?? 'start'}-${Date.now()}`}
          scene={selectedScene}
          game={game}
          onClose={() => {
            setShowScenePreview(false);
            setPreviewStartCommand(undefined);
          }}
          startAtCommandIndex={previewStartCommand}
          onScriptError={setScriptError}
        />
      )}

      {/* Script Error Dialog */}
      <ScriptErrorDialog
        error={scriptError}
        onClose={() => setScriptError(null)}
        onCreateActor={handleCreateActorFromError}
        onCreateItem={handleCreateItemFromError}
      />

      {/* Floating Cursor Indicator for Placement Mode */}
      {placementMode && (
        <div 
          className="fixed pointer-events-none z-[9999] flex items-center gap-1 bg-diesel-gold text-diesel-black px-2 py-1 text-xs font-bold shadow-lg border border-diesel-gold"
          style={{ 
            left: mousePos.x + 16, 
            top: mousePos.y + 16,
          }}
        >
          <MousePointer2 size={12} />
          <span>+{placementMode.type === 'ACTOR' ? 'A' : placementMode.type === 'ITEM' ? 'I' : 'B'}</span>
        </div>
      )}

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-lg bg-diesel-panel border-diesel-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-diesel-purple" />
            <h2 className="text-lg font-bold text-diesel-gold">AI Suggestions</h2>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
            {suggestions.length === 0 ? (
              <p className="text-diesel-steel text-sm italic">No suggestions available.</p>
            ) : (
              suggestions.map((s, i) => (
                <div key={i} className="p-3 bg-diesel-dark border border-diesel-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 border font-bold ${
                      s.category === 'dialogue' ? 'border-diesel-green text-diesel-green' :
                      s.category === 'staging' ? 'border-diesel-gold text-diesel-gold' :
                      s.category === 'atmosphere' ? 'border-diesel-purple text-diesel-purple' :
                      s.category === 'pacing' ? 'border-diesel-rust text-diesel-rust' :
                      'border-diesel-steel text-diesel-steel'
                    }`}>
                      {s.category}
                    </span>
                    <span className="text-sm font-bold text-diesel-paper">{s.title}</span>
                  </div>
                  <p className="text-xs text-diesel-steel leading-relaxed">{s.description}</p>
                  {s.script_snippet && (
                    <pre className="mt-2 text-[10px] bg-diesel-black/50 p-2 font-mono text-diesel-green border border-diesel-border overflow-x-auto">
                      {s.script_snippet}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setShowSuggestions(false)}
              className="px-4 py-2 border border-diesel-border text-diesel-steel text-xs font-bold uppercase hover:bg-diesel-steel/20 transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};