import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  optimizeDeps: {
    include: ["cobe", "canvas-confetti", "rough-notation"],
  },
  server: {
    port: 5610,
  },
});
