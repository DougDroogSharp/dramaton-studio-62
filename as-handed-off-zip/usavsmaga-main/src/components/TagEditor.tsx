import React, { useState } from 'react';
import { Tag, X, Plus, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TagEditorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  contentType: 'scene' | 'page';
  title: string;
  content: string;
  actors?: string[]; // For scenes, list of actor names
  disabled?: boolean;
  needsRegeneration?: boolean; // When AI detects new content not covered by tags
  regenerationReason?: string;
}

export const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  onTagsChange,
  contentType,
  title,
  content,
  actors,
  disabled = false,
  needsRegeneration = false,
  regenerationReason,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const handleGenerateTags = async () => {
    if (!content.trim()) {
      toast.error('No content to analyze');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tags', {
        body: { contentType, title, content, actors },
      });

      if (error) throw error;
      
      if (data?.tags && Array.isArray(data.tags)) {
        onTagsChange(data.tags);
        toast.success(`Generated ${data.tags.length} tags`);
      }
    } catch (err) {
      console.error('Tag generation error:', err);
      toast.error('Failed to generate tags');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  const handleAddTag = () => {
    const trimmed = newTag.toLowerCase().trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setNewTag('');
      setShowAddInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setShowAddInput(false);
      setNewTag('');
    }
  };

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-3 border-b border-diesel-border pb-2">
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest flex items-center gap-2">
          <Tag size={14} className="text-diesel-gold" />
          Search Tags
          {needsRegeneration && (
            <span 
              className="flex items-center gap-1 text-[10px] font-normal normal-case text-diesel-rust"
              title={regenerationReason || 'New content detected that may need tagging'}
            >
              <AlertCircle size={10} />
              update suggested
            </span>
          )}
        </h3>
        <button
          onClick={handleGenerateTags}
          disabled={isGenerating || disabled || !content.trim()}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            needsRegeneration 
              ? 'text-diesel-rust border-diesel-rust hover:bg-diesel-rust/20 animate-pulse' 
              : 'text-diesel-cyan hover:text-diesel-paper border-diesel-cyan/50 hover:border-diesel-cyan'
          } border`}
          title={needsRegeneration ? (regenerationReason || 'New content needs tagging') : 'Generate tags with AI'}
        >
          {isGenerating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {isGenerating ? 'Generating...' : needsRegeneration ? 'Update Tags' : 'Regenerate'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-diesel-gold/20 border border-diesel-gold/50 text-diesel-gold text-xs rounded-sm"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              disabled={disabled}
              className="hover:text-diesel-rust transition-colors disabled:opacity-50"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {showAddInput ? (
          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newTag.trim()) {
                  setShowAddInput(false);
                }
              }}
              autoFocus
              placeholder="new tag..."
              className="w-24 px-2 py-0.5 bg-diesel-black border border-diesel-gold/50 text-diesel-paper text-xs focus:outline-none focus:border-diesel-gold"
            />
            <button
              onClick={handleAddTag}
              className="p-0.5 text-diesel-green hover:text-diesel-paper"
            >
              <Plus size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2 py-0.5 border border-dashed border-diesel-steel/50 text-diesel-steel text-xs hover:border-diesel-gold hover:text-diesel-gold transition-colors disabled:opacity-50"
          >
            <Plus size={10} />
            Add tag
          </button>
        )}
      </div>

      {tags.length === 0 && (
        <p className="text-xs text-diesel-steel mt-2 italic">
          No tags yet. Click "Regenerate" to auto-generate from content.
        </p>
      )}
    </section>
  );
};
