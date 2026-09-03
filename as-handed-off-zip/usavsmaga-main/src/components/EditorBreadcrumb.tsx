import { ChevronRight, ChevronLeft, Settings, User, Video, Package, Music, MousePointer2, Layers, FileCode, Archive } from "lucide-react";
import { SelectionState, GameData } from "@/types";

interface EditorBreadcrumbProps {
  selection: SelectionState;
  game: GameData;
  onNavigate: (type: SelectionState["type"], id: string | null) => void;
  historyBack?: () => void;
  historyForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

const typeConfig: Record<SelectionState["type"], { icon: React.ElementType; label: string; plural: string }> = {
  settings: { icon: Settings, label: "Game", plural: "Game" },
  actor: { icon: User, label: "Actor", plural: "Actors" },
  scene: { icon: Video, label: "Scene", plural: "Scenes" },
  drop: { icon: Package, label: "Drop", plural: "Drops" },
  item: { icon: Package, label: "Item", plural: "Items" },
  sfx: { icon: Music, label: "SFX", plural: "SFX" },
  button: { icon: MousePointer2, label: "Button", plural: "Buttons" },
  episode: { icon: Layers, label: "Episode", plural: "Episodes" },
  page: { icon: FileCode, label: "Page", plural: "Pages" },
  collection: { icon: Archive, label: "Collection", plural: "Collection" },
};

export function EditorBreadcrumb({ 
  selection, 
  game, 
  onNavigate, 
  historyBack, 
  historyForward, 
  canGoBack = false, 
  canGoForward = false 
}: EditorBreadcrumbProps) {
  const config = typeConfig[selection.type];
  const Icon = config.icon;

  // Get the selected asset name
  const getAssetName = (): string | null => {
    if (!selection.id) return null;
    
    switch (selection.type) {
      case "actor":
        return game.actors.find(a => a.id === selection.id)?.name ?? null;
      case "scene":
        return game.scenes.find(s => s.id === selection.id)?.name ?? null;
      case "drop":
        return game.drops.find(d => d.id === selection.id)?.name ?? null;
      case "item":
        return game.items.find(i => i.id === selection.id)?.name ?? null;
      case "sfx":
        return game.sfx.find(s => s.id === selection.id)?.name ?? null;
      case "button":
        return game.buttons.find(b => b.id === selection.id)?.name ?? null;
      case "episode":
        return game.episodes.find(e => e.id === selection.id)?.name ?? null;
      case "page":
        return game.pages.find(p => p.id === selection.id)?.name ?? null;
      default:
        return null;
    }
  };

  const assetName = getAssetName();

  return (
    <nav className="flex items-center gap-1 text-sm mb-4" aria-label="Breadcrumb">
      {/* Navigation arrows */}
      <div className="flex items-center gap-0.5 mr-2 border-r border-diesel-border pr-2">
        <button
          onClick={historyBack}
          disabled={!canGoBack}
          className={`p-1 transition-colors ${
            canGoBack 
              ? 'text-diesel-steel hover:text-diesel-gold hover:bg-diesel-gold/10' 
              : 'text-diesel-border cursor-not-allowed'
          }`}
          title="Go back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={historyForward}
          disabled={!canGoForward}
          className={`p-1 transition-colors ${
            canGoForward 
              ? 'text-diesel-steel hover:text-diesel-gold hover:bg-diesel-gold/10' 
              : 'text-diesel-border cursor-not-allowed'
          }`}
          title="Go forward"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Game root */}
      <button
        onClick={() => onNavigate("settings", null)}
        className="flex items-center gap-1.5 text-diesel-steel hover:text-diesel-gold transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        <span>{game.info.title}</span>
      </button>

      {/* Asset type level (if not settings) */}
      {selection.type !== "settings" && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-diesel-border" />
          <button
            onClick={() => onNavigate(selection.type, null)}
            className={`flex items-center gap-1.5 transition-colors ${
              selection.id ? "text-diesel-steel hover:text-diesel-gold" : "text-diesel-gold font-medium"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{config.plural}</span>
          </button>
        </>
      )}

      {/* Specific asset (if selected) */}
      {selection.id && assetName && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-diesel-border" />
          <span className="text-diesel-gold font-medium truncate max-w-[200px]">
            {assetName}
          </span>
        </>
      )}
    </nav>
  );
}
