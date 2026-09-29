import { defineConfig } from "vite";

export default defineConfig({
  base: "/workbench/",
  build: { manifest: "manifest.json" },
});
