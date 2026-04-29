export interface JobEntry {
  id: string;
  project: string;
  dates: string[];
}

export interface StoredState {
  comfortTarget: number;
  /** Revenue per logged day (EUR; estimates use EUR). */
  dayRate?: number;
  entries: JobEntry[];
}
