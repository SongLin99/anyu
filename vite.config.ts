import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.APP_BASE || "/anyu/",
  plugins: [react()],
  server: { host: "127.0.0.1" },
});
