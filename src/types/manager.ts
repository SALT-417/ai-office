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
  reply: string;
  plan: ManagerPlan;
}

export type ManagerRequestStatus = 'idle' | 'loading' | 'success' | 'error';
