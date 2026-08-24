import { useEffect, useState } from 'react';
import { initialEmployeeProgress } from '../data/employees';
import type { EmployeeId, OfficeMode, OfficeState } from '../types/office';
import { clampProgress } from '../utils/progress';

export const STORAGE_KEY = 'ai-office-state-v1';
const employeeIds: EmployeeId[] = ['ren', 'mio', 'sou', 'yuna', 'aki'];
const officeModes: OfficeMode[] = ['work', 'walk', 'break', 'meeting', 'night'];

const initialState: OfficeState = { mode: 'work', selectedEmployeeId: 'ren', employeeProgress: initialEmployeeProgress };

function loadState(): OfficeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<OfficeState>;
    const mode = officeModes.includes(parsed.mode as OfficeMode) ? parsed.mode as OfficeMode : 'work';
    const selectedEmployeeId = employeeIds.includes(parsed.selectedEmployeeId as EmployeeId) ? parsed.selectedEmployeeId as EmployeeId : 'ren';
    const progress: Partial<Record<EmployeeId, number>> = parsed.employeeProgress ?? {};
    const employeeProgress = Object.fromEntries(employeeIds.map((id) => [id, typeof progress[id] === 'number' ? clampProgress(progress[id]) : initialEmployeeProgress[id]])) as Record<EmployeeId, number>;
    return { mode, selectedEmployeeId, employeeProgress };
  } catch {
    return initialState;
  }
}

export function usePersistentOfficeState() {
  const [state, setState] = useState<OfficeState>(loadState);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const selectMode = (mode: OfficeMode) => setState((current) => ({ ...current, mode }));
  const selectEmployee = (selectedEmployeeId: EmployeeId) => setState((current) => ({ ...current, selectedEmployeeId }));
  const updateProgress = (id: EmployeeId, value: number) => setState((current) => ({ ...current, employeeProgress: { ...current.employeeProgress, [id]: clampProgress(value) } }));
  return { state, selectMode, selectEmployee, updateProgress };
}
