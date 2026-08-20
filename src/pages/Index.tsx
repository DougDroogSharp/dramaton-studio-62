import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GameData, SelectionState, createDefaultGame, AssetStatus, migrateGameData } from "@/types";
import { DramatonLogo } from "@/components/DramatonLogo";
import { CostMeter } from "@/components/CostMeter";
import { CyberInput } from "@/components/CyberInput";
import { loadGameFromDB, saveGameToDB, clearGameFromDB, getRecentGames, addRecentGame, RecentGame } from "@/utils/db";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProjectCapture } from "@/hooks/useProjectCapture";
import { saveFileWithPicker, openFileWithPicker, DRAM_FILE_OPTIONS } from "@/utils/filePicker";
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
} from "lucide-react";
import { SettingsEditor } from "@/components/editors/SettingsEditor";
import { ActorEditor } from "@/components/editors/ActorEditor";
import { SceneEditor } from "@/components/editors/SceneEditor";
import { DropEditor } from "@/components/editors/DropEditor";
import { ItemEditor } from "@/components/editors/ItemEditor";
import { SfxEditor } from "@/components/editors/SfxEditor";
import { ButtonEditor } from "@/components/editors/ButtonEditor";
import { EpisodeEditor } from "@/components/editors/EpisodeEditor";
import { PublishDialog } from "@/components/PublishDialog";
import { AssetTree } from "@/components/AssetTree";
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
} from "@/components/DieselpunkDecorations";


// The shipped Humans vs Billionaires games, openable straight from
// public/ for a tweak-and-see pass in the editor.
const SHIPPED_GAMES = [
  { file: 'hvb-william.json', title: 'William the Conqueror', scenes: '326 scenes' },
  { file: 'hvb-leopold.json', title: 'King Leopold', scenes: '310 scenes' },
  { file: 'hvb-capone.json', title: 'King of Chicago', scenes: '284 scenes' },
  { file: 'hvb-elon.json', title: 'Elon Musk (moving to USA vs MAGA)', scenes: '290 scenes' },
  { file: 'hvb-machine.json', title: 'The Machine', scenes: '17 scenes' },
  { file: 'hvb-campaign.json', title: 'The Campaign', scenes: '107 scenes' },
];

const Index = () => {
  const navigate = useNavigate();
  const { confirm, alert } = useConfirmDialog();
  const { user, loading: authLoading, signOut } = useAuth();
  // Startup state
  const [isStarted, setIsStarted] = useState(false);
  const [startTitle, setStartTitle] = useState("Untitled Game");
  const [startAuthor, setStartAuthor] = useState("Unknown Creator");
  const [hasAutoSave, setHasAutoSave] = useState(false);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loadingShipped, setLoadingShipped] = useState<string | null>(null);

  // Editor state
  const [game, setGame] = useState<GameData>(createDefaultGame());
  const [selection, setSelection] = useState<SelectionState>({ type: "settings", id: null });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [history, setHistory] = useState<GameData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Project capture for PDF export
  const { isCapturing, captureAllViews } = useProjectCapture(
    (sel) => setSelection(sel as SelectionState),
    game.info.title,
    () => {
      // Navigate to editor when capturing from splash
      setIsStarted(true);
      setIsLoaded(true);
    },
    () => game, // Pass game data getter for selecting first items
  );

  // Handler for Document Project button on splash screen
  const handleDocumentProject = async () => {
    // Load the saved game first
    const saved = await loadGameFromDB();
    if (saved) {
      setGame(saved);
      // Start capture with splash screen included
      captureAllViews(true);
    }
  };

  // Check for autosave on mount
  useEffect(() => {
    loadGameFromDB().then((saved) => {
      if (saved) {
        setHasAutoSave(true);
        setStartTitle(saved.info.title);
        setStartAuthor(saved.info.author);
      }
    });
    getRecentGames().then(setRecentGames);
  }, []);

  // Open one of the shipped HvB games straight from public/ — the
  // files are large (art is embedded), so show progress and never
  // leave the button silently dead.
  const handleOpenShipped = async (file: string, title: string) => {
    setLoadingShipped(file);
    try {
      const response = await fetch(`/${file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = migrateGameData(await response.json());
      setGame(data);
      setIsStarted(true);
      setIsLoaded(true);
      saveGameToDB(data);
      toast.success(`Loaded: ${title}`);
    } catch (err) {
      console.error('Failed to open shipped game:', err);
      toast.error(`Could not load ${file} — is the dev server serving public/?`);
    } finally {
      setLoadingShipped(null);
    }
  };

  // Reopen a recent .dram file from its stored handle
  const handleOpenRecent = async (recent: RecentGame) => {
    if (!recent.handle) {
      toast.error('No file handle stored — use Load to open it once.');
      return;
    }
    try {
      const h = recent.handle as FileSystemFileHandle & {
        queryPermission?: (o: { mode: string }) => Promise<string>;
        requestPermission?: (o: { mode: string }) => Promise<string>;
      };
      let perm = (await h.queryPermission?.({ mode: 'read' })) ?? 'granted';
      if (perm !== 'granted') perm = (await h.requestPermission?.({ mode: 'read' })) ?? 'denied';
      if (perm !== 'granted') {
        toast.error('Permission denied — use Load to open it instead.');
        return;
      }
      const file = await h.getFile();
      const data = migrateGameData(JSON.parse(await file.text()));
      setGame(data);
      setIsStarted(true);
      setIsLoaded(true);
      saveGameToDB(data);
      addRecentGame({ title: data.info.title, fileName: recent.fileName, handle: recent.handle }).then(setRecentGames);
      toast.success(`Loaded: ${recent.fileName}`);
    } catch (err) {
      console.error('Failed to open recent game:', err);
      toast.error('Could not open that file (moved or deleted?) — use Load instead.');
    }
  };

  // Autosave when editing (debounced)
  useEffect(() => {
    if (isLoaded && game.info.enableAutosave) {
      const timer = setTimeout(() => saveGameToDB(game), 2000);
      return () => clearTimeout(timer);
    }
  }, [game, isLoaded]);

  const handleStartGame = async () => {
    // Validate title and author are not default/empty
    if (!startTitle.trim() || startTitle === "Untitled Game") {
      await alert("Please enter a unique game title before starting.");
      return;
    }
    if (!startAuthor.trim() || startAuthor === "Unknown Creator") {
      await alert("Please enter your name or studio as the creator.");
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
    newGame.info.author = startAuthor.trim();
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

  const handleResumeGame = async () => {
    const saved = await loadGameFromDB();
    if (saved) {
      setGame(migrateGameData(saved));
      setIsStarted(true);
      setIsLoaded(true);
    }
  };

  const handlePlayGame = () => {
    // Theater will load from IndexedDB automatically
    navigate("/theater");
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
      setIsStarted(true);
      setIsLoaded(true);
      saveGameToDB(data); // Save to IndexedDB for autosave
      addRecentGame({ title: data.info.title, fileName: result.name, handle: result.handle }).then(setRecentGames);
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
    setSelection({ type, id });
  };

  const handleUpdateStatus = (type: "actor" | "scene" | "drop" | "item" | "sfx", id: string, status: AssetStatus) => {
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

    const saved = await saveFileWithPicker(
      content,
      {
        ...DRAM_FILE_OPTIONS,
        suggestedName,
      },
      ({ handle, name }) => {
        addRecentGame({ title: game.info.title, fileName: name, handle }).then(setRecentGames);
      }
    );

    if (saved) {
      toast.success("Game saved!");
    }
  };

  const navItems = [
    { type: "settings" as const, icon: Settings, label: "Settings", abbrev: "GA", color: "text-diesel-gold" },
    {
      type: "actor" as const,
      icon: User,
      label: "Actors",
      abbrev: "AC",
      color: "text-diesel-gold",
      count: game?.actors?.length ?? 0,
    },
    {
      type: "scene" as const,
      icon: Video,
      label: "Scenes",
      abbrev: "SC",
      color: "text-diesel-rust",
      count: game?.scenes?.length ?? 0,
    },
    {
      type: "episode" as const,
      icon: Layers,
      label: "Episodes",
      abbrev: "EP",
      color: "text-diesel-purple",
      count: game?.episodes?.length ?? 0,
    },
    {
      type: "drop" as const,
      icon: Monitor,
      label: "Drops",
      abbrev: "DR",
      color: "text-diesel-paper",
      count: game?.drops?.length ?? 0,
    },
    {
      type: "item" as const,
      icon: Package,
      label: "Items",
      abbrev: "IT",
      color: "text-diesel-gold",
      count: game?.items?.length ?? 0,
    },
    {
      type: "sfx" as const,
      icon: Music,
      label: "SFX",
      abbrev: "FX",
      color: "text-diesel-green",
      count: game?.sfx?.length ?? 0,
    },
    {
      type: "button" as const,
      icon: MousePointer2,
      label: "Buttons",
      abbrev: "BT",
      color: "text-diesel-cyan",
      count: game?.buttons?.length ?? 0,
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // SPLASH SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (!isStarted) {
    return (
      <div
        data-capture-area="splash"
        className="h-screen w-screen flex flex-col items-center justify-center bg-diesel-black overflow-hidden relative"
      >
        {/* Background gears - slow rotating */}
        <Gear
          size={300}
          teeth={16}
          className="absolute -top-20 -left-20 text-diesel-border opacity-20 animate-[spin_60s_linear_infinite]"
        />
        <Gear
          size={200}
          teeth={12}
          className="absolute top-40 -left-10 text-diesel-border opacity-15 animate-[spin_45s_linear_infinite_reverse]"
        />
        <Gear
          size={250}
          teeth={14}
          className="absolute -bottom-20 -right-20 text-diesel-border opacity-20 animate-[spin_50s_linear_infinite]"
        />
        <Gear
          size={180}
          teeth={10}
          className="absolute bottom-40 -right-10 text-diesel-border opacity-15 animate-[spin_40s_linear_infinite_reverse]"
        />

        {/* Pipes */}
        <div className="absolute top-0 left-20">
          <PipeVertical height={200} className="opacity-40" />
        </div>
        <div className="absolute top-0 right-24">
          <PipeVertical height={150} className="opacity-40" />
        </div>
        <div className="absolute bottom-0 left-32">
          <PipeVertical height={180} className="opacity-40" />
        </div>
        <div className="absolute bottom-0 right-16">
          <PipeVertical height={220} className="opacity-40" />
        </div>

        {/* Steam vents */}
        <div className="absolute top-20 left-16 opacity-60">
          <SteamVent />
        </div>
        <div className="absolute top-32 right-20 opacity-60">
          <SteamVent />
        </div>

        {/* Gauges */}
        <div className="absolute top-8 left-1/4 opacity-70">
          <Gauge value={0.75} label="STEAM" />
        </div>
        <div className="absolute top-8 right-1/4 opacity-70">
          {/* Vacuum Tubes */}
          <div className="absolute left-8 top-1/3 -translate-y-1/2">
            <VacuumTube size={60} glowColor="orange" pulseSpeed={2.5} />
          </div>
          <div className="absolute left-20 top-1/3 -translate-y-1/2 mt-8">
            <VacuumTube size={50} glowColor="orange" pulseSpeed={3} />
          </div>
          <div className="absolute right-8 top-1/3 -translate-y-1/2">
            <VacuumTube size={60} glowColor="green" pulseSpeed={2} />
          </div>
          <div className="absolute right-20 top-1/3 -translate-y-1/2 mt-10">
            <VacuumTube size={45} glowColor="green" pulseSpeed={2.8} />
          </div>
          <Gauge value={0.45} label="FLUX" />
        </div>

        {/* Corner rivets pattern */}
        <div className="absolute top-4 left-4 flex gap-8">
          <Rivet size={16} />
          <Rivet size={16} />
          <Rivet size={16} />
        </div>
        <div className="absolute top-4 right-4 flex gap-8">
          <Rivet size={16} />
          <Rivet size={16} />
          <Rivet size={16} />
        </div>
        <div className="absolute bottom-4 left-4 flex gap-8">
          <Rivet size={16} />
          <Rivet size={16} />
          <Rivet size={16} />
        </div>
        <div className="absolute bottom-4 right-4 flex gap-8">
          <Rivet size={16} />
          <Rivet size={16} />
          <Rivet size={16} />
        </div>

        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)",
          }}
        />

        {/* Main content */}
        <div className="relative z-20 flex flex-col items-center pt-1 pb-2">
          {/* Logo with glow - smaller */}
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-diesel-rust/30 rounded-full" />
            <DramatonLogo className="relative w-16 h-16 text-diesel-rust mb-1 animate-pulse drop-shadow-[0_0_30px_hsl(15,70%,45%,0.5)]" />
          </div>

          {/* Art deco divider */}
          <ArtDecoDivider width={280} className="text-diesel-gold mb-1" />

          {/* Title - smaller */}
          <h1 className="text-2xl md:text-3xl font-bold text-diesel-rust tracking-widest mb-0.5 drop-shadow-[0_0_10px_hsl(15,70%,45%,0.8)]">
            DRAMATON
          </h1>
          <p className="text-diesel-steel text-[9px] tracking-[0.3em] mb-2 uppercase font-mono">
            ▸ Legendary Interactive Narrative System ◂
          </p>

          {/* Industrial Panel - compact */}
          <IndustrialPanel className="w-[380px] max-w-[90vw]" glowing>
            {/* Saved game section */}
            {hasAutoSave && (
              <div className="mb-2">
                <p className="text-diesel-steel text-[10px] uppercase tracking-widest text-center font-mono">
                  ▸ Saved Game ◂
                </p>
                <p className="text-diesel-paper text-sm text-center font-bold truncate">"{startTitle}"</p>
                <p className="text-diesel-steel/70 text-[10px] text-center mb-2">by {startAuthor}</p>
                <div className="flex gap-1.5 mb-2">
                  <button
                    onClick={handlePlayGame}
                    className="flex-1 py-1.5 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-xs font-bold uppercase hover:bg-diesel-rust/30 transition-all flex items-center justify-center gap-1"
                  >
                    <Play size={12} />
                    Play
                  </button>
                  <button
                    onClick={handleResumeGame}
                    className="flex-1 py-1.5 bg-diesel-green/20 border border-diesel-green text-diesel-green text-xs font-bold uppercase hover:bg-diesel-green/30 transition-all flex items-center justify-center gap-1"
                  >
                    <Settings size={12} />
                    Edit
                  </button>
                  <button
                    onClick={handleDocumentProject}
                    disabled={isCapturing}
                    className="flex-1 py-1.5 bg-diesel-cyan/20 border border-diesel-cyan text-diesel-cyan text-xs font-bold uppercase hover:bg-diesel-cyan/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Camera size={12} />
                    PDF
                  </button>
                </div>
                <div className="flex items-center my-2">
                  <div className="flex-1 h-px bg-diesel-border" />
                  <span className="px-2 text-diesel-steel/50 text-[9px] uppercase">new / load</span>
                  <div className="flex-1 h-px bg-diesel-border" />
                </div>
              </div>
            )}

            {/* New game inputs */}
            <div className="space-y-1.5">
              <CyberInput
                label="Title"
                value={startTitle}
                onChange={(e) => setStartTitle(e.target.value)}
                placeholder="Game title..."
              />
              <CyberInput
                label="Author"
                value={startAuthor}
                onChange={(e) => setStartAuthor(e.target.value)}
                placeholder="Your name..."
              />
            </div>

            {/* Action buttons - side by side */}
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={handleStartGame}
                className="flex-1 py-1.5 bg-diesel-rust/20 border border-diesel-rust text-diesel-rust text-xs font-bold uppercase hover:bg-diesel-rust/30 transition-all flex items-center justify-center gap-1"
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

            {/* The shipped HvB games, one click into the editor. These
                are BUILD OUTPUTS of scripts/chapters/build-*.mjs — a
                rebuild overwrites them, so edits made here are for
                trying things out; anything you want to keep belongs in
                the generator (or save it out under a new name). */}
            <div className="mt-3 border-t border-diesel-border pt-2">
              <p className="text-[9px] uppercase tracking-widest text-diesel-steel mb-1.5">
                Humans vs Billionaires
              </p>
              <div className="space-y-1">
                {SHIPPED_GAMES.map(g => (
                  <button
                    key={g.file}
                    onClick={() => handleOpenShipped(g.file, g.title)}
                    disabled={loadingShipped !== null}
                    className="w-full flex items-baseline justify-between gap-2 px-2 py-1 bg-diesel-black/40 border border-diesel-border text-left hover:border-diesel-gold transition-colors disabled:opacity-40"
                    title={`Open ${g.file} in the editor`}
                  >
                    <span className="text-xs text-diesel-paper truncate">{g.title}</span>
                    <span className="text-[9px] text-diesel-steel truncate shrink-0">
                      {loadingShipped === g.file ? 'loading…' : g.scenes}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-diesel-steel/60 mt-1.5 leading-snug">
                Build outputs — a rebuild overwrites them. Keep changes in the generator.
              </p>
            </div>

            {/* Recent games: one click back into the last 5 files */}
            {recentGames.length > 0 && (
              <div className="mt-3 border-t border-diesel-border pt-2">
                <p className="text-[9px] uppercase tracking-widest text-diesel-steel mb-1.5">Recent</p>
                <div className="space-y-1">
                  {recentGames.map(r => (
                    <button
                      key={r.fileName}
                      onClick={() => handleOpenRecent(r)}
                      className="w-full flex items-baseline justify-between gap-2 px-2 py-1 bg-diesel-black/40 border border-diesel-border text-left hover:border-diesel-gold transition-colors"
                      title={r.fileName}
                    >
                      <span className="text-xs text-diesel-paper truncate">{r.title}</span>
                      <span className="text-[9px] text-diesel-steel truncate shrink-0">{r.fileName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </IndustrialPanel>

          {/* Footer - minimal */}
          <div className="mt-3 flex items-center gap-2 text-diesel-steel/50 text-[9px] tracking-wider font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-diesel-green rounded-full animate-pulse" />
              ONLINE
            </span>
            <span className="text-diesel-border">│</span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-diesel-gold rounded-full animate-pulse" />
              READY
            </span>
          </div>
        </div>
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

          {/* New Game button */}
          <button
            onClick={handleNewGame}
            className="h-full px-2 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors border-r border-diesel-border text-diesel-green hover:bg-diesel-green/20"
            title="New Game"
          >
            <FilePlus2 size={12} />
            <span className="hidden sm:inline">New</span>
          </button>

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
            >
              <item.icon size={12} />
              <span className="hidden sm:inline">{item.abbrev}</span>
              {item.count !== undefined && (
                <span className="text-[9px] opacity-60 hidden md:inline">({item.count})</span>
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
          <Link
            to="/theater"
            className="h-full px-2 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors border-r border-diesel-border text-diesel-green hover:bg-diesel-green/20"
          >
            <Play size={12} />
            <span className="hidden sm:inline">Play</span>
          </Link>
        </div>

        {/* Toolbar actions - compact */}
        <div className="flex items-center h-full">
          <CostMeter game={game} />
          <button
            onClick={() => setShowPublishDialog(true)}
            className="p-1.5 text-diesel-rust hover:text-diesel-gold"
            title="Publish to Cloud"
          >
            <Cloud size={14} />
          </button>
          <button
            onClick={() => captureAllViews(false)}
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
              onClick={() => {
                signOut();
                toast.success("Logged out");
              }}
              className="p-1.5 text-diesel-steel hover:text-diesel-rust"
              title={`Logged in as ${user.email} - Click to logout`}
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
        {/* Settings page: Two-panel layout with preview */}
        {selection.type === "settings" ? (
          <>
            {/* Editor Panel */}
            <div
              className="w-full md:w-3/5 lg:w-1/2 xl:w-3/5 bg-diesel-panel border-r border-diesel-border overflow-y-auto custom-scrollbar p-6"
              data-scroll-area
            >
              <h2 className="text-2xl font-bold text-diesel-gold border-b border-diesel-gold/30 pb-2 mb-6">
                GAME SETTINGS
              </h2>
              <SettingsEditor game={game} onChange={setGame} />
            </div>

            {/* Asset Tree Panel */}
            <div className="hidden md:flex md:w-2/5 lg:w-1/2 xl:w-2/5 bg-diesel-black p-4">
              <AssetTree game={game} onNavigate={handleSelect} onUpdateStatus={handleUpdateStatus} />
            </div>
          </>
        ) : (
          /* Full-width layout for all other editors */
          <div className="w-full bg-diesel-panel overflow-y-auto custom-scrollbar p-6" data-scroll-area>
            <h2 className="text-2xl font-bold text-diesel-gold border-b border-diesel-gold/30 pb-2 mb-6">
              {selection.type === "actor" && "ACTOR EDITOR"}
              {selection.type === "scene" && "SCENE EDITOR"}
              {selection.type === "drop" && "DROP EDITOR"}
              {selection.type === "item" && "ITEM EDITOR"}
              {selection.type === "sfx" && "SFX EDITOR"}
            </h2>

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
              />
            )}
          </div>
        )}
      </div>

      {/* Publish Dialog */}
      <PublishDialog open={showPublishDialog} onOpenChange={setShowPublishDialog} game={game} />
    </div>
  );
};

export default Index;
