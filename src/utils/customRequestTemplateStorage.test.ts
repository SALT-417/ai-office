import type { CustomRequestTemplate } from '../types/requestTemplate';
import { CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY, loadCustomRequestTemplates, makeAutomaticTemplateTitle, MAX_CUSTOM_TEMPLATES, MAX_CUSTOM_TEMPLATES_PER_CATEGORY, saveCustomRequestTemplates } from './customRequestTemplateStorage';

function entry(index: number, overrides: Partial<CustomRequestTemplate> = {}): CustomRequestTemplate {
  const date = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
  return { id: `custom-${index}`, category: 'general', title: `テンプレート${index}`, prompt: `依頼文${index}`, createdAt: date, updatedAt: date, ...overrides };
}

describe('custom request template storage', () => {
  it('starts empty and restores a separate versioned store', () => {
    expect(loadCustomRequestTemplates()).toEqual([]);
    saveCustomRequestTemplates([entry(1)]);
    expect(JSON.parse(localStorage.getItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY) ?? '{}').version).toBe(1);
    expect(loadCustomRequestTemplates()).toEqual([entry(1)]);
  });

  it('recovers from broken JSON and old versions', () => {
    localStorage.setItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY, '{broken');
    expect(loadCustomRequestTemplates()).toEqual([]);
    localStorage.setItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY, JSON.stringify({ version: 0, entries: [entry(1)] }));
    expect(loadCustomRequestTemplates()).toEqual([]);
  });

  it('filters invalid category, dates, oversized values, duplicate ids and collection excess', () => {
    const entries = [
      entry(1, { category: 'invalid' as CustomRequestTemplate['category'] }),
      entry(2, { updatedAt: 'not-a-date' }),
      entry(3, { title: 'あ'.repeat(41) }),
      entry(4, { prompt: 'あ'.repeat(2_001) }),
      ...Array.from({ length: 12 }, (_, index) => entry(20 + index)),
      entry(99, { id: 'custom-20' }),
    ];
    localStorage.setItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY, JSON.stringify({ version: 1, entries }));
    const loaded = loadCustomRequestTemplates();
    expect(loaded).toHaveLength(MAX_CUSTOM_TEMPLATES_PER_CATEGORY);
    expect(new Set(loaded.map(({ id }) => id)).size).toBe(loaded.length);
    expect(loaded.length).toBeLessThanOrEqual(MAX_CUSTOM_TEMPLATES);
  });

  it('creates a safe automatic title from the prompt', () => {
    expect(makeAutomaticTemplateTitle('  短い依頼です  ')).toBe('短い依頼です');
    expect(makeAutomaticTemplateTitle('あ'.repeat(50))).toHaveLength(24);
  });
});
