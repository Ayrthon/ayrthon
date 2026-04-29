/** Apply stored theme class before paint to reduce flash (pairs with useSiteTheme). */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  const STORAGE_KEY = "ayrthon-site-theme";
  const html = document.documentElement;
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === "dark") html.classList.add("theme-dark");
  else if (raw === "light") html.classList.remove("theme-dark");
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches)
    html.classList.add("theme-dark");
  else html.classList.remove("theme-dark");
});
