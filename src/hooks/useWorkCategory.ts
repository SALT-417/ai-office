import { useState } from 'react';
import type { WorkCategory } from '../../shared/workCategories';
import { loadWorkCategory, saveWorkCategory } from '../utils/workCategoryStorage';

export function useWorkCategory() {
  const [category, setCategoryState] = useState<WorkCategory>(loadWorkCategory);
  const [storageError, setStorageError] = useState<string | null>(null);
  const setCategory = (next: WorkCategory) => {
    setCategoryState(next);
    try { saveWorkCategory(next); setStorageError(null); }
    catch { setStorageError('業務カテゴリをブラウザへ保存できませんでした。現在の選択はこの画面で利用できます。'); }
  };
  return { category, setCategory, storageError };
}
