import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { pdfJsCMapsPlugin } from "../ui/vite/pdfJsCMapsPlugin.js";
const version = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).version;
export default defineConfig({
  root: "webview",
  base: "./",
  publicDir: "../../web/public",
  plugins: [react(), tailwindcss(), pdfJsCMapsPlugin()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "../ui/src"),
      "d3-path": resolve(import.meta.dirname, "../../node_modules/d3-path/src/index.js"),
    },
  },
  define: {
    __ZCODE_VERSION__: JSON.stringify(version),
    __ZCODE_ENV__: '"production"',
    __ZCODE_COMMIT__: '"local"',
    __ZCODE_ENDPOINT_ENV__: "{}",
  },
  worker: { rollupOptions: { treeshake: false } },
  build: { outDir: "../dist/webview", emptyOutDir: true, sourcemap: false },
});
