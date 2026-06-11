import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ command }) => ({
  root: appRoot,
  cacheDir: "node_modules/.vite",
  plugins: [react()],
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"]
  },
  server: {
    port: 5173,
    fs: {
      strict: true,
      allow: [appRoot]
    },
    proxy: {
      "/api": "http://127.0.0.1:3001"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
}));
