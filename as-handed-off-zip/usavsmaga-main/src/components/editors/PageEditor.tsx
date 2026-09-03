import { useState, useRef } from 'react';
import { GameData, Page, SelectionState, AssetStatus } from '@/types';
import { CyberInput } from '@/components/CyberInput';
import { Plus, Trash2, FileCode, ChevronRight, Archive, Eye, EyeOff, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { StatusSelector, StatusBadge } from '@/components/StatusBadge';
import { NotesSection } from '@/components/NotesSection';
import { TagEditor } from '@/components/TagEditor';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { 
  loadLibraryFromDB, 
  saveLibraryToDB, 
  addPageToLibrary,
  findDuplicatePage 
} from '@/utils/library';

interface PageEditorProps {
  game: GameData;
  selection: SelectionState;
  onChange: (game: GameData) => void;
  onSelect: (type: SelectionState['type'], id: string | null) => void;
}

export const PageEditor: React.FC<PageEditorProps> = ({ game, selection, onChange, onSelect }) => {
  const { confirm } = useConfirmDialog();
  const [showPreview, setShowPreview] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const selectedPage = selection.id 
    ? game.pages?.find(p => p.id === selection.id) 
    : null;

  const createPage = () => {
    const newPage: Page = {
      id: `page_${Date.now()}`,
      name: 'New Page',
      htmlContent: '',
      cssStyles: '',
      status: 'new',
    };
    onChange({ 
      ...game, 
      pages: [...(game.pages || []), newPage] 
    });
    onSelect('page', newPage.id);
  };

  // Update page with auto-promotion to 'work' when content changes
  const updatePage = (id: string, updates: Partial<Page>) => {
    const currentPage = game.pages?.find(p => p.id === id);
    if (!currentPage) return;
    
    const updatedPage = { ...currentPage, ...updates };
    
    // Auto-promote to 'work' if currently 'new' and content is being edited
    let newStatus = updatedPage.status || 'new';
    if (!('status' in updates) && newStatus === 'new') {
      const hasContent = 
        updatedPage.name !== 'New Page' ||
        updatedPage.htmlContent !== '';
      if (hasContent) {
        newStatus = 'work';
      }
    }
    
    onChange({
      ...game,
      pages: game.pages?.map(p => p.id === id ? { ...updatedPage, status: newStatus } : p) || [],
    });
  };

  // Manual status change
  const setPageStatus = (id: string, status: AssetStatus) => {
    onChange({
      ...game,
      pages: game.pages?.map(p => p.id === id ? { ...p, status } : p) || [],
    });
  };

  const deletePage = async (id: string) => {
    const shouldDelete = await confirm({
      title: 'Delete Page',
      description: 'Are you sure you want to delete this page?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    
    if (!shouldDelete) return;
    
    onChange({ 
      ...game, 
      pages: game.pages?.filter(p => p.id !== id) || [] 
    });
    onSelect('page', null);
  };

  const handleAddToLibrary = async () => {
    if (!selectedPage) return;
    
    const library = await loadLibraryFromDB();
    const duplicateCheck = findDuplicatePage(library, selectedPage);
    
    if (duplicateCheck.isDuplicate) {
      const shouldReplace = await confirm({
        title: 'Duplicate Found',
        description: `A page named "${duplicateCheck.existingItem.name}" already exists in the library. Add anyway?`,
        confirmText: 'Add Anyway',
        cancelText: 'Cancel',
      });
      if (!shouldReplace) return;
    }
    
    const updatedLibrary = addPageToLibrary(library, selectedPage, game.info.title);
    await saveLibraryToDB(updatedLibrary);
    toast.success('Page added to library!');
  };

  // Import HTML as a new page (from list view)
  const handleImportHTML = () => {
    fileInputRef.current?.click();
  };

  // Load HTML into the currently selected page
  const loadHTMLInputRef = useRef<HTMLInputElement>(null);
  
  const handleLoadHTMLIntoPage = () => {
    loadHTMLInputRef.current?.click();
  };

  const handleLoadHTMLFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPage) return;
    
    try {
      const content = await file.text();
      
      // Extract CSS from <style> tags if present
      let htmlContent = content;
      let cssStyles = selectedPage.cssStyles || '';
      
      const styleMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        const extractedCss = styleMatches
          .map(match => match.replace(/<\/?style[^>]*>/gi, ''))
          .join('\n');
        cssStyles = extractedCss;
        htmlContent = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      }
      
      // Extract body content if full HTML document
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        htmlContent = bodyMatch[1];
      }
      
      // Remove head section if present
      htmlContent = htmlContent.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
      htmlContent = htmlContent.replace(/<!DOCTYPE[^>]*>/gi, '');
      htmlContent = htmlContent.replace(/<\/?html[^>]*>/gi, '');
      htmlContent = htmlContent.trim();
      
      updatePage(selectedPage.id, { htmlContent, cssStyles });
      toast.success(`Loaded "${file.name}"`);
    } catch (error) {
      toast.error('Failed to load HTML file');
      console.error('Load error:', error);
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const content = await file.text();
      const fileName = file.name.replace(/\.(html?|htm)$/i, '');
      
      // Extract CSS from <style> tags if present
      let htmlContent = content;
      let cssStyles = '';
      
      const styleMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        cssStyles = styleMatches
          .map(match => match.replace(/<\/?style[^>]*>/gi, ''))
          .join('\n');
        htmlContent = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      }
      
      // Extract body content if full HTML document
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        htmlContent = bodyMatch[1];
      }
      
      // Remove head section if present
      htmlContent = htmlContent.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
      htmlContent = htmlContent.replace(/<!DOCTYPE[^>]*>/gi, '');
      htmlContent = htmlContent.replace(/<\/?html[^>]*>/gi, '');
      htmlContent = htmlContent.trim();
      
      const newPage: Page = {
        id: `page_${Date.now()}`,
        name: fileName || 'Imported Page',
        htmlContent,
        cssStyles,
        status: 'work',
      };
      
      onChange({ 
        ...game, 
        pages: [...(game.pages || []), newPage] 
      });
      onSelect('page', newPage.id);
      toast.success(`Imported "${file.name}"`);
    } catch (error) {
      toast.error('Failed to import HTML file');
      console.error('Import error:', error);
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Page List View
  if (!selectedPage) {
    return (
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-diesel-steel">
            {game.pages?.length || 0} page{(game.pages?.length || 0) !== 1 ? 's' : ''} defined
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleImportHTML}
              className="flex items-center gap-2 px-3 py-2 bg-diesel-cyan/20 border border-diesel-cyan text-diesel-cyan text-sm font-bold uppercase hover:bg-diesel-cyan/30 transition-colors"
            >
              <Upload size={14} />
              Import
            </button>
            <button
              onClick={createPage}
              className="flex items-center gap-2 px-3 py-2 bg-diesel-paper/20 border border-diesel-paper text-diesel-paper text-sm font-bold uppercase hover:bg-diesel-paper/30 transition-colors"
            >
              <Plus size={14} />
              New Page
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {game.pages?.map(page => {
            const statusBorderColor = page.status === 'done' 
              ? 'border-diesel-green/50 hover:border-diesel-green' 
              : page.status === 'work' 
                ? 'border-diesel-rust/50 hover:border-diesel-rust' 
                : 'border-diesel-border hover:border-diesel-paper';
            
            return (
              <button
                key={page.id}
                onClick={() => onSelect('page', page.id)}
                className={`w-full flex items-center gap-3 p-3 bg-diesel-black border ${statusBorderColor} transition-colors text-left`}
              >
                <FileCode size={18} className="text-diesel-cyan shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-diesel-paper font-bold text-sm truncate">{page.name}</div>
                  <div className="text-diesel-steel text-xs truncate">
                    {page.htmlContent.length} chars
                  </div>
                </div>
                <StatusBadge status={page.status || 'new'} size="sm" />
                <ChevronRight size={14} className="text-diesel-steel" />
              </button>
            );
          })}
        </div>
        
        {(!game.pages || game.pages.length === 0) && (
          <div className="text-center py-12 text-diesel-steel">
            <FileCode size={48} className="mx-auto mb-4 opacity-30" />
            <p>No pages yet. Create custom HTML pages for your game!</p>
            <p className="text-xs mt-2 text-diesel-steel/70">
              Pages can display credits, instructions, inventory, or any custom content.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Page Detail View
  return (
    <div className="space-y-6">
      <button
        onClick={() => onSelect('page', null)}
        className="text-sm text-diesel-steel hover:text-diesel-paper flex items-center gap-1"
      >
        ← Back to Pages
      </button>
      
      {/* Basic Info */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-diesel-border pb-2">
          <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest">
            Page Info
          </h3>
          <StatusSelector 
            status={selectedPage.status || 'new'} 
            onChange={(status) => setPageStatus(selectedPage.id, status)} 
          />
        </div>
        <CyberInput
          label="Name"
          value={selectedPage.name}
          onChange={(e) => updatePage(selectedPage.id, { name: e.target.value })}
        />
        <div className="mt-3">
          <NotesSection 
            note={selectedPage.note || ''} 
            onChange={(note) => updatePage(selectedPage.id, { note })} 
          />
        </div>
      </section>

      {/* HTML Content */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-diesel-border pb-2">
          <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest">
            HTML Content
          </h3>
          <button
            onClick={handleLoadHTMLIntoPage}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-diesel-cyan hover:text-diesel-paper border border-diesel-cyan/50 hover:border-diesel-cyan transition-colors"
          >
            <Upload size={12} />
            Load HTML
          </button>
        </div>
        <input
          ref={loadHTMLInputRef}
          type="file"
          accept=".html,.htm"
          onChange={handleLoadHTMLFile}
          className="hidden"
        />
        <textarea
          value={selectedPage.htmlContent}
          onChange={(e) => updatePage(selectedPage.id, { htmlContent: e.target.value })}
          className="w-full h-48 bg-diesel-black border border-diesel-border text-diesel-paper p-3 text-xs font-mono resize-y focus:outline-none focus:border-diesel-gold"
          placeholder="<div>Your HTML content here...</div>"
        />
      </section>

      {/* CSS Styles */}
      <section>
        <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest mb-4 border-b border-diesel-border pb-2">
          CSS Styles (Optional)
        </h3>
        <textarea
          value={selectedPage.cssStyles || ''}
          onChange={(e) => updatePage(selectedPage.id, { cssStyles: e.target.value })}
          className="w-full h-32 bg-diesel-black border border-diesel-border text-diesel-paper p-3 text-xs font-mono resize-y focus:outline-none focus:border-diesel-gold"
          placeholder="h1 { color: gold; }"
        />
      </section>

      {/* Preview */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-diesel-border pb-2">
          <h3 className="text-sm font-bold text-diesel-paper uppercase tracking-widest">
            Preview
          </h3>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-diesel-steel hover:text-diesel-paper transition-colors"
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {showPreview && (
          <div className="border border-diesel-border bg-white rounded overflow-hidden">
            <iframe
              srcDoc={`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: sans-serif; }
    ${selectedPage.cssStyles || ''}
  </style>
</head>
<body>
  ${selectedPage.htmlContent}
</body>
</html>`}
              sandbox="allow-same-origin"
              className="w-full h-64"
              title="Page Preview"
            />
          </div>
        )}
      </section>

      {/* Tags Section */}
      <TagEditor
        tags={selectedPage.tags || []}
        onTagsChange={(tags) => updatePage(selectedPage.id, { tags, tagsUpdatedAt: Date.now() })}
        contentType="page"
        title={selectedPage.name}
        content={selectedPage.htmlContent}
      />

      {/* Actions */}
      <section className="pt-4 border-t border-diesel-border space-y-2">
        <button
          onClick={handleAddToLibrary}
          className="w-full flex items-center justify-center gap-2 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-sm font-bold uppercase hover:bg-diesel-gold/30"
        >
          <Archive size={14} />
          Add to Library
        </button>
        <button
          onClick={() => deletePage(selectedPage.id)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-sm font-bold uppercase hover:bg-diesel-rust/30"
        >
          <Trash2 size={14} />
          Delete Page
        </button>
      </section>
    </div>
  );
};
