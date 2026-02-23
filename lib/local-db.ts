import Dexie, { Table } from "dexie";

export type CachedJob = {
  jobId: string;
  companyId: string;
  title: string;
  company: string;
  location: string;
  pay: string;
  summary: string;
  bullets: string[];
  applyUrl: string;
  updatedAt: number;
};

export type SavedJob = {
  jobId: string;
  title: string;
  company: string;
  location: string;
  savedAt: number;
};

export type LocalDoc = {
  key: string;
  value: string;
  updatedAt: number;
};

class MistroDB extends Dexie {
  jobs_cache!: Table<CachedJob, string>;
  saved_jobs!: Table<SavedJob, string>;
  local_docs!: Table<LocalDoc, string>;

  constructor() {
    super("mistro_local_db");
    this.version(1).stores({
      jobs_cache: "jobId, title, company, location, updatedAt",
      saved_jobs: "jobId, savedAt",
      local_docs: "key, updatedAt",
    });
  }
}

export const db = new MistroDB();
