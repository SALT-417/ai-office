import { isWorkCategory } from '../../shared/workCategories';
import type { CustomRequestTemplate } from '../types/requestTemplate';

export const CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY = 'ai-office-custom-request-templates-v1';
export const MAX_CUSTOM_TEMPLATES = 30;
export const MAX_CUSTOM_TEMPLATES_PER_CATEGORY = 10;
export const MAX_CUSTOM_TEMPLATE_TITLE_LENGTH = 40;
export const MAX_CUSTOM_TEMPLATE_PROMPT_LENGTH = 2_000;

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isCustomRequestTemplate(value: unknown): value is CustomRequestTemplate {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<CustomRequestTemplate>;
  return typeof entry.id === 'string' && entry.id.length > 0 && entry.id.length <= 100
    && isWorkCategory(entry.category)
    && typeof entry.title === 'string' && entry.title.trim().length >= 1 && entry.title.length <= MAX_CUSTOM_TEMPLATE_TITLE_LENGTH
    && typeof entry.prompt === 'string' && entry.prompt.trim().length >= 1 && entry.prompt.length <= MAX_CUSTOM_TEMPLATE_PROMPT_LENGTH
    && (entry.description === undefined || (typeof entry.description === 'string' && entry.description.length <= 200))
    && isIsoDate(entry.createdAt) && isIsoDate(entry.updatedAt);
}

export function loadCustomRequestTemplates(storage: Storage = localStorage): CustomRequestTemplate[] {
  try {
    const raw = storage.getItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: unknown; entries?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) return [];
    const counts = new Map<string, number>();
    const ids = new Set<string>();
    return parsed.entries
      .filter(isCustomRequestTemplate)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .filter((entry) => {
        if (ids.has(entry.id)) return false;
        const count = counts.get(entry.category) ?? 0;
        if (count >= MAX_CUSTOM_TEMPLATES_PER_CATEGORY) return false;
        ids.add(entry.id);
        counts.set(entry.category, count + 1);
        return true;
      })
      .slice(0, MAX_CUSTOM_TEMPLATES);
  } catch {
    return [];
  }
}

export function saveCustomRequestTemplates(entries: CustomRequestTemplate[], storage: Storage = localStorage): void {
  storage.setItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY, JSON.stringify({ version: 1, entries }));
}

export function createCustomTemplateId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto.getRandomValues === 'function') {
      const values = crypto.getRandomValues(new Uint32Array(4));
      return `custom-${[...values].map((value) => value.toString(36)).join('-')}`;
    }
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function makeAutomaticTemplateTitle(prompt: string): string {
  const compact = prompt.trim().replace(/\s+/g, ' ');
  return compact.length <= 24 ? compact : `${compact.slice(0, 23)}…`;
}
