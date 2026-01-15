import { useState } from 'react';
import { GameData, Actor, ActorGraphic, SelectionState } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { VoiceBrowser } from '@/components/VoiceBrowser';
import { POSES, EXPRESSIONS, ANGLES } from '@/constants';
import { Plus, Trash2, Upload, User, Image, Mic, ChevronRight, Play } from 'lucide-react';

interface ActorEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

export const ActorEditor: React.FC<ActorEditorProps> = ({ game, selection, onChange, onSelect }) => {
  const [showVoiceBrowser, setShowVoiceBrowser] = useState(false);
  
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
                  {POSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={graphic.expression}
                  onChange={(e) => updateGraphic(selectedActor.id, graphic.id, { expression: e.target.value })}
                  className="bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 focus:outline-none focus:border-diesel-gold"
                >
                  {EXPRESSIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select
                  value={graphic.angle}
                  onChange={(e) => updateGraphic(selectedActor.id, graphic.id, { angle: Number(e.target.value) })}
                  className="bg-diesel-panel border border-diesel-border text-diesel-paper text-sm p-2 focus:outline-none focus:border-diesel-gold"
                >
                  {ANGLES.map(a => <option key={a} value={a}>{a}°</option>)}
                </select>
              </div>
              
              {graphic.image ? (
                <div className="relative group">
                  <img src={graphic.image} alt="Graphic" className="w-full h-32 object-contain bg-diesel-panel" />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-white text-sm">Replace Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(selectedActor.id, graphic.id, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-24 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
                  <Image size={20} />
                  <span className="text-sm">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(selectedActor.id, graphic.id, e)}
                    className="hidden"
                  />
                </label>
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
    </div>
  );
};
