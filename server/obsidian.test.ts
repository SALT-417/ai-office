import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MAX_OBSIDIAN_MARKDOWN_BYTES, ObsidianSaveError, saveObsidianMarkdown, type ObsidianSaveInput } from './obsidian';

const cleanup: string[] = [];

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  cleanup.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('Obsidian Vault save safety', () => {
  it('rejects an unset Vault directory without exposing an absolute path', async () => {
    await expect(saveObsidianMarkdown({ filename: 'note.md', markdown: '# note' }, {})).rejects.toMatchObject({ status: 503 });
    try { await saveObsidianMarkdown({ filename: 'note.md', markdown: '# note' }, {}); } catch (error) {
      expect((error as ObsidianSaveError).publicMessage).not.toMatch(/[A-Z]:\\|\/tmp\//i);
      expect((error as ObsidianSaveError).publicMessage).not.toContain('stack');
    }
  });

  it.each(['../note.md', 'folder/note.md', 'folder\\note.md', 'bad:name.md', 'bad?.md', 'note.txt', 'bad\0.md'])('rejects an unsafe filename: %s', async (filename) => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await expect(saveObsidianMarkdown({ filename, markdown: '# note' }, { vaultDir })).rejects.toBeInstanceOf(ObsidianSaveError);
  });

  it('rejects empty, non-string and oversized Markdown', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await expect(saveObsidianMarkdown({ filename: 'note.md', markdown: '' }, { vaultDir })).rejects.toMatchObject({ status: 400 });
    await expect(saveObsidianMarkdown({ filename: 'note.md', markdown: null }, { vaultDir })).rejects.toMatchObject({ status: 400 });
    await expect(saveObsidianMarkdown({ filename: 'note.md', markdown: 'あ'.repeat(MAX_OBSIDIAN_MARKDOWN_BYTES) }, { vaultDir })).rejects.toMatchObject({ status: 413 });
  });

  it('creates a configured subfolder and never overwrites an existing file', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    const first = await saveObsidianMarkdown({ filename: 'note.md', markdown: '# first' }, { vaultDir, exportSubdir: 'AI OFFICE' });
    const second = await saveObsidianMarkdown({ filename: 'note.md', markdown: '# second' }, { vaultDir, exportSubdir: 'AI OFFICE' });
    expect(first).toEqual({ saved: true, filename: 'note.md', relativePath: 'AI OFFICE/note.md', dailyNote: { appended: false, reason: 'not-requested' } });
    expect(second).toEqual({ saved: true, filename: 'note-2.md', relativePath: 'AI OFFICE/note-2.md', dailyNote: { appended: false, reason: 'not-requested' } });
    expect(await readFile(path.join(vaultDir, 'AI OFFICE', 'note.md'), 'utf8')).toBe('# first');
    expect(await readFile(path.join(vaultDir, 'AI OFFICE', 'note-2.md'), 'utf8')).toBe('# second');
  });

  it.each([
    ['general', '一般業務'],
    ['development', '開発'],
  ] as const)('saves work/%s in the fixed %s folder', async (category, folder) => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    const saved = await saveObsidianMarkdown({ filename: 'work.md', markdown: '# work', entryType: 'work', category }, { vaultDir, exportSubdir: 'AI OFFICE' });
    expect(saved.relativePath).toBe(`AI OFFICE/${folder}/work.md`);
    expect(await readFile(path.join(vaultDir, 'AI OFFICE', folder, 'work.md'), 'utf8')).toBe('# work');
  });

  it('saves analysis in the fixed analysis folder and ignores category or arbitrary folder input', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    const saved = await saveObsidianMarkdown({ filename: 'analysis.md', markdown: '# analysis', entryType: 'analysis', category: 'not-a-category', folder: '../../outside' } as ObsidianSaveInput & { folder: string }, { vaultDir });
    expect(saved.relativePath).toBe('AI OFFICE/分析/analysis.md');
    expect(saved.relativePath).not.toContain('outside');
  });

  it('rejects missing or invalid categories for work and invalid entry types', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await expect(saveObsidianMarkdown({ filename: 'work.md', markdown: '# work', entryType: 'work' }, { vaultDir })).rejects.toMatchObject({ status: 400 });
    await expect(saveObsidianMarkdown({ filename: 'work.md', markdown: '# work', entryType: 'work', category: 'unknown' }, { vaultDir })).rejects.toMatchObject({ status: 400 });
    await expect(saveObsidianMarkdown({ filename: 'work.md', markdown: '# work', entryType: 'other' }, { vaultDir })).rejects.toMatchObject({ status: 400 });
  });

  it('increments filenames inside the category folder', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    const input = { filename: 'work.md', markdown: '# work', entryType: 'work', category: 'development' };
    await saveObsidianMarkdown(input, { vaultDir });
    const second = await saveObsidianMarkdown(input, { vaultDir });
    expect(second.relativePath).toBe('AI OFFICE/開発/work-2.md');
  });

  it('rejects a symlink or junction that escapes the Vault', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    const outside = await temporaryDirectory('ai-office-outside-');
    await mkdir(path.join(vaultDir, 'safe'));
    await symlink(outside, path.join(vaultDir, 'safe', 'linked'), 'junction');
    await expect(saveObsidianMarkdown({ filename: 'note.md', markdown: '# note' }, { vaultDir, exportSubdir: 'safe/linked' })).rejects.toMatchObject({ status: 503 });
    await expect(readFile(path.join(outside, 'note.md'), 'utf8')).rejects.toBeTruthy();
  });

  it('does not overwrite a pre-existing file created outside the save function', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await mkdir(path.join(vaultDir, 'AI OFFICE'));
    await writeFile(path.join(vaultDir, 'AI OFFICE', 'note.md'), 'keep');
    const saved = await saveObsidianMarkdown({ filename: 'note.md', markdown: 'new' }, { vaultDir });
    expect(saved.filename).toBe('note-2.md');
    expect(await readFile(path.join(vaultDir, 'AI OFFICE', 'note.md'), 'utf8')).toBe('keep');
  });

  it('keeps the individual save successful when Daily notes are disabled', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    const saved = await saveObsidianMarkdown({ filename: 'work.md', markdown: '# full body', entryType: 'work', category: 'development', dailyNote: { enabled: true, title: 'API改善', summary: '承認済み成果物を保存しました。', employees: ['ソウ'] } }, { vaultDir, dailyNotesEnabled: false });
    expect(saved.dailyNote).toEqual({ appended: false, reason: 'disabled' });
    expect(await readFile(path.join(vaultDir, 'AI OFFICE', '開発', 'work.md'), 'utf8')).toBe('# full body');
  });

  it('creates and appends a short UTF-8 Daily log while preserving existing content', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await mkdir(path.join(vaultDir, 'Daily'));
    const dailyPath = path.join(vaultDir, 'Daily', '2026-08-26.md');
    await writeFile(dailyPath, '# 既存ノート\n', 'utf8');
    const input = { filename: 'work.md', markdown: '# 個別Markdown全文はDailyへ入れない', entryType: 'work', category: 'development', dailyNote: { enabled: true, title: 'API改善', summary: '承認済み成果物を保存しました。', employees: ['ソウ'] } };
    const config = { vaultDir, dailyNotesEnabled: true, dailyNotesSubdir: 'Daily', now: () => new Date(2026, 7, 26, 10, 35) };
    const first = await saveObsidianMarkdown(input, config);
    const second = await saveObsidianMarkdown(input, config);
    const daily = await readFile(dailyPath, 'utf8');
    expect(first.dailyNote).toEqual({ appended: true, relativePath: 'Daily/2026-08-26.md' });
    expect(second.dailyNote).toEqual({ appended: true, relativePath: 'Daily/2026-08-26.md' });
    expect(daily).toContain('# 既存ノート');
    expect(daily.match(/10:35 作業履歴/g)).toHaveLength(2);
    expect(daily).toContain('カテゴリ: 開発');
    expect(daily).toContain('担当: ソウ');
    expect(daily).toContain('保存先: AI OFFICE/開発/work');
    expect(daily).toContain('メモ: 承認済み成果物を保存しました');
    expect(daily).not.toContain('個別Markdown全文はDailyへ入れない');
  });

  it('creates an analysis Daily note without exposing absolute paths', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    const saved = await saveObsidianMarkdown({ filename: 'analysis.md', markdown: '# analysis', entryType: 'analysis', dailyNote: { enabled: true, title: '入力検証の分析', summary: '承認済み分析を保存しました。', employees: ['アキ'] } }, { vaultDir, dailyNotesEnabled: true, now: () => new Date(2026, 7, 26, 11, 5) });
    expect(saved.dailyNote).toEqual({ appended: true, relativePath: 'Daily/2026-08-26.md' });
    expect(JSON.stringify(saved)).not.toContain(vaultDir);
    expect(await readFile(path.join(vaultDir, 'Daily', '2026-08-26.md'), 'utf8')).toContain('11:05 分析履歴');
  });

  it('escapes HTML and Markdown syntax in Daily metadata as inert text', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await saveObsidianMarkdown({ filename: 'work.md', markdown: '# work', entryType: 'work', category: 'general', dailyNote: { enabled: true, title: '<script>*確認*</script>', summary: '[リンク](javascript:alert(1))', employees: ['ソウ'] } }, { vaultDir, dailyNotesEnabled: true, now: () => new Date(2026, 7, 26, 12, 0) });
    const daily = await readFile(path.join(vaultDir, 'Daily', '2026-08-26.md'), 'utf8');
    expect(daily).toContain('&lt;script&gt;\\*確認\\*&lt;/script&gt;');
    expect(daily).toContain('\\[リンク\\]\\(javascript:alert\\(1\\)\\)');
    expect(daily).not.toContain('<script>');
  });

  it.each([
    [{ enabled: true, title: '', summary: 'メモ', employees: [] }],
    [{ enabled: true, title: 'a'.repeat(81), summary: 'メモ', employees: [] }],
    [{ enabled: true, title: '題名', summary: 'a'.repeat(201), employees: [] }],
    [{ enabled: true, title: '題名\n改行', summary: 'メモ', employees: [] }],
  ])('rejects invalid Daily metadata before writing an individual file', async (dailyNote) => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await expect(saveObsidianMarkdown({ filename: 'work.md', markdown: '# work', entryType: 'work', category: 'general', dailyNote }, { vaultDir, dailyNotesEnabled: true })).rejects.toMatchObject({ status: 400 });
    await expect(readFile(path.join(vaultDir, 'AI OFFICE', '一般業務', 'work.md'), 'utf8')).rejects.toBeTruthy();
  });

  it.each(['../Daily', 'C:\\Daily', 'Daily\\mixed/path', 'bad:name', 'bad\0name'])('rejects an unsafe Daily subdirectory setting: %s', async (dailyNotesSubdir) => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await expect(saveObsidianMarkdown({ filename: 'work.md', markdown: '# work', entryType: 'work', category: 'general', dailyNote: { enabled: true, title: '題名', summary: 'メモ', employees: [] } }, { vaultDir, dailyNotesEnabled: true, dailyNotesSubdir })).rejects.toMatchObject({ status: 503 });
  });

  it('keeps the individual save when only Daily append fails', async () => {
    const vaultDir = await temporaryDirectory('ai-office-vault-');
    await writeFile(path.join(vaultDir, 'Daily'), 'not a directory');
    const saved = await saveObsidianMarkdown({ filename: 'work.md', markdown: '# work', entryType: 'work', category: 'general', dailyNote: { enabled: true, title: '題名', summary: 'メモ', employees: [] } }, { vaultDir, dailyNotesEnabled: true });
    expect(saved.dailyNote).toEqual({ appended: false, reason: 'failed' });
    expect(await readFile(path.join(vaultDir, 'AI OFFICE', '一般業務', 'work.md'), 'utf8')).toBe('# work');
  });
});
