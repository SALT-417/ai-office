import { useState } from 'react';
import type { WorkCategory } from '../../shared/workCategories';
import type { CustomRequestTemplate } from '../types/requestTemplate';
import { createCustomTemplateId, loadCustomRequestTemplates, makeAutomaticTemplateTitle, MAX_CUSTOM_TEMPLATES, MAX_CUSTOM_TEMPLATES_PER_CATEGORY, MAX_CUSTOM_TEMPLATE_PROMPT_LENGTH, MAX_CUSTOM_TEMPLATE_TITLE_LENGTH, saveCustomRequestTemplates } from '../utils/customRequestTemplateStorage';

type OperationResult = { ok: true; message: string } | { ok: false; message: string };

export function useCustomRequestTemplates() {
  const [entries, setEntries] = useState<CustomRequestTemplate[]>(loadCustomRequestTemplates);

  const persist = (next: CustomRequestTemplate[]): OperationResult => {
    try {
      saveCustomRequestTemplates(next);
      setEntries(next);
      return { ok: true, message: '' };
    } catch {
      return { ok: false, message: '自分用テンプレートをブラウザへ保存できませんでした。保存容量を確認してください。' };
    }
  };

  const add = (category: WorkCategory, title: string, prompt: string): OperationResult => {
    const normalizedPrompt = prompt.trim();
    const normalizedTitle = title.trim() || makeAutomaticTemplateTitle(normalizedPrompt);
    if (!normalizedPrompt || normalizedPrompt.length > MAX_CUSTOM_TEMPLATE_PROMPT_LENGTH) return { ok: false, message: '依頼文は1〜2000文字で入力してください。' };
    if (!normalizedTitle || normalizedTitle.length > MAX_CUSTOM_TEMPLATE_TITLE_LENGTH) return { ok: false, message: 'タイトルは40文字以内で入力してください。' };
    if (entries.length >= MAX_CUSTOM_TEMPLATES) return { ok: false, message: '自分用テンプレートは全体で30件まで保存できます。' };
    if (entries.filter((entry) => entry.category === category).length >= MAX_CUSTOM_TEMPLATES_PER_CATEGORY) return { ok: false, message: '自分用テンプレートは1カテゴリ10件まで保存できます。' };
    const now = new Date().toISOString();
    const next = [{ id: createCustomTemplateId(), category, title: normalizedTitle, prompt: normalizedPrompt, createdAt: now, updatedAt: now }, ...entries];
    const result = persist(next);
    return result.ok ? { ok: true, message: '自分用テンプレートを保存しました。' } : result;
  };

  const rename = (id: string, title: string): OperationResult => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > MAX_CUSTOM_TEMPLATE_TITLE_LENGTH) return { ok: false, message: 'タイトルは1〜40文字で入力してください。' };
    const next = entries.map((entry) => entry.id === id ? { ...entry, title: normalizedTitle, updatedAt: new Date().toISOString() } : entry);
    const result = persist(next);
    return result.ok ? { ok: true, message: 'テンプレート名を変更しました。' } : result;
  };

  const remove = (id: string): OperationResult => {
    const result = persist(entries.filter((entry) => entry.id !== id));
    return result.ok ? { ok: true, message: '自分用テンプレートを削除しました。' } : result;
  };

  return { entries, add, rename, remove };
}
