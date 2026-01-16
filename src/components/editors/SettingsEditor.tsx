import { GameData } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { Plus, Trash2, Upload, Key, X } from 'lucide-react';
import { useState } from 'react';
import { POSES, EXPRESSIONS } from '@/constants';
import { toast } from 'sonner';

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
  const [showApiKey, setShowApiKey] = useState(false);
  const [newPose, setNewPose] = useState('');
  const [newExpression, setNewExpression] = useState('');

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
          <div className="relative group">
            <img
              src={game.info.styleGuide}
              alt="Style guide"
              className="w-full max-w-[300px] h-auto border border-diesel-border"
            />
            <button
              onClick={() => updateInfo({ styleGuide: null })}
              className="absolute top-2 right-2 p-1 bg-diesel-rust text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
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
        <div className="relative">
          <CyberInput
            label="ElevenLabs API Key"
            type={showApiKey ? 'text' : 'password'}
            value={game.info.elevenLabsApiKey || ''}
            onChange={(e) => updateInfo({ elevenLabsApiKey: e.target.value })}
            placeholder="xi_xxxxxxxxxxxxxxxxxx"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-7 text-diesel-steel hover:text-diesel-gold"
          >
            <Key size={14} />
          </button>
        </div>
        <p className="text-xs text-diesel-steel mt-1">
          Required for AI voice synthesis. Get your key at elevenlabs.io
        </p>
      </section>

      {/* Custom Poses */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Custom Poses
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Add custom poses beyond the defaults: {POSES.join(', ')}
        </p>
        
        {/* Existing custom poses */}
        {game.info.customPoses && game.info.customPoses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {game.info.customPoses.map((pose) => (
              <div key={pose} className="flex items-center gap-1 bg-diesel-black px-2 py-1 border border-diesel-border text-sm text-diesel-paper">
                <span>{pose}</span>
                <button
                  onClick={() => updateInfo({ customPoses: game.info.customPoses?.filter(p => p !== pose) })}
                  className="text-diesel-rust hover:text-red-400 ml-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add new pose */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New pose name"
            value={newPose}
            onChange={(e) => setNewPose(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newPose.trim()) {
                updateInfo({ customPoses: [...(game.info.customPoses || []), newPose.trim()] });
                setNewPose('');
              }
            }}
            className="flex-1 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button
            onClick={() => {
              if (newPose.trim()) {
                updateInfo({ customPoses: [...(game.info.customPoses || []), newPose.trim()] });
                setNewPose('');
              }
            }}
            className="px-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
          >
            <Plus size={16} />
          </button>
        </div>
      </section>

      {/* Custom Expressions */}
      <section>
        <h3 className="text-sm font-bold text-diesel-gold uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Custom Expressions
        </h3>
        <p className="text-xs text-diesel-steel mb-3">
          Add custom expressions beyond the defaults: {EXPRESSIONS.join(', ')}
        </p>
        
        {/* Existing custom expressions */}
        {game.info.customExpressions && game.info.customExpressions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {game.info.customExpressions.map((expr) => (
              <div key={expr} className="flex items-center gap-1 bg-diesel-black px-2 py-1 border border-diesel-border text-sm text-diesel-paper">
                <span>{expr}</span>
                <button
                  onClick={() => updateInfo({ customExpressions: game.info.customExpressions?.filter(e => e !== expr) })}
                  className="text-diesel-rust hover:text-red-400 ml-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add new expression */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New expression name"
            value={newExpression}
            onChange={(e) => setNewExpression(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newExpression.trim()) {
                updateInfo({ customExpressions: [...(game.info.customExpressions || []), newExpression.trim()] });
                setNewExpression('');
              }
            }}
            className="flex-1 bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          />
          <button
            onClick={() => {
              if (newExpression.trim()) {
                updateInfo({ customExpressions: [...(game.info.customExpressions || []), newExpression.trim()] });
                setNewExpression('');
              }
            }}
            className="px-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold hover:bg-diesel-gold/30"
          >
            <Plus size={16} />
          </button>
        </div>
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
