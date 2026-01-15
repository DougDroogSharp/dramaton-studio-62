import { useState } from 'react';
import { GameData, Actor, ActorGraphic, SelectionState } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { VoiceBrowser } from '@/components/VoiceBrowser';
import { POSES, EXPRESSIONS, ANGLES } from '@/constants';
import { Plus, Trash2, Upload, User, Image, Mic, ChevronRight, Play, Sparkles, Loader2, Camera, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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

  const MAX_REFERENCE_SIZE_KB = 500; // Max size in KB for reference images
  
  const handleReferenceUpload = (actorId: string, field: 'referenceImageCloseUp' | 'referenceImageFullBody', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileSizeKB = file.size / 1024;
    
    if (fileSizeKB > MAX_REFERENCE_SIZE_KB) {
      toast.warning(`Image is ${Math.round(fileSizeKB)}KB - larger images may not work with AI generation. Consider using an image under ${MAX_REFERENCE_SIZE_KB}KB.`, {
        duration: 5000,
      });
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateActor(actorId, { [field]: ev.target?.result as string });
      toast.success('Reference image uploaded');
    };
    reader.readAsDataURL(file);
  };

  const generateGraphic = async (actorId: string, graphicId: string) => {
    const actor = game.actors.find(a => a.id === actorId);
    const graphic = actor?.graphics.find(g => g.id === graphicId);
    if (!actor || !graphic) return;

    setGeneratingGraphic(graphicId);

    try {
      const prompt = `Generate a character portrait for "${actor.name}". 
Pose: ${graphic.pose}
Expression: ${graphic.expression}
Camera angle: ${graphic.angle} degrees
Style: Dieselpunk visual novel character art, clean lines, dramatic lighting, suitable for game sprite.
The character should be on a transparent or simple background suitable for compositing.`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            prompt,
            referenceImage: actor.referenceImageCloseUp || actor.referenceImageFullBody,
            styleGuide,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      if (data.imageUrl) {
        updateGraphic(actorId, graphicId, { image: data.imageUrl });
      }
    } catch (err) {
      console.error('Generation error:', err);
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
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                      onClick={() => updateGraphic(selectedActor.id, graphic.id, { image: '' })}
                      className="px-2 py-1 bg-diesel-rust/50 border border-diesel-rust text-white text-xs hover:bg-diesel-rust"
                    >
                      Remove
                    </button>
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
    </div>
  );
};
