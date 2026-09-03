import React, { useRef, useCallback } from 'react';
import { GameData, Scene, StageElement, Actor, Drop, Sfx, Button, Item, Page, MouthPosition } from '@/types';
import { User, Package, MessageSquare } from 'lucide-react';

// Element override state for script-driven changes (from useScriptRunner)
interface ElementOverride {
  x?: number;
  y?: number;
  zIndex?: number;
  pose?: string;
  expression?: string;
  angle?: number;
  scale?: number;
  rotation?: number;
  animationFrame?: string; // Current animation frame image (overrides pose graphic during POSE_MOVE)
}

// Runtime balloon from SAY command
interface RuntimeBalloon {
  id: string;
  targetScriptId: string;
  text: string;
  displayedText: string;
  style: 'speech' | 'thought';
  x: number;
  y: number;
  isComplete: boolean;
}

interface StageProps {
  scene: Scene;
  game: GameData;
  background?: Drop;
  // Editor mode props
  editable?: boolean;
  selectedElementId?: string | null;
  draggingId?: string | null;
  onElementSelect?: (id: string | null) => void;
  onElementMouseDown?: (e: React.MouseEvent, elementId: string) => void;
  onElementDoubleClick?: (element: StageElement, actor?: Actor) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onCanvasClick?: (e: React.MouseEvent) => void;
  canvasRef?: React.RefObject<HTMLDivElement>;
  // Button editor props
  selectedButtonId?: string | null;
  draggingButtonId?: string | null;
  onButtonSelect?: (id: string | null) => void;
  onButtonMouseDown?: (e: React.MouseEvent, buttonId: string) => void;
  onButtonUpdate?: (buttonId: string, updates: Partial<Button>) => void;
  // Theater mode props
  animatingElements?: Map<string, { x: number; y: number }>;
  activeEffects?: Map<string, string[]>; // element id -> active sfx ids
  hideElement?: Set<string>; // elements to hide (for EXIT command) - keyed by script ID
  elementOverrides?: Map<string, ElementOverride>; // script-driven position/pose overrides - keyed by script ID
  activeButtons?: string[]; // button ids that are currently active/visible
  onButtonClick?: (button: Button) => void; // callback when button is clicked
  onElementClick?: (element: StageElement, actor?: Actor, item?: Item) => void; // callback when actor/item clicked in theater
  scriptMode?: boolean; // If true, only show elements that have been ENTER'd via script (for theater/preview)
  // Comm balloon placement mode
  commBalloonTargetId?: string | null; // Highlight this element as target during COMM balloon step 1
  // Inline balloon editing
  editingBalloonId?: string | null;
  onBalloonTextChange?: (elementId: string, text: string) => void;
  onBalloonEditStart?: (elementId: string) => void;
  onBalloonEditEnd?: () => void;
  // Runtime balloon from SAY command
  activeBalloon?: RuntimeBalloon | null;
}

export const Stage: React.FC<StageProps> = ({
  scene,
  game,
  background,
  editable = false,
  selectedElementId,
  draggingId,
  onElementSelect,
  onElementMouseDown,
  onElementDoubleClick,
  onMouseMove,
  onMouseUp,
  onCanvasClick,
  canvasRef: externalCanvasRef,
  // Button editor props
  selectedButtonId,
  draggingButtonId,
  onButtonSelect,
  onButtonMouseDown,
  onButtonUpdate,
  // Theater mode props
  animatingElements,
  activeEffects,
  hideElement,
  elementOverrides,
  activeButtons,
  onButtonClick,
  onElementClick,
  scriptMode = false,
  commBalloonTargetId,
  // Inline balloon editing
  editingBalloonId,
  onBalloonTextChange,
  onBalloonEditStart,
  onBalloonEditEnd,
  // Runtime balloon from SAY
  activeBalloon,
}) => {
  const internalCanvasRef = useRef<HTMLDivElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;

  // Get SFX animation classes
  const getSfxClasses = (elementId: string): string => {
    const effects = activeEffects?.get(elementId);
    if (!effects || effects.length === 0) return '';
    
    const sfxItems = effects.map(sfxId => game.sfx.find(s => s.id === sfxId)).filter(Boolean) as Sfx[];
    const classes: string[] = [];
    
    for (const sfx of sfxItems) {
      switch (sfx.type) {
        case 'pulse':
          classes.push('animate-[sfx-pulse_0.5s_ease-in-out_infinite]');
          break;
        case 'shake':
          classes.push('animate-[sfx-shake_0.1s_ease-in-out_infinite]');
          break;
        case 'jiggle':
          classes.push('animate-[sfx-jiggle_0.2s_ease-in-out_infinite]');
          break;
        case 'electric':
          classes.push('animate-[sfx-electric_0.3s_ease-in-out_infinite]');
          break;
        case 'glow':
          classes.push('shadow-[0_0_20px_hsl(var(--diesel-gold))]');
          break;
        case 'fade':
          classes.push('opacity-50');
          break;
      }
    }
    
    return classes.join(' ');
  };

  const renderElement = (element: StageElement) => {
    const actor = element.type === 'ACTOR' ? game.actors.find(a => a.id === element.assetId) : null;
    const item = element.type === 'ITEM' ? game.items.find(i => i.id === element.assetId) : null;
    
    // Get script ID for this element (used for hideElement and elementOverrides lookup)
    const scriptId = (actor?.name || item?.name || '')?.toLowerCase().replace(/\s+/g, '_');
    
    // In script mode, only show elements that have been ENTER'd (have overrides)
    // Elements start hidden and are revealed via ENTER commands
    // BALLOON elements are hidden in script mode - they're replaced by runtime balloons from SAY commands
    if (scriptMode) {
      if (element.type === 'BALLOON') return null; // Static balloons hidden in script mode
      if (scriptId && !elementOverrides?.has(scriptId)) return null;
    }
    
    // Check if element should be hidden (by script ID)
    if (scriptId && hideElement?.has(scriptId)) return null;
    
    // Get overrides from script runner (keyed by script ID)
    const override = scriptId ? elementOverrides?.get(scriptId) : undefined;
    
    // Use override values if present, otherwise use element defaults
    const effectivePose = override?.pose || element.pose;
    const effectiveExpression = override?.expression || element.expression;
    const effectiveAngle = override?.angle ?? element.spriteAngle;
    
    // Check for animation frame override (used during POSE_MOVE locomotion/transition)
    const animationFrameImage = override?.animationFrame;
    
    // Find the matching graphic based on effective pose/expression/angle
    const actorGraphic = actor?.graphics.find(g => 
      g.pose === effectivePose && 
      g.expression === effectiveExpression && 
      g.angle === effectiveAngle
    ) || actor?.graphics[0];

    // Get position (use override, then animation, then element default)
    const animPos = animatingElements?.get(element.id);
    const x = override?.x ?? animPos?.x ?? element.x;
    const y = override?.y ?? animPos?.y ?? element.y;
    const zIndex = override?.zIndex ?? element.zIndex;
    const effectiveScale = override?.scale ?? element.scale;
    const effectiveRotation = override?.rotation ?? element.rotation;
    
    const sfxClasses = getSfxClasses(element.id);

    // Check if element has a page attached or is collectible (for theater click handling)
    const hasPage = (actor?.pageId || item?.pageId) && !editable;
    const isCollectible = item?.isCollectible && !editable;
    const isClickable = hasPage || isCollectible;
    
    // Check if this element is the target during COMM balloon placement
    const isCommTarget = commBalloonTargetId === element.id;
    
    return (
      <div
        key={element.id}
        className={`absolute select-none transition-all duration-200 ${
          editable ? 'cursor-move' : isClickable ? 'cursor-pointer hover:ring-2 hover:ring-diesel-gold/50' : ''
        } ${
          editable && selectedElementId === element.id 
            ? 'ring-2 ring-diesel-gold ring-offset-2 ring-offset-transparent' 
            : ''
        } ${
          editable && draggingId === element.id ? 'z-50' : ''
        } ${
          isCommTarget ? 'ring-2 ring-diesel-cyan animate-pulse' : ''
        } ${sfxClasses}`}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -100%) scale(${effectiveScale}) rotate(${effectiveRotation}deg)`,
          zIndex: draggingId === element.id ? 1000 : zIndex,
        }}
        onMouseDown={editable ? (e) => onElementMouseDown?.(e, element.id) : undefined}
        onDoubleClick={editable ? () => onElementDoubleClick?.(element, actor || undefined) : undefined}
        onClick={isClickable ? () => onElementClick?.(element, actor || undefined, item || undefined) : undefined}
      >
        {element.type === 'ACTOR' && (
          // Use animation frame if present (during POSE_MOVE), otherwise use pose graphic
          animationFrameImage ? (
            <img
              src={animationFrameImage}
              alt={actor?.name}
              className="max-w-32 max-h-40 object-contain pointer-events-none"
              draggable={false}
            />
          ) : actorGraphic?.image ? (
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
          <div className="relative">
            {/* Collectible pickup tag */}
            {item?.isCollectible && !editable && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
                <span className="px-1.5 py-0.5 bg-diesel-gold text-diesel-black text-[8px] font-bold uppercase tracking-wide border border-diesel-rust animate-pulse">
                  {item.collectibleLabel || 'PICKUP'}
                </span>
              </div>
            )}
            {item?.visualAsset ? (
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
            )}
          </div>
        )}

        {element.type === 'BALLOON' && (
          <div
            className={`px-3 py-2 max-w-48 text-sm cursor-text ${
              element.balloonType === 'THOUGHT'
                ? 'bg-diesel-paper rounded-[2rem] border-2 border-dashed border-diesel-steel text-diesel-black'
                : element.balloonCategory === 'TEXT'
                  ? 'bg-diesel-gold border-2 border-diesel-rust text-diesel-black font-bold'
                  : 'bg-diesel-paper border-2 border-diesel-steel text-diesel-black rounded-lg'
            }`}
            onClick={(e) => {
              if (editable) {
                e.stopPropagation();
                onBalloonEditStart?.(element.id);
              }
            }}
          >
            {editable && editingBalloonId === element.id ? (
              <textarea
                autoFocus
                value={element.text || ''}
                onChange={(e) => onBalloonTextChange?.(element.id, e.target.value)}
                onBlur={() => onBalloonEditEnd?.()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    onBalloonEditEnd?.();
                  }
                }}
                className="w-full min-w-32 bg-transparent border-none outline-none resize-none text-diesel-black placeholder:text-diesel-steel/50"
                placeholder={element.balloonCategory === 'COMM' ? 'Dialogue...' : 'Label...'}
                rows={2}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              element.text || (
                editable && (
                  <span className="text-diesel-steel italic">
                    {element.balloonCategory === 'COMM' ? 'Dialogue...' : 'Label...'}
                  </span>
                )
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const renderButton = (button: Button) => {
    const isActive = activeButtons?.includes(button.id);
    const isSelected = selectedButtonId === button.id;
    const isDragging = draggingButtonId === button.id;
    
    // In editor mode, show all buttons; in theater mode, only show active ones
    if (!isActive && !editable) return null;
    
    return (
      <div
        key={button.id}
        className={`absolute flex items-center justify-center font-bold text-sm uppercase transition-all ${
          editable ? 'cursor-move' : 'cursor-pointer'
        } ${
          isSelected ? 'ring-2 ring-diesel-cyan ring-offset-2 ring-offset-transparent' : ''
        } ${
          isDragging ? 'z-[1000]' : ''
        } ${
          button.style === 'primary'
            ? 'bg-diesel-gold/90 text-diesel-black hover:bg-diesel-gold'
            : button.style === 'danger'
            ? 'bg-diesel-rust/90 text-diesel-paper hover:bg-diesel-rust'
            : 'bg-diesel-panel/95 text-diesel-paper border border-diesel-border hover:bg-diesel-panel hover:border-diesel-paper'
        } ${!editable ? 'hover:scale-105' : ''}`}
        style={{
          left: `${button.x}%`,
          top: `${button.y}%`,
          width: `${button.width}%`,
          height: `${button.height}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: isDragging ? 1000 : 100,
        }}
        onMouseDown={editable ? (e) => {
          e.stopPropagation();
          onButtonMouseDown?.(e, button.id);
        } : undefined}
        onClick={editable ? (e) => {
          e.stopPropagation();
          onButtonSelect?.(button.id);
        } : () => onButtonClick?.(button)}
      >
        {button.label}
      </div>
    );
  };

  // Get mouth position for a target element
  const getMouthPosition = (target: StageElement): MouthPosition | undefined => {
    if (target.type === 'ACTOR') {
      const actor = game.actors.find(a => a.id === target.assetId);
      if (!actor) return undefined;
      
      // Get the current pose/expression from overrides or element
      const scriptId = actor.name?.toLowerCase().replace(/\s+/g, '_');
      const override = scriptId ? elementOverrides?.get(scriptId) : undefined;
      const effectivePose = override?.pose || target.pose;
      const effectiveExpression = override?.expression || target.expression;
      const effectiveAngle = override?.angle ?? target.spriteAngle;
      
      // Try exact match first
      const exactMatch = actor.graphics.find(g => 
        g.pose === effectivePose && 
        g.expression === effectiveExpression && 
        g.angle === effectiveAngle &&
        g.mouthPosition
      );
      if (exactMatch?.mouthPosition) return exactMatch.mouthPosition;
      
      // Fallback: same pose with any mouthPosition
      const samePoseWithMouth = actor.graphics.find(g => 
        g.pose === effectivePose && g.mouthPosition
      );
      if (samePoseWithMouth?.mouthPosition) return samePoseWithMouth.mouthPosition;
      
      // Final fallback: any graphic with mouthPosition
      const anyWithMouth = actor.graphics.find(g => g.mouthPosition);
      if (anyWithMouth?.mouthPosition) return anyWithMouth.mouthPosition;
      
      return undefined;
    }
    
    if (target.type === 'ITEM') {
      const item = game.items.find(i => i.id === target.assetId);
      return item?.mouthPosition;
    }
    
    return undefined;
  };

  // Render connecting lines for COMM balloons
  // In script mode, static balloons are hidden (SAY commands create runtime balloons instead)
  const renderCommBalloonLines = () => {
    // Don't render static balloon lines in script mode - runtime balloons handle their own rendering
    if (scriptMode) return null;
    
    const commBalloons = scene.stage?.filter(el => 
      el.type === 'BALLOON' && 
      el.balloonCategory === 'COMM' && 
      el.targetElementId
    ) || [];
    
    if (commBalloons.length === 0) return null;
    
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {commBalloons.map(balloon => {
          const target = scene.stage?.find(el => el.id === balloon.targetElementId);
          if (!target) return null;
          
          // Get positions (use overrides if in script mode)
          const targetScriptId = target.type === 'ACTOR' 
            ? game.actors.find(a => a.id === target.assetId)?.name?.toLowerCase().replace(/\s+/g, '_')
            : game.items.find(i => i.id === target.assetId)?.name?.toLowerCase().replace(/\s+/g, '_');
          
          const targetOverride = targetScriptId ? elementOverrides?.get(targetScriptId) : undefined;
          const targetX = targetOverride?.x ?? target.x;
          const targetY = targetOverride?.y ?? target.y;
          const targetScale = targetOverride?.scale ?? target.scale ?? 1;
          
          const balloonX = balloon.x;
          const balloonY = balloon.y;
          
          // Get mouth position if available
          const mouthPos = getMouthPosition(target);
          
          // Calculate mouth point on stage
          // mouthPos.x/y are percentages (0-100) within the image
          // Origin is now BOTTOM-CENTER: x=50% horizontal, y=100% vertical (bottom)
          let mouthX: number;
          let mouthY: number;
          
          if (mouthPos) {
            // Convert mouth position from image-relative to stage-relative
            // The mouth position is within the image bounds
            // We estimate image size at ~15% of stage width for actors, ~10% for items
            const imageSizeFactor = target.type === 'ACTOR' ? 0.15 : 0.10;
            const scaledSize = imageSizeFactor * targetScale;
            
            // With bottom-center origin:
            // - Horizontal: (mouthPos.x - 50) gives offset from center (-50 to +50)
            // - Vertical: (mouthPos.y - 100) gives offset from bottom (-100 to 0)
            //   mouthPos.y=0 (top of image) -> offset = -100 (full height above anchor)
            //   mouthPos.y=100 (bottom of image) -> offset = 0 (at anchor)
            const offsetX = ((mouthPos.x - 50) / 100) * scaledSize * 100;
            const offsetY = ((mouthPos.y - 100) / 100) * scaledSize * 100;
            
            mouthX = targetX + offsetX;
            mouthY = targetY + offsetY;
          } else {
            // Fallback: "head" is near top of image (about 20% from top = -80% offset from bottom)
            const imageSizeFactor = target.type === 'ACTOR' ? 0.15 : 0.10;
            const scaledSize = imageSizeFactor * targetScale;
            mouthX = targetX;
            mouthY = targetY + ((-80) / 100) * scaledSize * 100;
          }
          
          if (balloon.balloonType === 'THOUGHT') {
            // Draw thought bubbles (3 circles diminishing toward target)
            const dx = mouthX - balloonX;
            const dy = mouthY - balloonY;
            
            return (
              <g key={`line-${balloon.id}`}>
                {/* Three diminishing circles */}
                <circle 
                  cx={`${balloonX + dx * 0.3}%`} 
                  cy={`${balloonY + dy * 0.3}%`} 
                  r="6" 
                  fill="hsl(var(--diesel-paper))" 
                  stroke="black"
                  strokeWidth="2"
                />
                <circle 
                  cx={`${balloonX + dx * 0.55}%`} 
                  cy={`${balloonY + dy * 0.55}%`} 
                  r="4" 
                  fill="hsl(var(--diesel-paper))" 
                  stroke="black"
                  strokeWidth="2"
                />
                <circle 
                  cx={`${balloonX + dx * 0.75}%`} 
                  cy={`${balloonY + dy * 0.75}%`} 
                  r="2.5" 
                  fill="hsl(var(--diesel-paper))" 
                  stroke="black"
                  strokeWidth="1.5"
                />
              </g>
            );
          } else {
            // Draw speech tail (simple line/triangle pointing to target mouth)
            return (
              <g key={`line-${balloon.id}`}>
                <line
                  x1={`${balloonX}%`}
                  y1={`${balloonY}%`}
                  x2={`${mouthX}%`}
                  y2={`${mouthY}%`}
                  stroke="black"
                  strokeWidth="2"
                />
                {/* Small circle at mouth point */}
                <circle 
                  cx={`${mouthX}%`} 
                  cy={`${mouthY}%`} 
                  r="3" 
                  fill="hsl(var(--diesel-paper))" 
                  stroke="black"
                  strokeWidth="2"
                />
              </g>
            );
          }
        })}
      </svg>
    );
  };

  return (
    <div
      ref={canvasRef}
      className={`relative w-full bg-diesel-panel ${editable ? 'cursor-crosshair' : ''}`}
      style={{ aspectRatio: '16/9' }}
      onMouseMove={editable ? onMouseMove : undefined}
      onMouseUp={editable ? onMouseUp : undefined}
      onMouseLeave={editable ? onMouseUp : undefined}
      onClick={editable ? onCanvasClick : undefined}
    >
      {/* Background Drop */}
      {background?.image ? (
        <img
          src={background.image}
          alt={background.name}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-diesel-steel text-sm bg-diesel-black">
          <span className="opacity-50">
            {editable ? 'No background selected' : ''}
          </span>
        </div>
      )}

      {/* Comm Balloon connecting lines - render before elements so they appear behind */}
      {renderCommBalloonLines()}

      {/* Stage Elements */}
      {scene.stage?.map(renderElement)}
      
      {/* Runtime Balloon from SAY command */}
      {activeBalloon && (
        <div
          className={`absolute z-[200] px-3 py-2 max-w-48 text-sm ${
            activeBalloon.style === 'thought'
              ? 'bg-diesel-paper/95 rounded-[2rem] border-2 border-dashed border-diesel-steel text-diesel-black'
              : 'bg-diesel-paper/95 border-2 border-diesel-steel text-diesel-black rounded-lg'
          }`}
          style={{
            left: `${activeBalloon.x}%`,
            top: `${activeBalloon.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {activeBalloon.displayedText || <span className="opacity-50">...</span>}
        </div>
      )}
      
      {/* Buttons - only render in theater mode (not editable) or when explicitly active */}
      {!editable && game.buttons?.filter(b => !activeButtons || activeButtons.includes(b.id)).map(renderButton)}
    </div>
  );
};
