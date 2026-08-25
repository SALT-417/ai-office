import type { WorkCategory } from '../../shared/workCategories';

export interface RequestTemplate {
  id: string;
  category: WorkCategory;
  title: string;
  description: string;
  prompt: string;
}

export interface CustomRequestTemplate {
  id: string;
  category: WorkCategory;
  title: string;
  prompt: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
