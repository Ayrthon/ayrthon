import vuetify from "vite-plugin-vuetify";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },

  css: ["vuetify/styles", "assets/fonts/fonts.css"],

  build: {
    transpile: ["vuetify"],
  },

  vite: {
    plugins: [vuetify()],
  },
});
