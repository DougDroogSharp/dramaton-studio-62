import { useState } from 'react';
import { GameData, Scene, StageElement, SelectionState } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { SCENE_TYPES } from '@/constants';
import { Plus, Trash2, Video, ChevronRight, Play, Image } from 'lucide-react';

interface SceneEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({ game, selection, onChange, onSelect }) => {
  const selectedScene = selection.id 
    ? game.scenes.find(s => s.id === selection.id) 
    : null;

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

  const addStageElement = (sceneId: string, type: StageElement['type']) => {
    const scene = game.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    const newElement: StageElement = {
      id: `element_${Date.now()}`,
      assetId: '',
      type,
      x: 50,
      y: 50,
      scale: 1,
      zIndex: (scene.stage?.length || 0) + 1,
      rotation: 0,
    };
    updateScene(sceneId, { stage: [...(scene.stage || []), newElement] });
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
  };

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

  // Scene Detail View
  const drop = game.drops.find(d => d.id === selectedScene.dropId);

  return (
    <div className="space-y-6">
      <button
        onClick={() => onSelect('scene', null)}
        className="text-sm text-diesel-steel hover:text-diesel-rust flex items-center gap-1"
      >
        ← Back to Scenes
      </button>
      
      {/* Basic Info */}
      <section>
        <h3 className="text-sm font-bold text-diesel-rust uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Scene Info
        </h3>
        <CyberInput
          label="Scene Name"
          value={selectedScene.name}
          onChange={(e) => updateScene(selectedScene.id, { name: e.target.value })}
        />
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Scene Type</label>
          <select
            value={selectedScene.sceneType || 'Dialogue'}
            onChange={(e) => updateScene(selectedScene.id, { sceneType: e.target.value })}
            className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold"
          >
            {SCENE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Background (Drop)</label>
          <select
            value={selectedScene.dropId || ''}
            onChange={(e) => updateScene(selectedScene.id, { dropId: e.target.value || undefined })}
            className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold"
          >
            <option value="">No background</option>
            {game.drops.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </section>

      {/* Stage Elements */}
      <section>
        <h3 className="text-sm font-bold text-diesel-rust uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Stage ({selectedScene.stage?.length || 0} elements)
        </h3>
        
        {/* Add Element Buttons - Prominent */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => addStageElement(selectedScene.id, 'ACTOR')}
            className="flex flex-col items-center gap-1 p-3 bg-diesel-gold/10 border-2 border-dashed border-diesel-gold/50 text-diesel-gold hover:bg-diesel-gold/20 hover:border-diesel-gold transition-colors"
          >
            <Plus size={20} />
            <span className="text-xs font-bold uppercase">Add Actor</span>
          </button>
          <button
            onClick={() => addStageElement(selectedScene.id, 'ITEM')}
            className="flex flex-col items-center gap-1 p-3 bg-diesel-gold/10 border-2 border-dashed border-diesel-gold/50 text-diesel-gold hover:bg-diesel-gold/20 hover:border-diesel-gold transition-colors"
          >
            <Plus size={20} />
            <span className="text-xs font-bold uppercase">Add Item</span>
          </button>
          <button
            onClick={() => addStageElement(selectedScene.id, 'BALLOON')}
            className="flex flex-col items-center gap-1 p-3 bg-diesel-gold/10 border-2 border-dashed border-diesel-gold/50 text-diesel-gold hover:bg-diesel-gold/20 hover:border-diesel-gold transition-colors"
          >
            <Plus size={20} />
            <span className="text-xs font-bold uppercase">Add Balloon</span>
          </button>
        </div>
        
        <div className="space-y-3">
          {selectedScene.stage?.map((element, idx) => (
            <div key={element.id} className="bg-diesel-black border border-diesel-border p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-diesel-gold font-bold uppercase">{element.type}</span>
                <button
                  onClick={() => deleteStageElement(selectedScene.id, element.id)}
                  className="text-diesel-rust hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              {element.type === 'ACTOR' && (
                <select
                  value={element.assetId}
                  onChange={(e) => updateStageElement(selectedScene.id, element.id, { assetId: e.target.value })}
                  className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 mb-2"
                >
                  <option value="">Select Actor</option>
                  {game.actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              
              {element.type === 'ITEM' && (
                <select
                  value={element.assetId}
                  onChange={(e) => updateStageElement(selectedScene.id, element.id, { assetId: e.target.value })}
                  className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 mb-2"
                >
                  <option value="">Select Item</option>
                  {game.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              )}
              
              {element.type === 'BALLOON' && (
                <>
                  <select
                    value={element.balloonType || 'SPEECH'}
                    onChange={(e) => updateStageElement(selectedScene.id, element.id, { balloonType: e.target.value as 'SPEECH' | 'THOUGHT' })}
                    className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 mb-2"
                  >
                    <option value="SPEECH">Speech</option>
                    <option value="THOUGHT">Thought</option>
                  </select>
                  <textarea
                    value={element.text || ''}
                    onChange={(e) => updateStageElement(selectedScene.id, element.id, { text: e.target.value })}
                    placeholder="Balloon text..."
                    className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 h-16 resize-none"
                  />
                </>
              )}
              
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-diesel-steel">X</label>
                  <input
                    type="number"
                    value={element.x}
                    onChange={(e) => updateStageElement(selectedScene.id, element.id, { x: Number(e.target.value) })}
                    className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper p-1 text-center"
                  />
                </div>
                <div>
                  <label className="text-diesel-steel">Y</label>
                  <input
                    type="number"
                    value={element.y}
                    onChange={(e) => updateStageElement(selectedScene.id, element.id, { y: Number(e.target.value) })}
                    className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper p-1 text-center"
                  />
                </div>
                <div>
                  <label className="text-diesel-steel">Scale</label>
                  <input
                    type="number"
                    step="0.1"
                    value={element.scale}
                    onChange={(e) => updateStageElement(selectedScene.id, element.id, { scale: Number(e.target.value) })}
                    className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper p-1 text-center"
                  />
                </div>
                <div>
                  <label className="text-diesel-steel">Z</label>
                  <input
                    type="number"
                    value={element.zIndex}
                    onChange={(e) => updateStageElement(selectedScene.id, element.id, { zIndex: Number(e.target.value) })}
                    className="w-full bg-diesel-panel border border-diesel-border text-diesel-paper p-1 text-center"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Script */}
      <section>
        <h3 className="text-sm font-bold text-diesel-rust uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Script
        </h3>
        <textarea
          value={selectedScene.script || ''}
          onChange={(e) => updateScene(selectedScene.id, { script: e.target.value })}
          placeholder="Write your scene script here...&#10;&#10;Example:&#10;[SPEAKER_NAME]: Dialogue text here...&#10;[pause 2]&#10;[sfx shake ACTOR_ID]"
          className="w-full h-48 bg-diesel-black border border-diesel-border text-diesel-paper p-3 font-mono text-sm resize-none focus:outline-none focus:border-diesel-rust"
        />
      </section>

      {/* Delete Scene */}
      <button
        onClick={() => deleteScene(selectedScene.id)}
        className="w-full py-2 mt-6 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
      >
        Delete Scene
      </button>
    </div>
  );
};
