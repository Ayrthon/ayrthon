<template>
  <div class="planning-page">
    <nav class="planning-nav">
      <NuxtLink class="planning-nav__link" to="/">
        ← Home
      </NuxtLink>
    </nav>

    <ClientOnly>
      <v-container class="planning-wrap py-8" fluid>
        <header class="planning-head mb-8">
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

        <v-row class="mb-6" dense>
          <v-col cols="12" md="4">
            <v-select
              v-model="yearModel"
              :items="yearItems"
              density="comfortable"
              hide-details
              label="Year"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              :model-value="comfortTarget"
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
          <v-col cols="12" md="4">
            <v-sheet class="stat-sheet pa-4" rounded="lg">
              <div class="stat-line">
                <span class="text-caption text-medium-emphasis">Logged days</span>
                <span class="stat-num">{{ uniqueDaysInSelectedYear }} / {{ comfortTarget }}</span>
              </div>
              <v-progress-linear
                :model-value="progressPct"
                class="mt-3"
                color="primary"
                height="10"
                rounded
              />
              <p class="text-caption text-medium-emphasis mt-2 mb-0">
                {{ progressNote }}
              </p>
            </v-sheet>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" lg="5">
            <v-card class="pa-4 mb-6" rounded="lg" variant="outlined">
              <v-card-title class="text-h6 px-0 pt-0 pb-3">
                Add job days
              </v-card-title>
              <v-text-field
                v-model="formProject"
                class="mb-3"
                density="comfortable"
                hide-details="auto"
                label="Project name"
                variant="outlined"
              />
              <p class="text-caption text-medium-emphasis mb-2">
                Add one or more dates for this project (use “Add date” or paste ISO lines below).
              </p>
              <div class="date-add-row mb-3">
                <input
                  v-model="pendingDateInput"
                  class="native-date"
                  type="date"
                >
                <v-btn color="primary" rounded="lg" variant="tonal" @click="addPendingDate">
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
                class="mb-4"
                density="comfortable"
                hint="Optional: one YYYY-MM-DD per line — Merge into list"
                label="Paste dates"
                persistent-hint
                rows="2"
                variant="outlined"
                @blur="mergeBulkDates"
              />
              <v-btn
                block
                color="primary"
                rounded="lg"
                size="large"
                variant="flat"
                @click="submitEntry"
              >
                Save entry
              </v-btn>
            </v-card>

            <v-card class="pa-4" rounded="lg" variant="outlined">
              <v-card-title class="text-h6 px-0 pt-0 pb-3">
                Entries ({{ entries.length }})
              </v-card-title>
              <v-list v-if="entriesSorted.length" density="compact" lines="two">
                <v-list-item
                  v-for="e in entriesSorted"
                  :key="e.id"
                  class="px-0"
                >
                  <v-list-item-title>{{ e.project }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ summarizeDates(e.dates) }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      aria-label="Remove entry"
                      icon="mdi-delete-outline"
                      size="small"
                      variant="text"
                      @click="removeEntry(e.id)"
                    />
                  </template>
                </v-list-item>
              </v-list>
              <p v-else class="text-body-2 text-medium-emphasis mb-0">
                No entries yet.
              </p>
            </v-card>
          </v-col>

          <v-col cols="12" lg="7">
            <v-card class="pa-4 mb-6" rounded="lg" variant="outlined">
              <v-card-title class="text-h6 px-0 pt-0 pb-4">
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

            <v-card class="pa-4" rounded="lg" variant="outlined">
              <v-card-title class="text-h6 px-0 pt-0 pb-3">
                Planned jobs by month · {{ year }}
              </v-card-title>
              <v-expansion-panels v-if="monthsWithRows.length" variant="accordion">
                <v-expansion-panel
                  v-for="block in monthsWithRows"
                  :key="block.monthIndex"
                >
                  <v-expansion-panel-title>
                    {{ block.label }}
                    <span class="text-caption text-medium-emphasis ml-2">
                      ({{ block.rows.length }})
                    </span>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-table density="compact" hover>
                      <thead>
                        <tr>
                          <th class="text-left">
                            Project
                          </th>
                          <th class="text-left">
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
                              class="mr-1"
                            >
                              {{ formatShortDate(d) }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
              <p v-else class="text-body-2 text-medium-emphasis mb-0">
                Nothing scheduled in {{ year }} yet — add dates above.
              </p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <v-snackbar v-model="snack" location="bottom" rounded="lg" timeout="2200">
        {{ snackText }}
      </v-snackbar>

      <template #fallback>
        <v-container class="py-16">
          <p class="text-body-1">
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
.planning-page {
  min-height: 100vh;
  min-height: 100dvh;
  color: #e7edff;
  background:
    radial-gradient(circle at 15% 20%, rgba(80, 140, 255, 0.35), transparent 50%),
    radial-gradient(circle at 90% 80%, rgba(44, 80, 200, 0.45), transparent 55%),
    #050814;
}

.planning-nav {
  padding: 1rem 1.25rem 0;
}

.planning-nav__link {
  color: rgba(231, 237, 255, 0.85);
  text-decoration: none;
  font-size: 0.95rem;
}

.planning-nav__link:hover {
  text-decoration: underline;
}

.planning-wrap {
  max-width: 1200px;
}

.planning-eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
  opacity: 0.75;
  margin-bottom: 0.35rem;
}

.planning-title {
  font-size: clamp(1.75rem, 4vw, 2.35rem);
  font-weight: 650;
  margin: 0 0 0.35rem;
}

.planning-sub {
  opacity: 0.78;
  max-width: 52ch;
  margin: 0;
}

.date-add-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.native-date {
  flex: 1;
  min-width: 160px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: #e7edff;
  font: inherit;
}

.date-chips {
  line-height: 1.8;
}

.stat-sheet {
  background: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.stat-num {
  font-size: 1.35rem;
  font-weight: 650;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 1rem;
}

.mini-month {
  padding: 0.5rem 0.35rem 0.65rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mini-month__title {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  text-align: center;
  opacity: 0.9;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
  font-size: 0.58rem;
  opacity: 0.55;
  text-align: center;
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.day-cell {
  aspect-ratio: 1;
  border: none;
  border-radius: 8px;
  font-size: 0.65rem;
  padding: 0;
  cursor: default;
  background: transparent;
  color: inherit;
  line-height: 1;
}

.day-cell--pad {
  visibility: hidden;
  pointer-events: none;
}

.day-cell:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.06);
}

.day-cell--work {
  background: rgba(86, 142, 255, 0.45);
  font-weight: 700;
  cursor: pointer;
}

.day-cell:not(.day-cell--pad):not(:disabled) {
  cursor: pointer;
}
</style>
