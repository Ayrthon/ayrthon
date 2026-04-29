import type { ComputedRef, Ref } from "vue";
import type { JobEntry, StoredState } from "~~/shared/planning-state";
import {
  parseComfortTargetFromStored,
  parseDayRateFromStored,
} from "~~/shared/planning-state";

export type { JobEntry, StoredState } from "~~/shared/planning-state";

/** Must be passed from `planning.vue`: Vue inject does not see `provide()` from the same component. */
export type PlanningSyncRef = Ref<boolean> | ComputedRef<boolean>;

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
function fetchPlannerOpts(): {
  credentials: "include";
  cache: RequestCache;
  headers: Record<string, string>;
} {
  return {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  };
}

export function useJobYearPlanner(syncOverride?: PlanningSyncRef) {
  const syncEnabled =
    syncOverride
    ?? inject<PlanningSyncRef>(
      "planningSync",
      computed(() => false),
    );

  const year = ref(new Date().getFullYear());
  const comfortTarget = ref(48);
  const dayRate = ref(0);
  const entries = ref<JobEntry[]>([]);
  /** Tombstones synced with server — required so merged PUTs do not resurrect deleted jobs. */
  const removedJobIds = ref<string[]>([]);
  /** True after remote state applied (or failed attempt while sync enabled). */
  const hydrated = ref(false);

  /** Skip autosave while applying remote payload (avoid redundant PUT). */
  let applyingRemote = false;

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  async function pullLoad() {
    applyingRemote = true;
    try {
      const data = await fetchPlanningStateOnce();
      const raw = data as Record<string, unknown>;
      const ct =
        parseComfortTargetFromStored(data.comfortTarget)
        ?? parseComfortTargetFromStored(raw["comfort_target"]);
      if (ct !== undefined) comfortTarget.value = ct;

      const dr =
        parseDayRateFromStored(data.dayRate)
        ?? parseDayRateFromStored(raw["day_rate"]);
      if (dr !== undefined) dayRate.value = dr;
      if (Array.isArray(data.entries)) {
        entries.value = data.entries.filter(
          (e) =>
            e
            && typeof e.id === "string"
            && typeof e.project === "string"
            && Array.isArray(e.dates),
        );
      }
      const rm = raw.removedJobIds ?? raw["removed_job_ids"];
      if (Array.isArray(rm)) {
        removedJobIds.value = [...new Set(
          rm.filter((x): x is string => typeof x === "string" && x.trim().length > 0),
        )].sort();
      } else {
        removedJobIds.value = [];
      }
    } catch (e: unknown) {
      const code = getFetchStatus(e);
      console.error("[planning] GET /api/planning/data failed:", code ?? e);
      /** Keep default refs; do not wipe — empty JSON was often a stale CDN cache, not "no data". */
    } finally {
      applyingRemote = false;
      hydrated.value = true;
    }
  }

  /** Unique URL — some proxies ignore `Cache-Control` on API routes; bust GET caches. */
  function planningDataUrl(): string {
    const q = new URLSearchParams({ _: String(Date.now()) });
    return `/api/planning/data?${q.toString()}`;
  }

  /** One retry on cold starts / transient Netlify errors so refresh does not show an empty planner. */
  async function fetchPlanningStateOnce(): Promise<StoredState> {
    const url = planningDataUrl();
    const opts = fetchPlannerOpts();
    try {
      return await $fetch<StoredState>(url, opts);
    } catch (first: unknown) {
      const code = getFetchStatus(first);
      const transient =
        code === undefined || code === 502 || code === 503 || code === 504;
      if (!transient) throw first;
      await new Promise((r) => setTimeout(r, 400));
      return await $fetch<StoredState>(planningDataUrl(), opts);
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
      ...(removedJobIds.value.length
        ? { removedJobIds: [...removedJobIds.value] }
        : {}),
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
          removedJobIds.value = [];
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
    [comfortTarget, dayRate, entries, removedJobIds],
    () => {
      if (!hydrated.value || !syncEnabled.value || applyingRemote) return;
      scheduleSave();
    },
    { deep: true, flush: "post" },
  );

  if (import.meta.client) {
    const hotFlush = () => void flushSave({ keepalive: true });
    let visibleRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    /** Avoid duplicate GET when page starts visible (initial pullLoad runs via watch). */
    let sawHiddenSinceLoad = false;
    const refetchWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!syncEnabled.value) return;
      if (visibleRefreshTimer) clearTimeout(visibleRefreshTimer);
      visibleRefreshTimer = setTimeout(() => {
        visibleRefreshTimer = null;
        void pullLoad();
      }, 120);
    };
    const onVis = () => {
      const vs = document.visibilityState;
      if (vs === "hidden") {
        sawHiddenSinceLoad = true;
        hotFlush();
        return;
      }
      if (vs === "visible" && sawHiddenSinceLoad) {
        sawHiddenSinceLoad = false;
        refetchWhenVisible();
      }
    };
    const onPageShow = (e: PageTransitionEvent) => {
      /** BFCache restore can resurrect stale Vue state without remounting — force reload from server. */
      if (e.persisted) void pullLoad();
    };
    window.addEventListener("pagehide", hotFlush);
    window.addEventListener("beforeunload", hotFlush);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVis);
    onScopeDispose(() => {
      window.removeEventListener("pagehide", hotFlush);
      window.removeEventListener("beforeunload", hotFlush);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVis);
      if (visibleRefreshTimer) clearTimeout(visibleRefreshTimer);
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
    const next = new Set(removedJobIds.value);
    next.add(id);
    removedJobIds.value = [...next].sort();
  }

  /** Replace project name and/or dates for an existing job (list editor). */
  function updateEntry(id: string, patch: { project: string; dates: string[] }) {
    const clean = patch.project.trim();
    if (!clean || !patch.dates.length) return false;
    const normalized = [...new Set(patch.dates.map(toIsoDateString))].sort();
    const idx = entries.value.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    entries.value = entries.value.map((e, i) =>
      i === idx ? { ...e, project: clean, dates: normalized } : e,
    );
    return true;
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
    updateEntry,
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
