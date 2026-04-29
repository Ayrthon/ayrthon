export interface JobEntry {
  id: string;
  project: string;
  dates: string[];
}

const STORAGE_KEY = "ayrthon-job-planner-v1";

export interface StoredState {
  comfortTarget: number;
  /** Revenue per logged day (EUR; estimates use EUR). */
  dayRate?: number;
  entries: JobEntry[];
}

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

export function useJobYearPlanner() {
  const year = ref(new Date().getFullYear());
  const comfortTarget = ref(48);
  const dayRate = ref(0);
  const entries = ref<JobEntry[]>([]);
  const hydrated = ref(false);

  function load() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        hydrated.value = true;
        return;
      }
      const data = JSON.parse(raw) as StoredState;
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
            e &&
            typeof e.id === "string" &&
            typeof e.project === "string" &&
            Array.isArray(e.dates),
        );
      }
    } catch {
      entries.value = [];
    }
    hydrated.value = true;
  }

  function save() {
    if (typeof window === "undefined") return;
    const payload: StoredState = {
      comfortTarget: comfortTarget.value,
      dayRate: dayRate.value,
      entries: entries.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  onMounted(() => {
    load();
  });

  watch([comfortTarget, dayRate, entries], () => {
    if (!hydrated.value) return;
    save();
  }, { deep: true });

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
    save,
    toIsoDateString,
  };
}
