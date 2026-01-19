import { GameData } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { Plus, Trash2, Upload, Key, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Reusable ElevenLabs API Key input with verification
const ElevenLabsApiKeyInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const verifyApiKey = async () => {
    if (!value.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-voices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: 'list' }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.voices && data.voices.length > 0) {
          setVerificationStatus('valid');
          toast.success(`API key verified! Found ${data.voices.length} voices available.`);
        } else {
          setVerificationStatus('valid');
          toast.success('API key verified!');
        }
      } else {
        setVerificationStatus('invalid');
        toast.error('API key verification failed. Please check your key.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('invalid');
      toast.error('Failed to verify API key. Check your connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="relative">
      <CyberInput
        label="ElevenLabs API Key"
        type={showApiKey ? 'text' : 'password'}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setVerificationStatus('idle');
        }}
        placeholder="xi_xxxxxxxxxxxxxxxxxx"
      />
      <div className="absolute right-2 top-7 flex items-center gap-1">
        {verificationStatus === 'valid' && (
          <CheckCircle size={14} className="text-diesel-green" />
        )}
        {verificationStatus === 'invalid' && (
          <XCircle size={14} className="text-diesel-rust" />
        )}
        <button
          type="button"
          onClick={() => setShowApiKey(!showApiKey)}
          className="text-diesel-steel hover:text-diesel-gold p-1"
          title={showApiKey ? 'Hide key' : 'Show key'}
        >
          <Key size={14} />
        </button>
      </div>
      {value.trim() && (
        <button
          type="button"
          onClick={verifyApiKey}
          disabled={isVerifying}
          className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-diesel-panel border border-diesel-border text-diesel-paper text-xs hover:border-diesel-gold hover:text-diesel-gold disabled:opacity-50 transition-colors"
        >
          {isVerifying ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle size={12} />
              Verify API Key
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Compress image to reduce AI token usage
const compressImage = (file: File, maxDimension: number = 512): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Scale down if needed
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Use JPEG for smaller file size
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface SettingsEditorProps {
  game: GameData;
  onChange: (game: GameData) => void;
}

export const SettingsEditor: React.FC<SettingsEditorProps> = ({ game, onChange }) => {
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  const updateInfo = (updates: Partial<GameData['info']>) => {
    onChange({ ...game, info: { ...game.info, ...updates } });
  };

  const addWorldStateVar = () => {
    if (!newVarKey.trim()) return;
    const worldState = { ...game.info.worldState, [newVarKey]: newVarValue || '' };
    updateInfo({ worldState });
    setNewVarKey('');
    setNewVarValue('');
  };

  const removeWorldStateVar = (key: string) => {
    const worldState = { ...game.info.worldState };
    delete worldState[key];
    updateInfo({ worldState });
  };

  const handleStyleGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const originalSizeKB = file.size / 1024;
    
    try {
      toast.info('Compressing style guide...');
      const compressed = await compressImage(file, 512);
      const compressedSizeKB = compressed.length * 0.75 / 1024; // base64 overhead
      
      updateInfo({ styleGuide: compressed });
      toast.success(`Style guide uploaded (${Math.round(originalSizeKB)}KB → ~${Math.round(compressedSizeKB)}KB)`);
    } catch (err) {
      console.error('Compression failed:', err);
      // Fallback to uncompressed
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateInfo({ styleGuide: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info - Title and Author are READ-ONLY */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Project Info
        </h3>
        
        {/* Read-only title and author display */}
        <div className="mb-4 p-3 bg-diesel-black/50 border border-diesel-border">
          <div className="mb-2">
            <span className="text-xs uppercase tracking-widest text-diesel-steel">Game Title</span>
            <p className="text-lg font-bold text-diesel-gold">{game.info.title}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-diesel-steel">Author</span>
            <p className="text-sm text-diesel-paper">{game.info.author}</p>
          </div>
        </div>
        
        <div className="flex gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-diesel-paper cursor-pointer">
            <input
              type="checkbox"
              checked={game.info.enableAutosave}
              onChange={(e) => updateInfo({ enableAutosave: e.target.checked })}
              className="accent-diesel-gold"
            />
            Enable Autosave
          </label>
          <label className="flex items-center gap-2 text-sm text-diesel-paper cursor-pointer">
            <input
              type="radio"
              name="gameMode"
              checked={game.info.gameMode === 'INTERACTIVE'}
              onChange={() => updateInfo({ gameMode: 'INTERACTIVE' })}
              className="accent-diesel-gold"
            />
            Interactive
          </label>
          <label className="flex items-center gap-2 text-sm text-diesel-paper cursor-pointer">
            <input
              type="radio"
              name="gameMode"
              checked={game.info.gameMode === 'AUTO_PLAY'}
              onChange={() => updateInfo({ gameMode: 'AUTO_PLAY' })}
              className="accent-diesel-gold"
            />
            Auto-Play
          </label>
        </div>
      </section>

      {/* Style Guide */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          AI Style Guide
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Upload a reference image to teach the AI your visual style for generated assets.
        </p>
        
        {game.info.styleGuide ? (
          <div className="relative group inline-block">
            <img
              src={game.info.styleGuide}
              alt="Style guide"
              className="w-24 h-24 object-cover border border-diesel-border"
            />
            <button
              onClick={() => updateInfo({ styleGuide: null })}
              className="absolute top-1 right-1 p-0.5 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-diesel-border text-diesel-steel hover:border-diesel-gold hover:text-diesel-gold cursor-pointer transition-colors">
            <Upload size={16} />
            <span className="text-sm">Upload Style Reference</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleStyleGuideUpload}
              className="hidden"
            />
          </label>
        )}
      </section>

      {/* ElevenLabs API Key */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Voice Integration
        </h3>
        <ElevenLabsApiKeyInput 
          value={game.info.elevenLabsApiKey || ''}
          onChange={(value) => updateInfo({ elevenLabsApiKey: value })}
        />
        <p className="text-xs text-diesel-steel mt-1">
          Required for AI voice synthesis. Get your key at elevenlabs.io
        </p>
      </section>

      {/* World State Variables */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          World State Variables
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Define global variables for game logic (flags, counters, states).
        </p>
        
        {/* Existing variables */}
        <div className="space-y-2 mb-4">
          {Object.entries(game.info.worldState).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 bg-diesel-black p-2 border border-diesel-border">
              <span className="text-diesel-gold font-mono text-sm flex-1">{key}</span>
              <span className="text-diesel-paper font-mono text-sm">{String(value)}</span>
              <button
                onClick={() => removeWorldStateVar(key)}
                className="text-diesel-rust hover:text-red-400 p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        
        {/* Add new variable */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Variable name"
            value={newVarKey}
            onChange={(e) => setNewVarKey(e.target.value)}
            className="flex-1 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <input
            type="text"
            placeholder="Value"
            value={newVarValue}
            onChange={(e) => setNewVarValue(e.target.value)}
            className="w-24 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button
            onClick={addWorldStateVar}
            className="px-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
          >
            <Plus size={16} />
          </button>
        </div>
      </section>
    </div>
  );
};
