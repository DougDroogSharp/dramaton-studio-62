import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import os from "os";
import { dramDocsPlugin } from "./vite-plugin-dram-docs";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  // The repo lives inside Dropbox, which locks files mid-sync and makes
  // Vite's dep-optimizer rename fail with EBUSY. Keep the cache outside
  // the synced tree.
  cacheDir: path.join(os.tmpdir(), "vite-cache-dramaton-studio"),
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
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
