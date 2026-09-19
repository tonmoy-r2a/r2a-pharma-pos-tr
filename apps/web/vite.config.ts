import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Resolve workspace package from source so Vite picks up new exports
      // without a stale CJS dist interop cache (avoids white-screen import errors).
      "@r2a/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src/index.ts",
      ),
    },
  },
  server: {
    // Match root .env.example CORS (5173) — Owner web.
    port: 5173,
    strictPort: true,
  },
  envPrefix: ["VITE_"],
});
