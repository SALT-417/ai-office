import type { ManagerPlan } from './manager';
import type { WorkResult } from './work';
import type { WorkCategory } from '../../shared/workCategories';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface WorkHistoryEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  task: string;
  category: WorkCategory;
  plan: ManagerPlan;
  results: WorkResult[];
  reviewStatus: ReviewStatus;
  reviewNote: string;
}

export interface WorkHistoryStore {
  version: 2;
  entries: WorkHistoryEntry[];
}
