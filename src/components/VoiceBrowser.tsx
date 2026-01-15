import { useState, useEffect, useRef } from 'react';
import { Mic, Play, Square, Loader2, Search, Check, X } from 'lucide-react';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

interface VoiceBrowserProps {
  currentVoiceId?: string;
  onSelect: (voiceId: string, voiceName: string) => void;
  onClose: () => void;
}

export const VoiceBrowser: React.FC<VoiceBrowserProps> = ({ currentVoiceId, onSelect, onClose }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoices();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-voices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'list' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      setVoices(data.voices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  const playPreview = async (voice: Voice, customText?: string) => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === voice.voice_id && !customText) {
      setPlayingId(null);
      return;
    }

    setPreviewLoading(voice.voice_id);

    try {
      // Use custom text, or ElevenLabs preview URL if available, otherwise generate default
      if (!customText && voice.preview_url) {
        audioRef.current = new Audio(voice.preview_url);
      } else {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-voices`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ 
              action: 'preview', 
              voiceId: voice.voice_id,
              text: customText 
            }),
          }
        );

        if (!response.ok) throw new Error('Preview failed');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current = new Audio(audioUrl);
      }

      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.onerror = () => setPlayingId(null);
      
      await audioRef.current.play();
      setPlayingId(voice.voice_id);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleSelect = async (voice: Voice) => {
    // Play "Reporting for duty" when selected
    await playPreview(voice, "Reporting for duty!");
    onSelect(voice.voice_id, voice.name);
  };

  const filteredVoices = voices.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-diesel-panel border border-diesel-border w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-diesel-border">
          <div className="flex items-center gap-2">
            <Mic className="text-diesel-gold" size={20} />
            <h2 className="text-lg font-bold text-diesel-gold uppercase tracking-widest">Voice Browser</h2>
          </div>
          <button onClick={onClose} className="text-diesel-steel hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-diesel-border">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-diesel-steel" />
            <input
              type="text"
              placeholder="Search voices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-diesel-black border border-diesel-border text-diesel-paper pl-10 pr-4 py-2 focus:outline-none focus:border-diesel-gold"
            />
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-diesel-gold" size={32} />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-diesel-rust mb-4">{error}</p>
              <button
                onClick={fetchVoices}
                className="px-4 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-sm hover:bg-diesel-gold/30"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredVoices.length === 0 && (
            <div className="text-center py-12 text-diesel-steel">
              <Mic size={48} className="mx-auto mb-4 opacity-30" />
              <p>No voices found</p>
            </div>
          )}

          <div className="space-y-2">
            {filteredVoices.map(voice => (
              <div
                key={voice.voice_id}
                className={`flex items-center gap-3 p-3 bg-diesel-black border transition-colors ${
                  currentVoiceId === voice.voice_id 
                    ? 'border-diesel-gold' 
                    : 'border-diesel-border hover:border-diesel-steel'
                }`}
              >
                {/* Play button */}
                <button
                  onClick={() => playPreview(voice)}
                  disabled={previewLoading === voice.voice_id}
                  className="w-10 h-10 flex items-center justify-center bg-diesel-panel border border-diesel-border hover:border-diesel-gold transition-colors"
                >
                  {previewLoading === voice.voice_id ? (
                    <Loader2 size={16} className="animate-spin text-diesel-gold" />
                  ) : playingId === voice.voice_id ? (
                    <Square size={14} className="text-diesel-rust" />
                  ) : (
                    <Play size={14} className="text-diesel-green ml-0.5" />
                  )}
                </button>

                {/* Voice info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-diesel-paper font-bold truncate">{voice.name}</span>
                    {currentVoiceId === voice.voice_id && (
                      <Check size={14} className="text-diesel-green shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-diesel-steel capitalize">
                    {voice.category}
                    {voice.labels?.accent && ` • ${voice.labels.accent}`}
                    {voice.labels?.gender && ` • ${voice.labels.gender}`}
                  </div>
                </div>

                {/* Select button */}
                <button
                  onClick={() => handleSelect(voice)}
                  disabled={previewLoading === voice.voice_id}
                  className={`px-3 py-1.5 text-xs font-bold uppercase ${
                    currentVoiceId === voice.voice_id
                      ? 'bg-diesel-gold/20 border border-diesel-gold text-diesel-gold'
                      : 'bg-diesel-panel border border-diesel-border text-diesel-steel hover:text-diesel-paper hover:border-diesel-paper'
                  } disabled:opacity-50`}
                >
                  {previewLoading === voice.voice_id ? 'Loading...' : currentVoiceId === voice.voice_id ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-diesel-border text-center">
          <p className="text-xs text-diesel-steel">
            {voices.length} voices available • Powered by ElevenLabs
          </p>
        </div>
      </div>
    </div>
  );
};
