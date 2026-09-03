import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, Move, Layers, User, Mic, Play, Loader2, Monitor, ExternalLink, PlusCircle, StopCircle, Radio, MousePointer2, MoreVertical, RotateCw, Scale, Crosshair, Grid, Tag, Zap, RefreshCw, Download, Camera, MessageSquare, Cloud, MessageCircle, Sparkles, Check, Edit2, FileText, Music, Layout, Palette, ChevronRight, X, Image as ImageIcon, SkipForward, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Scene, GameData, StageElement, SelectionType, Actor, ActorGraphic, Drop, GameInfo } from '../../types';
import { POSES, EXPRESSIONS, ANGLES } from '../../constants';
import { speak, stopSpeech } from '../../utils/voice';

interface SceneEditorProps {
  game: GameData;
  scene: Scene;
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
  onDeleteScene: (id: string) => void;
  onUpdateActor: (id: string, updates: Partial<Actor>) => void;
  onAddDropForScene: (sceneId: string) => void;
  onUpdateDrop?: (id: string, updates: Partial<Drop>) => void;
  onSelect: (type: SelectionType, id: string | null) => void;
  onUpdateInfo?: (field: keyof GameInfo, value: any) => void;
  isSimulating?: boolean;
  voiceEnabled?: boolean;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({
  game,
  scene,
  onUpdateScene,
  onDeleteScene,
  onUpdateActor,
  onAddDropForScene,
  onUpdateDrop,
  onSelect,
  onUpdateInfo,
  isSimulating,
  voiceEnabled
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'stage' | 'audio'>('stage');
  
  // Selection / Tools State
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'add-balloon'>('select');
  
  // Placement State (kept for right panel)
  const [selectedActorForPlacement, setSelectedActorForPlacement] = useState<string>(game.actors[0]?.id || "");
  const [selectedItemForPlacement, setSelectedItemForPlacement] = useState<string>(game.items[0]?.id || "");
  const [balloonText, setBalloonText] = useState("");
  const [balloonType, setBalloonType] = useState<'SPEECH' | 'THOUGHT'>('SPEECH');

  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Quick Gen State
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elementId: string } | null>(null);

  // -- EDITOR MODE TABS (Place vs Modify) --
  const [editorMode, setEditorMode] = useState<'place' | 'modify'>('place');

  // -- RUNNER STATE (Simulation) --
  const [scriptLines, setScriptLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showingEstablishingShot, setShowingEstablishingShot] = useState(false);

  // Ensure placement ID is valid
  useEffect(() => {
     if (!selectedActorForPlacement && game.actors.length > 0) {
        setSelectedActorForPlacement(game.actors[0].id);
     }
     if (!selectedItemForPlacement && game.items.length > 0) {
        setSelectedItemForPlacement(game.items[0].id);
     }
  }, [game.actors, game.items]);

  // -- SIMULATION LOGIC --
  useEffect(() => {
    if (isSimulating) {
        // Initialize Sim
        if (scene.dropId) {
            setShowingEstablishingShot(true);
        } else {
            startScript();
        }
    } else {
        // Stop Sim
        if (audioElement) {
            audioElement.pause();
            setAudioElement(null);
        }
        stopSpeech();
        setShowingEstablishingShot(false);
    }
  }, [isSimulating, scene.id]);

  useEffect(() => {
      if (isSimulating && !showingEstablishingShot) {
          startScript();
      }
  }, [showingEstablishingShot, isSimulating]);

  // Auto-switch to MODIFY tab when an element is selected
  useEffect(() => {
     if (selectedElementId) {
        setEditorMode('modify');
     }
  }, [selectedElementId]);

  const handleModeSwitch = (mode: 'place' | 'modify') => {
     setEditorMode(mode);
     if (mode === 'place') {
        setSelectedElementId(null);
     }
  };

  const startScript = () => {
      if (scene.script) {
        const lines = scene.script.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('//'));
        setScriptLines(lines);
        setCurrentLineIndex(0);
        if(lines.length > 0) {
           playLineAudio(lines[0]);
        }
      } else {
        setScriptLines([]);
      }
  };

  const playLineAudio = (line: string) => {
    if (audioElement) audioElement.pause();
    
    // Ignore commands like >> GOTO
    if (line.startsWith('>>')) return;

    if (scene.audioData && scene.audioData[line]) {
      const audio = new Audio(scene.audioData[line]);
      audio.volume = 1.0; 
      audio.play();
      setAudioElement(audio);
    } else if (voiceEnabled) {
      speak(line); 
    }
  };

  const handleNextLine = () => {
    if (!isSimulating) return;
    
    if (currentLineIndex < scriptLines.length - 1) {
      const nextIndex = currentLineIndex + 1;
      const nextLine = scriptLines[nextIndex];

      if (nextLine.trim().startsWith('>> GOTO:')) {
         const targetSceneName = nextLine.split('GOTO:')[1].trim();
         const targetScene = game.scenes.find(s => s.name === targetSceneName);
         if (targetScene && onSelect) {
            onSelect('scene', targetScene.id);
            return;
         }
      }

      setCurrentLineIndex(nextIndex);
      playLineAudio(nextLine);
    } else {
        // End of script
    }
  };

  // -- Visual Helpers --

  const getActorVisual = (element: StageElement): { src: string | null, isFallback: boolean } => {
     const actor = game.actors.find(a => a.id === element.assetId);
     if (!actor) return { src: null, isFallback: false };
     
     if (element.pose && actor.graphics) {
        const targetAngle = element.spriteAngle || 0;
        const graphic = actor.graphics.find(g => 
            g.pose === element.pose && 
            (!element.expression || g.expression === element.expression) &&
            g.angle === targetAngle
        );
        if (graphic) return { src: graphic.image, isFallback: false };
        
        // Try fallback without angle
        const fallback = actor.graphics.find(g => 
            g.pose === element.pose && 
            (!element.expression || g.expression === element.expression)
        );
        if (fallback) return { src: fallback.image, isFallback: true };
     }
     
     const defaultSrc = actor.referenceImageFullBody || actor.image || actor.referenceImageCloseUp || null;
     return { src: defaultSrc, isFallback: true };
  };

  const getItemVisual = (element: StageElement): string | null => {
      const item = game.items.find(i => i.id === element.assetId);
      return item ? item.visualAsset : null;
  };

  const getSmartDefaults = (actorId: string) => {
    const actor = game.actors.find(a => a.id === actorId);
    let pose = 'Neutral';
    let expression = 'Neutral';
    let spriteAngle = 0;
    
    if (actor && actor.graphics && actor.graphics.length > 0) {
        // Find the "Neutral" pose first, or just use the first one available
        const neutralGraphic = actor.graphics.find(g => g.pose === 'Neutral') || actor.graphics[0];
        pose = neutralGraphic.pose;
        expression = neutralGraphic.expression;
        spriteAngle = neutralGraphic.angle || 0;
    }
    return { pose, expression, spriteAngle };
  };

  const getSfxStyle = (element: StageElement): React.CSSProperties => {
      if (!element.activeSfx || element.activeSfx.length === 0) return {};
      let combinedStyle: React.CSSProperties = {};
      let filters: string[] = [];

      element.activeSfx.forEach(sfxId => {
          const sfx = game.sfx.find(s => s.id === sfxId);
          if (!sfx) return;
          const { intensity, speed, color } = sfx.params;

          if (sfx.type === 'glow') filters.push(`drop-shadow(0 0 ${intensity / 2}px ${color})`);
          if (sfx.type === 'pulse') {
              const durationSec = 2 - (speed! / 100) * 1.8;
              combinedStyle.animation = `sfx-pulse ${durationSec}s infinite ease-in-out`;
              filters.push(`drop-shadow(0 0 ${intensity / 5}px ${color})`);
          }
          if (sfx.type === 'shake') {
              const durationSec = 1 - (speed! / 100) * 0.9;
              combinedStyle.animation = `sfx-shake ${durationSec}s infinite linear`;
          }
          if (sfx.type === 'jiggle') {
              const durationSec = 1 - (speed! / 100) * 0.8;
              combinedStyle.animation = `sfx-jiggle ${durationSec}s infinite ease-in-out`;
          }
          if (sfx.type === 'fade') combinedStyle.opacity = (100 - intensity) / 100;
          if (sfx.type === 'electric' || (sfx.type as string) === 'flash') {
              const durationSec = 2.0 - ((speed || 50) / 100) * 1.8; 
              combinedStyle.animation = `sfx-electric ${durationSec}s infinite linear`;
              combinedStyle.color = color || '#ffff00';
          }
      });

      if (filters.length > 0) combinedStyle.filter = filters.join(' ');
      return combinedStyle;
  };

  // -- Quick Generation Handler --
  const handleQuickGenerate = async (element: StageElement) => {
    if (!element || element.type !== 'ACTOR' || !process.env.API_KEY) return;
    const actor = game.actors.find(a => a.id === element.assetId);
    if (!actor) return;
    
    // Check references
    const referenceImage = actor.referenceImageFullBody || actor.referenceImageCloseUp;
    if (!referenceImage) {
        alert("Reference image missing. Please upload one in the Actor Editor.");
        return;
    }

    setIsQuickGenerating(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const parts: any[] = [];
        
        const meta = referenceImage.split(',')[0];
        const data = referenceImage.split(',')[1];
        const mimeType = meta.split(':')[1]?.split(';')[0];
        parts.push({ inlineData: { mimeType, data } });

        if (game.info.styleGuide) {
             const styleMeta = game.info.styleGuide.split(',')[0];
             const styleData = game.info.styleGuide.split(',')[1];
             const styleMime = styleMeta.split(':')[1]?.split(';')[0];
             parts.push({ inlineData: { mimeType: styleMime, data: styleData } });
        }

        const targetAngle = element.spriteAngle || 0;
        const pose = element.pose || 'Neutral';
        const expr = element.expression || 'Neutral';
        
        const prompt = `Generate a high-quality 2D game sprite. 
        Character Name: ${actor.name}.
        Pose: ${pose}.
        Expression: ${expr}.
        Camera Angle: ${targetAngle} degrees (Ensure head and body facing matches angle).
        Background: SOLID BRIGHT GREEN (#00FF00) for chroma key.
        Style: Flat colors, comic style outlines. Match the reference character exactly.`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts }
        });

        const newImageBase64 = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        
        if (newImageBase64) {
            const finalImage = `data:image/png;base64,${newImageBase64}`;
            
            const img = new Image();
            img.src = finalImage;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
                    const d = imageData.data;
                    for(let i=0; i<d.length; i+=4) {
                        if(d[i+1] > d[i] + 20 && d[i+1] > d[i+2] + 20) d[i+3] = 0;
                    }
                    ctx.putImageData(imageData, 0, 0);
                    const processedImage = canvas.toDataURL();

                    const newGraphic: ActorGraphic = {
                        id: Date.now().toString(),
                        pose,
                        expression: expr,
                        angle: targetAngle,
                        image: processedImage
                    };
                    const updatedGraphics = [...(actor.graphics || []), newGraphic];
                    onUpdateActor(actor.id, { graphics: updatedGraphics });
                }
            };
        }
    } catch (e) {
        console.error("Quick Gen Failed", e);
        alert("Generation failed. Check console.");
    } finally {
        setIsQuickGenerating(false);
    }
  };


  // -- Interaction Handlers --

  const handleStageBackgroundClick = (e: React.MouseEvent) => {
     if (!stageRef.current) return;
     
     // CRITICAL: Only trigger background logic if the click target is the stage itself,
     // not an actor element that let the click bubble up.
     if (e.target !== e.currentTarget) return;

     if (activeTool === 'add-balloon' && balloonText && editorMode === 'place') {
         const rect = stageRef.current.getBoundingClientRect();
         const x = ((e.clientX - rect.left) / rect.width) * 100;
         const y = ((e.clientY - rect.top) / rect.height) * 100;
         
         const newElement: StageElement = {
            id: Date.now().toString(),
            assetId: 'balloon_' + Date.now(),
            type: 'BALLOON',
            x, y, scale: 1, zIndex: (scene.stage?.length || 0) + 100,
            rotation: 0, text: balloonText, balloonType
         };
         onUpdateScene(scene.id, { stage: [...(scene.stage || []), newElement] });
         setActiveTool('select');
         setBalloonText("");
         setSelectedElementId(newElement.id); // This will auto-switch to Modify mode
     } else {
         setSelectedElementId(null);
     }
  };

  const handleAddActor = () => {
      if (!selectedActorForPlacement) return;
      const { pose, expression, spriteAngle } = getSmartDefaults(selectedActorForPlacement);
      const newElement: StageElement = {
        id: Date.now().toString(),
        assetId: selectedActorForPlacement,
        type: 'ACTOR',
        x: 50, y: 50, 
        scale: 1, zIndex: (scene.stage?.length || 0) + 1,
        rotation: 0, pose, expression, spriteAngle, activeSfx: []
      };
      onUpdateScene(scene.id, { stage: [...(scene.stage || []), newElement] });
      setSelectedElementId(newElement.id); // This will auto-switch to Modify mode
  };

  const handleAddItem = () => {
      if (!selectedItemForPlacement) return;
      const newElement: StageElement = {
        id: Date.now().toString(),
        assetId: selectedItemForPlacement,
        type: 'ITEM',
        x: 50, y: 50,
        scale: 1, zIndex: (scene.stage?.length || 0) + 1,
        rotation: 0, activeSfx: []
      };
      onUpdateScene(scene.id, { stage: [...(scene.stage || []), newElement] });
      setSelectedElementId(newElement.id); // This will auto-switch to Modify mode
  };

  const handleElementMouseDown = (e: React.MouseEvent, elId: string) => {
     if (e.button === 0 && !isSimulating) {
        e.stopPropagation();
        setSelectedElementId(elId);
        setDraggedElementId(elId);
     }
  };

  const handleContextMenu = (e: React.MouseEvent, elId: string) => {
    if (isSimulating) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: elId });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
     const handleMouseMove = (e: MouseEvent) => {
        if (draggedElementId && stageRef.current) {
           const rect = stageRef.current.getBoundingClientRect();
           let x = ((e.clientX - rect.left) / rect.width) * 100;
           let y = ((e.clientY - rect.top) / rect.height) * 100;
           x = Math.max(0, Math.min(100, x));
           y = Math.max(0, Math.min(100, y));
           
           const updatedStage = scene.stage?.map(el => 
              el.id === draggedElementId ? { ...el, x, y } : el
           );
           onUpdateScene(scene.id, { stage: updatedStage });
        }
     };
     const handleMouseUp = () => { setDraggedElementId(null); };
     if (draggedElementId) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
     }
     return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
     };
  }, [draggedElementId, scene.stage, onUpdateScene, scene.id]);

  const handleUpdateElement = (elId: string, updates: Partial<StageElement>) => {
    const updatedStage = scene.stage?.map(el => 
      el.id === elId ? { ...el, ...updates } : el
    );
    onUpdateScene(scene.id, { stage: updatedStage });
  };

  const handleDeleteElement = (elId: string) => {
    const updatedStage = scene.stage?.filter(el => el.id !== elId);
    onUpdateScene(scene.id, { stage: updatedStage });
    setSelectedElementId(null);
  };

  const handleToggleSfx = (elId: string, sfxId: string) => {
      const element = scene.stage?.find(el => el.id === elId);
      if (!element) return;
      const currentSfx = element.activeSfx || [];
      const newSfx = currentSfx.includes(sfxId)
          ? currentSfx.filter(id => id !== sfxId) 
          : [...currentSfx, sfxId]; 
      handleUpdateElement(elId, { activeSfx: newSfx });
  };

  // -- Render Data --
  const backgroundDrop = game.drops.find(s => s.id === scene.dropId);
  const selectedElement = scene.stage?.find(el => el.id === selectedElementId);
  const contextElement = contextMenu ? scene.stage?.find(el => el.id === contextMenu.elementId) : null;

  // -- Dialogue Parsing for Sim --
  const currentLineText = scriptLines[currentLineIndex] || "";
  const parsedLine = currentLineText.includes(':') 
     ? { name: currentLineText.split(':')[0], text: currentLineText.split(':')[1] }
     : { name: "", text: currentLineText };

  const isSelectedVisualFallback = selectedElement?.type === 'ACTOR' ? getActorVisual(selectedElement).isFallback : false;

  return (
    <div className="h-full flex flex-col">
      {/* TABS HEADER */}
      <div className="flex bg-diesel-black border-b border-diesel-border text-xs font-bold shrink-0">
          <button 
             onClick={() => setActiveTab('stage')} 
             className={`flex-1 py-4 flex items-center justify-center gap-2 border-r border-diesel-border transition-colors uppercase ${activeTab === 'stage' ? 'bg-diesel-panel text-diesel-gold border-b-2 border-b-diesel-gold' : 'text-diesel-steel hover:text-white hover:bg-white/5'}`}
          >
             <Layout size={18} /> <span className="text-sm">VISUAL STAGE</span>
          </button>
          <button 
             onClick={() => setActiveTab('script')} 
             className={`flex-1 py-4 flex items-center justify-center gap-2 border-r border-diesel-border transition-colors uppercase ${activeTab === 'script' ? 'bg-diesel-panel text-diesel-paper border-b-2 border-b-diesel-paper' : 'text-diesel-steel hover:text-white hover:bg-white/5'}`}
          >
             <FileText size={18} /> <span className="text-sm">DRAMSCRIPT</span>
          </button>
          <button 
             onClick={() => setActiveTab('audio')} 
             className={`flex-1 py-4 flex items-center justify-center gap-2 transition-colors uppercase ${activeTab === 'audio' ? 'bg-diesel-panel text-diesel-green border-b-2 border-b-diesel-green' : 'text-diesel-steel hover:text-white hover:bg-white/5'}`}
          >
             <Music size={18} /> <span className="text-sm">AUDIO LOG</span>
          </button>
      </div>
      
      {activeTab === 'stage' ? (
        <div className="flex-1 flex overflow-hidden">
           
           {/* LEFT COLUMN: STAGE (FULL WIDTH IF SIMULATING) */}
           <div className="flex-1 bg-[#050505] relative flex flex-col items-center justify-center p-8 border-r border-diesel-border overflow-hidden">
              
              {/* TOP TOOLBAR */}
              {!isSimulating && (
                <div className="absolute top-0 left-0 right-0 bg-diesel-dark border-b border-diesel-border p-3 flex justify-between items-center z-20">
                    <div className="flex items-center gap-3">
                        <input 
                            className="bg-black text-diesel-rust font-bold uppercase text-base p-2.5 border-2 border-diesel-border focus:border-diesel-rust outline-none w-64"
                            value={scene.name}
                            onChange={(e) => onUpdateScene(scene.id, { name: e.target.value })}
                            placeholder="SCENE NAME"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <select 
                            className="bg-black text-diesel-paper text-sm p-2.5 border-2 border-diesel-border focus:border-diesel-paper outline-none max-w-[250px]"
                            value={scene.dropId || ""}
                            onChange={(e) => onUpdateScene(scene.id, { dropId: e.target.value || undefined })}
                        >
                            <option value="">(No Backdrop)</option>
                            {game.drops.map(s => (
                            <option key={s.id} value={s.id}>
                               {s.name.length > 30 ? s.name.substring(0, 30) + "..." : s.name}
                            </option>
                            ))}
                        </select>
                        <button 
                            onClick={() => onAddDropForScene(scene.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-diesel-paper/10 text-diesel-paper text-xs font-bold border-2 border-diesel-paper hover:bg-diesel-paper hover:text-black transition-colors"
                        >
                            <Plus size={14} /> NEW DROP
                        </button>
                    </div>
                </div>
              )}

              {/* 16:9 STAGE CONTAINER */}
              <div 
                 ref={stageRef}
                 onClick={isSimulating ? handleNextLine : handleStageBackgroundClick}
                 className={`relative w-full aspect-video bg-[#0a0a0a] shadow-2xl border-4 border-diesel-border/50 overflow-hidden ${activeTool === 'add-balloon' && editorMode === 'place' ? 'cursor-crosshair' : ''} ${isSimulating ? 'cursor-pointer' : ''}`}
                 style={{ maxHeight: 'calc(100% - 80px)', maxWidth: '100%' }}
              >
                  {/* Establishing Shot Overlay */}
                  {isSimulating && showingEstablishingShot && backgroundDrop?.image && (
                      <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowingEstablishingShot(false); }}>
                        <div className="relative w-full h-full animate-[fadeIn_1s_ease-out] group">
                           <img src={backgroundDrop.image} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Establishing Shot" />
                           <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-4 z-10">
                               <div className="text-center animate-pulse mb-4">
                                  <span className="bg-black/80 text-white px-6 py-2 text-sm tracking-[0.5em] uppercase font-bold border-y-2 border-white/50 shadow-2xl">
                                     {backgroundDrop.name}
                                  </span>
                               </div>
                               <div className="px-6 py-2 bg-diesel-gold text-black font-bold text-xs uppercase tracking-widest border-2 border-white shadow-xl animate-bounce">
                                  CLICK TO BEGIN SCENE
                               </div>
                           </div>
                        </div>
                      </div>
                  )}

                  {backgroundDrop?.image ? (
                      <div className="absolute inset-0 pointer-events-none">
                        <img src={backgroundDrop.image} className="w-full h-full object-cover" alt="bg" />
                      </div>
                  ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-diesel-steel/10 text-6xl font-bold font-mono pointer-events-none select-none">NO SIGNAL</div>
                  )}

                  {scene.stage?.map(el => {
                     const isSelected = selectedElementId === el.id;
                     const sfxStyle = getSfxStyle(el);
                     const visual = el.type === 'ACTOR' ? getActorVisual(el) : { src: getItemVisual(el), isFallback: false };

                     return (
                        <div
                            key={el.id}
                            onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                            onClick={(e) => e.stopPropagation()}
                            onContextMenu={(e) => handleContextMenu(e, el.id)}
                            className={`absolute origin-center transition-transform duration-300
                                ${isSelected && !isSimulating ? 'ring-4 ring-diesel-gold z-50 cursor-move' : ''}
                                ${isSimulating ? '' : 'cursor-pointer hover:brightness-110'}
                            `}
                            style={{
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: el.type === 'ITEM' ? `${10 * el.scale}%` : (el.type === 'ACTOR' ? `${20 * el.scale}%` : 'auto'),
                                transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.type === 'BALLOON' ? el.scale : 1})`,
                                zIndex: el.zIndex,
                                ...sfxStyle
                            }}
                        >
                            {el.type === 'ACTOR' && visual.src && (
                                <img 
                                  src={visual.src} 
                                  className="w-full drop-shadow-2xl pointer-events-none select-none" 
                                  style={{ mixBlendMode: 'normal' }} 
                                />
                            )}
                            {el.type === 'ITEM' && visual.src && (
                                <img src={visual.src} className="w-full drop-shadow-xl pointer-events-none select-none" />
                            )}
                            {el.type === 'BALLOON' && (
                                <div className={`
                                    bg-[#f3f4f6] text-black font-bold font-mono text-xl px-6 py-6 max-w-[300px] text-center shadow-xl border-4 border-black leading-tight relative select-none
                                    ${el.balloonType === 'THOUGHT' ? 'rounded-[3rem] border-dashed' : 'rounded-2xl rounded-bl-none'}
                                `}>
                                    {el.text}
                                    {/* Speech Tail */}
                                    {(!el.balloonType || el.balloonType === 'SPEECH') && (
                                        <div className="absolute -bottom-[12px] left-[0px] w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-black border-r-[0px] border-r-transparent">
                                            <div className="absolute -top-[18px] left-[-13px] w-0 h-0 border-l-[14px] border-l-transparent border-t-[14px] border-t-[#f3f4f6] border-r-[0px] border-r-transparent"></div>
                                        </div>
                                    )}
                                    {/* Thought Bubbles */}
                                    {el.balloonType === 'THOUGHT' && (
                                        <>
                                            <div className="absolute -bottom-4 left-6 w-4 h-4 bg-[#f3f4f6] border-4 border-black rounded-full"></div>
                                            <div className="absolute -bottom-8 left-3 w-3 h-3 bg-[#f3f4f6] border-4 border-black rounded-full"></div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                     );
                  })}

                  {/* SIMULATION: DIALOGUE OVERLAY */}
                  {isSimulating && !showingEstablishingShot && (
                      <div className="absolute bottom-6 left-6 right-6 z-40">
                          <div className="bg-diesel-black/95 border-2 border-diesel-gold/70 backdrop-blur-lg p-8 shadow-2xl relative min-h-[140px] flex flex-col">
                                {/* Name Tag */}
                                {parsedLine.name && (
                                    <div className="absolute -top-4 left-8 px-6 py-2 bg-diesel-black border-2 border-diesel-gold text-diesel-gold font-bold text-sm tracking-widest uppercase shadow-lg">
                                        {parsedLine.name}
                                    </div>
                                )}
                                {/* Text */}
                                <div className="text-diesel-paper font-mono text-xl leading-relaxed">
                                    {parsedLine.text || <span className="italic opacity-50">...</span>}
                                </div>
                                <div className="mt-auto flex justify-end">
                                    <SkipForward className="text-diesel-gold animate-pulse" size={24} />
                                </div>
                          </div>
                      </div>
                  )}
              </div>
           </div>

           {/* RIGHT COLUMN: INSPECTOR & TOOLS (HIDDEN DURING SIM) */}
           {!isSimulating && (
               <div className="w-[380px] bg-diesel-panel border-l border-diesel-border flex flex-col shrink-0 relative z-30 shadow-2xl transition-all duration-300">
                  
                  {/* EDITOR MODE TABS */}
                  <div className="flex bg-diesel-black border-b border-diesel-border">
                      <button 
                         onClick={() => handleModeSwitch('place')} 
                         className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${editorMode === 'place' ? 'bg-diesel-gold text-black' : 'text-diesel-steel hover:bg-white/5'}`}
                      >
                         <Plus size={18} /> PLACE
                      </button>
                      <button 
                         onClick={() => handleModeSwitch('modify')} 
                         className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${editorMode === 'modify' ? 'bg-diesel-green text-black' : 'text-diesel-steel hover:bg-white/5'}`}
                      >
                         <MousePointer2 size={18} /> MODIFY
                      </button>
                  </div>

                  <div className="p-4 bg-diesel-black border-b border-diesel-border">
                     <h3 className="text-base font-bold text-diesel-gold uppercase tracking-widest flex items-center gap-3">
                        {editorMode === 'place' ? <PlusCircle size={20}/> : <Edit2 size={20}/>}
                        {editorMode === 'place' ? "SCENE TOOLS" : "INSPECTOR"}
                     </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                     
                     {/* MODE: PLACE */}
                     {editorMode === 'place' && (
                        <div className="animate-fade-in space-y-5">
                           {/* Add Actor */}
                           <div className="bg-diesel-dark p-5 border-2 border-diesel-border">
                              <div className="text-xs text-diesel-steel uppercase font-bold mb-3 flex items-center gap-2"><User size={16}/> Actor</div>
                              <select 
                                  className="w-full bg-diesel-black text-diesel-gold text-base font-bold border-2 border-diesel-border p-3 mb-4 focus:outline-none"
                                  value={selectedActorForPlacement}
                                  onChange={(e) => setSelectedActorForPlacement(e.target.value)}
                              >
                                  {game.actors.length > 0 ? (game.actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)) : (<option value="">No Actors</option>)}
                              </select>
                              <button onClick={handleAddActor} disabled={game.actors.length === 0} className="w-full bg-diesel-gold text-black text-sm font-bold py-4 hover:bg-white transition-colors border-2 border-diesel-gold">
                                 ADD TO CENTER
                              </button>
                           </div>

                           {/* Add Item */}
                           <div className="bg-diesel-dark p-5 border-2 border-diesel-border">
                              <div className="text-xs text-diesel-steel uppercase font-bold mb-3 flex items-center gap-2"><Tag size={16}/> Item</div>
                              <select 
                                  className="w-full bg-diesel-black text-diesel-green text-base font-bold border-2 border-diesel-border p-3 mb-4 focus:outline-none"
                                  value={selectedItemForPlacement}
                                  onChange={(e) => setSelectedItemForPlacement(e.target.value)}
                              >
                                  {game.items.length > 0 ? (game.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)) : (<option value="">No Items</option>)}
                              </select>
                              <button onClick={handleAddItem} disabled={game.items.length === 0} className="w-full bg-diesel-green text-black text-sm font-bold py-4 hover:bg-white transition-colors border-2 border-diesel-green">
                                 ADD TO CENTER
                              </button>
                           </div>

                           {/* Add Balloon */}
                           <div className="bg-diesel-dark p-5 border-2 border-diesel-border">
                              <div className="text-xs text-diesel-steel uppercase font-bold mb-3 flex items-center gap-2"><MessageSquare size={16}/> Text Balloon</div>
                              <div className="flex gap-2 mb-3">
                                 <button onClick={() => setBalloonType('SPEECH')} className={`flex-1 py-3 text-xs font-bold border-2 ${balloonType === 'SPEECH' ? 'bg-white text-black border-white' : 'text-diesel-steel border-diesel-border'}`}>SPEECH</button>
                                 <button onClick={() => setBalloonType('THOUGHT')} className={`flex-1 py-3 text-xs font-bold border-2 ${balloonType === 'THOUGHT' ? 'bg-white text-black border-white' : 'text-diesel-steel border-diesel-border'}`}>THOUGHT</button>
                              </div>
                              <textarea 
                                 className="w-full bg-diesel-black text-white text-sm border-2 border-diesel-border p-4 mb-4 h-24 resize-none focus:border-diesel-gold outline-none"
                                 placeholder="Dialogue text..."
                                 value={balloonText}
                                 onChange={(e) => setBalloonText(e.target.value)}
                              />
                              <button 
                                 onClick={() => setActiveTool(activeTool === 'add-balloon' ? 'select' : 'add-balloon')} 
                                 disabled={!balloonText}
                                 className={`w-full text-sm font-bold py-4 transition-colors border-2 ${activeTool === 'add-balloon' ? 'bg-diesel-rust text-black border-diesel-rust animate-pulse shadow-diesel-rust-glow' : 'bg-diesel-paper text-black hover:bg-white border-diesel-paper disabled:opacity-50'}`}
                              >
                                 {activeTool === 'add-balloon' ? 'CLICK STAGE TO PLACE' : 'PLACE ON STAGE'}
                              </button>
                           </div>
                        </div>
                     )}

                     {/* MODE: MODIFY (INSPECTOR) */}
                     {editorMode === 'modify' && (
                        <div className="animate-fade-in space-y-6">
                           {selectedElement ? (
                               <>
                                   <div className="flex justify-between items-center pb-3 border-b-2 border-diesel-gold/30">
                                      <span className="text-sm font-bold text-diesel-gold uppercase tracking-widest">
                                         {selectedElement.type} PROPERTIES
                                      </span>
                                      <button onClick={() => setSelectedElementId(null)} className="text-diesel-steel hover:text-white p-2 bg-white/5 rounded-full"><X size={20}/></button>
                                   </div>

                                   {/* TRANSFORM */}
                                   <div className="space-y-4 bg-black/30 p-4 border border-white/5">
                                      <div className="text-xs text-diesel-steel uppercase font-bold tracking-widest">Transform</div>
                                      
                                      <div className="space-y-1">
                                         <div className="flex justify-between text-[10px] text-diesel-steel uppercase">Scale <span>{(selectedElement.scale * 100).toFixed(0)}%</span></div>
                                         <div className="flex items-center">
                                            <Scale size={16} className="text-diesel-steel mr-3"/>
                                            <input type="range" min="0.5" max="3" step="0.1" value={selectedElement.scale} onChange={(e) => handleUpdateElement(selectedElement.id, { scale: Number(e.target.value) })} className="flex-1 h-3 bg-diesel-black appearance-none accent-diesel-gold cursor-pointer rounded-full"/>
                                         </div>
                                      </div>

                                      <div className="space-y-1">
                                         <div className="flex justify-between text-[10px] text-diesel-steel uppercase">Rotation <span>{selectedElement.rotation}°</span></div>
                                         <div className="flex items-center">
                                            <RotateCw size={16} className="text-diesel-steel mr-3"/>
                                            <input type="range" min="-180" max="180" value={selectedElement.rotation} onChange={(e) => handleUpdateElement(selectedElement.id, { rotation: Number(e.target.value) })} className="flex-1 h-3 bg-diesel-black appearance-none accent-diesel-gold cursor-pointer rounded-full"/>
                                         </div>
                                      </div>

                                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                         <div className="flex items-center gap-3">
                                            <Layers size={16} className="text-diesel-steel"/>
                                            <span className="text-xs uppercase text-diesel-steel">Z-Index</span>
                                         </div>
                                         <input type="number" className="w-20 bg-diesel-black text-center text-sm p-2 border-2 border-diesel-border text-diesel-gold font-bold" value={selectedElement.zIndex} onChange={(e) => handleUpdateElement(selectedElement.id, { zIndex: Number(e.target.value) })}/>
                                      </div>
                                   </div>

                                   {/* FALLBACK WARNING */}
                                   {isSelectedVisualFallback && (
                                       <div className="p-3 bg-diesel-rust/10 border-2 border-diesel-rust/40 text-diesel-rust text-[10px] font-bold flex items-start gap-2 animate-pulse">
                                           <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                           <span>VISUAL FALLBACK: No high-quality graphic found for current state. Preview may look low-res or generic.</span>
                                       </div>
                                   )}

                                   {/* BALLOON SPECIFIC */}
                                   {selectedElement.type === 'BALLOON' && (
                                      <div className="space-y-4 border-t-2 border-diesel-gold/20 pt-4">
                                         <div className="text-xs text-diesel-steel uppercase font-bold tracking-widest">Balloon Content</div>
                                         <textarea 
                                            className="w-full bg-diesel-black text-white text-base border-2 border-diesel-border p-4 focus:outline-none focus:border-diesel-gold h-32 resize-none"
                                            value={selectedElement.text || ""}
                                            onChange={(e) => handleUpdateElement(selectedElement.id, { text: e.target.value })}
                                         />
                                         <div className="flex gap-2">
                                            <button 
                                               onClick={() => handleUpdateElement(selectedElement.id, { balloonType: 'SPEECH' })} 
                                               className={`flex-1 py-3 text-xs font-bold border-2 ${(!selectedElement.balloonType || selectedElement.balloonType === 'SPEECH') ? 'bg-white text-black border-white' : 'text-diesel-steel border-diesel-border'}`}
                                            >
                                               SPEECH
                                            </button>
                                            <button 
                                               onClick={() => handleUpdateElement(selectedElement.id, { balloonType: 'THOUGHT' })} 
                                               className={`flex-1 py-3 text-xs font-bold border-2 ${selectedElement.balloonType === 'THOUGHT' ? 'bg-white text-black border-white' : 'text-diesel-steel border-diesel-border'}`}
                                            >
                                               THOUGHT
                                            </button>
                                         </div>
                                      </div>
                                   )}

                                   {/* ACTOR SPECIFIC */}
                                   {selectedElement.type === 'ACTOR' && (
                                      <div className="space-y-4 border-t-2 border-diesel-gold/20 pt-4">
                                         <div className="text-xs text-diesel-steel uppercase font-bold flex justify-between items-center tracking-widest">
                                             State
                                             <button 
                                                onClick={() => onSelect('actor', selectedElement.assetId)}
                                                className="flex items-center gap-2 text-[10px] bg-diesel-gold/10 text-diesel-gold px-3 py-1.5 border-2 border-diesel-gold/30 hover:bg-diesel-gold hover:text-black transition-colors"
                                             >
                                                <Zap size={12} /> OPEN IN LAB
                                             </button>
                                         </div>
                                         
                                         <div className="space-y-3">
                                            <div className="space-y-1">
                                               <label className="text-[10px] text-diesel-steel uppercase font-bold block mb-1 tracking-widest">Pose</label>
                                               <select className="w-full bg-diesel-black text-sm text-white font-bold border-2 border-diesel-border p-3 focus:border-diesel-gold outline-none" value={selectedElement.pose} onChange={(e) => handleUpdateElement(selectedElement.id, { pose: e.target.value })}>
                                                  {POSES.map(p => <option key={p} value={p}>{p}</option>)}
                                               </select>
                                            </div>
                                            <div className="space-y-1">
                                               <label className="text-[10px] text-diesel-steel uppercase font-bold block mb-1 tracking-widest">Expression</label>
                                               <select className="w-full bg-diesel-black text-sm text-white font-bold border-2 border-diesel-border p-3 focus:border-diesel-gold outline-none" value={selectedElement.expression} onChange={(e) => handleUpdateElement(selectedElement.id, { expression: e.target.value })}>
                                                  {EXPRESSIONS.map(e => <option key={e} value={e}>{e}</option>)}
                                               </select>
                                            </div>
                                         </div>
                                         
                                         {/* ANGLE SELECTOR */}
                                         <div className="space-y-1">
                                            <label className="text-[10px] text-diesel-steel uppercase font-bold block mb-1 tracking-widest">Camera Angle (Sprite)</label>
                                            <select 
                                                className="w-full bg-diesel-black text-sm text-diesel-gold border-2 border-diesel-border p-3 font-bold focus:border-diesel-gold outline-none"
                                                value={selectedElement.spriteAngle || 0}
                                                onChange={(e) => handleUpdateElement(selectedElement.id, { spriteAngle: Number(e.target.value) })}
                                            >
                                               {ANGLES.map(a => <option key={a} value={a}>{a}° View</option>)}
                                            </select>
                                         </div>

                                         {/* QUICK GENERATOR */}
                                         <button 
                                            onClick={() => handleQuickGenerate(selectedElement)}
                                            disabled={isQuickGenerating}
                                            className="w-full py-4 bg-diesel-gold/10 text-diesel-gold border-2 border-diesel-gold/50 hover:bg-diesel-gold hover:text-black text-xs font-bold flex items-center justify-center gap-3 mt-4 transition-all shadow-diesel-glow"
                                         >
                                            {isQuickGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                                            GENERATE MISSING SPRITE
                                         </button>
                                      </div>
                                   )}

                                   {/* SFX */}
                                   <div className="border-t-2 border-diesel-gold/20 pt-4">
                                      <div className="text-xs text-diesel-steel uppercase font-bold mb-3 flex items-center gap-2 tracking-widest">
                                          <Sparkles size={16} /> Active Effects
                                      </div>
                                      <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                                          {game.sfx.map(sfx => {
                                              const isActive = selectedElement.activeSfx?.includes(sfx.id);
                                              return (
                                                  <button 
                                                    key={sfx.id}
                                                    onClick={() => handleToggleSfx(selectedElement.id, sfx.id)}
                                                    className={`text-sm text-left px-4 py-3 flex items-center justify-between border-2 transition-all ${isActive ? 'bg-diesel-green text-black border-diesel-green font-bold shadow-[0_0_10px_rgba(107,122,90,0.3)]' : 'bg-black text-diesel-steel border-diesel-border hover:bg-white/10'}`}
                                                  >
                                                      <span className="truncate">{sfx.name}</span>
                                                      {isActive && <Check size={16}/>}
                                                  </button>
                                              );
                                          })}
                                          {game.sfx.length === 0 && <div className="text-xs text-diesel-steel italic opacity-50 p-4 border border-dashed border-white/5 text-center">No effects created yet.</div>}
                                      </div>
                                   </div>

                                   <div className="pt-6 border-t-2 border-diesel-border">
                                      <button onClick={() => handleDeleteElement(selectedElement.id)} className="w-full bg-diesel-rust text-black text-sm font-bold py-4 hover:bg-white flex items-center justify-center gap-3 transition-all border-2 border-diesel-rust shadow-diesel-rust-glow">
                                         <Trash2 size={20}/> DELETE ELEMENT
                                      </button>
                                   </div>
                               </>
                           ) : (
                               <div className="flex flex-col items-center justify-center text-diesel-steel opacity-50 h-96 gap-4">
                                   <Crosshair size={48} />
                                   <p className="text-sm text-center font-bold tracking-widest">SELECT ELEMENT ON STAGE<br/>TO MODIFY</p>
                               </div>
                           )}
                        </div>
                     )}

                  </div>
               </div>
           )}
        </div>
      ) : activeTab === 'script' ? (
         <div className="flex-1 p-8 flex flex-col h-full overflow-hidden">
             <div className="flex justify-between items-center mb-6 border-b-2 border-diesel-paper/30 pb-3 shrink-0">
                <h3 className="text-2xl font-bold text-diesel-paper uppercase flex items-center gap-3">
                   <FileText size={24} className="text-diesel-gold" /> DRAMSCRIPT EDITOR
                </h3>
             </div>
             
             <div className="bg-black/50 p-4 border-2 border-diesel-border mb-6 text-xs font-mono text-diesel-steel leading-relaxed">
                <span className="text-diesel-gold font-bold uppercase tracking-widest">Syntax Guide:</span><br/>
                <span className="text-diesel-paper opacity-80">Actor Name: "Dialogue text"</span><br/>
                <span className="text-diesel-paper opacity-80">>> GOTO: Scene Name</span><br/>
                <span className="text-diesel-paper opacity-50 italic">// Comments ignored by engine</span>
             </div>

             <textarea 
                className="flex-1 w-full bg-diesel-black border-2 border-diesel-border p-6 font-mono text-base text-diesel-paper focus:outline-none focus:border-diesel-gold resize-none leading-relaxed shadow-inner"
                placeholder="// Enter dialogue here..."
                value={scene.script}
                onChange={(e) => onUpdateScene(scene.id, { script: e.target.value })}
                spellCheck={false}
             />
         </div>
      ) : (
         <div className="flex-1 p-10 flex flex-col items-center justify-center text-diesel-steel opacity-50">
             <Music size={64} className="mb-6" />
             <p className="text-lg font-bold tracking-[0.3em]">AUDIO MANAGER</p>
             <p className="text-xs mt-2 opacity-50">STATION STANDBY - OFFLINE</p>
         </div>
      )}
    </div>
  );
};
