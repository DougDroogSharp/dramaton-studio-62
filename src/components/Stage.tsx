import React, { useRef, useCallback } from 'react';
import { GameData, Scene, StageElement, Actor, Drop, Sfx } from '@/types';
import { User, Package, MessageSquare } from 'lucide-react';

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
  // Theater mode props
  animatingElements?: Map<string, { x: number; y: number }>;
  activeEffects?: Map<string, string[]>; // element id -> active sfx ids
  hideElement?: Set<string>; // elements to hide (for EXIT command)
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
  animatingElements,
  activeEffects,
  hideElement,
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
    // Check if element should be hidden
    if (hideElement?.has(element.id)) return null;
    
    const actor = element.type === 'ACTOR' ? game.actors.find(a => a.id === element.assetId) : null;
    const item = element.type === 'ITEM' ? game.items.find(i => i.id === element.assetId) : null;
    
    // Find the matching graphic based on pose/expression/angle stored on the element
    const actorGraphic = actor?.graphics.find(g => 
      g.pose === element.pose && 
      g.expression === element.expression && 
      g.angle === element.spriteAngle
    ) || actor?.graphics[0];

    // Get position (use animation override if present)
    const animPos = animatingElements?.get(element.id);
    const x = animPos?.x ?? element.x;
    const y = animPos?.y ?? element.y;
    
    const sfxClasses = getSfxClasses(element.id);

    return (
      <div
        key={element.id}
        className={`absolute select-none transition-all duration-200 ${
          editable ? 'cursor-move' : ''
        } ${
          editable && selectedElementId === element.id 
            ? 'ring-2 ring-diesel-gold ring-offset-2 ring-offset-transparent' 
            : ''
        } ${
          editable && draggingId === element.id ? 'z-50' : ''
        } ${sfxClasses}`}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) scale(${element.scale}) rotate(${element.rotation}deg)`,
          zIndex: draggingId === element.id ? 1000 : element.zIndex,
        }}
        onMouseDown={editable ? (e) => onElementMouseDown?.(e, element.id) : undefined}
        onDoubleClick={editable ? () => onElementDoubleClick?.(element, actor || undefined) : undefined}
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
              editable && <span className="text-diesel-steel italic">Empty balloon</span>
            )}
          </div>
        )}
      </div>
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

      {/* Stage Elements */}
      {scene.stage?.map(renderElement)}
    </div>
  );
};
