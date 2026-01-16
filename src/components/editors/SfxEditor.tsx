import { useState, useRef } from 'react';
import { GameData, Sfx, SfxType, SfxCategory, SelectionState } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { SFX_TYPES } from '@/constants';
import { Plus, Trash2, Music, ChevronRight, Play, Zap, Sparkles, Volume2, Loader2, Square } from 'lucide-react';

interface SfxEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

export const SfxEditor: React.FC<SfxEditorProps> = ({ game, selection, onChange, onSelect }) => {
  const [previewingSfx, setPreviewingSfx] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const selectedSfx = selection.id 
    ? game.sfx.find(s => s.id === selection.id) 
    : null;

  const createSfx = (category: SfxCategory) => {
    const types = SFX_TYPES[category];
    const newSfx: Sfx = {
      id: `sfx_${Date.now()}`,
      name: `New ${category} Effect`,
      type: types[0] as SfxType,
      category,
      params: {
        intensity: 1,
        speed: 1,
        duration: 1,
      },
    };
    onChange({ ...game, sfx: [...game.sfx, newSfx] });
    onSelect('sfx', newSfx.id);
  };

  const updateSfx = (id: string, updates: Partial<Sfx>) => {
    onChange({
      ...game,
      sfx: game.sfx.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  const deleteSfx = (id: string) => {
    stopAudio();
    onChange({ ...game, sfx: game.sfx.filter(s => s.id !== id) });
    onSelect('sfx', null);
  };

  // Audio generation using ElevenLabs
  const generateAudio = async (sfx: Sfx) => {
    const prompt = sfx.params.audioPrompt || `${sfx.type} sound effect, ${sfx.name}`;
    
    setGeneratingAudio(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            prompt,
            duration: sfx.params.duration || 2,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Update the SFX with the generated audio
      updateSfx(sfx.id, { 
        params: { 
          ...sfx.params, 
          audioUrl,
          audioPrompt: prompt,
        } 
      });
      
      // Play the generated audio
      playAudio(audioUrl, sfx.id);
    } catch (error) {
      console.error('Audio generation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate audio');
    } finally {
      setGeneratingAudio(false);
    }
  };

  const playAudio = (url: string, sfxId: string) => {
    stopAudio();
    const audio = new Audio(url);
    audio.play();
    audioRef.current = audio;
    setPlayingAudio(sfxId);
    
    audio.onended = () => {
      setPlayingAudio(null);
    };
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudio(null);
  };

  const getAnimationStyle = (sfx: Sfx): React.CSSProperties => {
    const { type, params } = sfx;
    const duration = `${(params.duration || 1) / params.intensity}s`;
    
    switch (type) {
      case 'glow':
        return {
          boxShadow: `0 0 ${20 * params.intensity}px ${params.color || '#d4a574'}`,
          animation: `pulse ${duration} ease-in-out infinite`,
        };
      case 'pulse':
        return {
          animation: `pulse ${duration} ease-in-out infinite`,
          transform: `scale(${1 + (params.intensity - 1) * 0.1})`,
        };
      case 'shake':
        return {
          animation: `shake ${parseFloat(duration) / 2}s ease-in-out infinite`,
        };
      case 'jiggle':
        return {
          animation: `jiggle ${duration} ease-in-out infinite`,
        };
      case 'electric':
        return {
          filter: `drop-shadow(0 0 ${5 * params.intensity}px #00ffff)`,
          animation: `electric ${parseFloat(duration) / 4}s ease-in-out infinite`,
        };
      case 'fade':
        return {
          animation: `fade ${duration} ease-in-out infinite alternate`,
        };
      default:
        return {};
    }
  };

  // SFX List View
  if (!selectedSfx) {
    const attachSfx = game.sfx.filter(s => s.category === 'ATTACH');
    const doSfx = game.sfx.filter(s => s.category === 'DO');
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-diesel-steel">
            {game.sfx.length} effect{game.sfx.length !== 1 ? 's' : ''} defined
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => createSfx('ATTACH')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-diesel-green/20 border border-diesel-green text-diesel-green hover:bg-diesel-green/30"
            >
              <Plus size={12} />
              Attach
            </button>
            <button
              onClick={() => createSfx('DO')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
            >
              <Plus size={12} />
              Do
            </button>
          </div>
        </div>
        
        {/* ATTACH Effects */}
        <section>
          <h3 className="text-sm font-bold text-diesel-green uppercase tracking-widest mb-3 flex items-center gap-2">
            <Sparkles size={14} />
            Attach Effects
          </h3>
          <p className="text-xs text-diesel-steel mb-3">
            Persistent effects that stay on elements (glow, pulse, etc.)
          </p>
          <div className="space-y-2">
            {attachSfx.map(sfx => (
              <button
                key={sfx.id}
                onClick={() => onSelect('sfx', sfx.id)}
                className="w-full flex items-center gap-3 p-3 bg-diesel-black border border-diesel-border hover:border-diesel-green transition-colors text-left"
              >
                <div 
                  className="w-8 h-8 bg-diesel-panel border border-diesel-green/50 flex items-center justify-center"
                  style={previewingSfx === sfx.id ? getAnimationStyle(sfx) : {}}
                >
                  <Sparkles size={16} className="text-diesel-green" />
                </div>
                <div className="flex-1">
                  <div className="text-diesel-paper font-bold">{sfx.name}</div>
                  <div className="text-xs text-diesel-steel capitalize">{sfx.type}</div>
                </div>
                <ChevronRight size={16} className="text-diesel-steel" />
              </button>
            ))}
            {attachSfx.length === 0 && (
              <p className="text-sm text-diesel-steel/50 italic">No attach effects yet</p>
            )}
          </div>
        </section>

        {/* DO Effects */}
        <section>
          <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap size={14} />
            Do Effects
          </h3>
          <p className="text-xs text-diesel-steel mb-3">
            One-time triggered effects (shake, fade, etc.)
          </p>
          <div className="space-y-2">
            {doSfx.map(sfx => (
              <button
                key={sfx.id}
                onClick={() => onSelect('sfx', sfx.id)}
                className="w-full flex items-center gap-3 p-3 bg-diesel-black border border-diesel-border hover:border-diesel-gold transition-colors text-left"
              >
                <div className="w-8 h-8 bg-diesel-panel border border-diesel-gold/50 flex items-center justify-center">
                  <Zap size={16} className="text-diesel-gold" />
                </div>
                <div className="flex-1">
                  <div className="text-diesel-paper font-bold">{sfx.name}</div>
                  <div className="text-xs text-diesel-steel capitalize">{sfx.type}</div>
                </div>
                <ChevronRight size={16} className="text-diesel-steel" />
              </button>
            ))}
            {doSfx.length === 0 && (
              <p className="text-sm text-diesel-steel/50 italic">No do effects yet</p>
            )}
          </div>
        </section>
        
        {game.sfx.length === 0 && (
          <div className="text-center py-8 text-diesel-steel">
            <Music size={48} className="mx-auto mb-4 opacity-30" />
            <p>No effects yet. Create your first SFX!</p>
          </div>
        )}
      </div>
    );
  }

  // SFX Detail View
  const availableTypes = SFX_TYPES[selectedSfx.category];
  const accentColor = selectedSfx.category === 'ATTACH' ? 'diesel-green' : 'diesel-gold';

  return (
    <div className="space-y-6">
      <button
        onClick={() => onSelect('sfx', null)}
        className={`text-sm text-diesel-steel hover:text-${accentColor} flex items-center gap-1`}
      >
        ← Back to SFX
      </button>
      
      {/* Preview */}
      <section className="flex justify-center">
        <div 
          className={`w-24 h-24 bg-diesel-panel border border-${accentColor}/50 flex items-center justify-center transition-all`}
          style={previewingSfx === selectedSfx.id ? getAnimationStyle(selectedSfx) : {}}
        >
          {selectedSfx.category === 'ATTACH' 
            ? <Sparkles size={32} className={`text-${accentColor}`} />
            : <Zap size={32} className={`text-${accentColor}`} />
          }
        </div>
      </section>
      
      <button
        onClick={() => setPreviewingSfx(previewingSfx === selectedSfx.id ? null : selectedSfx.id)}
        className={`w-full py-2 flex items-center justify-center gap-2 bg-${accentColor}/20 border border-${accentColor} text-${accentColor} text-sm font-bold uppercase hover:bg-${accentColor}/30 transition-colors`}
      >
        <Play size={14} />
        {previewingSfx === selectedSfx.id ? 'Stop Preview' : 'Preview Effect'}
      </button>
      
      {/* Basic Info */}
      <section>
        <h3 className={`text-sm font-bold text-${accentColor} uppercase tracking-widest mb-4 border-b border-diesel-border pb-2`}>
          Effect Info
        </h3>
        <CyberInput
          label="Name"
          value={selectedSfx.name}
          onChange={(e) => updateSfx(selectedSfx.id, { name: e.target.value })}
        />
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Type</label>
          <select
            value={selectedSfx.type}
            onChange={(e) => updateSfx(selectedSfx.id, { type: e.target.value as SfxType })}
            className="bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold"
          >
            {availableTypes.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
      </section>

      {/* Parameters */}
      <section>
        <h3 className={`text-sm font-bold text-${accentColor} uppercase tracking-widest mb-4 border-b border-diesel-border pb-2`}>
          Parameters
        </h3>
        <CyberSlider
          label="Intensity"
          min={0.1}
          max={3}
          step={0.1}
          value={selectedSfx.params.intensity}
          onChange={(v) => updateSfx(selectedSfx.id, { params: { ...selectedSfx.params, intensity: v } })}
        />
        <CyberSlider
          label="Speed"
          min={0.1}
          max={5}
          step={0.1}
          value={selectedSfx.params.speed || 1}
          onChange={(v) => updateSfx(selectedSfx.id, { params: { ...selectedSfx.params, speed: v } })}
        />
        <CyberSlider
          label="Duration (s)"
          min={0.1}
          max={10}
          step={0.1}
          value={selectedSfx.params.duration || 1}
          onChange={(v) => updateSfx(selectedSfx.id, { params: { ...selectedSfx.params, duration: v } })}
        />
        {(selectedSfx.type === 'glow' || selectedSfx.type === 'electric') && (
          <div className="flex flex-col gap-1 mt-4">
            <label className="text-xs uppercase tracking-widest text-diesel-gold font-bold">Color</label>
            <input
              type="color"
              value={selectedSfx.params.color || '#d4a574'}
              onChange={(e) => updateSfx(selectedSfx.id, { params: { ...selectedSfx.params, color: e.target.value } })}
              className="w-full h-10 bg-diesel-black border border-diesel-border cursor-pointer"
            />
          </div>
        )}
      </section>

      {/* Audio Section */}
      <section>
        <h3 className={`text-sm font-bold text-${accentColor} uppercase tracking-widest mb-4 border-b border-diesel-border pb-2 flex items-center gap-2`}>
          <Volume2 size={14} />
          Sound Effect
        </h3>
        
        <CyberInput
          label="Audio Prompt"
          value={selectedSfx.params.audioPrompt || ''}
          onChange={(e) => updateSfx(selectedSfx.id, { params: { ...selectedSfx.params, audioPrompt: e.target.value } })}
          placeholder={`${selectedSfx.type} sound effect...`}
        />
        <p className="text-xs text-diesel-steel mb-3">
          Describe the sound you want (e.g., "electric zap", "magical shimmer", "mechanical clunk")
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={() => generateAudio(selectedSfx)}
            disabled={generatingAudio}
            className={`flex-1 py-2 flex items-center justify-center gap-2 bg-${accentColor}/20 border border-${accentColor} text-${accentColor} text-sm font-bold uppercase hover:bg-${accentColor}/30 transition-colors disabled:opacity-50`}
          >
            {generatingAudio ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Volume2 size={14} />
                Generate Audio
              </>
            )}
          </button>
          
          {selectedSfx.params.audioUrl && (
            <button
              onClick={() => {
                if (playingAudio === selectedSfx.id) {
                  stopAudio();
                } else {
                  playAudio(selectedSfx.params.audioUrl!, selectedSfx.id);
                }
              }}
              className={`px-4 py-2 flex items-center justify-center gap-2 border text-sm font-bold uppercase transition-colors ${
                playingAudio === selectedSfx.id 
                  ? 'bg-diesel-rust/20 border-diesel-rust text-diesel-rust' 
                  : `bg-${accentColor}/20 border-${accentColor} text-${accentColor} hover:bg-${accentColor}/30`
              }`}
            >
              {playingAudio === selectedSfx.id ? <Square size={14} /> : <Play size={14} />}
            </button>
          )}
        </div>
        
        {selectedSfx.params.audioUrl && (
          <p className="text-xs text-diesel-green mt-2">✓ Audio generated</p>
        )}
      </section>

      {/* Delete SFX */}
      <button
        onClick={() => deleteSfx(selectedSfx.id)}
        className="w-full py-2 mt-6 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
      >
        Delete Effect
      </button>
    </div>
  );
};
