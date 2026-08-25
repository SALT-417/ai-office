import { CATEGORY_EMPLOYEE_ROLES, normalizeWorkCategory, WORK_CATEGORIES } from './workCategories';

describe('work category definitions', () => {
  it('defines the five shared typed categories with UI metadata and all employees', () => {
    expect(WORK_CATEGORIES.map(({ id }) => id)).toEqual(['general', 'learning', 'development', 'career', 'content']);
    for (const category of WORK_CATEGORIES) {
      expect(category.label).not.toBe('');
      expect(category.description).not.toBe('');
      expect(category.example).not.toBe('');
      expect(Object.keys(CATEGORY_EMPLOYEE_ROLES[category.id])).toEqual(['レン', 'ミオ', 'ソウ', 'ユナ', 'アキ']);
    }
  });

  it('safely normalizes invalid values to general', () => {
    expect(normalizeWorkCategory('learning')).toBe('learning');
    expect(normalizeWorkCategory('unknown')).toBe('general');
    expect(normalizeWorkCategory(null)).toBe('general');
  });
});
