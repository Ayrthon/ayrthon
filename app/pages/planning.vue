<template>
  <div class="planning-page">
    <nav class="planning-nav">
      <NuxtLink class="planning-nav__link" to="/">
        ← Home
      </NuxtLink>
      <div class="planning-nav__aside">
        <v-btn
          v-if="auth.ready && auth.authenticated"
          class="planning-nav__signout"
          rounded="xl"
          variant="text"
          @click="signOut"
        >
          Sign out
        </v-btn>
        <SiteThemeToggle />
      </div>
    </nav>

    <ClientOnly>
      <template v-if="!auth.ready">
        <v-container class="planning-wrap planning-wrap--loading" fluid>
          <p class="loading-text mb-0">
            Checking access…
          </p>
        </v-container>
      </template>

      <template v-else-if="!auth.authenticated">
        <v-container class="planning-wrap" fluid>
          <header class="planning-head">
            <p class="planning-eyebrow">
              Personal
            </p>
            <h1 class="planning-title">
              Planning
            </h1>
          </header>
          <v-card class="surface-card pa-6" rounded="xl" style="max-width: 440px;" variant="flat">
            <v-card-text class="px-0 pt-0">
              <v-text-field
                v-model="loginPassword"
                aria-label="Password"
                autocomplete="current-password"
                class="plan-field"
                density="comfortable"
                hide-details="auto"
                type="password"
                variant="outlined"
                @keyup.enter="submitPlanningLogin"
              />
              <p v-if="auth.loginError" class="mb-0 mt-2 text-caption text-error">
                {{ auth.loginError }}
              </p>
            </v-card-text>
            <v-card-actions class="px-0 pb-0 pt-2">
              <v-btn color="primary" rounded="xl" size="large" variant="flat" @click="submitPlanningLogin">
                Continue
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-container>
      </template>

      <template v-else>
      <v-container class="planning-wrap" fluid>
        <header class="planning-head">
          <p class="planning-eyebrow">
            Personal
          </p>
          <div class="planning-title-row">
            <h1 class="planning-title">
              Planning
            </h1>
            <v-select
              v-model="yearModel"
              :items="yearItems"
              class="planning-year-field planning-year-select"
              density="compact"
              hide-details
              hide-no-data
              label="Year"
              variant="underlined"
            />
          </div>
          <div class="planning-sub-row">
            <p class="planning-sub mb-0">
              Track work days against your yearly comfort target.
            </p>
            <v-btn
              class="planning-sync-btn"
              density="comfortable"
              rounded="lg"
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-sync"
              :disabled="!hydrated"
              :loading="syncRefreshing"
              @click="onSyncNow"
            >
              Sync now
            </v-btn>
          </div>
        </header>

        <v-row class="controls-row" dense>
          <v-col cols="12">
            <v-sheet class="stat-sheet pa-4" rounded="xl">
              <div class="stat-line">
                <span class="stat-label">Logged days</span>
                <div class="stat-line__right">
                  <div class="stat-line__nums">
                    <span class="stat-num">{{ uniqueDaysInSelectedYear }} / {{ comfortTarget }}</span>
                    <v-btn
                      aria-label="Planning settings"
                      class="stat-settings-btn touch-icon"
                      icon="mdi-cog-outline"
                      variant="text"
                      @click="comfortSettingsOpen = true"
                    />
                  </div>
                  <p v-if="estimatedRevenueFormatted" class="stat-revenue mb-0">
                    Est. revenue {{ estimatedRevenueFormatted }}
                  </p>
                </div>
              </div>
              <v-progress-linear
                :model-value="progressPct"
                :style="{ '--stat-progress-pct': progressPct }"
                class="stat-progress mt-3"
                bg-opacity="0.32"
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
          <v-col cols="12">
            <v-card id="planning-calendar-card" class="surface-card pa-4" rounded="xl" variant="flat">
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
                    :class="{ 'draft-paint-active': draftPaintActive }"
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
                      :data-plan-date="cell.kind === 'day' ? cell.date : undefined"
                      :id="
                        cell.kind === 'day'
                          ? 'plan-cal-' + cell.date
                          : undefined
                      "
                      :aria-current="
                        cell.kind === 'day' && cell.date === todayIso
                          ? 'date'
                          : undefined
                      "
                      :class="dayCellClasses(cell, year, m - 1)"
                      :disabled="cell.kind !== 'day'"
                      :style="dayCellGridStyle(idx)"
                      type="button"
                      @mouseenter="cell.kind === 'day' ? onMiniMonthDayEnter(cell) : undefined"
                      @pointerdown="cell.kind === 'day' ? onCalendarDayPointerDown(cell, $event) : undefined"
                      @click="cell.kind === 'day' && cell.date ? onCalendarDayClick(cell.date) : null"
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

          <v-col cols="12">
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
                  @click="onJobRowClick(e)"
                >
                  <v-list-item-title class="entry-title">
                    {{ e.project }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="entry-sub">
                    {{ summarizeDates(e.dates) }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      aria-label="Edit job"
                      class="touch-icon"
                      icon="mdi-pencil-outline"
                      size="large"
                      variant="text"
                      @click.stop="openEditJob(e)"
                    />
                    <v-btn
                      aria-label="Remove entry"
                      class="touch-icon"
                      icon="mdi-delete-outline"
                      size="large"
                      variant="text"
                      @click.stop="openDeleteJobConfirm(e)"
                    />
                  </template>
                </v-list-item>
              </v-list>
              <p v-else class="empty-text mb-0">
                No jobs yet.
              </p>
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

      <v-dialog
        v-model="comfortSettingsOpen"
        class="comfort-settings-dialog"
        max-width="340"
        scroll-strategy="close"
      >
        <v-card
          class="comfort-settings-card surface-card draft-bubble-theme pa-4"
          rounded="xl"
          variant="flat"
        >
          <v-card-title class="comfort-settings-card__title px-0 pt-0 pb-3">
            Planning settings
          </v-card-title>
          <v-card-text class="px-0 pb-2 pt-0">
            <v-text-field
              v-model.number="comfortDraft"
              class="plan-field"
              density="comfortable"
              hide-details="auto"
              label="Comfort target (days / year)"
              min="1"
              step="1"
              type="number"
              variant="outlined"
              @keyup.enter="saveComfortSettings"
            />
            <p class="comfort-settings-hint mb-0 mt-3">
              Distinct work days in {{ year }} count toward this yearly goal.
            </p>
            <v-text-field
              v-model.number="dayRateDraft"
              class="plan-field mt-4"
              density="comfortable"
              hide-details="auto"
              label="Day rate (per logged day)"
              hint="Leave at 0 to hide revenue. Estimate = distinct logged days in the selected year × rate."
              min="0"
              persistent-hint
              step="0.01"
              type="number"
              variant="outlined"
              @keyup.enter="saveComfortSettings"
            />
          </v-card-text>
          <v-card-actions class="comfort-settings-actions px-0 pb-0 pt-2">
            <v-spacer />
            <v-btn
              rounded="xl"
              variant="text"
              @click="comfortSettingsOpen = false"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              rounded="xl"
              variant="flat"
              @click="saveComfortSettings"
            >
              Save
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog
        v-model="editJobOpen"
        class="job-edit-dialog"
        max-width="440"
        scroll-strategy="close"
      >
        <v-card
          class="job-edit-card surface-card draft-bubble-theme pa-4"
          rounded="xl"
          variant="flat"
        >
          <v-card-title class="job-edit-card__title px-0 pt-0 pb-3">
            Edit job
          </v-card-title>
          <v-card-text class="px-0 pb-2 pt-0">
            <v-text-field
              v-model="editJobProject"
              class="plan-field"
              density="comfortable"
              hide-details="auto"
              label="Project name"
              variant="outlined"
              @keyup.enter="saveEditJob"
            />
            <v-textarea
              v-model="editJobDatesText"
              auto-grow
              class="plan-field mt-3"
              density="comfortable"
              hide-details="auto"
              hint="One calendar date per line: YYYY-MM-DD. You can also separate dates with commas or semicolons."
              label="Work dates"
              persistent-hint
              rows="5"
              variant="outlined"
            />
          </v-card-text>
          <v-card-actions class="job-edit-actions px-0 pb-0 pt-2">
            <v-spacer />
            <v-btn
              rounded="xl"
              variant="text"
              @click="editJobOpen = false"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              rounded="xl"
              variant="flat"
              @click="saveEditJob"
            >
              Save
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog
        v-model="deleteJobConfirmOpen"
        class="delete-job-dialog"
        max-width="360"
        scroll-strategy="close"
      >
        <v-card
          class="delete-job-card surface-card draft-bubble-theme pa-4"
          rounded="xl"
          variant="flat"
        >
          <v-card-title class="delete-job-card__title px-0 pt-0 pb-3">
            Remove job?
          </v-card-title>
          <v-card-text class="px-0 pb-2 pt-0">
            <p v-if="deleteJobPending" class="mb-0">
              Remove “{{ deleteJobPending.project }}” and all dates assigned to it? This cannot be undone automatically.
            </p>
          </v-card-text>
          <v-card-actions class="delete-job-actions px-0 pb-0 pt-2">
            <v-spacer />
            <v-btn
              rounded="xl"
              variant="text"
              @click="deleteJobConfirmOpen = false"
            >
              Cancel
            </v-btn>
            <v-btn
              color="error"
              rounded="xl"
              variant="flat"
              @click="confirmDeleteJob"
            >
              Remove
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar
        v-model="snack"
        class="plan-snackbar"
        location="bottom"
        rounded="xl"
        timeout="2400"
      >
        {{ snackText }}
      </v-snackbar>

      </template>

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
import { toIsoDateString, type JobEntry } from "~/composables/useJobYearPlanner";

useHead({
  title: "Planning · Ayrthon",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const auth = usePlanningAuth();
/** Same-component inject cannot see `provide`; pass explicitly into the composable. */
const planningSyncEnabled = computed(() => auth.ready && auth.authenticated);
provide("planningSync", planningSyncEnabled);

const loginPassword = ref("");

async function submitPlanningLogin() {
  await auth.login(loginPassword.value);
  if (auth.authenticated) {
    loginPassword.value = "";
  }
}

const {
  year,
  comfortTarget,
  dayRate,
  entries,
  hydrated,
  refreshPlanningFromServer,
  uniqueDaysInSelectedYear,
  datesByDay,
  addEntry,
  removeEntry,
  updateEntry,
  setComfortTarget,
  setDayRate,
  markPlanningSettingsSaved,
  flushSave,
} = useJobYearPlanner(planningSyncEnabled);

const syncRefreshing = ref(false);

async function onSyncNow() {
  syncRefreshing.value = true;
  try {
    await refreshPlanningFromServer();
    snackText.value = "Synced with server.";
    snack.value = true;
  } finally {
    syncRefreshing.value = false;
  }
}

async function signOut() {
  await flushSave();
  await auth.logout();
}

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
/** Click-drag on calendar: add draft dates from empty cells, or remove when starting on selected cells. */
const draftPaintActive = ref(false);
const draftPaintDragIntent = ref(false);
/** Avoid duplicate tap handling after pointer gesture ends (click follows pointerup). */
const suppressCalendarDayClick = ref(false);
let draftPaintStrokeSet = new Set<string>();
let draftPaintSubtractMode = false;
let draftPaintStartX = 0;
let draftPaintStartY = 0;
/** Debounce duplicate toggle from pointerup + click firing close together. */
let lastDraftToggleAt = 0;
let lastDraftToggleIso = "";
/** Multi-day run highlighted together on hover (`job:…` or `draft:…`). */
const hoveredCalendarRunKey = ref<string | null>(null);
const highlightedJobIds = ref<string[]>([]);
/** Local calendar date (YYYY-MM-DD) for “today”; refreshed on mount and every minute. */
const todayIso = ref("");
let highlightClearTimer: ReturnType<typeof setTimeout> | undefined;
const snack = ref(false);
const snackText = ref("");
const comfortSettingsOpen = ref(false);
const comfortDraft = ref(48);
const dayRateDraft = ref(0);

const editJobOpen = ref(false);
const editJobId = ref<string | null>(null);
const editJobProject = ref("");
const editJobDatesText = ref("");

const deleteJobConfirmOpen = ref(false);
const deleteJobPending = ref<JobEntry | null>(null);

function openDeleteJobConfirm(entry: JobEntry) {
  deleteJobPending.value = entry;
  deleteJobConfirmOpen.value = true;
}

function confirmDeleteJob() {
  const id = deleteJobPending.value?.id;
  deleteJobConfirmOpen.value = false;
  if (id) removeEntry(id);
}

watch(deleteJobConfirmOpen, (open) => {
  if (!open) deleteJobPending.value = null;
});

watch(comfortSettingsOpen, (open) => {
  if (open) {
    comfortDraft.value = comfortTarget.value;
    dayRateDraft.value = dayRate.value;
  }
});

function syncTodayIso() {
  const n = new Date();
  todayIso.value = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

if (import.meta.client) syncTodayIso();

onMounted(() => {
  syncTodayIso();
  const tid = window.setInterval(syncTodayIso, 60_000);
  onScopeDispose(() => clearInterval(tid));
});

function saveComfortSettings() {
  const n = Math.round(Number(comfortDraft.value));
  if (!Number.isFinite(n) || n < 1) {
    snackText.value = "Enter a positive whole number for comfort target.";
    snack.value = true;
    return;
  }
  const rate = Number(dayRateDraft.value);
  if (!Number.isFinite(rate) || rate < 0) {
    snackText.value = "Enter a valid day rate (0 or greater).";
    snack.value = true;
    return;
  }
  setComfortTarget(n);
  setDayRate(rate);
  markPlanningSettingsSaved();
  comfortSettingsOpen.value = false;
}

const estimatedRevenueFormatted = computed(() => {
  const rate = dayRate.value;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const total = uniqueDaysInSelectedYear.value * rate;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: total % 1 === 0 ? 0 : 2,
  }).format(total);
});

const progressPct = computed(() => {
  const t = comfortTarget.value || 1;
  return Math.min(100, Math.round((uniqueDaysInSelectedYear.value / t) * 100));
});

const progressNote = computed(() => {
  const u = uniqueDaysInSelectedYear.value;
  const t = comfortTarget.value;
  if (u < t) {
    const diff = t - u;
    return `${diff} more distinct work day${diff === 1 ? "" : "s"} to reach comfort.`;
  }
  if (u === t) {
    return "Met comfort target for this year.";
  }
  const over = u - t;
  return `${over} distinct work day${over === 1 ? "" : "s"} above comfort target for this year.`;
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

function parseIsoParts(iso: string): { y: number; mo: number; d: number } | null {
  const [ys, ms, ds] = iso.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return { y, mo, d };
}

function consecutiveIsoDays(a: string, b: string): boolean {
  const pa = parseIsoParts(a);
  const pb = parseIsoParts(b);
  if (!pa || !pb) return false;
  const da = new Date(pa.y, pa.mo - 1, pa.d);
  const db = new Date(pb.y, pb.mo - 1, pb.d);
  return (db.getTime() - da.getTime()) / 86_400_000 === 1;
}

/** Sort ISO dates and split into maximal consecutive calendar-day runs. */
function groupSortedIntoRuns(sorted: string[]): string[][] {
  if (!sorted.length) return [];
  const runs: string[][] = [];
  let cur = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const iso = sorted[i]!;
    if (consecutiveIsoDays(prev, iso)) cur.push(iso);
    else {
      runs.push(cur);
      cur = [iso];
    }
  }
  runs.push(cur);
  return runs;
}

function formatIsoForJobList(iso: string, omitYear: boolean): string {
  const p = parseIsoParts(iso);
  if (!p) return iso;
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  if (!omitYear) opts.year = "numeric";
  return new Intl.DateTimeFormat(undefined, opts).format(
    new Date(p.y, p.mo - 1, p.d),
  );
}

/** One contiguous run of days → compact label (e.g. Jan 15–17 or Jan 15 – Feb 2). */
function formatRunForJobList(run: string[], omitYear: boolean): string {
  if (run.length === 1) return formatIsoForJobList(run[0]!, omitYear);

  const first = run[0]!;
  const last = run[run.length - 1]!;
  const pf = parseIsoParts(first);
  const pl = parseIsoParts(last);
  if (!pf || !pl) return run.map((iso) => formatIsoForJobList(iso, omitYear)).join(" · ");

  const allStepwise = run.every((iso, idx) =>
    idx === 0 ? true : consecutiveIsoDays(run[idx - 1]!, iso),
  );
  if (!allStepwise) {
    return run.map((iso) => formatIsoForJobList(iso, omitYear)).join(" · ");
  }

  if (pf.y === pl.y && pf.mo === pl.mo) {
    const moLabel = new Intl.DateTimeFormat(undefined, { month: "short" }).format(
      new Date(pf.y, pf.mo - 1, 1),
    );
    const yearSuffix = omitYear ? "" : `\u00a0${pf.y}`;
    return `${moLabel}\u00a0${pf.d}–${pl.d}${yearSuffix}`;
  }

  return `${formatIsoForJobList(first, omitYear)}\u00a0–\u00a0${formatIsoForJobList(last, omitYear)}`;
}

function summarizeDates(dates: string[]): string {
  const sorted = [...new Set(dates)].sort();
  if (!sorted.length) return "";

  const years = new Set(sorted.map((iso) => iso.slice(0, 4)));
  const omitYear = years.size === 1;

  const runs = groupSortedIntoRuns(sorted);
  const segments = runs.map((run) => formatRunForJobList(run, omitYear));

  if (segments.length <= 3) {
    return segments.join(" · ");
  }

  const shown = segments.slice(0, 3).join(" · ");
  const shownDays = runs.slice(0, 3).reduce((n, r) => n + r.length, 0);
  const rest = sorted.length - shownDays;
  const dayWord = rest === 1 ? "day" : "days";
  return `${shown} · +${rest}\u00a0more ${dayWord}`;
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

function parseJobDatesInput(raw: string): string[] {
  const chunks = raw.split(/[\n,;]+/).flatMap((chunk) => chunk.split(/\s+/));
  const seen = new Set<string>();
  for (const part of chunks) {
    const s = part.trim();
    if (!s) continue;
    const iso = toIsoDateString(s);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) seen.add(iso);
  }
  return [...seen].sort();
}

function openEditJob(e: JobEntry) {
  editJobId.value = e.id;
  editJobProject.value = e.project;
  editJobDatesText.value = e.dates.join("\n");
  editJobOpen.value = true;
}

function saveEditJob() {
  const id = editJobId.value;
  if (!id) return;
  const proj = editJobProject.value.trim();
  const dates = parseJobDatesInput(editJobDatesText.value);
  if (!proj || !dates.length) {
    snackText.value =
      "Enter a project name and at least one valid date (YYYY-MM-DD).";
    snack.value = true;
    return;
  }
  const ok = updateEntry(id, { project: proj, dates });
  if (!ok) {
    snackText.value = "Could not update that job.";
    snack.value = true;
    return;
  }
  editJobOpen.value = false;
  editJobId.value = null;
  snackText.value = "Job updated.";
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

/** Stable key so all dates in the current draft multi-select hover-highlight together (even when not adjacent). */
function draftSelectionHoverKey(): string | null {
  if (draftDates.value.length <= 1) return null;
  return `draft-selection:${[...draftDates.value].sort().join("|")}`;
}

/** Hover/shading key for calendar cells: draft multi-select groups, or all days of a multi-date job (even if not adjacent). */
function calendarRunHoverKey(iso: string): string | null {
  if (draftDates.value.includes(iso) && draftDates.value.length > 1) {
    return draftSelectionHoverKey();
  }

  for (const entry of entries.value) {
    if (entry.dates.length <= 1) continue;
    if (!entry.dates.includes(iso)) continue;
    return `job-entry:${entry.id}`;
  }
  return null;
}

function onMiniMonthDayEnter(cell: Cell) {
  if (cell.kind !== "day") return;
  hoveredCalendarRunKey.value = calendarRunHoverKey(cell.date);
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

function appendTodayMarker(cls: string[], iso: string) {
  if (iso === todayIso.value) cls.push("day-cell--today");
}

function dayCellClasses(cell: Cell, y: number, monthIndex: number): string[] {
  if (cell.kind === "pad") return ["day-cell", "day-cell--pad"];
  const iso = cell.date;
  const flashJob = isoInHighlightedJobs(iso);
  const draft = draftDates.value.includes(iso);
  const runKey = calendarRunHoverKey(iso);
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
    if (flashJob) cls.push("day-cell--job-flash");
    appendTodayMarker(cls, iso);
    return cls;
  }
  const cls = ["day-cell"];
  if (!datesByDay.value.has(iso)) {
    if (flashJob) cls.push("day-cell--job-flash");
    appendTodayMarker(cls, iso);
    return cls;
  }
  if (cellUsesJobBlock(iso, y, monthIndex)) {
    cls.push("day-cell--work", "day-cell--work-on-block");
    if (runHoverActive) cls.push("day-cell--calendar-run-hover");
  } else cls.push("day-cell--work");
  if (flashJob) cls.push("day-cell--job-flash");
  appendTodayMarker(cls, iso);
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

function scheduleHighlightClear() {
  if (highlightClearTimer) clearTimeout(highlightClearTimer);
  highlightClearTimer = setTimeout(() => {
    highlightedJobIds.value = [];
    highlightClearTimer = undefined;
  }, 3200);
}

/** Calendar cells get a ring when their ISO date belongs to a highlighted job (from list or day click). */
function isoInHighlightedJobs(iso: string): boolean {
  if (!highlightedJobIds.value.length) return false;
  for (const id of highlightedJobIds.value) {
    const e = entries.value.find((x) => x.id === id);
    if (e?.dates.includes(iso)) return true;
  }
  return false;
}

function entryDatesInSelectedYear(entry: JobEntry): string[] {
  const prefix = `${year.value}-`;
  return entry.dates.filter((d) => d.startsWith(prefix)).sort();
}

function onJobRowClick(entry: JobEntry) {
  highlightedJobIds.value = [entry.id];
  scheduleHighlightClear();

  const yearDates = entryDatesInSelectedYear(entry);
  const scrollTargetId =
    yearDates.length > 0 ? `plan-cal-${yearDates[0]}` : "planning-calendar-card";

  nextTick(() => {
    document.getElementById(scrollTargetId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  });

  snackText.value =
    yearDates.length > 0
      ? `${entry.project} · ${formatDayLabel(yearDates[0]!)}`
      : `${entry.project}`;
  snack.value = true;
}

function isoFromClientPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  const btn = el?.closest?.("[data-plan-date]");
  const raw = btn?.getAttribute?.("data-plan-date") ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function mergeDraftDayIntoSelection(iso: string) {
  if (!draftDates.value.includes(iso)) {
    draftDates.value = [...draftDates.value, iso].sort();
  }
}

function subtractDraftDayFromSelection(iso: string) {
  if (draftDates.value.includes(iso)) {
    draftDates.value = draftDates.value.filter((x) => x !== iso);
  }
}

function toggleDraftDaySelection(iso: string) {
  const now = Date.now();
  if (iso === lastDraftToggleIso && now - lastDraftToggleAt < 320) return;
  lastDraftToggleIso = iso;
  lastDraftToggleAt = now;

  if (draftDates.value.includes(iso)) {
    draftDates.value = draftDates.value.filter((x) => x !== iso);
  } else {
    draftDates.value = [...draftDates.value, iso].sort();
  }
}

function cleanupDraftPaintGestureListeners() {
  window.removeEventListener("pointermove", draftPaintPointerMoveHandler);
  window.removeEventListener("pointerup", draftPaintPointerEndHandler);
  window.removeEventListener("pointercancel", draftPaintPointerEndHandler);
}

function draftPaintPointerMoveHandler(e: PointerEvent) {
  if (!draftPaintActive.value) return;

  const iso = isoFromClientPoint(e.clientX, e.clientY);
  if (!iso) return;
  if (datesByDay.value.get(iso)?.length) return;

  draftPaintStrokeSet.add(iso);
  if (draftPaintSubtractMode) {
    subtractDraftDayFromSelection(iso);
  } else {
    mergeDraftDayIntoSelection(iso);
  }
  if (draftPaintStrokeSet.size > 1) draftPaintDragIntent.value = true;
}

function draftPaintPointerEndHandler(_e: PointerEvent) {
  cleanupDraftPaintGestureListeners();
  const wasPaintGesture = draftPaintActive.value;
  draftPaintActive.value = false;
  if (!wasPaintGesture) return;

  suppressCalendarDayClick.value = true;

  if (!draftPaintDragIntent.value && draftPaintStrokeSet.size === 1) {
    toggleDraftDaySelection([...draftPaintStrokeSet][0]!);
  }

  draftPaintDragIntent.value = false;
  draftPaintStrokeSet.clear();
  draftPaintSubtractMode = false;
}

function onCalendarDayPointerDown(cell: Cell, e: PointerEvent) {
  if (cell.kind !== "day" || !cell.date) return;
  suppressCalendarDayClick.value = false;

  const iso = cell.date;
  if (datesByDay.value.get(iso)?.length) return;

  if (e.pointerType === "mouse" && e.button !== 0) return;

  e.preventDefault();

  draftPaintActive.value = true;
  draftPaintDragIntent.value = false;
  draftPaintSubtractMode = draftDates.value.includes(iso);
  draftPaintStrokeSet = new Set([iso]);
  draftPaintStartX = e.clientX;
  draftPaintStartY = e.clientY;

  window.addEventListener("pointermove", draftPaintPointerMoveHandler);
  window.addEventListener("pointerup", draftPaintPointerEndHandler);
  window.addEventListener("pointercancel", draftPaintPointerEndHandler);
}

function onCalendarDayClick(date: string) {
  if (suppressCalendarDayClick.value) {
    suppressCalendarDayClick.value = false;
    return;
  }
  onDayClick(date);
}

function onDayClick(date: string) {
  const jobsOnDay = datesByDay.value.get(date);
  if (jobsOnDay?.length) {
    const ids = [...new Set(jobsOnDay.map((j) => j.id))];
    highlightedJobIds.value = ids;
    scheduleHighlightClear();

    nextTick(() => {
      document.getElementById(`job-row-${ids[0]}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
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

  toggleDraftDaySelection(date);
}

onScopeDispose(() => {
  if (highlightClearTimer) clearTimeout(highlightClearTimer);
  cleanupDraftPaintGestureListeners();
  draftPaintActive.value = false;
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
  --plan-job-flash-bg: rgba(22, 163, 74, 0.14);
  --plan-job-flash-border: rgba(22, 163, 74, 0.42);
  --plan-today-ring: #0d9488;
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
  --plan-job-flash-bg: rgba(74, 222, 128, 0.14);
  --plan-job-flash-border: rgba(74, 222, 128, 0.48);
  --plan-today-ring: #5eead4;
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

.planning-nav__aside {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

.planning-sub-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
}

.planning-sub-row .planning-sub {
  flex: 1 1 14rem;
  min-width: 0;
}

.planning-sync-btn {
  flex-shrink: 0;
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

.planning-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.65rem 1rem;
  margin-bottom: 0.5rem;
}

.planning-title {
  font-size: clamp(1.65rem, 6vw, 2.15rem);
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin: 0;
  color: var(--plan-text);
  flex: 0 1 auto;
}

.planning-year-field {
  flex: 0 0 90px;
  width: 90px;
  min-width: 90px;
  max-width: 90px;
}

.planning-year-select :deep(.v-input) {
  width: 100%;
}

.planning-year-select :deep(.v-field) {
  border-radius: 0;
}

.planning-year-select :deep(.v-field--variant-underlined .v-field__outline) {
  --v-field-border-opacity: 0.55;
}

.planning-year-select :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
}

.planning-year-select :deep(.v-label) {
  font-size: 0.8125rem !important;
  font-weight: 600 !important;
  color: var(--plan-muted) !important;
  opacity: 1 !important;
}

.planning-year-select :deep(.v-select__selection-text) {
  font-size: 1rem !important;
  font-weight: 650 !important;
  letter-spacing: -0.02em;
  color: var(--plan-text) !important;
}

.planning-year-select :deep(.v-field__append-inner) {
  padding-inline-start: 2px;
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
  gap: 1rem;
}

.stat-line:not(:has(.stat-revenue)) {
  align-items: center;
}

.stat-line:has(.stat-revenue) {
  align-items: flex-start;
}

.stat-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--plan-muted);
}

.stat-line:has(.stat-revenue) .stat-label {
  padding-top: 0.35rem;
}

.stat-line__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 0;
}

.stat-revenue {
  font-size: 0.8125rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--plan-muted);
  line-height: 1.35;
  text-align: right;
}

.stat-line__nums {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.stat-num {
  font-size: clamp(1.2rem, 4vw, 1.45rem);
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  color: var(--plan-text);
}

.stat-settings-btn {
  flex-shrink: 0;
}

.stat-progress :deep(.v-progress-linear__determinate) {
  border-radius: inherit;
  background-color: transparent !important;
  background-image: linear-gradient(
    90deg,
    #ef4444 0%,
    #eab308 50%,
    #22c55e 100%
  ) !important;
  background-size: calc(
      100% / max(0.004, calc(var(--stat-progress-pct, 100) / 100))
    )
    100% !important;
  background-position: left center !important;
  background-repeat: no-repeat !important;
  box-shadow:
    0 0 18px rgba(239, 68, 68, 0.22),
    0 0 22px rgba(34, 197, 94, 0.18);
}

.stat-progress :deep(.v-progress-linear__background) {
  opacity: 0.32 !important;
}

.comfort-settings-card.draft-bubble-theme.surface-card,
.job-edit-card.draft-bubble-theme.surface-card,
.delete-job-card.draft-bubble-theme.surface-card {
  color: var(--plan-text);
  color-scheme: light;
  background-color: var(--plan-surface) !important;
}

html.theme-dark .comfort-settings-card.draft-bubble-theme.surface-card,
html.theme-dark .job-edit-card.draft-bubble-theme.surface-card,
html.theme-dark .delete-job-card.draft-bubble-theme.surface-card {
  color-scheme: dark;
}

.comfort-settings-dialog :deep(.v-overlay__content) {
  width: min(100%, 250px);
}

.comfort-settings-card__title {
  font-size: 1.125rem !important;
  font-weight: 700 !important;
  color: var(--plan-text) !important;
  letter-spacing: -0.01em;
}

.comfort-settings-hint {
  font-size: 0.8125rem;
  color: var(--plan-muted);
  line-height: 1.45;
}

.comfort-settings-actions {
  gap: 8px;
}

.job-edit-dialog :deep(.v-overlay__content) {
  width: min(100%, 440px);
}

.job-edit-card__title {
  font-size: 1.125rem !important;
  font-weight: 700 !important;
  color: var(--plan-text) !important;
  letter-spacing: -0.01em;
}

.job-edit-actions {
  gap: 8px;
}

.delete-job-dialog :deep(.v-overlay__content) {
  width: min(100%, 360px);
}

.delete-job-card__title {
  font-size: 1.125rem !important;
  font-weight: 700 !important;
  color: var(--plan-text) !important;
  letter-spacing: -0.01em;
}

.delete-job-card :deep(.v-card-text) {
  color: var(--plan-text) !important;
  opacity: 1 !important;
}

.delete-job-card :deep(.v-card-text p) {
  color: var(--plan-text);
  line-height: 1.45;
}

.delete-job-actions {
  gap: 8px;
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

.day-cell--job-flash {
  box-shadow: 0 0 0 2px var(--plan-job-flash-border);
  transition: box-shadow 0.22s ease;
}

.day-cell--today:not(.day-cell--pad) {
  outline: 2px solid var(--plan-today-ring);
  outline-offset: 1px;
  position: relative;
  z-index: 2;
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
  margin-top: 6px !important;
  font-size: 0.90625rem !important;
  font-weight: 450 !important;
  line-height: 1.45 !important;
  letter-spacing: 0.01em !important;
  color: var(--plan-muted) !important;
  opacity: 1 !important;
  white-space: normal !important;
  font-variant-numeric: tabular-nums;
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
    grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  }

  .mini-month {
    column-gap: 5px;
    row-gap: 7px;
    padding: 11px 10px 13px;
  }

  .mini-month__calendar {
    gap: 5px;
  }

  .day-cell {
    font-size: 0.8125rem;
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

.mini-month__calendar.draft-paint-active {
  user-select: none;
  touch-action: none;
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

/* Floating draft composer (teleported to body) — bottom-centered on desktop */
.draft-bubble-anchor {
  position: fixed;
  z-index: 10050;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  left: max(12px, env(safe-area-inset-left));
  pointer-events: none;
  display: flex;
  justify-content: center;
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
