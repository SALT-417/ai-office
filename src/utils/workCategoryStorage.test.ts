import { loadWorkCategory, saveWorkCategory, WORK_CATEGORY_STORAGE_KEY } from './workCategoryStorage';

describe('work category storage', () => {
  it('starts with general and restores a saved versioned category', () => {
    expect(loadWorkCategory()).toBe('general');
    saveWorkCategory('content');
    expect(JSON.parse(localStorage.getItem(WORK_CATEGORY_STORAGE_KEY) ?? '{}')).toEqual({ version: 1, category: 'content' });
    expect(loadWorkCategory()).toBe('content');
  });

  it.each(['{broken', JSON.stringify({ version: 0, category: 'learning' }), JSON.stringify({ version: 1, category: 'invalid' })])('recovers unsafe data to general', (stored) => {
    localStorage.setItem(WORK_CATEGORY_STORAGE_KEY, stored);
    expect(loadWorkCategory()).toBe('general');
  });

  it('does not change unrelated localStorage values', () => {
    localStorage.setItem('other-key', 'keep');
    saveWorkCategory('development');
    expect(localStorage.getItem('other-key')).toBe('keep');
  });
});
