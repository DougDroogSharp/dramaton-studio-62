import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import os from "os";
import { dramDocsPlugin } from "./vite-plugin-dram-docs";
import { dramBridgePlugin } from "./vite-plugin-dram-bridge";
import { fluxPlugin } from "./vite-plugin-flux";
import { voicePlugin } from "./vite-plugin-voice";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // The repo lives inside Dropbox, which locks files mid-sync and makes
  // Vite's dep-optimizer rename fail with EBUSY. Keep the cache outside
  // the synced tree.
  cacheDir: path.join(os.tmpdir(), "vite-cache-dramaton-studio"),
  build: {
    // Two builds, one repo — each gets its own folder so neither can
    // silently overwrite the other:
    //   npm run build:pod    -> dist-pod/    the editor (the Dramaton pod)
    //   npm run build:games  -> dist-games/  theater only, for sharing
    //   npm run build        -> dist/        theater only (safe default)
    outDir:
      mode === "pod" ? "dist-pod" : mode === "games" ? "dist-games" : "dist",
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    dramDocsPlugin(),
    // DRAM bridge: the live document mirrored to the dev server for AI
    // co-editing (dev-only; no-op in production builds)
    dramBridgePlugin(),
    // Server-side Flux image bridge; reads BFL_API_KEY / FLUX_MODEL
    // from .env.local without exposing them to the client
    fluxPlugin(loadEnv(mode, process.cwd(), "")),
    // Server-side ElevenLabs bridge; caches generated audio to disk so
    // a line is paid for once, however often a scene replays.
    voicePlugin(loadEnv(mode, process.cwd(), "")),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
