import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      input: { main: "index.html", audio: "audio-demo.html" },
    },
  },
  server: { headers: { "Cache-Control": "no-store" } },
});
