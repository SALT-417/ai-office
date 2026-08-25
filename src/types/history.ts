import type { ManagerPlan } from './manager';
import type { WorkResult } from './work';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface WorkHistoryEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  task: string;
  plan: ManagerPlan;
  results: WorkResult[];
  reviewStatus: ReviewStatus;
  reviewNote: string;
}

export interface WorkHistoryStore {
  version: 1;
  entries: WorkHistoryEntry[];
}
