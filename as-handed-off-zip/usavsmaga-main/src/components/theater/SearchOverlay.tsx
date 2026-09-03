import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, FileText, Video, User, Clock } from 'lucide-react';
import { GameData } from '@/types';

interface SearchEntry {
  id: string;
  type: 'scene' | 'page' | 'actor';
  title: string;
  tags: string[];
}

interface SearchOverlayProps {
  game: GameData;
  onClose: () => void;
  onNavigateToScene: (sceneId: string) => void;
  onNavigateToPage: (pageId: string) => void;
}

// Build search index from game data
function buildSearchIndex(game: GameData): SearchEntry[] {
  const entries: SearchEntry[] = [];
  
  // Add scenes
  for (const scene of game.scenes) {
    entries.push({
      id: scene.id,
      type: 'scene',
      title: scene.name,
      tags: scene.tags || [],
    });
  }
  
  // Add pages
  for (const page of game.pages || []) {
    entries.push({
      id: page.id,
      type: 'page',
      title: page.name,
      tags: page.tags || [],
    });
  }
  
  // Add actors (with their linked page tags)
  for (const actor of game.actors) {
    const linkedPage = actor.pageId ? game.pages?.find(p => p.id === actor.pageId) : null;
    const tags = [
      actor.name.toLowerCase(),
      ...(linkedPage?.tags || []),
    ];
    entries.push({
      id: actor.id,
      type: 'actor',
      title: actor.name,
      tags,
    });
  }
  
  return entries;
}

// Search function
function search(query: string, index: SearchEntry[]): SearchEntry[] {
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return [];
  
  const queryWords = queryLower.split(/\s+/);
  
  return index
    .map(entry => {
      let score = 0;
      
      // Check tags
      for (const tag of entry.tags) {
        for (const word of queryWords) {
          if (tag.includes(word)) {
            score++;
            break;
          }
        }
      }
      
      // Boost exact title match
      if (entry.title.toLowerCase().includes(queryLower)) {
        score += 10;
      }
      
      // Partial title match
      for (const word of queryWords) {
        if (entry.title.toLowerCase().includes(word)) {
          score += 2;
        }
      }
      
      return { entry, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => result.entry);
}

// Recent searches storage
const RECENT_KEY = 'dramaton_recent_searches';
const MAX_RECENT = 10;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): void {
  const recent = getRecentSearches().filter(q => q !== query);
  recent.unshift(query);
  if (recent.length > MAX_RECENT) recent.pop();
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  game,
  onClose,
  onNavigateToScene,
  onNavigateToPage,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Build index once
  const searchIndex = React.useMemo(() => buildSearchIndex(game), [game]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Update results when query changes
  useEffect(() => {
    if (query.trim()) {
      const found = search(query, searchIndex);
      setResults(found);
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [query, searchIndex]);
  
  // Handle navigation
  const handleSelect = useCallback((entry: SearchEntry) => {
    if (query.trim()) {
      addRecentSearch(query.trim());
    }
    
    if (entry.type === 'scene') {
      onNavigateToScene(entry.id);
    } else if (entry.type === 'page') {
      onNavigateToPage(entry.id);
    } else if (entry.type === 'actor') {
      // For actors, navigate to their linked page if they have one
      const actor = game.actors.find(a => a.id === entry.id);
      if (actor?.pageId) {
        onNavigateToPage(actor.pageId);
      }
    }
    onClose();
  }, [query, game, onNavigateToScene, onNavigateToPage, onClose]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  }, [results, selectedIndex, handleSelect, onClose]);
  
  // Click recent search
  const handleRecentClick = (q: string) => {
    setQuery(q);
  };
  
  const getIcon = (type: SearchEntry['type']) => {
    switch (type) {
      case 'scene': return <Video size={16} className="text-diesel-cyan" />;
      case 'page': return <FileText size={16} className="text-diesel-gold" />;
      case 'actor': return <User size={16} className="text-diesel-green" />;
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-diesel-black/95 z-50 flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl mx-4 bg-diesel-panel border-2 border-diesel-gold shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-diesel-border">
          <Search size={20} className="text-diesel-gold" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Search ${game.info.title}...`}
            className="flex-1 bg-transparent text-diesel-paper text-lg focus:outline-none placeholder:text-diesel-steel"
          />
          <button
            onClick={onClose}
            className="p-1 text-diesel-steel hover:text-diesel-paper"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content area */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Recent searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-4 border-b border-diesel-border">
              <div className="flex items-center gap-2 text-diesel-steel text-xs uppercase mb-2">
                <Clock size={12} />
                Recent
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(q)}
                    className="px-3 py-1 bg-diesel-dark border border-diesel-border text-diesel-paper text-sm hover:border-diesel-gold transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Results */}
          {query && results.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-diesel-steel uppercase px-2 py-1 mb-1">
                {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </div>
              {results.map((entry, i) => (
                <button
                  key={`${entry.type}-${entry.id}`}
                  onClick={() => handleSelect(entry)}
                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                    i === selectedIndex 
                      ? 'bg-diesel-gold/20 border-l-2 border-diesel-gold' 
                      : 'hover:bg-diesel-dark border-l-2 border-transparent'
                  }`}
                >
                  <div className="mt-0.5">{getIcon(entry.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-diesel-paper font-bold truncate">
                      {entry.title}
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="text-xs text-diesel-steel mt-1 truncate">
                        Tags: {entry.tags.slice(0, 5).join(', ')}
                        {entry.tags.length > 5 && ` +${entry.tags.length - 5}`}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] uppercase text-diesel-steel">
                    {entry.type}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {/* No results */}
          {query && results.length === 0 && (
            <div className="p-8 text-center">
              <Search size={32} className="mx-auto text-diesel-steel opacity-50 mb-3" />
              <p className="text-diesel-steel">No results for "{query}"</p>
              <p className="text-xs text-diesel-steel/70 mt-1">
                Try different keywords or check spelling
              </p>
            </div>
          )}
          
          {/* Empty state */}
          {!query && recentSearches.length === 0 && (
            <div className="p-8 text-center">
              <Search size={32} className="mx-auto text-diesel-gold opacity-50 mb-3" />
              <p className="text-diesel-paper">Search for people, topics, or events</p>
              <p className="text-xs text-diesel-steel mt-1">
                Try: "miller", "ice", "1st amendment"
              </p>
            </div>
          )}
        </div>
        
        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-diesel-border text-xs text-diesel-steel flex gap-4">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
};
