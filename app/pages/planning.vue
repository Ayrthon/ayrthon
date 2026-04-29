<template>
  <div class="planning-page">
    <nav class="planning-nav">
      <NuxtLink class="planning-nav__link" to="/">
        ← Home
      </NuxtLink>
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
          <v-col cols="12" sm="6" lg="4">
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
          <v-col cols="12" sm="6" lg="4">
            <v-text-field
              :model-value="comfortTarget"
              class="plan-field"
              density="comfortable"
              hide-details
              label="Comfort target (days / year)"
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
              <p class="help-text mb-3">
                Add one or more dates (picker + Add date, or paste lines below).
              </p>
              <div class="date-add-row mb-3">
                <input
                  v-model="pendingDateInput"
                  class="native-date"
                  type="date"
                >
                <v-btn
                  class="touch-btn"
                  color="primary"
                  rounded="xl"
                  size="large"
                  variant="flat"
                  @click="addPendingDate"
                >
                  Add date
                </v-btn>
              </div>
              <div v-if="draftDates.length" class="date-chips mb-4">
                <v-chip
                  v-for="d in draftDates"
                  :key="d"
                  class="ma-1"
                  closable
                  color="primary"
                  variant="tonal"
                  @click:close="removeDraftDate(d)"
                >
                  {{ d }}
                </v-chip>
              </div>
              <v-textarea
                v-model="bulkDatesText"
                auto-grow
                class="plan-field mb-4"
                density="comfortable"
                hint="Optional: one YYYY-MM-DD per line (blur merges into list)"
                label="Paste dates"
                persistent-hint
                rows="3"
                variant="outlined"
                @blur="mergeBulkDates"
              />
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
                Entries ({{ entries.length }})
              </v-card-title>
              <v-list v-if="entriesSorted.length" bg-color="transparent" class="entry-list" density="comfortable">
                <v-list-item
                  v-for="e in entriesSorted"
                  :key="e.id"
                  class="entry-item px-2 py-2 rounded-lg"
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
                No entries yet.
              </p>
            </v-card>
          </v-col>

          <v-col cols="12" lg="7">
            <v-card class="surface-card pa-4 mb-4 mb-lg-6" rounded="xl" variant="flat">
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
                    <span v-for="w in weekdayLetters" :key="w">{{ w }}</span>
                  </div>
                  <div class="day-grid">
                    <button
                      v-for="(cell, idx) in cellsForMonth(year, m - 1)"
                      :key="idx"
                      class="day-cell"
                      :class="{
                        'day-cell--pad': cell.kind === 'pad',
                        'day-cell--work': cell.kind === 'day' && cell.date && datesByDay.has(cell.date),
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

            <v-card class="surface-card pa-4" rounded="xl" variant="flat">
              <v-card-title class="card-title px-0 pt-0 pb-3">
                Planned jobs by month · {{ year }}
              </v-card-title>
              <v-expansion-panels
                v-if="monthsWithRows.length"
                class="month-panels"
                variant="accordion"
              >
                <v-expansion-panel
                  v-for="block in monthsWithRows"
                  :key="block.monthIndex"
                >
                  <v-expansion-panel-title class="panel-title">
                    <span>{{ block.label }}</span>
                    <span class="panel-meta">
                      ({{ block.rows.length }})
                    </span>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text class="panel-body">
                    <div class="table-scroll">
                      <v-table class="month-table" density="comfortable" hover>
                        <thead>
                          <tr>
                            <th scope="col">
                              Project
                            </th>
                            <th scope="col">
                              Dates
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in block.rows" :key="row.project">
                            <td>{{ row.project }}</td>
                            <td>
                              <span
                                v-for="d in row.dates"
                                :key="d"
                                class="date-pill"
                              >
                                {{ formatShortDate(d) }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
              <p v-else class="empty-text mb-0">
                Nothing scheduled in {{ year }} yet — add dates above.
              </p>
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
  monthlyPlan,
  addEntry,
  removeEntry,
  setComfortTarget,
  toIsoDateString,
} = useJobYearPlanner();

const currentYear = new Date().getFullYear();
const yearItems = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const yearModel = computed({
  get: () => year.value,
  set: (v: number) => {
    year.value = v;
  },
});

function isoToday(): string {
  return toIsoDateString(new Date());
}

const formProject = ref("");
const draftDates = ref<string[]>([]);
const pendingDateInput = ref(isoToday());
const bulkDatesText = ref("");
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
    return (bm ?? "").localeCompare(am ?? "");
  }),
);

const monthsWithRows = computed(() =>
  monthlyPlan.value.filter((m) => m.rows.length > 0),
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

function addPendingDate() {
  const s = pendingDateInput.value?.trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return;
  if (!draftDates.value.includes(s))
    draftDates.value = [...draftDates.value, s].sort();
}

function removeDraftDate(d: string) {
  draftDates.value = draftDates.value.filter((x) => x !== d);
}

function mergeBulkLines(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(line)) out.push(line);
  }
  return [...new Set(out)].sort();
}

function mergeBulkDates() {
  const extra = mergeBulkLines(bulkDatesText.value);
  if (!extra.length) return;
  draftDates.value = [...new Set([...draftDates.value, ...extra])].sort();
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
  bulkDatesText.value = "";
  pendingDateInput.value = isoToday();
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

function formatShortDate(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(y, mo - 1, d));
}

function onDayClick(date: string) {
  if (!draftDates.value.includes(date))
    draftDates.value = [...draftDates.value, date].sort();
  pendingDateInput.value = date;
  snackText.value = `${date} added to this entry — add a project name and save.`;
  snack.value = true;
}
</script>

<style scoped>
/* Mobile-first, high-contrast light UI (readable on phones; cards lift off soft gray bg) */
.planning-page {
  --plan-bg: #f1f5f9;
  --plan-text: #0f172a;
  --plan-muted: #475569;
  --plan-hint: #64748b;
  --plan-border: #e2e8f0;
  --plan-surface: #ffffff;
  --plan-accent: #2563eb;
  --plan-accent-soft: #dbeafe;
  --plan-work: #1d4ed8;

  min-height: 100vh;
  min-height: 100dvh;
  color: var(--plan-text);
  background: var(--plan-bg);
  color-scheme: light;
  -webkit-font-smoothing: antialiased;
  font-size: 1rem;
  line-height: 1.55;
}

.planning-nav {
  padding: clamp(12px, 4vw, 18px) clamp(12px, 4vw, 20px) 0;
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
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
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
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.card-title {
  font-size: 1.125rem !important;
  font-weight: 700 !important;
  color: var(--plan-text) !important;
  letter-spacing: -0.01em;
}

.date-add-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (min-width: 380px) {
  .date-add-row {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: stretch;
  }

  .native-date {
    flex: 1;
    min-width: min(100%, 200px);
  }

  .date-add-row .touch-btn {
    flex-shrink: 0;
    align-self: stretch;
  }
}

.native-date {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--plan-border);
  background: var(--plan-surface);
  color: var(--plan-text);
  font: inherit;
  font-size: 1rem;
}

.native-date:focus-visible {
  outline: 2px solid var(--plan-accent);
  outline-offset: 2px;
}

.touch-btn {
  min-height: 48px !important;
  font-weight: 650 !important;
}

.touch-icon {
  color: var(--plan-muted) !important;
}

.date-chips {
  line-height: 2;
}

.entry-list {
  padding: 0 !important;
}

.entry-item {
  border: 1px solid transparent;
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
  padding: 10px 8px 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid var(--plan-border);
}

.mini-month__title {
  font-size: 0.8125rem;
  font-weight: 750;
  margin-bottom: 8px;
  text-align: center;
  color: var(--plan-text);
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--plan-hint);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  aspect-ratio: 1;
  border: none;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0;
  cursor: default;
  background: var(--plan-surface);
  color: var(--plan-text);
  border: 1px solid transparent;
  line-height: 1;
}

@media (hover: hover) and (pointer: fine) {
  .day-cell:not(:disabled):hover {
    background: #eef2ff;
    border-color: #c7d2fe;
  }
}

.day-cell--pad {
  visibility: hidden;
  pointer-events: none;
}

.day-cell--work {
  background: var(--plan-accent-soft);
  color: var(--plan-work);
  border-color: #93c5fd;
  font-weight: 800;
  cursor: pointer;
}

.day-cell:not(.day-cell--pad):not(:disabled) {
  cursor: pointer;
}

@media (hover: none) {
  .day-cell:not(.day-cell--pad) {
    min-height: 40px;
  }
}

.month-panels {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.panel-title {
  font-weight: 650 !important;
  color: var(--plan-text) !important;
  padding-block: 14px !important;
  min-height: 52px !important;
}

.panel-meta {
  margin-left: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--plan-muted);
}

.panel-body {
  padding-inline: 0 !important;
}

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -4px;
  padding: 0 4px;
}

.month-table {
  min-width: 100%;
  font-size: 0.9375rem;
}

.month-table :deep(th),
.month-table :deep(td) {
  color: var(--plan-text) !important;
  border-color: var(--plan-border) !important;
}

.month-table :deep(th) {
  font-weight: 700 !important;
  font-size: 0.8125rem !important;
}

.date-pill {
  display: inline-block;
  margin: 2px 6px 2px 0;
  padding: 2px 0;
  white-space: nowrap;
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

.planning-page :deep(.v-expansion-panel) {
  border: 1px solid var(--plan-border) !important;
  border-radius: 14px !important;
  overflow: hidden;
  margin-bottom: 10px !important;
  background: var(--plan-surface) !important;
}

.planning-page :deep(.v-expansion-panel-title__overlay) {
  opacity: 0 !important;
}

.plan-snackbar :deep(.v-snackbar__wrapper) {
  color: var(--plan-text);
}

.plan-snackbar :deep(.v-snackbar__content) {
  font-weight: 550;
}
</style>
