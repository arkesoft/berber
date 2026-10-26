import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";
import { rm } from "node:fs/promises";
export default defineConfig(({ mode }) => ({
  server: {
    proxy:
      loadEnv(mode, process.cwd(), "").VITE_API_MODE === "api"
        ? { "/api": { target: "http://127.0.0.1:3001", changeOrigin: false } }
        : undefined,
  },
  plugins: [
    reactRouter(),
    {
      name: "exclude-demo-worker-from-live-build",
      async closeBundle() {
        if (mode !== "demo" && mode !== "development")
          await rm("build/client/mockServiceWorker.js", { force: true });
      },
    },
  ],
  build: { sourcemap: false },
}));
