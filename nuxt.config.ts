import { createResolver } from "@nuxt/kit";
import vuetify from "vite-plugin-vuetify";

const resolver = createResolver(import.meta.url);

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },

  // App lives under ./app (pages, components, plugins, composables, assets)
  srcDir: "app/",

  // Enable file-based routing from the `pages/` directory
  pages: true,

  hooks: {
    // Ensures /planning is registered even if auto-discovery misses it (WSL/path quirks).
    "pages:extend"(pages) {
      const planningFile = resolver.resolve("./app/pages/planning.vue");
      const already = pages.some((p) => {
        const path = typeof p.path === "string" ? p.path.replace(/\/$/, "") : "";
        if (path === "/planning") return true;
        if (typeof p.file !== "string") return false;
        return p.file.replace(/\\/g, "/").endsWith("pages/planning.vue");
      });
      if (!already) {
        pages.push({
          name: "planning",
          path: "/planning",
          file: planningFile,
        });
      }
    },
  },

  css: [
    "vuetify/styles",
    "@mdi/font/css/materialdesignicons.css",
    "assets/fonts/fonts.css",
  ],

  build: {
    transpile: ["vuetify"],
  },

  vite: {
    plugins: [vuetify()],
  },

  nitro: {
    preset: "netlify",
  },

  runtimeConfig: {
    planningPassword: "",
    planningSessionSecret: "",
  },
});
