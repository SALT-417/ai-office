import { normalizeWorkCategory, type WorkCategory } from '../../shared/workCategories';

export const WORK_CATEGORY_STORAGE_KEY = 'ai-office-work-category-v1';

export function loadWorkCategory(storage: Storage = localStorage): WorkCategory {
  try {
    const raw = storage.getItem(WORK_CATEGORY_STORAGE_KEY);
    if (!raw) return 'general';
    const parsed = JSON.parse(raw) as { version?: unknown; category?: unknown };
    return parsed.version === 1 ? normalizeWorkCategory(parsed.category) : 'general';
  } catch { return 'general'; }
}

export function saveWorkCategory(category: WorkCategory, storage: Storage = localStorage): void {
  storage.setItem(WORK_CATEGORY_STORAGE_KEY, JSON.stringify({ version: 1, category }));
}

