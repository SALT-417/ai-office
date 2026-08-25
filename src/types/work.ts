import type { EmployeeId } from './office';
import type { WorkCategory } from '../../shared/workCategories';

export type SpecialistEmployeeId = Exclude<EmployeeId, 'ren'>;
export type WorkRequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'cancelled';

export interface WorkResult {
  employeeId: SpecialistEmployeeId;
  name: string;
  role: string;
  status: 'completed' | 'failed';
  title: string;
  content: string;
  error?: string;
}

export interface WorkResponse {
  coordinator: 'レン';
  category: WorkCategory;
  task: string;
  results: WorkResult[];
}
