import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      input: { main: "index.html", text: "text/index.html", audio: "audio-demo.html", magic: "magic-demo.html" },
    },
  },
  server: { headers: { "Cache-Control": "no-store" } },
});
