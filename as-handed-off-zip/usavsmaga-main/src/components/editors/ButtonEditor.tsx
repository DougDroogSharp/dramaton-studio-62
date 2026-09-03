import { useState } from 'react';
import { GameData, Button, SelectionState, AssetStatus } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import { Plus, Trash2, MousePointer2, ChevronRight, Link, Volume2, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { NotesSection } from '@/components/NotesSection';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface ButtonEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

const BUTTON_STYLES = ['default', 'primary', 'danger'] as const;

export const ButtonEditor: React.FC<ButtonEditorProps> = ({ game, selection, onChange, onSelect }) => {
  const { confirm } = useConfirmDialog();
  const selectedButton = selection.id 
    ? game.buttons?.find(b => b.id === selection.id) 
    : null;

  const createButton = () => {
    const newButton: Button = {
      id: `button_${Date.now()}`,
      name: 'New Button',
      label: 'Click Me',
      x: 50,
      y: 50,
      width: 20,
      height: 8,
      style: 'default',
      status: 'new',
    };
    onChange({ 
      ...game, 
      buttons: [...(game.buttons || []), newButton] 
    });
    onSelect('button', newButton.id);
  };

  // Update button with auto-promotion to 'work' when content changes
  const updateButton = (id: string, updates: Partial<Button>) => {
    const currentButton = game.buttons?.find(b => b.id === id);
    if (!currentButton) return;
    
    const updatedButton = { ...currentButton, ...updates };
    
    // Auto-promote to 'work' if currently 'new' and content is being edited
    let newStatus = updatedButton.status || 'new';
    if (!('status' in updates) && newStatus === 'new') {
      const hasContent = 
        updatedButton.name !== 'New Button' ||
        updatedButton.label !== 'Click Me' ||
        updatedButton.targetSceneId ||
        updatedButton.pageUrl;
      if (hasContent) {
        newStatus = 'work';
      }
    }
    
    onChange({
      ...game,
      buttons: game.buttons?.map(b => b.id === id ? { ...updatedButton, status: newStatus } : b) || [],
    });
  };

  // Manual status change - allows setting any status directly
  const setButtonStatus = (id: string, status: AssetStatus) => {
    onChange({
      ...game,
      buttons: game.buttons?.map(b => b.id === id ? { ...b, status } : b) || [],
    });
  };

  const deleteButton = async (id: string) => {
    const button = game.buttons?.find(b => b.id === id);
    if (!button) return;
    const shouldDelete = await confirm({
      title: 'Delete Button',
      description: `Delete "${button.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!shouldDelete) return;
    onChange({ 
      ...game, 
      buttons: game.buttons?.filter(b => b.id !== id) || [] 
    });
    onSelect('button', null);
  };

  // Button List View
  if (!selectedButton) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-diesel-steel">
            {game.buttons?.length || 0} button{(game.buttons?.length || 0) !== 1 ? 's' : ''} defined
          </p>
          <button
            onClick={createButton}
            className="flex items-center gap-2 px-3 py-2 bg-diesel-paper/20 border border-diesel-paper text-diesel-paper text-sm font-bold uppercase hover:bg-diesel-paper/30 transition-colors"
          >
            <Plus size={14} />
            New Button
          </button>
        </div>
        
        <div className="space-y-2">
          {game.buttons?.map(button => {
            const statusBorderColor = button.status === 'done' 
              ? 'border-diesel-green/50 hover:border-diesel-green' 
              : button.status === 'work' 
                ? 'border-diesel-rust/50 hover:border-diesel-rust' 
                : 'border-diesel-border hover:border-diesel-paper';
            
            return (
              <button
                key={button.id}
                onClick={() => onSelect('button', button.id)}
                className={`w-full flex items-center gap-3 p-3 bg-diesel-black border ${statusBorderColor} transition-colors text-left`}
              >
                <MousePointer2 size={18} className="text-diesel-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-diesel-paper font-bold text-sm truncate">{button.name}</div>
                  <div className="text-diesel-steel text-xs truncate">"{button.label}"</div>
                </div>
                <StatusBadge status={button.status || 'new'} size="sm" />
                <ChevronRight size={14} className="text-diesel-steel" />
              </button>
            );
          })}
        </div>
        
        {(!game.buttons || game.buttons.length === 0) && (
          <div className="text-center py-12 text-diesel-steel">
            <MousePointer2 size={48} className="mx-auto mb-4 opacity-30" />
            <p>No buttons yet. Create interactive buttons for your scenes!</p>
            <p className="text-xs mt-2 text-diesel-steel/70">
              Buttons can link to scenes, play sounds, or open URLs.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Button Detail View
  return (
    <div className="space-y-6">
      <button
        onClick={() => onSelect('button', null)}
        className="text-sm text-diesel-steel hover:text-diesel-paper flex items-center gap-1"
      >
        ← Back to Buttons
      </button>
      
      {/* Basic Info */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-diesel-border pb-2">
          <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest">
            Button Info
          </h3>
          <StatusSelector 
            status={selectedButton.status || 'new'} 
            onChange={(status) => setButtonStatus(selectedButton.id, status)} 
          />
        </div>
        <CyberInput
          label="Name (internal)"
          value={selectedButton.name}
          onChange={(e) => updateButton(selectedButton.id, { name: e.target.value })}
        />
        <CyberInput
          label="Label (visible text)"
          value={selectedButton.label}
          onChange={(e) => updateButton(selectedButton.id, { label: e.target.value })}
        />
        <div className="mt-3">
          <NotesSection 
            note={selectedButton.note || ''} 
            onChange={(note) => updateButton(selectedButton.id, { note })} 
          />
        </div>
      </section>

      {/* Position & Size */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Position & Size
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <CyberSlider
            label="X Position"
            value={selectedButton.x}
            min={0}
            max={100}
            step={1}
            onChange={(v) => updateButton(selectedButton.id, { x: v })}
          />
          <CyberSlider
            label="Y Position"
            value={selectedButton.y}
            min={0}
            max={100}
            step={1}
            onChange={(v) => updateButton(selectedButton.id, { y: v })}
          />
          <CyberSlider
            label="Width"
            value={selectedButton.width}
            min={5}
            max={50}
            step={1}
            onChange={(v) => updateButton(selectedButton.id, { width: v })}
          />
          <CyberSlider
            label="Height"
            value={selectedButton.height}
            min={5}
            max={20}
            step={1}
            onChange={(v) => updateButton(selectedButton.id, { height: v })}
          />
        </div>
      </section>

      {/* Style */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Style
        </h3>
        <div className="flex gap-2">
          {BUTTON_STYLES.map(style => (
            <button
              key={style}
              onClick={() => updateButton(selectedButton.id, { style })}
              className={`flex-1 py-2 px-3 border text-xs font-bold uppercase transition-colors ${
                selectedButton.style === style
                  ? style === 'primary' 
                    ? 'bg-diesel-gold/20 border-diesel-gold text-diesel-gold'
                    : style === 'danger'
                    ? 'bg-diesel-rust/20 border-diesel-rust text-diesel-rust'
                    : 'bg-diesel-paper/20 border-diesel-paper text-diesel-paper'
                  : 'bg-diesel-panel border-diesel-border text-diesel-steel hover:border-diesel-paper'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          On Click Actions
        </h3>
        
        {/* Link to Scene */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-diesel-gold uppercase flex items-center gap-1">
            <Link size={12} />
            Navigate to Scene
          </label>
          <select
            value={selectedButton.targetSceneId || ''}
            onChange={(e) => updateButton(selectedButton.id, { targetSceneId: e.target.value || undefined })}
            className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          >
            <option value="">None (no navigation)</option>
            {game.scenes.map(scene => (
              <option key={scene.id} value={scene.id}>{scene.name}</option>
            ))}
          </select>
        </div>

        {/* Play Sound Effect */}
        <div className="space-y-2 mb-4">
          <label className="text-xs text-diesel-gold uppercase flex items-center gap-1">
            <Volume2 size={12} />
            Play Sound Effect
          </label>
          <select
            value={selectedButton.sfxId || ''}
            onChange={(e) => updateButton(selectedButton.id, { sfxId: e.target.value || undefined })}
            className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          >
            <option value="">None (no sound)</option>
            {game.sfx.filter(s => s.params.audioUrl).map(sfx => (
              <option key={sfx.id} value={sfx.id}>{sfx.name}</option>
            ))}
          </select>
        </div>

        {/* External URL */}
        <CyberInput
          label="Open URL (optional)"
          value={selectedButton.pageUrl || ''}
          onChange={(e) => updateButton(selectedButton.id, { pageUrl: e.target.value || undefined })}
          placeholder="https://example.com"
        />

        {/* Show Page */}
        <div className="space-y-2 mt-4">
          <label className="text-xs text-diesel-gold uppercase flex items-center gap-1">
            <FileCode size={12} />
            Show Page
          </label>
          <select
            value={selectedButton.pageId || ''}
            onChange={(e) => updateButton(selectedButton.id, { pageId: e.target.value || undefined })}
            className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-2 text-sm focus:outline-none focus:border-diesel-gold"
          >
            <option value="">None (no page)</option>
            {game.pages?.map(page => (
              <option key={page.id} value={page.id}>{page.name}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Preview */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          Preview
        </h3>
        <div className="aspect-video bg-diesel-black border border-diesel-border relative">
          <div
            className={`absolute flex items-center justify-center font-bold text-sm uppercase cursor-pointer transition-all ${
              selectedButton.style === 'primary'
                ? 'bg-diesel-gold/80 text-diesel-black hover:bg-diesel-gold'
                : selectedButton.style === 'danger'
                ? 'bg-diesel-rust/80 text-diesel-paper hover:bg-diesel-rust'
                : 'bg-diesel-panel/90 text-diesel-paper border border-diesel-border hover:bg-diesel-panel'
            }`}
            style={{
              left: `${selectedButton.x}%`,
              top: `${selectedButton.y}%`,
              width: `${selectedButton.width}%`,
              height: `${selectedButton.height}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={() => toast.info('Button clicked! (Preview mode)')}
          >
            {selectedButton.label}
          </div>
        </div>
      </section>

      {/* Delete */}
      <section className="pt-4 border-t border-diesel-border">
        <button
          onClick={() => deleteButton(selectedButton.id)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/30"
        >
          <Trash2 size={14} />
          Delete Button
        </button>
      </section>
    </div>
  );
};
