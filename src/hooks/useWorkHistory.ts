import { useCallback, useRef, useState } from 'react';
import type { ManagerPlan } from '../types/manager';
import type { ReviewStatus, WorkHistoryEntry } from '../types/history';
import type { WorkResult } from '../types/work';
import { createHistoryId, loadWorkHistory, MAX_HISTORY_ENTRIES, saveWorkHistory } from '../utils/workHistoryStorage';

const storageErrorMessage = '作業履歴をブラウザへ保存できませんでした。現在の成果物は画面で確認できます。ブラウザの保存容量を確認してください。';

export function useWorkHistory() {
  const [entries, setEntries] = useState<WorkHistoryEntry[]>(loadWorkHistory);
  const [selectedId, setSelectedId] = useState<string | null>(() => loadWorkHistory()[0]?.id ?? null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const handledExecutionIds = useRef(new Set(loadWorkHistory().map((entry) => entry.id)));

  const commit = useCallback((next: WorkHistoryEntry[]) => {
    try {
      saveWorkHistory(next);
      setEntries(next);
      setStorageError(null);
      return true;
    } catch {
      setStorageError(storageErrorMessage);
      return false;
    }
  }, []);

  const addExecution = useCallback((executionId: string, task: string, plan: ManagerPlan, results: WorkResult[]) => {
    if (!executionId || handledExecutionIds.current.has(executionId) || entries.some((entry) => entry.id === executionId)) return;
    handledExecutionIds.current.add(executionId);
    const now = new Date().toISOString();
    const entry: WorkHistoryEntry = { id: executionId || createHistoryId(), createdAt: now, updatedAt: now, task, plan, results, reviewStatus: 'pending', reviewNote: '' };
    const next = [entry, ...entries].slice(0, MAX_HISTORY_ENTRIES);
    commit(next);
  }, [commit, entries]);

  const updateReview = useCallback((id: string, reviewStatus: ReviewStatus, reviewNote: string) => {
    const next = entries.map((entry) => entry.id === id ? { ...entry, reviewStatus, reviewNote: reviewNote.slice(0, 1_000), updatedAt: new Date().toISOString() } : entry);
    commit(next);
  }, [commit, entries]);

  const removeOne = useCallback((id: string) => {
    const next = entries.filter((entry) => entry.id !== id);
    if (commit(next)) setSelectedId((current) => current === id ? next[0]?.id ?? null : current);
  }, [commit, entries]);

  const removeAll = useCallback(() => {
    if (commit([])) setSelectedId(null);
  }, [commit]);

  return { entries, selectedId, selectedEntry: entries.find((entry) => entry.id === selectedId) ?? null, storageError, selectEntry: setSelectedId, addExecution, updateReview, removeOne, removeAll };
}
