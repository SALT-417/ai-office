import type { WorkHistoryEntry } from '../types/history';
import { loadWorkHistory, MAX_HISTORY_ENTRIES, saveWorkHistory, WORK_HISTORY_STORAGE_KEY } from './workHistoryStorage';

function entry(index: number, overrides: Partial<WorkHistoryEntry> = {}): WorkHistoryEntry {
  const date = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
  return {
    id: `history-${index}`,
    createdAt: date,
    updatedAt: date,
    category: 'general',
    task: `依頼 ${index}`,
    plan: { summary: '依頼の要約', assignments: [{ name: 'ソウ', task: 'AI・Web開発、技術実装' }], firstActions: ['作業を整理する'] },
    results: [{ employeeId: 'sou', name: 'ソウ', role: 'AI開発担当', status: 'completed', title: '成果物', content: '安全な本文' }],
    reviewStatus: 'pending',
    reviewNote: '',
    ...overrides,
  };
}

describe('work history storage', () => {
  it('starts empty and restores a versioned store newest first', () => {
    expect(loadWorkHistory()).toEqual([]);
    saveWorkHistory([entry(1), entry(3), entry(2)]);
    expect(JSON.parse(localStorage.getItem(WORK_HISTORY_STORAGE_KEY) ?? '{}').version).toBe(2);
    expect(loadWorkHistory().map((item) => item.id)).toEqual(['history-3', 'history-2', 'history-1']);
  });

  it('keeps at most 20 entries', () => {
    saveWorkHistory(Array.from({ length: 25 }, (_, index) => entry(24 - index)));
    expect(loadWorkHistory()).toHaveLength(MAX_HISTORY_ENTRIES);
  });

  it('recovers from broken JSON and old versions', () => {
    localStorage.setItem(WORK_HISTORY_STORAGE_KEY, '{broken');
    expect(loadWorkHistory()).toEqual([]);
    localStorage.setItem(WORK_HISTORY_STORAGE_KEY, JSON.stringify({ version: 0, entries: [entry(1)] }));
    expect(loadWorkHistory()).toEqual([]);
  });

  it('migrates a valid v1 entry without category to general', () => {
    const legacy = entry(7) as Partial<WorkHistoryEntry>;
    delete legacy.category;
    localStorage.setItem(WORK_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, entries: [legacy] }));
    expect(loadWorkHistory()).toEqual([expect.objectContaining({ id: 'history-7', category: 'general' })]);
  });

  it('rejects invalid employee ids, review states, oversized text, and keeps valid entries', () => {
    const invalidEmployee = entry(1) as unknown as Record<string, unknown>;
    invalidEmployee.results = [{ ...entry(1).results[0], employeeId: 'ren' }];
    const invalidReview = { ...entry(2), reviewStatus: 'executed' };
    const oversized = entry(3, { task: 'あ'.repeat(2_001) });
    localStorage.setItem(WORK_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, entries: [invalidEmployee, invalidReview, oversized, entry(4)] }));
    expect(loadWorkHistory()).toEqual([entry(4)]);
  });
});
