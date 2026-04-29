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
            <v-card class="surface-card pa-4 mb-4 mb-lg-6" rounded="xl" variant="flat">
              <v-card-title class="card-title px-0 pt-0 pb-3">
                Add job days
              </v-card-title>
              <v-text-field
                v-model="formProject"
                class="plan-field mb-3"
                density="comfortable"
                hide-details="auto"
                label="Project name"
                variant="outlined"
              />
              <p class="help-text mb-4">
                Tap dates on the calendar to add or remove them from this entry (same year as selected above).
              </p>
              <v-btn
                block
                class="touch-btn"
                color="primary"
                rounded="xl"
                size="large"
                variant="flat"
                @click="submitEntry"
              >
                Save entry
              </v-btn>
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
                  <div class="day-grid">
                    <button
                      v-for="(cell, idx) in cellsForMonth(year, m - 1)"
                      :key="idx"
                      class="day-cell"
                      :class="{
                        'day-cell--pad': cell.kind === 'pad',
                        'day-cell--work': cell.kind === 'day' && cell.date && datesByDay.has(cell.date),
                        'day-cell--draft':
                          cell.kind === 'day' && cell.date && draftDates.includes(cell.date),
                      }"
                      :disabled="cell.kind !== 'day'"
                      type="button"
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

type Cell =
  | { kind: "pad" }
  | { kind: "day"; date: string; dayNum: number };

function cellsForMonth(y: number, monthIndex: number): Cell[] {
  const first = new Date(y, monthIndex, 1);
  const lastDay = new Date(y, monthIndex + 1, 0).getDate();
  const pad = first.getDay();
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

const weekdayLetters = ["S", "M", "T", "W", "T", "F", "S"];

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
.planning-page {
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
  --plan-day-hover-bg: #eef2ff;
  --plan-day-hover-border: #c7d2fe;
  --plan-job-flash-bg: rgba(37, 99, 235, 0.14);
  --plan-job-flash-border: rgba(37, 99, 235, 0.4);
  --plan-draft-bg: rgba(245, 158, 11, 0.2);
  --plan-draft-border: rgba(217, 119, 6, 0.65);
  --plan-draft-text: #b45309;
  --plan-draft-hover-bg: rgba(251, 191, 36, 0.28);
  --plan-draft-hover-border: rgba(217, 119, 6, 0.85);
  --plan-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);

  min-height: 100vh;
  min-height: 100dvh;
  color: var(--plan-text);
  background: var(--plan-bg);
  color-scheme: light;
  -webkit-font-smoothing: antialiased;
  font-size: 1rem;
  line-height: 1.55;
}

html.theme-dark .planning-page {
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
  --plan-day-hover-bg: rgba(148, 163, 184, 0.14);
  --plan-day-hover-border: #475569;
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

.day-grid {
  display: contents;
}

.day-cell {
  box-sizing: border-box;
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
  .day-cell:not(:disabled):not(.day-cell--draft):hover {
    background: var(--plan-day-hover-bg);
    border-color: var(--plan-day-hover-border);
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
}

.day-cell--draft {
  background: var(--plan-draft-bg);
  color: var(--plan-draft-text);
  border-color: var(--plan-draft-border);
  font-weight: 800;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .day-cell--draft:not(:disabled):hover {
    background: var(--plan-draft-hover-bg);
    border-color: var(--plan-draft-hover-border);
  }
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
</style>
