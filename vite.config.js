import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
      ],
      manifest: {
        name: "Bathroom Code Tracker",
        short_name: "Bathroom Codes",
        description: "Find and share bathroom access codes for businesses",
        theme_color: "#52525b",
        background_color: "#fafafa",
        display: "standalone",
        orientation: "portrait",
        start_url: "./", // Changed to relative
        scope: "./", // Changed to relative
        icons: [
          {
            src: "android-chrome-192x192.png", // Removed leading slash
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "android-chrome-512x512.png", // Removed leading slash
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: "index.html", // Removed path
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "openstreetmap-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: "/bathroom-code-tracker/",
});
