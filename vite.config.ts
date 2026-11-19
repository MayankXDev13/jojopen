import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "pages-redirect",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/docs/mcp") {
            res.writeHead(301, { Location: "/docs/mcp/" });
            res.end();
            return;
          }
          if (req.url === "/privacy") {
            res.writeHead(301, { Location: "/privacy/" });
            res.end();
            return;
          }
          if (req.url === "/terms") {
            res.writeHead(301, { Location: "/terms/" });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  server: { port: 5173, strictPort: false },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        docsMcp: resolve(import.meta.dirname, "docs/mcp/index.html"),
        privacy: resolve(import.meta.dirname, "privacy/index.html"),
        terms: resolve(import.meta.dirname, "terms/index.html"),
      },
    },
  },
});
