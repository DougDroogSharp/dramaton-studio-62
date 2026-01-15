import { useState, useRef, useCallback } from 'react';
import { GameData, Scene, StageElement, SelectionState } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { SCENE_TYPES } from '@/constants';
import { Plus, Trash2, Video, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, MessageSquare, User, Package } from 'lucide-react';

interface SceneEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({ game, selection, onChange, onSelect }) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showScript, setShowScript] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedScene = selection.id 
    ? game.scenes.find(s => s.id === selection.id) 
    : null;
  
  const selectedElement = selectedScene?.stage?.find(e => e.id === selectedElementId);

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

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(elementId);
    setDragging(elementId);

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

        {/* Scene Info */}
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
                  onClick={() => addStageElement(selectedScene.id, 'ACTOR', actor.id)}
                  className="px-2 py-1 bg-diesel-panel border border-diesel-border text-xs text-diesel-paper hover:border-diesel-gold transition-colors flex items-center gap-1"
                >
                  {actor.image && (
                    <img src={actor.image} alt="" className="w-4 h-4 rounded object-cover" />
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
                >
                  {element.type === 'ACTOR' && (
                    actor?.image ? (
                      <img
                        src={actor.image}
                        alt={actor.name}
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
    </div>
  );
};
