import type { JobEntry, StoredState } from "~~/shared/planning-state";

export type { JobEntry, StoredState } from "~~/shared/planning-state";

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Normalize various picker outputs to YYYY-MM-DD (local calendar date). */
export function toIsoDateString(input: Date | string): string {
  if (typeof input === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return input;
    return padDate(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return padDate(input.getFullYear(), input.getMonth(), input.getDate());
}

/** Avoid CDN/browser caching stale planner JSON on hard refresh (Netlify edge). */
const fetchPlannerOpts = {
  credentials: "include" as const,
  cache: "no-store" as RequestCache,
};

export function useJobYearPlanner() {
  const syncEnabled = inject(
    "planningSync",
    computed(() => false),
  );

  const year = ref(new Date().getFullYear());
  const comfortTarget = ref(48);
  const dayRate = ref(0);
  const entries = ref<JobEntry[]>([]);
  /** True after remote state applied (or failed attempt while sync enabled). */
  const hydrated = ref(false);

  /** Skip autosave while applying remote payload (avoid redundant PUT). */
  let applyingRemote = false;

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  async function pullLoad() {
    applyingRemote = true;
    try {
      const data = await fetchPlanningStateOnce();
      if (typeof data.comfortTarget === "number" && data.comfortTarget > 0) {
        comfortTarget.value = data.comfortTarget;
      }
      if (
        typeof data.dayRate === "number"
        && Number.isFinite(data.dayRate)
        && data.dayRate >= 0
      ) {
        dayRate.value = Math.round(data.dayRate * 100) / 100;
      }
      if (Array.isArray(data.entries)) {
        entries.value = data.entries.filter(
          (e) =>
            e
            && typeof e.id === "string"
            && typeof e.project === "string"
            && Array.isArray(e.dates),
        );
      }
    } catch (e: unknown) {
      const code = getFetchStatus(e);
      if (import.meta.dev) {
        console.warn("[planning] GET /api/planning/data failed:", code ?? e);
      }
      /** Keep default refs; do not wipe — empty JSON was often a stale CDN cache, not "no data". */
    } finally {
      applyingRemote = false;
      hydrated.value = true;
    }
  }

  /** One retry on cold starts / transient Netlify errors so refresh does not show an empty planner. */
  async function fetchPlanningStateOnce(): Promise<StoredState> {
    try {
      return await $fetch<StoredState>("/api/planning/data", fetchPlannerOpts);
    } catch (first: unknown) {
      const code = getFetchStatus(first);
      const transient =
        code === undefined || code === 502 || code === 503 || code === 504;
      if (!transient) throw first;
      await new Promise((r) => setTimeout(r, 400));
      return await $fetch<StoredState>("/api/planning/data", fetchPlannerOpts);
    }
  }

  async function flushSave(opts?: { keepalive?: boolean }) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!syncEnabled.value || !hydrated.value || applyingRemote) return;
    const payload: StoredState = {
      comfortTarget: comfortTarget.value,
      dayRate: dayRate.value,
      entries: entries.value,
    };
    try {
      await $fetch("/api/planning/data", {
        method: "PUT",
        credentials: "include",
        body: payload,
        cache: "no-store",
        keepalive: opts?.keepalive === true,
      });
    } catch (e: unknown) {
      console.error("[planning] PUT /api/planning/data failed:", getFetchStatus(e), e);
    }
  }

  /** Debounced save — next macrotick batches Vue updates without long delay before refresh. */
  function scheduleSave() {
    if (!syncEnabled.value || typeof window === "undefined") return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flushSave(), 0);
  }

  watch(
    syncEnabled,
    async (v, prev) => {
      if (!v) {
        if (prev === true) {
          comfortTarget.value = 48;
          dayRate.value = 0;
          entries.value = [];
        }
        hydrated.value = false;
        return;
      }
      hydrated.value = false;
      await pullLoad();
    },
    { immediate: true },
  );

  watch(
    [comfortTarget, dayRate, entries],
    () => {
      if (!hydrated.value || !syncEnabled.value || applyingRemote) return;
      scheduleSave();
    },
    { deep: true, flush: "post" },
  );

  if (import.meta.client) {
    const hotFlush = () => void flushSave({ keepalive: true });
    const onVis = () => {
      if (document.visibilityState === "hidden") hotFlush();
    };
    window.addEventListener("pagehide", hotFlush);
    window.addEventListener("beforeunload", hotFlush);
    document.addEventListener("visibilitychange", onVis);
    onScopeDispose(() => {
      window.removeEventListener("pagehide", hotFlush);
      window.removeEventListener("beforeunload", hotFlush);
      document.removeEventListener("visibilitychange", onVis);
    });
  }

  const uniqueDaysInSelectedYear = computed(() => {
    const y = year.value;
    const prefix = `${y}-`;
    const set = new Set<string>();
    for (const e of entries.value) {
      for (const d of e.dates) {
        if (typeof d === "string" && d.startsWith(prefix)) set.add(d);
      }
    }
    return set.size;
  });

  const datesByDay = computed(() => {
    const y = year.value;
    const prefix = `${y}-`;
    const map = new Map<string, JobEntry[]>();
    for (const e of entries.value) {
      for (const d of e.dates) {
        if (typeof d === "string" && d.startsWith(prefix)) {
          const list = map.get(d) ?? [];
          list.push(e);
          map.set(d, list);
        }
      }
    }
    return map;
  });

  /** Months 0–11 → sorted unique entries touching that month */
  const monthlyPlan = computed(() => {
    const y = year.value;
    const months: {
      monthIndex: number;
      label: string;
      rows: { project: string; dates: string[] }[];
    }[] = [];

    const fmt = new Intl.DateTimeFormat(undefined, { month: "long" });

    for (let m = 0; m < 12; m++) {
      const seen = new Map<string, Set<string>>();
      for (const e of entries.value) {
        const inMonth = e.dates.filter((d) => {
          if (!d.startsWith(`${y}-`)) return false;
          const parts = d.split("-");
          const mi = Number(parts[1]) - 1;
          return mi === m;
        });
        if (!inMonth.length) continue;
        if (!seen.has(e.project)) seen.set(e.project, new Set());
        const ps = seen.get(e.project)!;
        for (const d of inMonth) ps.add(d);
      }
      const rows = [...seen.entries()].map(([project, ds]) => ({
        project,
        dates: [...ds].sort(),
      }));
      rows.sort((a, b) => a.project.localeCompare(b.project));
      months.push({
        monthIndex: m,
        label: fmt.format(new Date(y, m, 1)),
        rows,
      });
    }
    return months;
  });

  function addEntry(project: string, dates: string[]) {
    const clean = project.trim();
    if (!clean || !dates.length) return;
    const normalized = [...new Set(dates.map(toIsoDateString))].sort();
    entries.value.push({
      id: crypto.randomUUID(),
      project: clean,
      dates: normalized,
    });
  }

  function removeEntry(id: string) {
    entries.value = entries.value.filter((e) => e.id !== id);
  }

  function setComfortTarget(n: number) {
    const v = Math.round(Number(n));
    if (Number.isFinite(v) && v > 0) comfortTarget.value = v;
  }

  function setDayRate(n: number) {
    const v = Number(n);
    if (!Number.isFinite(v) || v < 0) return;
    dayRate.value = Math.round(v * 100) / 100;
  }

  return {
    year,
    comfortTarget,
    dayRate,
    entries,
    hydrated,
    uniqueDaysInSelectedYear,
    datesByDay,
    monthlyPlan,
    addEntry,
    removeEntry,
    setComfortTarget,
    setDayRate,
    flushSave,
    toIsoDateString,
  };
}

function getFetchStatus(e: unknown): number | undefined {
  if (!e || typeof e !== "object") return undefined;
  const x = e as { statusCode?: unknown; status?: unknown };
  if (typeof x.statusCode === "number") return x.statusCode;
  if (typeof x.status === "number") return x.status;
  return undefined;
}
