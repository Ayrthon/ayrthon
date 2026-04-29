export type SiteThemeMode = "light" | "dark";

const STORAGE_KEY = "ayrthon-site-theme";

function readStoredMode(): SiteThemeMode {
  if (typeof window === "undefined") return "light";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "dark" || raw === "light") return raw;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyDom(m: SiteThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("theme-dark", m === "dark");
  document.documentElement.style.colorScheme = m === "dark" ? "dark" : "light";
}

/** Shared site-wide light/dark preference (localStorage + html.theme-dark). */
export function useSiteTheme() {
  const mode = useState<SiteThemeMode>("site-theme-mode", () => "light");

  if (import.meta.client) {
    mode.value = readStoredMode();
    applyDom(mode.value);
  }

  function setMode(m: SiteThemeMode) {
    mode.value = m;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, m);
      applyDom(m);
    }
  }

  function toggle() {
    setMode(mode.value === "light" ? "dark" : "light");
  }

  const isDark = computed(() => mode.value === "dark");

  return {
    mode,
    isDark,
    setMode,
    toggle,
  };
}
