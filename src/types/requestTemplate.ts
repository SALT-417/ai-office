import type { WorkCategory } from '../../shared/workCategories';

export interface RequestTemplate {
  id: string;
  category: WorkCategory;
  title: string;
  description: string;
  prompt: string;
}
