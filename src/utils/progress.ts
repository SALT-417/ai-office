import type { EmployeeId } from '../types/office';

export function calculateOverallProgress(progress: Record<EmployeeId, number>): number {
  const values = Object.values(progress);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}
