export type ManagerEmployeeName = 'レン' | 'ミオ' | 'ソウ' | 'ユナ' | 'アキ';

export interface ManagerAssignment {
  name: ManagerEmployeeName;
  task: string;
}

export interface ManagerPlan {
  summary: string;
  assignments: ManagerAssignment[];
  firstActions: string[];
}

export interface ManagerApiResponse {
  manager: 'レン';
  category: WorkCategory;
  reply: string;
  plan: ManagerPlan;
}

export type ManagerRequestStatus = 'idle' | 'loading' | 'success' | 'error';
import type { WorkCategory } from '../../shared/workCategories';
