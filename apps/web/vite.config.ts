import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  cacheDir: process.env.VITE_CACHE_DIR ?? "node_modules/.vite",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5179
  }
});
