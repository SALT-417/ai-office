import { lstat, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MAX_OBSIDIAN_MARKDOWN_BYTES = 100 * 1024;
const MAX_FILENAME_LENGTH = 180;
const WINDOWS_FORBIDDEN = /[<>:"|?*]/;

export interface ObsidianSaveInput {
  filename: unknown;
  markdown: unknown;
}

export interface ObsidianSaveResult {
  saved: true;
  filename: string;
  relativePath: string;
}

export interface ObsidianSaveConfig {
  vaultDir?: string;
  exportSubdir?: string;
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

export async function saveObsidianMarkdown(input: ObsidianSaveInput, config: ObsidianSaveConfig = {}): Promise<ObsidianSaveResult> {
  const filename = validateFilename(input.filename);
  const markdown = validateMarkdown(input.markdown);
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

  const parts = subdirectoryParts(config.exportSubdir);
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
      return { saved: true, filename: candidateName, relativePath: [...parts, candidateName].join('/') };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
      if (error instanceof ObsidianSaveError) throw error;
      throw new ObsidianSaveError(500, 'Obsidian用Markdownを保存できませんでした。');
    }
  }
  throw new ObsidianSaveError(409, '同名ファイルが多いため保存できませんでした。');
}

export function getObsidianSaveConfig(environment: NodeJS.ProcessEnv = process.env): ObsidianSaveConfig {
  return { vaultDir: environment.OBSIDIAN_VAULT_DIR, exportSubdir: environment.OBSIDIAN_EXPORT_SUBDIR };
}
