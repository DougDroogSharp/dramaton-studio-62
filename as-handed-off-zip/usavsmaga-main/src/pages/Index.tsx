import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GameData, SelectionState, createDefaultGame, AssetStatus, migrateGameData } from "@/types";
import { DramatonLogo } from "@/components/DramatonLogo";
import dramatonLogoImageSrc from "@/assets/dramaton-logo.png";
import kingOfChicagoImage from "@/assets/king-of-chicago.jpg";
import { removeBackground } from "@/utils/removeBackground";
import { CyberInput } from "@/components/CyberInput";
import { loadGameFromDB, saveGameToDB, clearGameFromDB } from "@/utils/db";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProjectCapture } from "@/hooks/useProjectCapture";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import { KeyboardShortcutsHelp, KeyboardShortcutsButton } from "@/components/KeyboardShortcutsHelp";
import { saveFileWithPicker, openFileWithPicker, DRAM_FILE_OPTIONS } from "@/utils/filePicker";
import { loadLibraryFromDB, saveLibraryToDB, addGameToLibrary, findDuplicateGame, updateGameInLibrary, setLibraryUsername } from "@/utils/library";
import { toast } from "sonner";
import {
  Settings,
  User,
  Video,
  Monitor,
  Package,
  Music,
  Save,
  Volume2,
  VolumeX,
  Undo2,
  Upload,
  FolderOpen,
  FilePlus2,
  Archive,
  Play,
  MousePointer2,
  Camera,
  Plus,
  Cloud,
  LogOut,
  LogIn,
  Layers,
  FileCode,
  Edit3,
} from "lucide-react";
import { SettingsEditor } from "@/components/editors/SettingsEditor";
import { EditorBreadcrumb } from "@/components/EditorBreadcrumb";
import { ActorEditor } from "@/components/editors/ActorEditor";
import { AIUsageDisplay } from "@/components/AIUsageDisplay";
import { SceneEditor } from "@/components/editors/SceneEditor";
import { DropEditor } from "@/components/editors/DropEditor";
import { ItemEditor } from "@/components/editors/ItemEditor";
import { SfxEditor } from "@/components/editors/SfxEditor";
import { ButtonEditor } from "@/components/editors/ButtonEditor";
import { EpisodeEditor } from "@/components/editors/EpisodeEditor";
import { PageEditor } from "@/components/editors/PageEditor";
import { CollectionEditor } from "@/components/editors/CollectionEditor";
import { PublishDialog } from "@/components/PublishDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AssetTree } from "@/components/AssetTree";
import Hourglass from "@/components/Hourglass";
import {
  Gear,
  Rivet,
  PipeHorizontal,
  PipeVertical,
  SteamVent,
  CornerBracket,
  Gauge,
  ArtDecoDivider,
  IndustrialPanel,
  VacuumTube,
  GearMechanism,
  SteamBoiler,
  FlywheelWithBelt,
} from "@/components/DieselpunkDecorations";
import { DriftingSteamPuffs } from "@/components/DriftingSteamPuffs";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, alert } = useConfirmDialog();
  const { user, loading: authLoading, signOut } = useAuth();
  // Startup state
  const [isStarted, setIsStarted] = useState(false);
  const [startTitle, setStartTitle] = useState("Untitled Game");
  const [startAuthor, setStartAuthor] = useState("Unknown Creator");
  const [hasAutoSave, setHasAutoSave] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Editor state
  const [game, setGame] = useState<GameData>(createDefaultGame());
  const [selection, setSelection] = useState<SelectionState>(() => {
    // Check if returning from Theater with a selection to restore
    const state = location.state as { restoreSelection?: SelectionState } | null;
    if (state?.restoreSelection) {
      return state.restoreSelection;
    }
    return { type: "settings", id: null };
  });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [history, setHistory] = useState<GameData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [processedLogoImage, setProcessedLogoImage] = useState<string | null>(null);
  const [boilerExploded, setBoilerExploded] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameAuthor, setRenameAuthor] = useState('');
  // Rest Period State
  const [minutes, setMinutes] = useState(new Date().getMinutes());
  const [didSaveOnRestStart, setDidSaveOnRestStart] = useState(false);
  const [forceShowRestPeriod, setForceShowRestPeriod] = useState(false);
  const [restPeriodOverride, setRestPeriodOverride] = useState(false); // Override to skip rest period
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Navigation history for back/forward
  const navHistory = useNavigationHistory();

  // Project capture for PDF export (needs forceShowRestPeriod setter)
  const { isCapturing, captureAllViews } = useProjectCapture(
    (sel) => setSelection(sel as SelectionState),
    game.info.title,
    setForceShowRestPeriod,
    () => {
      // Navigate to editor when capturing from splash
      setIsStarted(true);
      setIsLoaded(true);
    },
    () => {
      const data = {
        actors: game.actors.map(a => ({ id: a.id, name: a.name })),
        scenes: game.scenes.map(s => ({ id: s.id, name: s.name })),
        drops: game.drops.map(d => ({ id: d.id, name: d.name })),
        items: game.items.map(i => ({ id: i.id, name: i.name })),
        sfx: game.sfx.map(s => ({ id: s.id, name: s.name })),
        buttons: game.buttons.map(b => ({ id: b.id, name: b.name })),
        episodes: game.episodes.map(e => ({ id: e.id, name: e.name })),
        pages: game.pages.map(p => ({ id: p.id, name: p.name })),
      };
      console.log('[Capture] getGameData called, returning:', data);
      return data;
    },
    () => {
      // Navigate to splash screen
      setIsStarted(false);
    },
    () => !isStarted,  // Check if currently on splash
    setRestPeriodOverride  // Allow capture to bypass rest period
  );

  // Handler for Document Project button on splash screen
  const handleDocumentProject = async () => {
    // Load the saved game first
    const saved = await loadGameFromDB();
    if (saved) {
      setGame(saved);
      // Wait for React to re-render with the new game state before capturing
      // This ensures getGameData returns the updated data
      await new Promise(resolve => setTimeout(resolve, 100));
      // Start capture (splash is always included now)
      captureAllViews();
    }
  };

  // Process logo to remove background on mount
  useEffect(() => {
    removeBackground(dramatonLogoImageSrc).then(setProcessedLogoImage).catch(console.error);
  }, []);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch user's username for default author name
  useEffect(() => {
    const fetchUsername = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.username) {
          setUsername(profile.username);
          setStartAuthor(profile.username);
        }
      }
    };
    fetchUsername();
  }, [user]);

  // Unsaved changes warning when closing browser
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLoaded && hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLoaded, hasUnsavedChanges]);

  // Track unsaved changes
  useEffect(() => {
    if (isLoaded) {
      setHasUnsavedChanges(true);
    }
  }, [game]);

  // Reset unsaved changes flag after autosave
  useEffect(() => {
    if (isLoaded && game.info.enableAutosave) {
      const timer = setTimeout(() => {
        setHasUnsavedChanges(false);
      }, 2500); // Slightly after autosave delay
      return () => clearTimeout(timer);
    }
  }, [game, isLoaded]);

  // Check for autosave on mount and handle return from Theater
  useEffect(() => {
    const loadData = async () => {
      const saved = await loadGameFromDB();
      if (saved) {
        setHasAutoSave(true);
        setStartTitle(saved.info.title);
        setStartAuthor(saved.info.author);
        
        // If returning from Theater with restored selection, auto-start the editor
        const state = location.state as { restoreSelection?: SelectionState } | null;
        if (state?.restoreSelection) {
          setGame(saved);
          setIsStarted(true);
          setIsLoaded(true);
          // Clear the navigation state to prevent re-triggering
          window.history.replaceState({}, document.title);
        }
      }
    };
    loadData();

    // Rest period timer - check every 10 seconds
    const timer = setInterval(() => {
      setMinutes(new Date().getMinutes());
    }, 10000);
    return () => clearInterval(timer);
  }, [location.state]);

  // Derive rest period status
  const isRestPeriod = minutes > 30; // 31-59 is rest time

  // Autosave every 5 minutes (respects rest period)
  useEffect(() => {
    if (isLoaded && game.info.enableAutosave) {
      const interval = setInterval(() => {
        // Check rest period dynamically
        const currentMinutes = new Date().getMinutes();
        const isResting = currentMinutes > 30; // 31-59 is rest time

        if (!isResting) {
          saveGameToDB(game);
          setDidSaveOnRestStart(false); // Reset flag when not resting
          console.log("Autosave completed");
        } else {
          console.log("Autosave skipped: Rest Period Active");
        }
      }, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [isLoaded, game.info.enableAutosave]);

  // Save once when rest period starts
  useEffect(() => {
    if (isLoaded && game.info.enableAutosave && isRestPeriod && !didSaveOnRestStart) {
      saveGameToDB(game);
      setDidSaveOnRestStart(true);
      console.log("Auto-saved on rest period start");
    }
    // Reset flag when rest period ends
    if (!isRestPeriod && didSaveOnRestStart) {
      setDidSaveOnRestStart(false);
    }
  }, [isRestPeriod, isLoaded, game, didSaveOnRestStart]);

  const handleStartGame = async () => {
    // Validate title is not empty
    if (!startTitle.trim()) {
      await alert("Please enter a game title before starting.");
      return;
    }
    if (!username) {
      await alert("Unable to determine your username. Please sign out and sign in again.");
      return;
    }

    // Confirm if there's already a saved game
    if (hasAutoSave) {
      const confirmed = await confirm({
        title: "Overwrite Saved Game",
        description: "Starting a new game will replace your saved game. This cannot be undone. Continue?",
        confirmText: "Start New",
        cancelText: "Cancel",
        variant: "destructive",
      });
      if (!confirmed) return;
    }

    const newGame = createDefaultGame();
    newGame.info.title = startTitle.trim();
    newGame.info.author = username;
    setGame(newGame);
    setIsStarted(true);
    setIsLoaded(true);
    // Save immediately so autosave works
    saveGameToDB(newGame);
  };

  const handleNewGame = async () => {
    const startNew = await confirm({
      title: "New Game",
      description: "Start a new game? You will be prompted to save the current game.",
      confirmText: "Start New",
      cancelText: "Cancel",
    });

    if (startNew) {
      // Offer to save current game
      const shouldSave = await confirm({
        title: "Save Current Game",
        description: "Would you like to save the current game to a file before starting new?",
        confirmText: "Save",
        cancelText: "Skip",
      });

      if (shouldSave) {
        handleSave();
      }
      // Clear IndexedDB so old game doesn't persist
      await clearGameFromDB();
      // Reset to splash screen with default placeholder values
      setIsStarted(false);
      setIsLoaded(false);
      setStartTitle("Untitled Game");
      setStartAuthor("Unknown Creator");
      setHasAutoSave(false);
      setHistory([]);
      setGame(createDefaultGame());
    }
  };

  // New game handler for splash screen - confirms and optionally saves before creating new
  const handleNewGameFromSplash = async () => {
    // If there's a saved game, confirm and offer to save
    if (hasAutoSave) {
      const startNew = await confirm({
        title: "Create New Game",
        description: "You have a saved game. Would you like to save it to a file before starting a new game?",
        confirmText: "Save First",
        cancelText: "Skip & Create New",
      });

      if (startNew) {
        // Save the current game to file
        handleSave();
      }
      
      // Clear the saved game from IndexedDB
      await clearGameFromDB();
      setHasAutoSave(false);
    }
    
    // Reset to new game state
    setStartTitle("");
    setHistory([]);
    setGame(createDefaultGame());
  };

  const handleResumeGame = async () => {
    const saved = await loadGameFromDB();
    if (saved) {
      setGame(saved);
      setIsStarted(true);
      setIsLoaded(true);
    }
  };

  const handlePlayGame = () => {
    // Store current selection in sessionStorage so Theater can return here
    sessionStorage.setItem('dramaton_last_editor', JSON.stringify(selection));
    
    // Theater will load from IndexedDB automatically
    // If we're editing a scene, pass it as a parameter to jump directly there
    if (selection.type === 'scene' && selection.id) {
      navigate(`/theater?scene=${selection.id}`);
    } else {
      navigate("/theater");
    }
  };

  const handleLoadFile = async () => {
    const result = await openFileWithPicker({
      ...DRAM_FILE_OPTIONS,
    });

    if (!result) return; // User cancelled

    try {
      const rawData = JSON.parse(result.content);
      const data = migrateGameData(rawData);
      setGame(data);
      setSelection({ type: "settings", id: null });
      setIsStarted(true);
      setIsLoaded(true);
      saveGameToDB(data); // Save to IndexedDB for autosave
      toast.success(`Loaded: ${result.name}`);
    } catch (err) {
      console.error("Failed to parse game file:", err);
      toast.error("Failed to parse game file");
    }
  };

  // Legacy handler for hidden file input (splash screen fallback)
  const handleLoadFileLegacy = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rawData = JSON.parse(ev.target?.result as string);
        const data = migrateGameData(rawData);
        setGame(data);
        setSelection({ type: "settings", id: null });
        setIsStarted(true);
        setIsLoaded(true);
        saveGameToDB(data);
        toast.success(`Loaded: ${file.name}`);
      } catch (err) {
        console.error("Failed to parse game file:", err);
        toast.error("Failed to parse game file");
      }
    };
    reader.readAsText(file);
  };

  const handleSelect = (type: SelectionState["type"], id: string | null) => {
    // Push current state to history before navigating
    navHistory.pushState(selection);
    setSelection({ type, id });
  };

  // Navigation history handlers
  const handleHistoryBack = () => {
    const prev = navHistory.goBack(selection);
    if (prev) setSelection(prev);
  };

  const handleHistoryForward = () => {
    const next = navHistory.goForward(selection);
    if (next) setSelection(next);
  };

  // Rename game handler - updates title/author and immediately saves to file
  const handleRenameGame = async (newTitle: string, newAuthor: string) => {
    const updatedGame = {
      ...game,
      info: {
        ...game.info,
        title: newTitle,
        author: newAuthor,
      },
    };
    setGame(updatedGame);
    // Immediately save to IndexedDB
    await saveGameToDB(updatedGame);
    
    // Also trigger a file download with the new name
    const content = JSON.stringify(updatedGame, null, 2);
    const suggestedName = `${newTitle.replace(/\s+/g, "_")}.dram`;
    await saveFileWithPicker(content, {
      ...DRAM_FILE_OPTIONS,
      suggestedName,
    });
  };

  // Open rename dialog with current values
  const openRenameDialog = () => {
    setRenameTitle(game.info.title);
    setRenameAuthor(game.info.author);
    setShowRenameDialog(true);
  };

  // Handle rename dialog submission
  const handleRenameDialogSubmit = async () => {
    const newTitle = renameTitle.trim();
    const newAuthor = renameAuthor.trim();
    
    if (!newTitle) {
      toast.error('Please enter a game title');
      return;
    }
    if (!newAuthor) {
      toast.error('Please enter an author name');
      return;
    }
    
    await handleRenameGame(newTitle, newAuthor);
    setShowRenameDialog(false);
    toast.success('Game renamed and saved');
  };

  const handleUpdateStatus = (type: "actor" | "scene" | "drop" | "item" | "sfx" | "page", id: string, status: AssetStatus) => {
    switch (type) {
      case "actor":
        setGame((g) => ({
          ...g,
          actors: g.actors.map((a) => (a.id === id ? { ...a, status } : a)),
        }));
        break;
      case "scene":
        setGame((g) => ({
          ...g,
          scenes: g.scenes.map((s) => (s.id === id ? { ...s, status } : s)),
        }));
        break;
      case "drop":
        setGame((g) => ({
          ...g,
          drops: g.drops.map((d) => (d.id === id ? { ...d, status } : d)),
        }));
        break;
      case "item":
        setGame((g) => ({
          ...g,
          items: g.items.map((i) => (i.id === id ? { ...i, status } : i)),
        }));
        break;
      case "sfx":
        setGame((g) => ({
          ...g,
          sfx: g.sfx.map((s) => (s.id === id ? { ...s, status } : s)),
        }));
        break;
      case "page":
        setGame((g) => ({
          ...g,
          pages: g.pages.map((p) => (p.id === id ? { ...p, status } : p)),
        }));
        break;
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      setGame(history[history.length - 1]);
      setHistory((h) => h.slice(0, -1));
    }
  };

  const handleSave = async () => {
    const content = JSON.stringify(game, null, 2);
    const suggestedName = `${game.info.title.replace(/\s+/g, "_")}.dram`;

    const saved = await saveFileWithPicker(content, {
      ...DRAM_FILE_OPTIONS,
      suggestedName,
    });

    if (saved) {
      // Auto-add game to library
      try {
        let library = await loadLibraryFromDB(username || undefined);
        
        // Set/update username on library
        if (username) {
          library = setLibraryUsername(library, username);
        }
        
        // Check for existing game with same title
        const duplicate = findDuplicateGame(library, game);
        if (duplicate.isDuplicate) {
          // Update existing game
          library = updateGameInLibrary(library, duplicate.existingItem.libraryId, game);
        } else {
          // Add new game
          library = addGameToLibrary(library, game);
        }
        
        await saveLibraryToDB(library, username || undefined);
      } catch (err) {
        console.error('Failed to add game to library:', err);
      }
      
      toast.success("Game saved!");
    }
  };

  const navItems = [
    { type: "settings" as const, icon: Settings, label: "", abbrev: "", color: "text-diesel-gold", isIconOnly: true },
    {
      type: "actor" as const,
      icon: User,
      label: "Actor",
      abbrev: "AC",
      color: "text-diesel-gold",
      count: game?.actors?.length ?? 0,
    },
    {
      type: "item" as const,
      icon: Package,
      label: "Item",
      abbrev: "IT",
      color: "text-diesel-gold",
      count: game?.items?.length ?? 0,
    },
    {
      type: "scene" as const,
      icon: Video,
      label: "Scene",
      abbrev: "SC",
      color: "text-diesel-rust",
      count: game?.scenes?.length ?? 0,
    },
    {
      type: "drop" as const,
      icon: Monitor,
      label: "Drop",
      abbrev: "DR",
      color: "text-diesel-paper",
      count: game?.drops?.length ?? 0,
    },
    {
      type: "page" as const,
      icon: FileCode,
      label: "Page",
      abbrev: "PG",
      color: "text-diesel-purple",
      count: game?.pages?.length ?? 0,
    },
    {
      type: "sfx" as const,
      icon: Music,
      label: "FX",
      abbrev: "FX",
      color: "text-diesel-green",
      count: game?.sfx?.length ?? 0,
    },
    {
      type: "episode" as const,
      icon: Layers,
      label: "Episode",
      abbrev: "EP",
      color: "text-diesel-purple",
      count: game?.episodes?.length ?? 0,
    },
    {
      type: "button" as const,
      icon: MousePointer2,
      label: "Buttons",
      abbrev: "BT",
      color: "text-diesel-cyan",
      count: game?.buttons?.length ?? 0,
    },
    {
      type: "collection" as const,
      icon: Archive,
      label: "Collection",
      abbrev: "CO",
      color: "text-diesel-cyan",
      count: game?.items?.filter(i => i.isCollectible)?.length ?? 0,
    },
  ];

  // Handler for navigating back (Escape key)
  const handleBack = useCallback(() => {
    if (selection.id) {
      // If viewing a specific item, go back to list
      setSelection({ type: selection.type, id: null });
    } else if (selection.type !== 'settings') {
      // If on a list view, go to settings
      setSelection({ type: 'settings', id: null });
    }
  }, [selection]);

  // Keyboard shortcuts hook
  const { shortcuts } = useKeyboardShortcuts({
    enabled: isStarted && isLoaded,
    onNavigate: handleSelect,
    onSave: handleSave,
    onNewGame: handleNewGame,
    onLoad: handleLoadFile,
    onUndo: handleUndo,
    onPlay: handlePlayGame,
    onBack: handleBack,
    selection,
  });

  // Help overlay toggle with ? key
  useEffect(() => {
    if (!isStarted) return;
    
    const handleHelpKey = (e: KeyboardEvent) => {
      // Don't trigger when typing
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleHelpKey);
    return () => window.removeEventListener('keydown', handleHelpKey);
  }, [isStarted]);

  // ═══════════════════════════════════════════════════════════════
  // REST PERIOD BLOCKING - Early return AFTER all hooks
  // ═══════════════════════════════════════════════════════════════
  if ((isRestPeriod || forceShowRestPeriod) && isStarted && !restPeriodOverride) {

    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
        data-capture-area="rest-period"
      >
        {/* Default blue theme background */}
        <div className="absolute inset-0 bg-[hsl(220,30%,8%)]/98 backdrop-blur-sm" />
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Background gears - hidden on mobile */}
        <Gear
          size={400}
          teeth={20}
          className="hidden md:block absolute -top-32 -left-32 text-[hsl(210,40%,35%)] opacity-8 animate-[spin_180s_linear_infinite]"
        />
        <Gear
          size={350}
          teeth={18}
          className="hidden md:block absolute -bottom-32 -right-32 text-[hsl(210,40%,35%)] opacity-8 animate-[spin_200s_linear_infinite_reverse]"
        />

        <div className="relative max-w-xl mx-4 p-8 bg-[hsl(220,25%,12%)]/90 border border-[hsl(210,40%,30%)] rounded-sm shadow-[0_0_40px_hsl(210,50%,30%,0.3)] backdrop-blur-md">
          <div className="text-center">
            {/* Compact header - cool blue tones */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-[hsl(210,50%,45%)]/30 rounded-full animate-[pulse_4s_ease-in-out_infinite]" />
                <DramatonLogo className="relative w-16 h-16 text-[hsl(210,50%,55%)] animate-[pulse_4s_ease-in-out_infinite] drop-shadow-[0_0_20px_hsl(210,50%,50%,0.4)]" />
              </div>
              <h2 className="text-2xl font-bold text-[hsl(210,40%,65%)] tracking-widest">REST PERIOD</h2>
            </div>

            <ArtDecoDivider width={250} className="text-[hsl(210,40%,40%)] mx-auto mb-3" />

            <p className="text-[hsl(210,20%,70%)] text-sm mb-4">Take a moment to breathe. Resume at top of hour.</p>

            {/* Timer display - hourglass beside countdown */}
            <div className="flex items-center justify-center gap-6 mb-4">
              {/* Hourglass */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-36 bg-[hsl(210,50%,50%)]/10 blur-xl rounded-full animate-[pulse_5s_ease-in-out_infinite]" />
                </div>
                <Hourglass remainingMinutes={Math.max(0, Math.min(30, 60 - minutes))} />
              </div>

              {/* Digital countdown - calm blue */}
              <div className="flex flex-col items-start">
                <div className="text-7xl font-mono text-[hsl(210,50%,65%)] drop-shadow-[0_0_20px_hsl(210,50%,55%,0.4)] tabular-nums">
                  <span className="animate-[pulse_4s_ease-in-out_infinite]">
                    {String(60 - minutes).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-lg text-[hsl(210,20%,55%)] font-mono uppercase tracking-wider">minutes</span>
              </div>
            </div>

            <p className="text-[hsl(210,20%,50%)] text-xs font-mono mb-4">Work window: :00 to :30 each hour</p>
            
            {/* Override button */}
            <button
              onClick={() => setRestPeriodOverride(true)}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider border border-[hsl(210,30%,35%)] text-[hsl(210,20%,50%)] hover:border-[hsl(210,40%,50%)] hover:text-[hsl(210,40%,70%)] hover:bg-[hsl(210,40%,20%)]/30 transition-all duration-300"
            >
              Override Rest Period
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SPLASH SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (!isStarted) {
    return (
      <div
        data-capture-area="splash"
        className="h-screen w-screen flex flex-col items-center justify-center bg-diesel-black overflow-hidden relative"
      >
        {/* Drifting steam puffs background */}
        <DriftingSteamPuffs />
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--diesel-border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--diesel-border)) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TOP EDGE - Horizontal pipes with gauges and valve wheels        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="absolute top-0 left-0 right-0 h-28">
          {/* Left pipe run */}
          <div className="absolute left-8 top-8">
            <PipeHorizontal width={180} />
          </div>
          {/* Left gauge cluster */}
          <div className="absolute left-48 top-4 flex gap-3">
            <Gauge value={0.75} label="PSI" />
            <Gauge value={0.6} label="RPM" />
          </div>
          
          {/* Center decorative element */}
          <div className="absolute left-1/2 -translate-x-1/2 top-6 flex items-center gap-4">
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-diesel-gold/50 to-transparent" />
            <Rivet size={10} />
            <div className="w-8 h-0.5 bg-diesel-gold/30" />
            <Rivet size={10} />
            <div className="w-24 h-0.5 bg-gradient-to-l from-transparent via-diesel-gold/50 to-transparent" />
          </div>
          
          {/* Right gauge cluster */}
          <div className="absolute right-48 top-4 flex gap-3">
            <Gauge value={0.45} label="TEMP" />
            <Gauge value={0.85} label="FLUX" />
          </div>
          {/* Right pipe run */}
          <div className="absolute right-8 top-8">
            <PipeHorizontal width={180} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LEFT EDGE - Gear mechanism with connecting rod                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="absolute left-0 top-0 bottom-0 w-48">
          {/* Upper vacuum tube bank */}
          <div className="absolute left-4 top-28 flex flex-col gap-1">
            <VacuumTube size={40} glowColor="orange" pulseSpeed={1.2} />
            <VacuumTube size={40} glowColor="green" pulseSpeed={2.7} />
            <VacuumTube size={40} glowColor="orange" pulseSpeed={0.8} />
          </div>
          
          {/* SYNCHRONIZED GEAR MECHANISM */}
          <GearMechanism 
            side="left" 
            animationDuration={4}
            className="absolute left-8 top-1/2 -translate-y-1/2"
          />
          
          {/* STEAM BOILER - Interactive with explosion */}
          <div className="absolute left-2 bottom-24">
            <SteamBoiler onExplosionStateChange={setBoilerExploded} />
          </div>
          
          {/* FLYWHEEL WITH BELT - connected to gear mechanism */}
          <div className="absolute left-32 bottom-16">
            <FlywheelWithBelt 
              isPaused={boilerExploded} 
              animationDuration={4}
            />
          </div>
          
          {/* Steam vent */}
          <div className="absolute left-4 top-24 opacity-60">
            <SteamVent />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RIGHT EDGE - Gear mechanism with connecting rod                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="absolute right-0 top-0 bottom-0 w-48">
          {/* SYNCHRONIZED GEAR MECHANISM */}
          <GearMechanism 
            side="right" 
            animationDuration={4}
            className="absolute right-8 top-1/2 -translate-y-1/2"
          />
          
          {/* Small meshing gear cluster */}
          <div className="absolute right-2 top-28">
            <Gear 
              size={50} 
              teeth={10} 
              className="text-diesel-steel animate-[spin_4s_linear_infinite_reverse]" 
            />
            <div className="absolute -left-4 top-6">
              <Gear 
                size={35} 
                teeth={8} 
                className="text-diesel-steel animate-[spin_2.8s_linear_infinite]" 
              />
            </div>
          </div>
          
          {/* Lower vacuum tube bank */}
          <div className="absolute right-4 bottom-28 flex flex-col gap-1">
            <VacuumTube size={40} glowColor="blue" pulseSpeed={1.5} />
            <VacuumTube size={40} glowColor="orange" pulseSpeed={0.9} />
            <VacuumTube size={40} glowColor="green" pulseSpeed={2.1} />
          </div>
          
          {/* Steam vent */}
          <div className="absolute right-4 top-24 opacity-60">
            <SteamVent />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BOTTOM EDGE - Horizontal pipes with valve wheels                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="absolute bottom-0 left-0 right-0 h-24">
          {/* Left pipe run with valve */}
          <div className="absolute left-8 bottom-8">
            <PipeHorizontal width={200} />
            {/* Valve wheel */}
            <div className="absolute left-20 -top-6">
              <svg viewBox="0 0 40 40" className="w-10 h-10 animate-[spin_20s_linear_infinite]">
                <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(40 15% 30%)" strokeWidth="4" />
                <circle cx="20" cy="20" r="6" fill="hsl(40 15% 25%)" stroke="hsl(40 15% 35%)" strokeWidth="2" />
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line 
                    key={angle}
                    x1={20 + Math.cos(angle * Math.PI / 180) * 6}
                    y1={20 + Math.sin(angle * Math.PI / 180) * 6}
                    x2={20 + Math.cos(angle * Math.PI / 180) * 14}
                    y2={20 + Math.sin(angle * Math.PI / 180) * 14}
                    stroke="hsl(40 15% 35%)"
                    strokeWidth="3"
                  />
                ))}
              </svg>
            </div>
          </div>
          
          {/* Center rivet line */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-6">
            {Array.from({ length: 11 }).map((_, i) => (
              <Rivet key={i} size={10} className="opacity-60" />
            ))}
          </div>
          
          {/* Right pipe run with valve */}
          <div className="absolute right-8 bottom-8">
            <PipeHorizontal width={200} />
            {/* Valve wheel */}
            <div className="absolute right-20 -top-6">
              <svg viewBox="0 0 40 40" className="w-10 h-10 animate-[spin_25s_linear_infinite_reverse]">
                <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(40 15% 30%)" strokeWidth="4" />
                <circle cx="20" cy="20" r="6" fill="hsl(40 15% 25%)" stroke="hsl(40 15% 35%)" strokeWidth="2" />
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line 
                    key={angle}
                    x1={20 + Math.cos(angle * Math.PI / 180) * 6}
                    y1={20 + Math.sin(angle * Math.PI / 180) * 6}
                    x2={20 + Math.cos(angle * Math.PI / 180) * 14}
                    y2={20 + Math.sin(angle * Math.PI / 180) * 14}
                    stroke="hsl(40 15% 35%)"
                    strokeWidth="3"
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CORNER BRACKETS - Industrial framing                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <CornerBracket className="absolute top-2 left-2 text-diesel-border" flip="none" />
        <CornerBracket className="absolute top-2 right-2 text-diesel-border" flip="h" />
        <CornerBracket className="absolute bottom-2 left-2 text-diesel-border" flip="v" />
        <CornerBracket className="absolute bottom-2 right-2 text-diesel-border" flip="both" />

        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)",
          }}
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MAIN CONTENT - Logo, title, and control panel                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="relative z-20 flex flex-col items-center pt-1 pb-2">
          {/* Logo with glow - clickable */}
          <button 
            onClick={() => setShowAboutDialog(true)}
            className="relative cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="absolute inset-0 blur-xl bg-white/40 rounded-full scale-150" />
            {processedLogoImage && (
              <img 
                src={processedLogoImage} 
                alt="Dramaton Logo" 
                className="relative w-24 h-24 mb-1 drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
              />
            )}
            {/* Spinning dashed ring around logo */}
            <div className="absolute inset-0 -m-4 border-2 border-dashed border-diesel-border/20 rounded-full animate-[spin_30s_linear_infinite]" />
          </button>

          {/* Art deco divider */}
          <ArtDecoDivider width={300} className="text-diesel-gold mb-1" />

          {/* Title with glow */}
          <h1 
            className="text-3xl md:text-4xl font-bold text-diesel-rust tracking-widest mb-0.5"
            style={{ textShadow: '0 0 20px hsl(var(--diesel-rust) / 0.5), 0 0 40px hsl(var(--diesel-rust) / 0.3)' }}
          >
            DRAMATON
          </h1>
          <p className="text-diesel-steel text-[9px] tracking-[0.3em] mb-3 uppercase font-mono">
            ▸ Legendary Interactive Narrative System ◂
          </p>

          {/* Industrial Panel - compact */}
          <IndustrialPanel className="w-[380px] max-w-[90vw]" glowing>
            {/* Saved game info - only shown when save exists */}
            {hasAutoSave && (
              <div className="mb-2">
                <p className="text-diesel-steel text-[10px] uppercase tracking-widest text-center font-mono">
                  ▸ Saved Game ◂
                </p>
                <p className="text-diesel-paper text-sm text-center font-bold truncate">"{startTitle}"</p>
                <p className="text-diesel-gold text-sm text-center font-bold mb-2">by {startAuthor}</p>
              </div>
            )}

            {/* Action buttons - always visible */}
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={hasAutoSave ? handlePlayGame : handleNewGameFromSplash}
                className="flex-1 py-1.5 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-xs font-bold uppercase hover:bg-diesel-rust/30 transition-all flex items-center justify-center gap-1"
              >
                <Play size={12} />
                Play
              </button>
              <button
                onClick={hasAutoSave ? handleResumeGame : handleNewGameFromSplash}
                disabled={hasAutoSave && !startTitle.trim()}
                className="flex-1 py-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green text-xs font-bold uppercase hover:bg-diesel-green/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-diesel-green/20"
              >
                <Settings size={12} />
                Edit
              </button>
              <button
                onClick={handleDocumentProject}
                disabled={isCapturing || !hasAutoSave}
                className="flex-1 py-1.5 bg-diesel-cyan/20 border border-diesel-cyan text-diesel-cyan text-xs font-bold uppercase hover:bg-diesel-cyan/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Camera size={12} />
                PDF
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center my-2">
              <div className="flex-1 h-px bg-diesel-border" />
              <span className="px-2 text-diesel-steel/50 text-[9px] uppercase">new / load</span>
              <div className="flex-1 h-px bg-diesel-border" />
            </div>

            {/* New game inputs */}
            <div className="space-y-1.5">
              <CyberInput
                label="Title"
                value={startTitle}
                onChange={(e) => setStartTitle(e.target.value)}
                placeholder="Add title here"
              />
              <CyberInput
                label="Author"
                value={username || startAuthor || ""}
                onChange={() => {}}
                placeholder=""
                disabled
                className="disabled:opacity-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Action buttons - side by side */}
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={handleNewGameFromSplash}
                className="flex-1 py-1.5 bg-orange-500/20 border border-orange-500 text-orange-500 text-xs font-bold uppercase hover:bg-orange-500/30 transition-all flex items-center justify-center gap-1"
              >
                <Plus size={12} />
                New
              </button>
              <button
                onClick={handleLoadFile}
                className="flex-1 py-1.5 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold text-xs font-bold uppercase hover:bg-diesel-gold/30 transition-all flex items-center justify-center gap-1"
              >
                <FolderOpen size={12} />
                Load
              </button>
            </div>
          </IndustrialPanel>

          {/* Sign Out button with username */}
          {user && (
            <div className="mt-3 flex items-center gap-2">
              {username && (
                <span className="text-diesel-gold text-xs font-bold">
                  {username}
                </span>
              )}
              <button
                onClick={async () => {
                  await signOut();
                  toast.success("Signed out");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-diesel-steel text-xs hover:text-diesel-rust transition-colors border border-diesel-border hover:border-diesel-rust"
              >
                <LogOut size={12} />
                Sign Out
              </button>
            </div>
          )}

          {/* Footer - system status */}
          <div className="mt-4 flex items-center gap-3 text-diesel-steel/50 text-[9px] tracking-wider font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-diesel-green rounded-full animate-pulse" />
              SYSTEMS ONLINE
            </span>
            <span className="text-diesel-border">│</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-diesel-gold rounded-full animate-pulse" />
              ENGINE READY
            </span>
          </div>
        </div>
        
        {/* About Dialog - also accessible from splash */}
        <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
          <DialogContent className="bg-diesel-dark border-diesel-border max-w-2xl">
            <div className="flex flex-col items-center text-center p-4">
              <div className="relative mb-4">
                <div className="absolute inset-0 blur-2xl bg-diesel-rust/40 rounded-full scale-150" />
                {processedLogoImage && (
                  <img 
                    src={processedLogoImage} 
                    alt="Dramaton Logo" 
                    className="relative w-32 h-32 drop-shadow-[0_0_40px_hsl(15,70%,45%,0.6)]"
                  />
                )}
              </div>
              <h2 className="text-2xl font-bold text-diesel-rust tracking-widest mb-2">DRAMATON</h2>
              <ArtDecoDivider width={250} className="text-diesel-gold mb-3" />
              <p className="text-diesel-paper text-sm leading-relaxed mb-4">
                A visual novel creation studio with a dieselpunk soul. Craft branching narratives and cinematic scenes—no coding required.
              </p>
              <div className="bg-diesel-panel/50 border border-diesel-border rounded p-4 mb-4 w-full">
                <div className="flex gap-4 items-start">
                  <button 
                    onClick={() => setShowFullImage(true)}
                    className="shrink-0 group cursor-zoom-in"
                    title="Click to view full size"
                  >
                    <img 
                      src={kingOfChicagoImage} 
                      alt="King of Chicago box art" 
                      className="w-28 rounded shadow-lg border-2 border-diesel-border group-hover:border-diesel-gold transition-colors"
                    />
                  </button>
                  <div className="text-left flex-1">
                    <p className="text-diesel-paper text-sm leading-relaxed mb-2">
                      From the creator of{' '}
                      <a 
                        href="https://dougsharp.wordpress.com/the-king-of-chicago-by-doug-sharp/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-diesel-gold hover:text-diesel-rust underline font-semibold"
                      >
                        The King of Chicago
                      </a>
                      —the pioneering 1987 interactive movie.
                    </p>
                    <div className="space-y-2 text-xs text-diesel-steel italic">
                      <p>"A brilliantly devised game that far outstrips others of its genre." <span className="text-diesel-gold not-italic">— Personal Computer World</span></p>
                      <p>"One of the best gangster games ever made." <span className="text-diesel-gold not-italic">— Home of The Underdogs</span></p>
                      <p>"A masterwork of interactive cinema." <span className="text-diesel-gold not-italic">— Interactive Fiction Database</span></p>
                    </div>
                  </div>
                </div>
              </div>
              <a 
                href="https://dougsharp.wordpress.com/talks-and-papers-about-games-and-interactive-narrative/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-diesel-cyan hover:text-diesel-gold text-sm underline"
              >
                More About Dramaton
              </a>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Full-size image dialog */}
        <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
          <DialogContent className="bg-diesel-dark border-diesel-border max-w-3xl p-2">
            <img 
              src={kingOfChicagoImage} 
              alt="King of Chicago box art" 
              className="w-full rounded"
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN EDITOR
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="h-screen w-screen flex flex-col bg-diesel-black overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-10 bg-diesel-dark border-b border-diesel-border flex items-center justify-between shrink-0">
        <div className="flex items-center h-full">
          {/* Logo */}
          <div className="flex items-center px-2 h-full border-r border-diesel-border">
            <DramatonLogo className="w-5 h-5 text-diesel-rust" />
          </div>

          {/* Navigation tabs - compact */}
          {navItems.map((item) => (
            <button
              key={item.type}
              onClick={() => handleSelect(item.type, null)}
              className={`h-full px-2 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors border-r border-diesel-border ${
                selection.type === item.type
                  ? `bg-diesel-panel ${item.color}`
                  : "text-diesel-steel hover:text-white hover:bg-white/5"
              }`}
              title={item.label || item.type}
            >
              <item.icon size={12} />
              {!item.isIconOnly && (
                <>
                  <span className="hidden sm:inline">{item.abbrev}</span>
                  {item.count !== undefined && (
                    <span className="text-[9px] opacity-60 hidden md:inline">({item.count})</span>
                  )}
                </>
              )}
            </button>
          ))}

          {/* Library nav tab */}
          <Link
            to="/library"
            className="h-full px-2 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors border-r border-diesel-border text-diesel-steel hover:text-diesel-gold hover:bg-diesel-gold/10"
          >
            <Archive size={12} />
            <span className="hidden sm:inline">LB</span>
          </Link>

          {/* Play in Theater */}
          <button
            onClick={handlePlayGame}
            className="h-full px-2 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors border-r border-diesel-border text-diesel-green hover:bg-diesel-green/20"
            title={selection.type === 'scene' && selection.id ? 'Play current scene' : 'Play game'}
          >
            <Play size={12} />
            <span className="hidden sm:inline">Play</span>
          </button>
        </div>

        {/* Toolbar actions - compact */}
        <div className="flex items-center h-full">
          {/* AI Usage Tracker */}
          <AIUsageDisplay />
          
          <button
            onClick={() => setShowPublishDialog(true)}
            className="p-1.5 text-diesel-rust hover:text-diesel-gold"
            title="Publish to Cloud"
          >
            <Cloud size={14} />
          </button>
          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: "Export to PDF",
                description: "This will capture all views and generate a PDF document. This may take a moment. Continue?",
                confirmText: "Generate PDF",
                cancelText: "Cancel",
              });
              if (confirmed) {
                captureAllViews();
              }
            }}
            disabled={isCapturing}
            className="p-1.5 text-diesel-steel hover:text-diesel-gold disabled:opacity-30"
            title="Capture project state as PDF"
          >
            <Camera size={14} />
          </button>
          <button onClick={handleSave} className="p-1.5 text-diesel-steel hover:text-white" title="Save to file">
            <Save size={14} />
          </button>
          <button onClick={handleLoadFile} className="p-1.5 text-diesel-steel hover:text-white" title="Load game">
            <FolderOpen size={14} />
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 text-diesel-steel hover:text-white disabled:opacity-30"
            title="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-1.5 ${voiceEnabled ? "text-diesel-green" : "text-diesel-steel opacity-50"}`}
            title="Toggle voice"
          >
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Auth buttons */}
          {user ? (
            <button
              onClick={async () => {
                if (isLoaded) {
                  const shouldSave = await confirm({
                    title: "Save Before Signing Out?",
                    description: "Would you like to save your game to a file before signing out?",
                    confirmText: "Save & Sign Out",
                    cancelText: "Just Sign Out",
                  });
                  
                  if (shouldSave) {
                    await handleSave();
                  }
                }
                await signOut();
                toast.success("Signed out");
              }}
              className="p-1.5 text-diesel-steel hover:text-diesel-rust"
              title={`Logged in as ${user.email} - Click to sign out`}
            >
              <LogOut size={14} />
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="p-1.5 text-diesel-gold hover:text-diesel-paper"
              title="Log in to publish"
            >
              <LogIn size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden" data-capture-area="editor">
        {/* Editor Panel */}
        <div
          className={`bg-diesel-panel border-r border-diesel-border overflow-y-auto custom-scrollbar p-6 ${
            selection.type === "settings" ? "w-full md:w-1/2 lg:w-2/5 shrink-0" : "w-full"
          }`}
          data-scroll-area
        >
          <EditorBreadcrumb 
            selection={selection} 
            game={game} 
            onNavigate={handleSelect}
            historyBack={handleHistoryBack}
            historyForward={handleHistoryForward}
            canGoBack={navHistory.canGoBack}
            canGoForward={navHistory.canGoForward}
          />
          <h2 className="text-2xl font-bold text-diesel-gold border-b border-diesel-gold/30 pb-2 mb-6">
            {selection.type === "settings" && "GAME SETTINGS"}
            {selection.type === "actor" && "ACTOR EDITOR"}
            {selection.type === "scene" && "SCENE EDITOR"}
            {selection.type === "drop" && "DROP EDITOR"}
            {selection.type === "item" && "ITEM EDITOR"}
            {selection.type === "sfx" && "SFX EDITOR"}
            {selection.type === "button" && "BUTTON EDITOR"}
            {selection.type === "episode" && "EPISODE EDITOR"}
            {selection.type === "page" && "PAGE EDITOR"}
            {selection.type === "collection" && "COLLECTION"}
          </h2>

          {selection.type === "settings" && (
            <SettingsEditor game={game} onChange={setGame} onRename={handleRenameGame} onLoadFile={handleLoadFile} username={username} />
          )}
          {selection.type === "actor" && (
            <ActorEditor
              game={game}
              selection={selection}
              onChange={setGame}
              onSelect={handleSelect}
              styleGuide={game.info.styleGuide}
            />
          )}
          {selection.type === "scene" && (
            <SceneEditor
              game={game}
              selection={selection}
              onChange={setGame}
              onSelect={handleSelect}
              styleGuide={game.info.styleGuide}
            />
          )}
          {selection.type === "drop" && (
            <DropEditor
              game={game}
              selection={selection}
              onChange={setGame}
              onSelect={handleSelect}
              styleGuide={game.info.styleGuide}
            />
          )}
          {selection.type === "item" && (
            <ItemEditor
              game={game}
              selection={selection}
              onChange={setGame}
              onSelect={handleSelect}
              styleGuide={game.info.styleGuide}
            />
          )}
          {selection.type === "sfx" && (
            <SfxEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} />
          )}
          {selection.type === "button" && (
            <ButtonEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} />
          )}
          {selection.type === "episode" && (
            <EpisodeEditor
              game={game}
              selectedId={selection.id}
              onUpdate={setGame}
              onSelect={(id) => handleSelect("episode", id)}
              onNavigateToScene={(sceneId) => handleSelect("scene", sceneId)}
            />
          )}
          {selection.type === "page" && (
            <PageEditor game={game} selection={selection} onChange={setGame} onSelect={handleSelect} />
          )}
          {selection.type === "collection" && (
            <CollectionEditor 
              game={game} 
              onChange={setGame} 
              onNavigateToItem={(itemId) => handleSelect("item", itemId)} 
            />
          )}
        </div>

        {/* Asset Tree Panel - Full right column on settings/game page */}
        {selection.type === "settings" && (
          <div className="hidden md:flex flex-col flex-1 bg-diesel-black p-4 overflow-y-auto custom-scrollbar">
            <AssetTree game={game} onNavigate={handleSelect} onUpdateStatus={handleUpdateStatus} />
          </div>
        )}
      </div>

      {/* Publish Dialog */}
      <PublishDialog open={showPublishDialog} onOpenChange={setShowPublishDialog} game={game} />
      
      {/* About Dialog */}
      <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
        <DialogContent className="bg-diesel-dark border-diesel-border max-w-2xl">
          <div className="flex flex-col items-center text-center p-4">
            <div className="relative mb-4">
              <div className="absolute inset-0 blur-2xl bg-diesel-rust/40 rounded-full scale-150" />
              {processedLogoImage && (
                <img 
                  src={processedLogoImage} 
                  alt="Dramaton Logo" 
                  className="relative w-32 h-32 drop-shadow-[0_0_40px_hsl(15,70%,45%,0.6)]"
                />
              )}
            </div>
            <h2 className="text-2xl font-bold text-diesel-rust tracking-widest mb-2">DRAMATON</h2>
            <ArtDecoDivider width={250} className="text-diesel-gold mb-3" />
            <p className="text-diesel-paper text-sm leading-relaxed mb-4">
              A visual novel creation studio with a dieselpunk soul. Craft branching narratives and cinematic scenes—no coding required.
            </p>
            <div className="bg-diesel-panel/50 border border-diesel-border rounded p-4 mb-4 w-full">
              <div className="flex gap-4 items-start">
                <button 
                  onClick={() => setShowFullImage(true)}
                  className="shrink-0 group cursor-zoom-in"
                  title="Click to view full size"
                >
                  <img 
                    src={kingOfChicagoImage} 
                    alt="King of Chicago box art" 
                    className="w-28 rounded shadow-lg border-2 border-diesel-border group-hover:border-diesel-gold transition-colors"
                  />
                </button>
                <div className="text-left flex-1">
                  <p className="text-diesel-paper text-sm leading-relaxed mb-2">
                    From the creator of{' '}
                    <a 
                      href="https://dougsharp.wordpress.com/the-king-of-chicago-by-doug-sharp/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-diesel-gold hover:text-diesel-rust underline font-semibold"
                    >
                      The King of Chicago
                    </a>
                    —the pioneering 1987 interactive movie.
                  </p>
                  <div className="space-y-2 text-xs text-diesel-steel italic">
                    <p>"A brilliantly devised game that far outstrips others of its genre." <span className="text-diesel-gold not-italic">— Personal Computer World</span></p>
                    <p>"One of the best gangster games ever made." <span className="text-diesel-gold not-italic">— Home of The Underdogs</span></p>
                    <p>"A masterwork of interactive cinema." <span className="text-diesel-gold not-italic">— Interactive Fiction Database</span></p>
                  </div>
                </div>
              </div>
            </div>
            <a 
              href="https://dougsharp.wordpress.com/talks-and-papers-about-games-and-interactive-narrative/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-diesel-cyan hover:text-diesel-gold text-sm underline"
            >
              More About Dramaton
            </a>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Full-size image dialog */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="bg-diesel-dark border-diesel-border max-w-3xl p-2">
          <img 
            src={kingOfChicagoImage} 
            alt="King of Chicago box art" 
            className="w-full rounded"
          />
        </DialogContent>
      </Dialog>
      
      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp 
        shortcuts={shortcuts} 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
      <KeyboardShortcutsButton onClick={() => setShowKeyboardHelp(true)} />

      {/* Rename Game Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-diesel-panel border-diesel-border">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-diesel-gold uppercase tracking-wider">Rename Game</h2>
            <div>
              <label className="block text-xs uppercase tracking-widest text-diesel-steel mb-1">Game Title</label>
              <input
                type="text"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-3 text-lg font-bold focus:outline-none focus:border-diesel-gold"
                placeholder="Enter game title..."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-diesel-steel mb-1">Author</label>
              <input
                type="text"
                value={renameAuthor}
                onChange={(e) => setRenameAuthor(e.target.value)}
                className="w-full bg-diesel-black border border-diesel-border text-diesel-paper p-2 focus:outline-none focus:border-diesel-gold"
                placeholder="Enter author name..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRenameDialog(false)}
                className="flex-1 px-4 py-2 border border-diesel-border text-diesel-steel hover:border-diesel-paper hover:text-diesel-paper transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameDialogSubmit}
                className="flex-1 px-4 py-2 bg-diesel-gold/20 border border-diesel-gold text-diesel-gold font-bold uppercase hover:bg-diesel-gold/30 transition-colors"
              >
                Rename & Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
