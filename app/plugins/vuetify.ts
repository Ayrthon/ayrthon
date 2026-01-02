import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: "light",
    },
    defaults: {
      global: {
        style: {
          fontFamily: "Roboto, sans-serif",
        },
      },
    },
  });

  nuxtApp.vueApp.use(vuetify);
});
