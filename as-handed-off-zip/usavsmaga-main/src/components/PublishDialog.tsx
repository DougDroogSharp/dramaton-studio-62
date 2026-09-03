import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameData } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { 
  publishGame, 
  generateSlug, 
  validateSlug, 
  checkSlugAvailable, 
  getGameBySlug,
  PublishProgress 
} from '@/utils/cloudPublish';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CyberInput } from '@/components/CyberInput';
import { Cloud, Check, AlertCircle, Loader2, Copy, ExternalLink, LogIn } from 'lucide-react';
import { toast } from 'sonner';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: GameData;
}

export const PublishDialog: React.FC<PublishDialogProps> = ({ 
  open, 
  onOpenChange, 
  game 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slug, setSlug] = useState('');
  const [notes, setNotes] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'available' | 'taken' | 'invalid' | 'updating' | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [progress, setProgress] = useState<PublishProgress | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  
  // Generate initial slug from title when dialog opens
  useEffect(() => {
    if (open) {
      const generatedSlug = generateSlug(game.info.title);
      setSlug(generatedSlug);
      setSlugStatus(null);
      setSlugError(null);
      setPublishedUrl(null);
      setPublishedVersion(null);
      setNotes('');
      setProgress(null);
    }
  }, [open, game.info.title]);
  
  // Check slug availability when it changes
  useEffect(() => {
    if (!slug || !open) return;
    
    const validation = validateSlug(slug);
    if (!validation.valid) {
      setSlugStatus('invalid');
      setSlugError(validation.error || 'Invalid slug');
      return;
    }
    
    setIsChecking(true);
    setSlugStatus(null);
    setSlugError(null);
    
    const timeoutId = setTimeout(async () => {
      try {
        const existingGame = await getGameBySlug(slug);
        if (existingGame) {
          // Slug exists - check if it's the same game (update) or different (taken)
          if (existingGame.title === game.info.title) {
            setSlugStatus('updating');
          } else {
            setSlugStatus('taken');
            setSlugError(`This slug is used by "${existingGame.title}"`);
          }
        } else {
          setSlugStatus('available');
        }
      } catch (error) {
        console.error('Error checking slug:', error);
      } finally {
        setIsChecking(false);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [slug, open, game.info.title]);
  
  const handlePublish = async () => {
    if (slugStatus === 'taken' || slugStatus === 'invalid') return;
    
    setIsPublishing(true);
    setProgress({ stage: 'preparing', current: 0, total: 1, message: 'Starting...' });
    
    try {
      const result = await publishGame(game, slug, notes, setProgress);
      
      if (result.success) {
        setPublishedUrl(result.url);
        setPublishedVersion(result.version);
        toast.success(`Published v${result.version}!`);
      } else {
        toast.error(result.error || 'Failed to publish');
        setProgress(null);
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish game');
      setProgress(null);
    } finally {
      setIsPublishing(false);
    }
  };
  
  const handleCopyUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      toast.success('URL copied to clipboard!');
    }
  };
  
  const handleOpenUrl = () => {
    if (publishedUrl) {
      window.open(publishedUrl, '_blank');
    }
  };
  
  const canPublish = slug && (slugStatus === 'available' || slugStatus === 'updating') && !isPublishing;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-diesel-panel border-diesel-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-diesel-gold">
            <Cloud size={20} />
            Publish to Cloud
          </DialogTitle>
        </DialogHeader>
        
        {/* Success state */}
        {publishedUrl ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-diesel-green/20 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-diesel-green" />
              </div>
              <h3 className="text-xl font-bold text-diesel-paper mb-1">Published!</h3>
              <p className="text-diesel-steel text-sm">
                Version {publishedVersion} is now live
              </p>
            </div>
            
            <div className="bg-diesel-black/50 rounded p-3">
              <p className="text-[10px] text-diesel-steel uppercase tracking-wider mb-1">Shareable URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-diesel-cyan text-sm truncate">
                  {publishedUrl}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className="p-2 text-diesel-steel hover:text-diesel-gold transition-colors"
                  title="Copy URL"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={handleOpenUrl}
                  className="p-2 text-diesel-steel hover:text-diesel-gold transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
            
            <button
              onClick={() => onOpenChange(false)}
              className="w-full py-3 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Publishing form */
          <div className="space-y-4">
            {/* Auth check */}
            {!user ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-diesel-gold/20 rounded-full flex items-center justify-center mb-4">
                  <LogIn className="w-8 h-8 text-diesel-gold" />
                </div>
                <h3 className="text-lg font-bold text-diesel-paper mb-2">Authentication Required</h3>
                <p className="text-diesel-steel text-sm mb-4">
                  You need to be logged in to publish games.
                </p>
                <button
                  onClick={() => { onOpenChange(false); navigate('/auth'); }}
                  className="py-2 px-6 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
                >
                  Log In / Sign Up
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-diesel-steel text-sm mb-4">
                    Publish your game to make it playable via a shareable link. Images will be uploaded to cloud storage.
                  </p>
                </div>
            
            {/* Slug input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-diesel-steel uppercase tracking-wider">
                  Game Slug (URL path)
                </label>
                {isChecking && (
                  <Loader2 size={12} className="animate-spin text-diesel-steel" />
                )}
                {!isChecking && slugStatus === 'available' && (
                  <span className="text-[10px] text-diesel-green flex items-center gap-1">
                    <Check size={10} /> Available
                  </span>
                )}
                {!isChecking && slugStatus === 'updating' && (
                  <span className="text-[10px] text-diesel-cyan flex items-center gap-1">
                    <Check size={10} /> Will update existing
                  </span>
                )}
                {!isChecking && (slugStatus === 'taken' || slugStatus === 'invalid') && (
                  <span className="text-[10px] text-diesel-rust flex items-center gap-1">
                    <AlertCircle size={10} /> {slugError}
                  </span>
                )}
              </div>
              <CyberInput
                label="Slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-awesome-game"
                disabled={isPublishing}
              />
              <p className="text-[9px] text-diesel-steel/60 mt-1">
                URL: {window.location.origin}/theater?slug={slug || '...'}
              </p>
            </div>
            
            {/* Release notes */}
            <div>
              <label className="text-[10px] text-diesel-steel uppercase tracking-wider mb-1 block">
                Release Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's new in this version..."
                disabled={isPublishing}
                className="w-full h-20 bg-diesel-black border border-diesel-border rounded px-3 py-2 text-diesel-paper text-sm placeholder:text-diesel-steel/50 focus:border-diesel-gold focus:outline-none resize-none"
              />
            </div>
            
            {/* Progress */}
            {progress && progress.stage !== 'done' && (
              <div className="bg-diesel-black/50 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={14} className="animate-spin text-diesel-gold" />
                  <span className="text-diesel-paper text-sm">{progress.message}</span>
                </div>
                {progress.total > 0 && (
                  <div className="w-full h-1 bg-diesel-border rounded overflow-hidden">
                    <div 
                      className="h-full bg-diesel-gold transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Publish button */}
            <button
              onClick={handlePublish}
              disabled={!canPublish}
              className="w-full py-3 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust font-bold uppercase hover:bg-diesel-rust/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Cloud size={16} />
                  {slugStatus === 'updating' ? 'Publish Update' : 'Publish'}
                </>
              )}
            </button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
