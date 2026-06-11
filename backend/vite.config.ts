import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: "src/server.ts",
    target: "node18",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "server.js"
      }
    }
  }
});
