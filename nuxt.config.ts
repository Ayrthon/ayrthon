import vuetify from "vite-plugin-vuetify";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },

  // Enable file-based routing from the `pages/` directory
  pages: true,

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
});
