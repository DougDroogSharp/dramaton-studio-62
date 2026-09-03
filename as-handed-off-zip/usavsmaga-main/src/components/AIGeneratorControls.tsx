import React from 'react';
import { Lock, Sparkles, Wand2, Upload, Trash2, Loader2 } from 'lucide-react';
import { formatTokens } from '@/utils/tokenEstimate';

interface AIGeneratorControlsProps {
  // Style Lock
  styleLock: boolean;
  onStyleLockChange: (locked: boolean) => void;
  
  // Token estimate (optional)
  tokenEstimate?: number;
  
  // Generate action
  isGenerating: boolean;
  onGenerate: () => void;
  generateDisabled?: boolean;
  generateLabel?: string;
  
  // Upload (optional)
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadAccept?: string;
  
  // Edit mode toggle (optional - for Drop/Actor editing)
  editMode?: {
    enabled: boolean;
    active: boolean;
    onToggle: () => void;
  };
  
  // Clear/Delete image (optional)
  onClear?: () => void;
  hasClearableContent?: boolean;
}

export const AIGeneratorControls: React.FC<AIGeneratorControlsProps> = ({
  styleLock,
  onStyleLockChange,
  tokenEstimate,
  isGenerating,
  onGenerate,
  generateDisabled,
  generateLabel = 'Generate',
  onUpload,
  uploadAccept = 'image/*',
  editMode,
  onClear,
  hasClearableContent,
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Style Lock */}
      <button
        onClick={() => onStyleLockChange(!styleLock)}
        className={`flex items-center gap-1.5 px-2 py-1.5 border text-xs font-bold uppercase transition-colors ${
          styleLock 
            ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold' 
            : 'bg-diesel-panel border-diesel-border text-diesel-steel hover:border-diesel-paper'
        }`}
        title="Style Lock - when ON, generated images follow the project style guide"
      >
        <Lock size={12} />
        Style
      </button>
      
      {/* Token Estimate */}
      {tokenEstimate !== undefined && (
        <span className="text-[10px] text-diesel-steel font-mono" title={`Estimated tokens: ${tokenEstimate}`}>
          ~{formatTokens(tokenEstimate)}
        </span>
      )}
      
      {/* Generate */}
      <button
        onClick={onGenerate}
        disabled={generateDisabled || isGenerating}
        className="flex items-center gap-1.5 px-2 py-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green text-xs font-bold uppercase hover:bg-diesel-green/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {generateLabel}
      </button>
      
      {/* Edit Mode Toggle (for Drop/Actor) */}
      {editMode && (
        <button
          onClick={editMode.onToggle}
          disabled={!editMode.enabled}
          className={`flex items-center gap-1.5 px-2 py-1.5 border text-xs font-bold uppercase transition-colors disabled:opacity-50 ${
            editMode.active 
              ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold' 
              : 'bg-diesel-panel border-diesel-border text-diesel-paper hover:border-diesel-gold'
          }`}
        >
          <Wand2 size={12} />
          Edit
        </button>
      )}
      
      {/* Upload */}
      {onUpload && (
        <label className="flex items-center gap-1.5 px-2 py-1.5 border border-diesel-border text-diesel-paper text-xs font-bold uppercase hover:border-diesel-gold cursor-pointer transition-colors">
          <Upload size={12} />
          Upload
          <input
            type="file"
            accept={uploadAccept}
            onChange={onUpload}
            className="hidden"
          />
        </label>
      )}
      
      {/* Clear/Delete */}
      {onClear && hasClearableContent && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-2 py-1.5 border border-diesel-rust text-diesel-rust text-xs font-bold uppercase hover:bg-diesel-rust/20 transition-colors"
        >
          <Trash2 size={12} />
          Clear
        </button>
      )}
    </div>
  );
};
