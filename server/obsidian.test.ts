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
    expect(first).toEqual({ saved: true, filename: 'note.md', relativePath: 'AI OFFICE/note.md' });
    expect(second).toEqual({ saved: true, filename: 'note-2.md', relativePath: 'AI OFFICE/note-2.md' });
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
});
