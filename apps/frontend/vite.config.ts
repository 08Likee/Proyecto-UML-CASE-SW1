import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Herramienta CASE Colaborativa",
        short_name: "CASE UML",
        description:
          "Herramienta CASE colaborativa para modelado UML y generación automática de backend",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
      },
    }),
  ],
});
