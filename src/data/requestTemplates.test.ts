import { requestTemplates, requestTemplatesByCategory } from './requestTemplates';
import { WORK_CATEGORIES } from '../../shared/workCategories';

describe('request templates', () => {
  it('defines three complete templates for each work category', () => {
    expect(requestTemplates).toHaveLength(15);
    expect(new Set(requestTemplates.map(({ id }) => id)).size).toBe(15);
    for (const { id } of WORK_CATEGORIES) {
      expect(requestTemplatesByCategory[id]).toHaveLength(3);
      for (const template of requestTemplatesByCategory[id]) {
        expect(template.category).toBe(id);
        expect(template.title.trim()).not.toBe('');
        expect(template.description.trim()).not.toBe('');
        expect(template.prompt.trim()).not.toBe('');
        expect(template.prompt.length).toBeLessThanOrEqual(2_000);
      }
    }
  });
});
