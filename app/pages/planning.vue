<template>
  <div class="planning-page">
    <nav class="planning-nav">
      <NuxtLink class="planning-nav__link" to="/">
        ← Home
      </NuxtLink>
      <SiteThemeToggle />
    </nav>

    <ClientOnly>
      <v-container class="planning-wrap" fluid>
        <header class="planning-head">
          <p class="planning-eyebrow">
            Personal · Job days / year
          </p>
          <h1 class="planning-title">
            Planning
          </h1>
          <p class="planning-sub">
            Track work days against your yearly comfort target. Data stays in this browser (local storage).
          </p>
        </header>

        <v-row class="controls-row" dense>
          <v-col cols="6" lg="4">
            <v-select
              v-model="yearModel"
              :items="yearItems"
              class="plan-field"
              density="comfortable"
              hide-details
              label="Year"
              variant="outlined"
            />
          </v-col>
          <v-col cols="6" lg="4">
            <v-text-field
              :model-value="comfortTarget"
              class="plan-field"
              density="comfortable"
              hide-details
              label="Comfort (days / yr)"
              min="1"
              step="1"
              type="number"
              variant="outlined"
              @update:model-value="onComfortInput"
            />
          </v-col>
          <v-col cols="12" lg="4">
            <v-sheet class="stat-sheet pa-4" rounded="xl">
              <div class="stat-line">
                <span class="stat-label">Logged days</span>
                <span class="stat-num">{{ uniqueDaysInSelectedYear }} / {{ comfortTarget }}</span>
              </div>
              <v-progress-linear
                :model-value="progressPct"
                class="mt-3"
                color="primary"
                height="12"
                rounded
              />
              <p class="stat-hint mt-3 mb-0">
                {{ progressNote }}
              </p>
            </v-sheet>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" lg="5">
            <v-card
              v-if="draftDates.length === 0"
              class="surface-card pa-4 mb-4 mb-lg-6"
              rounded="xl"
              variant="flat"
            >
              <p class="help-text mb-0">
                Tap dates on the calendar (same year as above) to start a new job entry. Selected days appear on the calendar in amber.
              </p>
            </v-card>

            <v-card class="surface-card pa-4" rounded="xl" variant="flat">
              <v-card-title class="card-title px-0 pt-0 pb-3">
                Jobs ({{ entries.length }})
              </v-card-title>
              <v-list v-if="entriesSorted.length" bg-color="transparent" class="entry-list" density="comfortable">
                <v-list-item
                  v-for="e in entriesSorted"
                  :id="'job-row-' + e.id"
                  :key="e.id"
                  :class="[
                    'entry-item px-2 py-2 rounded-lg',
                    { 'entry-item--highlight': highlightedJobIds.includes(e.id) },
                  ]"
                  rounded="lg"
                >
                  <v-list-item-title class="entry-title">
                    {{ e.project }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="entry-sub">
                    {{ summarizeDates(e.dates) }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      aria-label="Remove entry"
                      class="touch-icon"
                      icon="mdi-delete-outline"
                      size="large"
                      variant="text"
                      @click="removeEntry(e.id)"
                    />
                  </template>
                </v-list-item>
              </v-list>
              <p v-else class="empty-text mb-0">
                No jobs yet.
              </p>
            </v-card>
          </v-col>

          <v-col cols="12" lg="7">
            <v-card class="surface-card pa-4" rounded="xl" variant="flat">
              <v-card-title class="card-title px-0 pt-0 pb-4">
                Calendar · {{ year }}
              </v-card-title>
              <div class="year-grid">
                <div
                  v-for="m in 12"
                  :key="m - 1"
                  class="mini-month"
                >
                  <div class="mini-month__title">
                    {{ monthTitle(year, m - 1) }}
                  </div>
                  <div class="weekday-row">
                    <span v-for="(w, wi) in weekdayLetters" :key="wi">{{ w }}</span>
                  </div>
                  <div
                    class="mini-month__calendar"
                    @mouseleave="onMiniMonthCalendarLeave"
                  >
                    <div
                      v-for="(blk, bi) in monthJobBlocks(year, m - 1)"
                      :key="'jb-' + (m - 1) + '-' + bi"
                      class="mini-month__job-block"
                      :style="blk.style"
                    />
                    <div
                      v-for="(blk, bi) in monthDraftBlocks(year, m - 1)"
                      :key="'db-' + (m - 1) + '-' + bi"
                      class="mini-month__draft-block"
                      :style="blk.style"
                    />
                    <button
                      v-for="(cell, idx) in cellsForMonth(year, m - 1)"
                      :key="idx"
                      :class="dayCellClasses(cell, year, m - 1)"
                      :disabled="cell.kind !== 'day'"
                      :style="dayCellGridStyle(idx)"
                      type="button"
                      @mouseenter="cell.kind === 'day' ? onMiniMonthDayEnter(cell, year, m - 1) : undefined"
                      @click="cell.kind === 'day' && cell.date ? onDayClick(cell.date) : null"
                    >
                      <template v-if="cell.kind === 'day'">
                        {{ cell.dayNum }}
                      </template>
                    </button>
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <Teleport to="body">
        <transition name="draft-bubble">
          <div
            v-if="draftDates.length"
            class="draft-bubble-theme draft-bubble-anchor"
          >
            <div
              class="draft-bubble pa-4 rounded-xl"
              role="dialog"
              aria-labelledby="draft-bubble-title"
            >
              <div class="draft-bubble__head">
                <div class="draft-bubble__titles">
                  <div id="draft-bubble-title" class="draft-bubble__title">
                    New job
                  </div>
                  <span class="draft-bubble__meta">{{ draftDates.length }} day<span v-if="draftDates.length !== 1">s</span> selected</span>
                </div>
                <v-btn
                  aria-label="Discard selection"
                  class="draft-bubble__close"
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  @click="clearDraft"
                />
              </div>
              <v-text-field
                v-model="formProject"
                class="plan-field mb-3 mt-1"
                density="comfortable"
                hide-details="auto"
                label="Project name"
                variant="outlined"
                @keyup.enter="submitEntry"
              />
              <div class="draft-bubble__actions">
                <v-btn
                  class="touch-btn draft-bubble__save"
                  color="primary"
                  rounded="xl"
                  size="large"
                  variant="flat"
                  @click="submitEntry"
                >
                  Save entry
                </v-btn>
              </div>
            </div>
          </div>
        </transition>
      </Teleport>

      <v-snackbar
        v-model="snack"
        class="plan-snackbar"
        location="bottom"
        rounded="xl"
        timeout="2400"
      >
        {{ snackText }}
      </v-snackbar>

      <template #fallback>
        <v-container class="planning-wrap planning-wrap--loading">
          <p class="loading-text">
            Loading planner…
          </p>
        </v-container>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Planning · Ayrthon",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const {
  year,
  comfortTarget,
  entries,
  uniqueDaysInSelectedYear,
  datesByDay,
  addEntry,
  removeEntry,
  setComfortTarget,
} = useJobYearPlanner();

const currentYear = new Date().getFullYear();
const yearItems = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const yearModel = computed({
  get: () => year.value,
  set: (v: number) => {
    year.value = v;
  },
});

const formProject = ref("");
const draftDates = ref<string[]>([]);
/** Multi-day run highlighted together on hover (`job:…` or `draft:…`). */
const hoveredCalendarRunKey = ref<string | null>(null);
const highlightedJobIds = ref<string[]>([]);
let highlightClearTimer: ReturnType<typeof setTimeout> | undefined;
const snack = ref(false);
const snackText = ref("");

const progressPct = computed(() => {
  const t = comfortTarget.value || 1;
  return Math.min(100, Math.round((uniqueDaysInSelectedYear.value / t) * 100));
});

const progressNote = computed(() => {
  const u = uniqueDaysInSelectedYear.value;
  const t = comfortTarget.value;
  const diff = t - u;
  if (diff <= 0) return "At or above comfort target for this year.";
  return `${diff} more distinct work day(s) to reach comfort.`;
});

const entriesSorted = computed(() =>
  [...entries.value].sort((a, b) => {
    const am = minDate(a.dates);
    const bm = minDate(b.dates);
    return (am ?? "").localeCompare(bm ?? "");
  }),
);

function minDate(dates: string[]): string | null {
  if (!dates.length) return null;
  return [...dates].sort()[0] ?? null;
}

function onComfortInput(v: string | number | null) {
  const n = typeof v === "string" ? Number.parseInt(v, 10) : Number(v);
  if (Number.isFinite(n) && n > 0) setComfortTarget(n);
}

function summarizeDates(dates: string[]): string {
  const sorted = [...dates].sort();
  if (sorted.length <= 3) return sorted.join(", ");
  return `${sorted.slice(0, 3).join(", ")} +${sorted.length - 3} more`;
}

function submitEntry() {
  const dates = [...draftDates.value].sort();
  if (!formProject.value.trim() || dates.length === 0) {
    snackText.value = "Add a project name and at least one date.";
    snack.value = true;
    return;
  }
  addEntry(formProject.value, dates);
  formProject.value = "";
  draftDates.value = [];
  snackText.value = "Saved.";
  snack.value = true;
}

function clearDraft() {
  draftDates.value = [];
  formProject.value = "";
}

type Cell =
  | { kind: "pad" }
  | { kind: "day"; date: string; dayNum: number };

function padForMonth(y: number, monthIndex: number): number {
  const first = new Date(y, monthIndex, 1);
  return (first.getDay() + 6) % 7;
}

function cellsForMonth(y: number, monthIndex: number): Cell[] {
  const lastDay = new Date(y, monthIndex + 1, 0).getDate();
  const pad = padForMonth(y, monthIndex);
  const cells: Cell[] = [];
  for (let i = 0; i < pad; i++) cells.push({ kind: "pad" });
  for (let d = 1; d <= lastDay; d++) {
    const mm = String(monthIndex + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const date = `${y}-${mm}-${dd}`;
    cells.push({ kind: "day", date, dayNum: d });
  }
  return cells;
}

const weekdayLetters = ["M", "T", "W", "T", "F", "S", "S"];

function gridIndexFromIso(iso: string, pad: number): number {
  const dd = Number(iso.slice(8, 10));
  return pad + dd - 1;
}

function isoDatesInMonthForEntry(
  entry: { dates: string[] },
  y: number,
  monthIndex: number,
): string[] {
  const prefix = `${y}-${String(monthIndex + 1).padStart(2, "0")}-`;
  return entry.dates.filter((d) => d.startsWith(prefix)).sort();
}

function indicesFromIsoDates(isos: string[], pad: number): number[] {
  return isos.map((iso) => gridIndexFromIso(iso, pad));
}

/** Sorted unique indices split into maximal consecutive chains (calendar days, across week rows). */
function splitIntoConsecutiveRuns(indices: number[]): number[][] {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  if (!sorted.length) return [];
  const runs: number[][] = [];
  let cur = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (curr === prev + 1) cur.push(curr);
    else {
      runs.push(cur);
      cur = [curr];
    }
  }
  runs.push(cur);
  return runs;
}

/** One contiguous index chain split into same-calendar-row segments (for grid placement). */
function splitRunIntoRowSegments(run: number[]): number[][] {
  if (!run.length) return [];
  const segs: number[][] = [];
  let cur = [run[0]!];
  for (let i = 1; i < run.length; i++) {
    const prev = run[i - 1]!;
    const curr = run[i]!;
    const sameRow = Math.floor(curr / 7) === Math.floor(prev / 7);
    if (sameRow) cur.push(curr);
    else {
      segs.push(cur);
      cur = [curr];
    }
  }
  segs.push(cur);
  return segs;
}

/** Include single-cell segments when they bridge rows (Sun→Mon) so span layers stay visible. */
function segmentShouldRender(seg: number[], run: number[]): boolean {
  if (seg.length > 1) return true;
  if (run.length <= 1) return false;
  const only = seg[0];
  if (only === undefined) return false;
  return run.includes(only - 1) || run.includes(only + 1);
}

function styleForCalendarSegment(
  segment: number[],
  opts: { draft: boolean },
): Record<string, string> {
  const i0 = segment[0]!;
  const i1 = segment[segment.length - 1]!;
  const row = Math.floor(i0 / 7);
  const colStart = i0 % 7;
  const span = i1 - i0 + 1;
  const base: Record<string, string> = {
    gridColumn: `${colStart + 1} / span ${span}`,
    gridRow: `${row + 1}`,
  };
  if (opts.draft) {
    return {
      ...base,
      background: "rgba(251, 191, 36, 0.32)",
      border: "1px solid rgba(217, 119, 6, 0.55)",
    };
  }
  return {
    ...base,
    background: "var(--plan-job-span-bg)",
    border: "1px solid var(--plan-job-span-border)",
  };
}

type CalendarSpanBlock = {
  key: string;
  style: Record<string, string>;
};

function monthJobBlocks(y: number, monthIndex: number): CalendarSpanBlock[] {
  const pad = padForMonth(y, monthIndex);
  const out: CalendarSpanBlock[] = [];
  for (const entry of entries.value) {
    if (entry.dates.length <= 1) continue;
    const inMonth = isoDatesInMonthForEntry(entry, y, monthIndex);
    if (inMonth.length <= 1) continue;
    const indices = indicesFromIsoDates(inMonth, pad);
    const runs = splitIntoConsecutiveRuns(indices);
    for (const run of runs) {
      if (run.length <= 1) continue;
      const segments = splitRunIntoRowSegments(run);
      const toRender = segments
        .map((seg, origIdx) => ({ seg, origIdx }))
        .filter(({ seg }) => segmentShouldRender(seg, run));
      toRender.forEach(({ seg, origIdx }) => {
        out.push({
          key: `${entry.id}-m${monthIndex}-${run[0]}-${run[run.length - 1]}-s${origIdx}`,
          style: styleForCalendarSegment(seg, { draft: false }),
        });
      });
    }
  }
  return out;
}

function monthDraftBlocks(y: number, monthIndex: number): CalendarSpanBlock[] {
  if (draftDates.value.length <= 1) return [];
  const pad = padForMonth(y, monthIndex);
  const prefix = `${y}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const inMonth = draftDates.value.filter((d) => d.startsWith(prefix)).sort();
  if (inMonth.length <= 1) return [];
  const indices = indicesFromIsoDates(inMonth, pad);
  const runs = splitIntoConsecutiveRuns(indices);
  const out: CalendarSpanBlock[] = [];
  let blockIdx = 0;
  for (const run of runs) {
    if (run.length <= 1) continue;
    const segments = splitRunIntoRowSegments(run);
    const toRender = segments
      .map((seg, origIdx) => ({ seg, origIdx }))
      .filter(({ seg }) => segmentShouldRender(seg, run));
    toRender.forEach(({ seg, origIdx }) => {
      out.push({
        key: `draft-${monthIndex}-${blockIdx}-s${origIdx}`,
        style: styleForCalendarSegment(seg, { draft: true }),
      });
      blockIdx++;
    });
  }
  return out;
}

function cellUsesJobBlock(iso: string, y: number, monthIndex: number): boolean {
  const pad = padForMonth(y, monthIndex);
  const idx = gridIndexFromIso(iso, pad);
  for (const entry of entries.value) {
    if (entry.dates.length <= 1) continue;
    const inMonth = isoDatesInMonthForEntry(entry, y, monthIndex);
    if (inMonth.length <= 1) continue;
    const indices = indicesFromIsoDates(inMonth, pad);
    const runs = splitIntoConsecutiveRuns(indices);
    for (const run of runs) {
      if (run.length > 1 && run.includes(idx)) return true;
    }
  }
  return false;
}

function cellUsesDraftBlock(iso: string, y: number, monthIndex: number): boolean {
  if (draftDates.value.length <= 1) return false;
  const pad = padForMonth(y, monthIndex);
  const idx = gridIndexFromIso(iso, pad);
  const prefix = `${y}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const inMonth = draftDates.value.filter((d) => d.startsWith(prefix)).sort();
  if (inMonth.length <= 1) return false;
  const indices = indicesFromIsoDates(inMonth, pad);
  const runs = splitIntoConsecutiveRuns(indices);
  return runs.some((run) => run.length > 1 && run.includes(idx));
}

/** Stable key for the contiguous calendar run containing `iso` in this mini-month (multi-day only). */
function calendarRunHoverKey(
  iso: string,
  y: number,
  monthIndex: number,
): string | null {
  if (draftDates.value.includes(iso) && draftDates.value.length > 1) {
    const pad = padForMonth(y, monthIndex);
    const idx = gridIndexFromIso(iso, pad);
    const prefix = `${y}-${String(monthIndex + 1).padStart(2, "0")}-`;
    const inMonth = draftDates.value.filter((d) => d.startsWith(prefix)).sort();
    if (inMonth.length <= 1) return null;
    const indices = indicesFromIsoDates(inMonth, pad);
    const runs = splitIntoConsecutiveRuns(indices);
    for (const run of runs) {
      if (run.length <= 1 || !run.includes(idx)) continue;
      return `draft:${y}:${monthIndex}:${run[0]}-${run[run.length - 1]}`;
    }
    return null;
  }

  const pad = padForMonth(y, monthIndex);
  const idx = gridIndexFromIso(iso, pad);
  for (const entry of entries.value) {
    if (entry.dates.length <= 1) continue;
    const inMonth = isoDatesInMonthForEntry(entry, y, monthIndex);
    if (inMonth.length <= 1) continue;
    const indices = indicesFromIsoDates(inMonth, pad);
    const runs = splitIntoConsecutiveRuns(indices);
    for (const run of runs) {
      if (run.length <= 1 || !run.includes(idx)) continue;
      return `job:${entry.id}:${y}:${monthIndex}:${run[0]}-${run[run.length - 1]}`;
    }
  }
  return null;
}

function onMiniMonthDayEnter(cell: Cell, y: number, monthIndex: number) {
  if (cell.kind !== "day") return;
  hoveredCalendarRunKey.value = calendarRunHoverKey(cell.date, y, monthIndex);
}

function onMiniMonthCalendarLeave() {
  hoveredCalendarRunKey.value = null;
}

function dayCellGridStyle(idx: number): Record<string, string> {
  const row = Math.floor(idx / 7) + 1;
  const col = idx % 7;
  return {
    gridColumn: String(col + 1),
    gridRow: String(row),
  };
}

function dayCellClasses(cell: Cell, y: number, monthIndex: number): string[] {
  if (cell.kind === "pad") return ["day-cell", "day-cell--pad"];
  const iso = cell.date;
  const draft = draftDates.value.includes(iso);
  const runKey = calendarRunHoverKey(iso, y, monthIndex);
  const runHoverActive =
    hoveredCalendarRunKey.value !== null &&
    runKey !== null &&
    hoveredCalendarRunKey.value === runKey;

  if (draft) {
    const cls = ["day-cell", "day-cell--draft"];
    if (cellUsesDraftBlock(iso, y, monthIndex)) {
      cls.push("day-cell--draft-on-block");
      if (runHoverActive) cls.push("day-cell--calendar-run-hover");
    }
    return cls;
  }
  const cls = ["day-cell"];
  if (!datesByDay.value.has(iso)) return cls;
  if (cellUsesJobBlock(iso, y, monthIndex)) {
    cls.push("day-cell--work", "day-cell--work-on-block");
    if (runHoverActive) cls.push("day-cell--calendar-run-hover");
  } else cls.push("day-cell--work");
  return cls;
}

function monthTitle(y: number, m: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(
    new Date(y, m, 1),
  );
}

function formatDayLabel(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return iso;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(y, mo - 1, d));
}

function onDayClick(date: string) {
  const jobsOnDay = datesByDay.value.get(date);
  if (jobsOnDay?.length) {
    const ids = [...new Set(jobsOnDay.map((j) => j.id))];
    highlightedJobIds.value = ids;
    if (highlightClearTimer) clearTimeout(highlightClearTimer);
    highlightClearTimer = setTimeout(() => {
      highlightedJobIds.value = [];
      highlightClearTimer = undefined;
    }, 3200);

    nextTick(() => {
      document.getElementById(`job-row-${ids[0]}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });

    const names = [...new Set(jobsOnDay.map((j) => j.project))];
    snackText.value =
      names.length === 1
        ? `${formatDayLabel(date)} · ${names[0]}`
        : `${formatDayLabel(date)} · ${names.join(", ")}`;
    snack.value = true;
    return;
  }

  if (!draftDates.value.includes(date)) {
    draftDates.value = [...draftDates.value, date].sort();
    return;
  }
  draftDates.value = draftDates.value.filter((x) => x !== date);
}

onScopeDispose(() => {
  if (highlightClearTimer) clearTimeout(highlightClearTimer);
});
</script>

<style scoped>
/* Light palette (default). Dark uses .planning-page--dark (synced with html.theme-dark). */
.planning-page,
.draft-bubble-theme {
  --plan-bg: #f1f5f9;
  --plan-text: #0f172a;
  --plan-muted: #475569;
  --plan-hint: #64748b;
  --plan-border: #e2e8f0;
  --plan-surface: #ffffff;
  --plan-mini-bg: #f8fafc;
  --plan-accent: #2563eb;
  --plan-accent-soft: #dbeafe;
  --plan-work: #1d4ed8;
  --plan-work-border: #93c5fd;
  --plan-job-span-bg: rgba(219, 234, 254, 0.88);
  --plan-job-span-border: rgba(59, 130, 246, 0.42);
  --plan-day-hover-bg: #eef2ff;
  --plan-day-hover-border: #c7d2fe;
  --plan-work-hover-bg: #dbeafe;
  --plan-work-hover-border: #60a5fa;
  --plan-work-hover-ring: rgba(37, 99, 235, 0.38);
  --plan-work-on-block-hover-bg: rgba(255, 255, 255, 0.58);
  --plan-work-on-block-hover-border: rgba(37, 99, 235, 0.62);
  --plan-job-flash-bg: rgba(37, 99, 235, 0.14);
  --plan-job-flash-border: rgba(37, 99, 235, 0.4);
  --plan-draft-bg: rgba(245, 158, 11, 0.2);
  --plan-draft-border: rgba(217, 119, 6, 0.65);
  --plan-draft-text: #b45309;
  --plan-draft-hover-bg: rgba(251, 191, 36, 0.28);
  --plan-draft-hover-border: rgba(217, 119, 6, 0.85);
  --plan-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.planning-page {
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--plan-text);
  background: var(--plan-bg);
  color-scheme: light;
  -webkit-font-smoothing: antialiased;
  font-size: 1rem;
  line-height: 1.55;
}

html.theme-dark .planning-page,
html.theme-dark .draft-bubble-theme {
  --plan-bg: #0b1220;
  --plan-text: #f1f5f9;
  --plan-muted: #94a3b8;
  --plan-hint: #64748b;
  --plan-border: #334155;
  --plan-surface: #151f33;
  --plan-mini-bg: #111c2e;
  --plan-accent: #60a5fa;
  --plan-accent-soft: rgba(59, 130, 246, 0.22);
  --plan-work: #bfdbfe;
  --plan-work-border: #2563eb;
  --plan-job-span-bg: rgba(59, 130, 246, 0.28);
  --plan-job-span-border: rgba(96, 165, 250, 0.48);
  --plan-day-hover-bg: rgba(148, 163, 184, 0.14);
  --plan-day-hover-border: #475569;
  --plan-work-hover-bg: rgba(59, 130, 246, 0.26);
  --plan-work-hover-border: rgba(147, 197, 253, 0.72);
  --plan-work-hover-ring: rgba(147, 197, 253, 0.48);
  --plan-work-on-block-hover-bg: rgba(30, 58, 138, 0.52);
  --plan-work-on-block-hover-border: rgba(147, 197, 253, 0.72);
  --plan-job-flash-bg: rgba(96, 165, 250, 0.16);
  --plan-job-flash-border: rgba(96, 165, 250, 0.45);
  --plan-draft-bg: rgba(251, 191, 36, 0.16);
  --plan-draft-border: rgba(251, 191, 36, 0.45);
  --plan-draft-text: #fde68a;
  --plan-draft-hover-bg: rgba(251, 191, 36, 0.26);
  --plan-draft-hover-border: rgba(253, 224, 71, 0.55);
  --plan-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);

  color-scheme: dark;
}

.planning-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: clamp(12px, 4vw, 18px) clamp(14px, 5vw, 20px) 0;
  max-width: 1200px;
  margin-inline: auto;
}

.planning-nav__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
  color: var(--plan-accent);
  text-decoration: none;
  font-size: 0.9375rem;
  font-weight: 600;
}

.planning-nav__link:hover,
.planning-nav__link:focus-visible {
  text-decoration: underline;
}

.planning-wrap {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: clamp(14px, 5vw, 28px);
  padding-block: clamp(18px, 5vw, 40px);
}

.planning-wrap--loading {
  padding-block: clamp(48px, 15vw, 96px);
}

.loading-text {
  margin: 0;
  font-size: 1.0625rem;
  color: var(--plan-muted);
  text-align: center;
}

.planning-head {
  margin-bottom: clamp(20px, 5vw, 32px);
}

.planning-eyebrow {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--plan-hint);
  margin: 0 0 0.4rem;
}

.planning-title {
  font-size: clamp(1.65rem, 6vw, 2.15rem);
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin: 0 0 0.5rem;
  color: var(--plan-text);
}

.planning-sub {
  margin: 0;
  max-width: 52ch;
  font-size: clamp(0.9375rem, 3.5vw, 1.0625rem);
  color: var(--plan-muted);
}

.controls-row {
  margin-bottom: clamp(18px, 4vw, 28px) !important;
}

.help-text,
.stat-hint,
.empty-text {
  font-size: 0.875rem;
  color: var(--plan-muted);
}

.stat-sheet {
  height: 100%;
  background: var(--plan-surface) !important;
  border: 1px solid var(--plan-border) !important;
  box-shadow: var(--plan-shadow);
}

.stat-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.stat-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--plan-muted);
}

.stat-num {
  font-size: clamp(1.2rem, 4vw, 1.45rem);
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  color: var(--plan-text);
}

.surface-card {
  background: var(--plan-surface) !important;
  border: 1px solid var(--plan-border) !important;
  box-shadow: var(--plan-shadow);
}

.card-title {
  font-size: 1.125rem !important;
  font-weight: 700 !important;
  color: var(--plan-text) !important;
  letter-spacing: -0.01em;
}

.card-title {
  min-height: 48px !important;
  font-weight: 650 !important;
}

.touch-icon {
  color: var(--plan-muted) !important;
}

.entry-list {
  padding: 0 !important;
}

.entry-item {
  border: 1px solid transparent;
}

.entry-item--highlight {
  background: var(--plan-job-flash-bg) !important;
  border-color: var(--plan-job-flash-border) !important;
  transition:
    background 0.22s ease,
    border-color 0.22s ease;
}

.entry-item + .entry-item {
  margin-top: 8px;
}

.entry-title {
  font-size: 1rem !important;
  font-weight: 650 !important;
  color: var(--plan-text) !important;
  line-height: 1.35 !important;
}

.entry-sub {
  margin-top: 4px !important;
  font-size: 0.875rem !important;
  color: var(--plan-muted) !important;
  opacity: 1 !important;
  white-space: normal !important;
}

.year-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(10px, 3vw, 14px);
}

@media (min-width: 420px) {
  .year-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 720px) {
  .year-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .year-grid {
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  }
}

.mini-month {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  column-gap: 4px;
  row-gap: 6px;
  align-items: start;
  padding: 10px 8px 12px;
  border-radius: 14px;
  background: var(--plan-mini-bg);
  border: 1px solid var(--plan-border);
}

.mini-month__title {
  grid-column: 1 / -1;
  font-size: 0.8125rem;
  font-weight: 750;
  margin: 0;
  text-align: center;
  color: var(--plan-text);
}

.weekday-row {
  display: contents;
}

.weekday-row span {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--plan-hint);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
}

.mini-month__calendar {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  align-items: stretch;
}

.mini-month__job-block {
  z-index: 0;
  min-height: 0;
  pointer-events: none;
  align-self: stretch;
  border-radius: 10px;
}

.mini-month__draft-block {
  z-index: 1;
  min-height: 0;
  pointer-events: none;
  align-self: stretch;
  border-radius: 10px;
}

.day-cell {
  box-sizing: border-box;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  aspect-ratio: 1;
  margin: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0;
  cursor: default;
  background: var(--plan-surface);
  color: var(--plan-text);
  line-height: 1;
  appearance: none;
  -webkit-appearance: none;
}

@media (hover: hover) and (pointer: fine) {
  .day-cell:not(:disabled):not(.day-cell--draft):not(.day-cell--work):hover {
    background: var(--plan-day-hover-bg);
    border-color: var(--plan-day-hover-border);
  }

  .day-cell--work:not(.day-cell--work-on-block):not(:disabled):hover {
    background: var(--plan-work-hover-bg);
    border-color: var(--plan-work-hover-border);
    box-shadow: 0 0 0 2px var(--plan-work-hover-ring);
  }

  .day-cell--work-on-block:not(:disabled):hover {
    background: var(--plan-work-on-block-hover-bg) !important;
    border-color: var(--plan-work-on-block-hover-border) !important;
    box-shadow: 0 0 0 2px var(--plan-work-hover-ring);
  }
}

.day-cell--pad {
  visibility: hidden;
  pointer-events: none;
}

.day-cell--work {
  background: var(--plan-accent-soft);
  color: var(--plan-work);
  border-color: var(--plan-work-border);
  font-weight: 800;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.day-cell--work-on-block {
  background: transparent !important;
  border-color: transparent !important;
  color: var(--plan-work);
  font-weight: 800;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.day-cell--work:focus-visible {
  outline: 2px solid var(--plan-accent);
  outline-offset: 2px;
}

.day-cell--draft {
  background: var(--plan-draft-bg);
  color: var(--plan-draft-text);
  border-color: var(--plan-draft-border);
  font-weight: 800;
  cursor: pointer;
}

.day-cell--draft-on-block {
  background: transparent !important;
  border-color: transparent !important;
  color: var(--plan-draft-text);
  font-weight: 800;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .day-cell--draft:not(:disabled):not(.day-cell--draft-on-block):hover {
    background: var(--plan-draft-hover-bg);
    border-color: var(--plan-draft-hover-border);
  }

  .day-cell--draft-on-block:not(:disabled):hover {
    background: var(--plan-draft-hover-bg) !important;
    border-color: transparent !important;
  }
}

.day-cell--calendar-run-hover.day-cell--work-on-block:not(:disabled) {
  background: var(--plan-work-on-block-hover-bg) !important;
  border-color: var(--plan-work-on-block-hover-border) !important;
  box-shadow: 0 0 0 2px var(--plan-work-hover-ring);
}

.day-cell--calendar-run-hover.day-cell--draft-on-block:not(:disabled) {
  background: var(--plan-draft-hover-bg) !important;
  border-color: var(--plan-draft-hover-border) !important;
  box-shadow: 0 0 0 2px var(--plan-draft-hover-border);
}

.day-cell:not(.day-cell--pad):not(:disabled) {
  cursor: pointer;
}

/* Vuetify field readability on light cards */
.plan-field :deep(.v-field__outline) {
  --v-field-border-opacity: 1;
}

.plan-field :deep(.v-label) {
  color: var(--plan-muted) !important;
  opacity: 1 !important;
}

.plan-field :deep(input),
.plan-field :deep(textarea),
.plan-field :deep(.v-select__selection-text) {
  color: var(--plan-text) !important;
  font-size: 1rem !important;
}

.planning-page :deep(.plan-field .v-input__details) {
  padding-inline: 2px;
}

.plan-field :deep(.v-messages__message) {
  color: var(--plan-hint) !important;
  opacity: 1 !important;
}

.plan-snackbar :deep(.v-snackbar__wrapper) {
  color: var(--plan-text);
}

.plan-snackbar :deep(.v-snackbar__content) {
  font-weight: 550;
}

/* Floating draft composer (teleported to body) */
.draft-bubble-anchor {
  position: fixed;
  z-index: 10050;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  left: max(12px, env(safe-area-inset-left));
  pointer-events: none;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}

.draft-bubble {
  pointer-events: auto;
  width: min(100%, 380px);
  max-height: min(70vh, 420px);
  overflow-y: auto;
  color: var(--plan-text);
  color-scheme: light;
  background-color: var(--plan-surface);
  border: 1px solid var(--plan-border);
  box-shadow:
    var(--plan-shadow),
    0 14px 44px rgba(15, 23, 42, 0.15);
}

html.theme-dark .draft-bubble-theme .draft-bubble {
  color-scheme: dark;
  box-shadow:
    var(--plan-shadow),
    0 18px 52px rgba(0, 0, 0, 0.55);
}

.draft-bubble__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.draft-bubble__titles {
  min-width: 0;
}

.draft-bubble__title {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--plan-text);
  letter-spacing: -0.02em;
}

.draft-bubble__meta {
  display: block;
  margin-top: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--plan-muted);
}

.draft-bubble__close {
  flex-shrink: 0;
  margin: -6px -8px 0 0;
}

.draft-bubble__save {
  width: 100%;
}

.draft-bubble-enter-active,
.draft-bubble-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.draft-bubble-enter-from,
.draft-bubble-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.97);
}

@media (max-width: 520px) {
  .draft-bubble-anchor {
    justify-content: stretch;
  }

  .draft-bubble {
    width: 100%;
  }
}
</style>
