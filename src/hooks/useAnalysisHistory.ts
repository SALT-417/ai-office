import { useCallback, useRef, useState } from 'react';
import type { AnalysisHistoryEntry, AnalysisResponse } from '../types/analysis';
import type { ReviewStatus } from '../types/history';
import { loadAnalysisHistory, MAX_ANALYSIS_HISTORY_ENTRIES, saveAnalysisHistory } from '../utils/analysisHistoryStorage';

const storageMessage = '分析履歴をブラウザへ保存できませんでした。現在の分析結果は画面で確認できます。';
export function useAnalysisHistory() {
  const initial = useRef(loadAnalysisHistory());
  const [entries, setEntries] = useState<AnalysisHistoryEntry[]>(initial.current);
  const [selectedId, setSelectedId] = useState<string | null>(initial.current[0]?.id ?? null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const handledIds = useRef(new Set(initial.current.map((entry) => entry.id)));
  const commit = useCallback((next: AnalysisHistoryEntry[]) => {
    try { saveAnalysisHistory(next); setEntries(next); setStorageError(null); return true; }
    catch { setStorageError(storageMessage); return false; }
  }, []);
  const add = useCallback((id: string, result: AnalysisResponse) => {
    if (!id || handledIds.current.has(id)) return;
    handledIds.current.add(id);
    const now = new Date().toISOString();
    const next = [{ ...result, id, createdAt: now, updatedAt: now, reviewStatus: 'pending' as const, reviewNote: '' }, ...entries].slice(0, MAX_ANALYSIS_HISTORY_ENTRIES);
    if (commit(next)) setSelectedId(id);
  }, [commit, entries]);
  const review = useCallback((id: string, reviewStatus: ReviewStatus, reviewNote: string) => commit(entries.map((entry) => entry.id === id ? { ...entry, reviewStatus, reviewNote: reviewNote.slice(0, 1_000), updatedAt: new Date().toISOString() } : entry)), [commit, entries]);
  const remove = useCallback((id: string) => { const next = entries.filter((entry) => entry.id !== id); if (commit(next)) setSelectedId((current) => current === id ? next[0]?.id ?? null : current); }, [commit, entries]);
  return { entries, selectedEntry: entries.find((entry) => entry.id === selectedId) ?? null, selectedId, storageError, add, review, remove, select: setSelectedId };
}
