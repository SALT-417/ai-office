import { beforeEach, describe, expect, it } from 'vitest';
import type { AnalysisHistoryEntry } from '../types/analysis';
import { ANALYSIS_LIMITS } from '../types/analysisContract';
import { ANALYSIS_HISTORY_STORAGE_KEY, isAnalysisHistoryEntry, loadAnalysisHistory, saveAnalysisHistory } from './analysisHistoryStorage';

const entry = (id = 'one'): AnalysisHistoryEntry => ({ id, createdAt: '2026-08-25T00:00:00.000Z', updatedAt: '2026-08-25T00:00:00.000Z', specialist: 'sou', specialistName: 'ソウ', objective: '改善', analyzedFiles: ['src/App.tsx'], redacted: false, summary: '要約', findings: [{ title: '型', severity: 'medium', evidence: [{ path: 'src/App.tsx', line: 1, description: '根拠' }], recommendation: '改善案', completionCriteria: ['完了'], verification: ['確認'] }], reviewStatus: 'pending', reviewNote: '' });
beforeEach(() => localStorage.clear());
describe('analysis history storage', () => {
  it('uses a separate versioned key and restores newest 20 without touching work history', () => {
    localStorage.setItem('ai-office-work-history-v1', 'keep');
    saveAnalysisHistory(Array.from({ length: 22 }, (_, index) => ({ ...entry(String(index)), createdAt: new Date(2026, 0, index + 1).toISOString() })));
    expect(loadAnalysisHistory()).toHaveLength(20);
    expect(localStorage.getItem('ai-office-work-history-v1')).toBe('keep');
    expect(JSON.parse(localStorage.getItem(ANALYSIS_HISTORY_STORAGE_KEY) ?? '{}').version).toBe(1);
  });
  it('recovers from corrupt, old, and invalid data', () => {
    localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, '{bad'); expect(loadAnalysisHistory()).toEqual([]);
    localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 0, entries: [entry()] })); expect(loadAnalysisHistory()).toEqual([]);
    expect(isAnalysisHistoryEntry({ ...entry(), specialist: 'ren' })).toBe(false);
    expect(isAnalysisHistoryEntry({ ...entry(), reviewStatus: 'done' })).toBe(false);
    expect(isAnalysisHistoryEntry({ ...entry(), objective: 'x'.repeat(1001) })).toBe(false);
  });
  it('uses the shared server and history collection limits', () => {
    const tooManyCriteria = { ...entry(), findings: [{ ...entry().findings[0], completionCriteria: Array.from({ length: ANALYSIS_LIMITS.listItems + 1 }, () => '確認') }] };
    const tooManyVerification = { ...entry(), findings: [{ ...entry().findings[0], verification: Array.from({ length: ANALYSIS_LIMITS.listItems + 1 }, () => '確認') }] };
    expect(isAnalysisHistoryEntry(tooManyCriteria)).toBe(false);
    expect(isAnalysisHistoryEntry(tooManyVerification)).toBe(false);
  });
});
