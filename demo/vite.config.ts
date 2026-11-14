import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served from https://awabadam.github.io/rtl-primitives/
export default defineConfig({
  root: __dirname,
  base: "./",
  plugins: [react()],
  build: { outDir: "../demo-dist", emptyOutDir: true },
});
