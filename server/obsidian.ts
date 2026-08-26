import { appendFile, lstat, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isWorkCategory, OBSIDIAN_CATEGORY_FOLDER_BY_ID } from '../shared/workCategories';

export const MAX_OBSIDIAN_MARKDOWN_BYTES = 100 * 1024;
const MAX_FILENAME_LENGTH = 180;
const WINDOWS_FORBIDDEN = /[<>:"|?*]/;

export interface ObsidianSaveInput {
  filename: unknown;
  markdown: unknown;
  entryType?: unknown;
  category?: unknown;
  dailyNote?: unknown;
}

export type ObsidianEntryType = 'work' | 'analysis';

export interface ObsidianSaveResult {
  saved: true;
  filename: string;
  relativePath: string;
  dailyNote: ObsidianDailyResult;
}

export type ObsidianDailyResult =
  | { appended: true; relativePath: string }
  | { appended: false; reason: 'not-requested' | 'disabled' | 'failed' };

export interface ObsidianSaveConfig {
  vaultDir?: string;
  exportSubdir?: string;
  dailyNotesEnabled?: boolean;
  dailyNotesSubdir?: string;
  now?: () => Date;
}

export interface ObsidianStatusResult {
  available: boolean;
  vaultSaveEnabled: boolean;
  exportSubdir: string;
  dailyNotesEnabled: boolean;
  dailyNotesSubdir: string;
  message: string;
}

export class ObsidianSaveError extends Error {
  constructor(public readonly status: number, public readonly publicMessage: string) {
    super(publicMessage);
  }
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateFilename(value: unknown): string {
  if (typeof value !== 'string') throw new ObsidianSaveError(400, 'filenameには文字列を指定してください。');
  if (!value || value.length > MAX_FILENAME_LENGTH || value !== path.basename(value) || value.includes('/') || value.includes('\\') || value.includes('..') || value.includes('\0') || WINDOWS_FORBIDDEN.test(value) || [...value].some((character) => character.charCodeAt(0) < 32)) {
    throw new ObsidianSaveError(400, 'ファイル名が正しくありません。');
  }
  if (path.extname(value).toLowerCase() !== '.md') throw new ObsidianSaveError(400, '保存できる拡張子は.mdだけです。');
  return value;
}

function validateMarkdown(value: unknown): string {
  if (typeof value !== 'string') throw new ObsidianSaveError(400, 'markdownには文字列を指定してください。');
  if (value.length === 0) throw new ObsidianSaveError(400, 'Markdown本文を入力してください。');
  if (Buffer.byteLength(value, 'utf8') > MAX_OBSIDIAN_MARKDOWN_BYTES) throw new ObsidianSaveError(413, 'Markdown本文は100KB以内にしてください。');
  return value;
}

function subdirectoryParts(value: string | undefined): string[] {
  const subdir = value === undefined ? 'AI OFFICE' : value.trim();
  if (!subdir) return [];
  if (subdir.includes('\0') || path.isAbsolute(subdir)) throw new ObsidianSaveError(503, 'Obsidian保存先の設定が正しくありません。');
  const parts = subdir.split(/[\\/]/);
  if (parts.some((part) => !part || part === '.' || part === '..' || WINDOWS_FORBIDDEN.test(part) || [...part].some((character) => character.charCodeAt(0) < 32))) {
    throw new ObsidianSaveError(503, 'Obsidian保存先の設定が正しくありません。');
  }
  return parts;
}

function dailySubdirectoryParts(value: string | undefined): string[] {
  const subdir = value === undefined ? 'Daily' : value.trim();
  if (subdir.includes('/') && subdir.includes('\\')) throw new ObsidianSaveError(503, 'Dailyノート保存先の設定が正しくありません。');
  try {
    return subdirectoryParts(subdir);
  } catch {
    throw new ObsidianSaveError(503, 'Dailyノート保存先の設定が正しくありません。');
  }
}

function displaySubdirectory(parts: string[]): string {
  return parts.length ? parts.join('/') : 'Vault直下';
}

export function getObsidianStatus(config: ObsidianSaveConfig = {}): ObsidianStatusResult {
  const vaultConfigured = Boolean(config.vaultDir?.trim());
  let exportParts: string[];
  let dailyParts: string[];
  try {
    exportParts = subdirectoryParts(config.exportSubdir);
    dailyParts = dailySubdirectoryParts(config.dailyNotesSubdir);
  } catch {
    return {
      available: false,
      vaultSaveEnabled: false,
      exportSubdir: '設定不正',
      dailyNotesEnabled: false,
      dailyNotesSubdir: '設定不正',
      message: 'Obsidianの保存先サブフォルダ設定が正しくないため、Vault保存は無効です。',
    };
  }
  if (!vaultConfigured) {
    return {
      available: false,
      vaultSaveEnabled: false,
      exportSubdir: displaySubdirectory(exportParts),
      dailyNotesEnabled: false,
      dailyNotesSubdir: displaySubdirectory(dailyParts),
      message: 'OBSIDIAN_VAULT_DIR が未設定のため、Vault保存は無効です。',
    };
  }
  return {
    available: true,
    vaultSaveEnabled: true,
    exportSubdir: displaySubdirectory(exportParts),
    dailyNotesEnabled: Boolean(config.dailyNotesEnabled),
    dailyNotesSubdir: displaySubdirectory(dailyParts),
    message: config.dailyNotesEnabled
      ? 'Vault保存と、確認時に選択したDailyノート追記を利用できます。'
      : 'Vault保存を利用できます。Dailyノート追記は設定で無効です。',
  };
}

interface ValidDailyNote {
  enabled: boolean;
  title?: string;
  summary?: string;
  employees: string[];
}

function validateDailyNote(value: unknown): ValidDailyNote {
  if (value === undefined) return { enabled: false, employees: [] };
  if (typeof value !== 'object' || value === null || !('enabled' in value) || typeof value.enabled !== 'boolean') {
    throw new ObsidianSaveError(400, 'dailyNoteの形式が正しくありません。');
  }
  if (!value.enabled) return { enabled: false, employees: [] };
  const title = 'title' in value ? value.title : undefined;
  const summary = 'summary' in value ? value.summary : undefined;
  const employees = 'employees' in value ? value.employees : [];
  if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 80 || /[\r\n]/.test(title) || [...title].some((character) => character.charCodeAt(0) < 32)) {
    throw new ObsidianSaveError(400, 'Dailyノートのタイトルは改行なしの1〜80文字で指定してください。');
  }
  if (typeof summary !== 'string' || summary.trim().length < 1 || summary.trim().length > 200 || /[\r\n]/.test(summary) || [...summary].some((character) => character.charCodeAt(0) < 32)) {
    throw new ObsidianSaveError(400, 'Dailyノートのメモは改行なしの1〜200文字で指定してください。');
  }
  if (!Array.isArray(employees) || employees.length > 5 || !employees.every((employee) => typeof employee === 'string' && employee.trim().length >= 1 && employee.trim().length <= 20 && !/[\r\n]/.test(employee))) {
    throw new ObsidianSaveError(400, 'Dailyノートの担当者が正しくありません。');
  }
  return { enabled: true, title: title.trim(), summary: summary.trim(), employees: employees.map((employee) => employee.trim()) };
}

function entrySubdirectory(input: ObsidianSaveInput): string[] {
  if (input.entryType === undefined) return [];
  if (input.entryType === 'analysis') return ['分析'];
  if (input.entryType !== 'work') throw new ObsidianSaveError(400, 'entryTypeの値が正しくありません。');
  if (!isWorkCategory(input.category)) throw new ObsidianSaveError(400, '作業履歴のcategoryが正しくありません。');
  return [OBSIDIAN_CATEGORY_FOLDER_BY_ID[input.category]];
}

async function safeExportDirectory(root: string, parts: string[]): Promise<string> {
  let current = root;
  for (const part of parts) {
    const next = path.join(current, part);
    try {
      const info = await lstat(next);
      if (info.isSymbolicLink() || !info.isDirectory()) throw new ObsidianSaveError(503, 'Obsidian保存先を安全に利用できません。');
    } catch (error) {
      if (error instanceof ObsidianSaveError) throw error;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await mkdir(next);
    }
    const resolved = await realpath(next);
    if (!isInside(root, resolved)) throw new ObsidianSaveError(503, 'Obsidian保存先を安全に利用できません。');
    current = resolved;
  }
  return current;
}

function numberedFilename(filename: string, number: number): string {
  if (number === 1) return filename;
  const extension = path.extname(filename);
  return `${filename.slice(0, -extension.length)}-${number}${extension}`;
}

function localDateParts(date: Date): { date: string; time: string } {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function escapeDailyInline(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_{}[\]()#+.!|~-])/g, '\\$1');
}

async function appendDailyNote(vaultRoot: string, input: ObsidianSaveInput, savedRelativePath: string, daily: ValidDailyNote, config: ObsidianSaveConfig): Promise<ObsidianDailyResult> {
  if (!daily.enabled) return { appended: false, reason: 'not-requested' };
  if (!config.dailyNotesEnabled) return { appended: false, reason: 'disabled' };
  try {
    const parts = dailySubdirectoryParts(config.dailyNotesSubdir);
    const directory = await safeExportDirectory(vaultRoot, parts);
    const timestamp = localDateParts(config.now?.() ?? new Date());
    const filename = `${timestamp.date}.md`;
    const target = path.join(directory, filename);
    if (!isInside(vaultRoot, target) || path.dirname(target) !== directory) throw new Error('Unsafe daily target');
    try {
      const info = await lstat(target);
      if (info.isSymbolicLink() || !info.isFile()) throw new Error('Unsafe daily file');
      const existingPath = await realpath(target);
      if (!isInside(vaultRoot, existingPath) || path.dirname(existingPath) !== directory) throw new Error('Unsafe daily file');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const typeLabel = input.entryType === 'analysis' ? '分析履歴' : '作業履歴';
    const categoryLabel = input.entryType === 'analysis'
      ? '分析'
      : isWorkCategory(input.category) ? OBSIDIAN_CATEGORY_FOLDER_BY_ID[input.category] : '未指定';
    const employeeLabel = daily.employees.length ? daily.employees.map(escapeDailyInline).join('・') : '未指定';
    const log = `\n\n## AI OFFICE\n\n- ${timestamp.time} ${typeLabel}: ${escapeDailyInline(daily.title ?? '')}\n  - カテゴリ: ${categoryLabel}\n  - 担当: ${employeeLabel}\n  - 保存先: ${escapeDailyInline(savedRelativePath)}\n  - メモ: ${escapeDailyInline(daily.summary ?? '')}\n`;
    await appendFile(target, log, { encoding: 'utf8' });
    const savedPath = await realpath(target);
    if (!isInside(vaultRoot, savedPath) || path.dirname(savedPath) !== directory) throw new Error('Unsafe saved daily file');
    return { appended: true, relativePath: [...parts, filename].join('/') };
  } catch {
    return { appended: false, reason: 'failed' };
  }
}

export async function saveObsidianMarkdown(input: ObsidianSaveInput, config: ObsidianSaveConfig = {}): Promise<ObsidianSaveResult> {
  const filename = validateFilename(input.filename);
  const markdown = validateMarkdown(input.markdown);
  const daily = validateDailyNote(input.dailyNote);
  if (daily.enabled && config.dailyNotesEnabled) dailySubdirectoryParts(config.dailyNotesSubdir);
  const vaultDir = config.vaultDir?.trim();
  if (!vaultDir) throw new ObsidianSaveError(503, 'Obsidian Vaultの保存先が設定されていません。');

  let vaultRoot: string;
  try {
    vaultRoot = await realpath(vaultDir);
    const rootInfo = await lstat(vaultRoot);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('Invalid root');
  } catch {
    throw new ObsidianSaveError(503, 'Obsidian Vaultの保存先を利用できません。設定を確認してください。');
  }

  const parts = [...subdirectoryParts(config.exportSubdir), ...entrySubdirectory(input)];
  let exportDirectory: string;
  try {
    exportDirectory = await safeExportDirectory(vaultRoot, parts);
  } catch (error) {
    if (error instanceof ObsidianSaveError) throw error;
    throw new ObsidianSaveError(503, 'Obsidian保存先を準備できませんでした。');
  }

  for (let index = 1; index <= 9999; index += 1) {
    const candidateName = numberedFilename(filename, index);
    const candidate = path.join(exportDirectory, candidateName);
    if (!isInside(vaultRoot, candidate) || path.dirname(candidate) !== exportDirectory) throw new ObsidianSaveError(400, '保存先を安全に決定できませんでした。');
    try {
      await writeFile(candidate, markdown, { encoding: 'utf8', flag: 'wx' });
      const savedPath = await realpath(candidate);
      if (!isInside(vaultRoot, savedPath) || path.dirname(savedPath) !== exportDirectory) {
        await rm(candidate, { force: true });
        throw new ObsidianSaveError(503, '保存先の安全確認に失敗しました。');
      }
      const relativePath = [...parts, candidateName].join('/');
      const dailyNote = await appendDailyNote(vaultRoot, input, relativePath, daily, config);
      return { saved: true, filename: candidateName, relativePath, dailyNote };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
      if (error instanceof ObsidianSaveError) throw error;
      throw new ObsidianSaveError(500, 'Obsidian用Markdownを保存できませんでした。');
    }
  }
  throw new ObsidianSaveError(409, '同名ファイルが多いため保存できませんでした。');
}

export function getObsidianSaveConfig(environment: NodeJS.ProcessEnv = process.env): ObsidianSaveConfig {
  return {
    vaultDir: environment.OBSIDIAN_VAULT_DIR,
    exportSubdir: environment.OBSIDIAN_EXPORT_SUBDIR,
    dailyNotesEnabled: environment.OBSIDIAN_DAILY_NOTES_ENABLED?.trim().toLowerCase() === 'true',
    dailyNotesSubdir: environment.OBSIDIAN_DAILY_NOTES_SUBDIR,
  };
}
