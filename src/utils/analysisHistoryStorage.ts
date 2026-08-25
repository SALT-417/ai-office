import type { AnalysisHistoryEntry, AnalysisHistoryStore } from '../types/analysis';
import type { ReviewStatus } from '../types/history';
import { ANALYSIS_LIMITS } from '../types/analysisContract';

export const ANALYSIS_HISTORY_STORAGE_KEY = 'ai-office-analysis-history-v1';
export const MAX_ANALYSIS_HISTORY_ENTRIES = 20;
const statuses: ReviewStatus[] = ['pending', 'approved', 'rejected'];
const specialists = ['sou', 'aki'];
const severity = ['low', 'medium', 'high'];
const validText = (value: unknown, max: number, empty = false): value is string => typeof value === 'string' && value.length <= max && (empty || value.trim().length > 0);
const validDate = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));

export function isAnalysisHistoryEntry(value: unknown): value is AnalysisHistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<AnalysisHistoryEntry>;
  return validText(entry.id, 120) && validDate(entry.createdAt) && validDate(entry.updatedAt)
    && specialists.includes(String(entry.specialist)) && (entry.specialistName === 'ソウ' || entry.specialistName === 'アキ')
    && validText(entry.objective, 1_000) && Array.isArray(entry.analyzedFiles) && entry.analyzedFiles.length >= 1 && entry.analyzedFiles.length <= 8 && entry.analyzedFiles.every((item) => validText(item, 300))
    && typeof entry.redacted === 'boolean' && validText(entry.summary, ANALYSIS_LIMITS.summary)
    && Array.isArray(entry.findings) && entry.findings.length >= 1 && entry.findings.length <= ANALYSIS_LIMITS.findings && entry.findings.every((finding) => validText(finding?.title, ANALYSIS_LIMITS.title)
      && severity.includes(String(finding?.severity)) && validText(finding?.recommendation, ANALYSIS_LIMITS.recommendation)
      && Array.isArray(finding?.evidence) && finding.evidence.length >= 1 && finding.evidence.length <= ANALYSIS_LIMITS.evidence && finding.evidence.every((item) => validText(item?.path, ANALYSIS_LIMITS.path) && validText(item?.description, ANALYSIS_LIMITS.description) && (item.line === undefined || (Number.isInteger(item.line) && Number(item.line) > 0)))
      && Array.isArray(finding?.completionCriteria) && finding.completionCriteria.length >= 1 && finding.completionCriteria.length <= ANALYSIS_LIMITS.listItems && finding.completionCriteria.every((item) => validText(item, ANALYSIS_LIMITS.listItem))
      && Array.isArray(finding?.verification) && finding.verification.length >= 1 && finding.verification.length <= ANALYSIS_LIMITS.listItems && finding.verification.every((item) => validText(item, ANALYSIS_LIMITS.listItem)))
    && statuses.includes(entry.reviewStatus as ReviewStatus) && validText(entry.reviewNote, 1_000, true);
}

export function loadAnalysisHistory(storage: Storage = localStorage): AnalysisHistoryEntry[] {
  try {
    const raw = storage.getItem(ANALYSIS_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const store = JSON.parse(raw) as Partial<AnalysisHistoryStore>;
    if (store.version !== 1 || !Array.isArray(store.entries)) return [];
    return store.entries.filter(isAnalysisHistoryEntry).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, MAX_ANALYSIS_HISTORY_ENTRIES);
  } catch { return []; }
}
export function saveAnalysisHistory(entries: AnalysisHistoryEntry[], storage: Storage = localStorage): void {
  storage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, entries: entries.slice(0, MAX_ANALYSIS_HISTORY_ENTRIES) } satisfies AnalysisHistoryStore));
}
