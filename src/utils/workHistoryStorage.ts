import type { ManagerEmployeeName, ManagerPlan } from '../types/manager';
import type { ReviewStatus, WorkHistoryEntry, WorkHistoryStore } from '../types/history';
import type { SpecialistEmployeeId, WorkResult } from '../types/work';
import { isWorkCategory, normalizeWorkCategory } from '../../shared/workCategories';

export const WORK_HISTORY_STORAGE_KEY = 'ai-office-work-history-v1';
export const WORK_HISTORY_VERSION = 2;
export const MAX_HISTORY_ENTRIES = 20;
export const MAX_REVIEW_NOTE_LENGTH = 1_000;

const managerNames: ManagerEmployeeName[] = ['レン', 'ミオ', 'ソウ', 'ユナ', 'アキ'];
const specialistIds: SpecialistEmployeeId[] = ['mio', 'sou', 'yuna', 'aki'];
const reviewStatuses: ReviewStatus[] = ['pending', 'approved', 'rejected'];

function validText(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0);
}

function validIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function validPlan(value: unknown): value is ManagerPlan {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as Partial<ManagerPlan>;
  return validText(plan.summary, 1_000)
    && Array.isArray(plan.assignments) && plan.assignments.length >= 1 && plan.assignments.length <= 5
    && plan.assignments.every((item) => managerNames.includes(item?.name) && validText(item?.task, 500))
    && Array.isArray(plan.firstActions) && plan.firstActions.length >= 1 && plan.firstActions.length <= 4
    && plan.firstActions.every((item) => validText(item, 500));
}

function validResult(value: unknown): value is WorkResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Partial<WorkResult>;
  return specialistIds.includes(result.employeeId as SpecialistEmployeeId)
    && validText(result.name, 40) && validText(result.role, 200)
    && (result.status === 'completed' || result.status === 'failed')
    && validText(result.title, 120) && validText(result.content, 8_000, true)
    && (result.error === undefined || validText(result.error, 300));
}

export function isWorkHistoryEntry(value: unknown): value is WorkHistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<WorkHistoryEntry>;
  return validText(entry.id, 120) && validIsoDate(entry.createdAt) && validIsoDate(entry.updatedAt)
    && validText(entry.task, 2_000) && validPlan(entry.plan)
    && isWorkCategory(entry.category)
    && Array.isArray(entry.results) && entry.results.length >= 1 && entry.results.length <= 4 && entry.results.every(validResult)
    && reviewStatuses.includes(entry.reviewStatus as ReviewStatus)
    && validText(entry.reviewNote, MAX_REVIEW_NOTE_LENGTH, true);
}

export function loadWorkHistory(storage: Storage = localStorage): WorkHistoryEntry[] {
  try {
    const raw = storage.getItem(WORK_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; entries?: unknown[] };
    if ((parsed.version !== 1 && parsed.version !== WORK_HISTORY_VERSION) || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.map((entry) => typeof entry === 'object' && entry !== null ? { ...entry, category: normalizeWorkCategory((entry as { category?: unknown }).category) } : entry).filter(isWorkHistoryEntry).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

export function saveWorkHistory(entries: WorkHistoryEntry[], storage: Storage = localStorage): void {
  const store: WorkHistoryStore = { version: WORK_HISTORY_VERSION, entries: entries.slice(0, MAX_HISTORY_ENTRIES) };
  storage.setItem(WORK_HISTORY_STORAGE_KEY, JSON.stringify(store));
}

export function createHistoryId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // 安全な代替IDへ進む。
  }
  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
