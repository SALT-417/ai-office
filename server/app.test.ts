// @vitest-environment node

import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach } from 'vitest';
import { createApp, type AppDependencies } from './app';
import { ManagerError, MAX_TASK_LENGTH, type ManagerReply } from './manager';
import type { WorkResponse } from './work';
import { ProjectAnalysisError, type AnalysisResponse, type AnalyzeRequest, type ProjectFileInfo } from './project-analysis';
import { ObsidianSaveError } from './obsidian';

let server: Server | undefined;

afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
  server = undefined;
});

async function startApi(managerReply: (task: string, category?: import('../shared/workCategories').WorkCategory) => Promise<ManagerReply>) {
  server = createApp({ managerReply }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server?.once('listening', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}/api/manager`;
}

async function post(url: string, body: unknown) {
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

describe('POST /api/manager', () => {
  it('normalizes a task and returns Ren reply', async () => {
    const plan = { summary: '品質確認の依頼です。', assignments: [{ name: 'アキ' as const, task: 'テスト、品質、アクセシビリティ' }], firstActions: ['確認項目を作る。', '主要操作を確認する。'] };
    const managerReply = vi.fn().mockResolvedValue({ category: 'general', reply: '整形済みの返答', plan });
    const url = await startApi(managerReply);
    const response = await post(url, { task: '  品質を確認してください  ' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ manager: 'レン', category: 'general', reply: '整形済みの返答', plan });
    expect(managerReply).toHaveBeenCalledWith('品質を確認してください', 'general');
  });

  it('passes an explicit category and rejects unknown values', async () => {
    const plan = { summary: '学習計画', assignments: [], firstActions: ['目標を決める', '演習を選ぶ'] };
    const managerReply = vi.fn().mockResolvedValue({ category: 'learning', reply: '返答', plan });
    const url = await startApi(managerReply);
    expect((await post(url, { task: 'Reactを学ぶ', category: 'learning' })).status).toBe(200);
    expect(managerReply).toHaveBeenCalledWith('Reactを学ぶ', 'learning');
    const invalid = await post(url, { task: 'Reactを学ぶ', category: 'unknown' });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: 'categoryの値が正しくありません。' });
  });

  it.each([
    [{}, 'taskには文字列を指定してください。'],
    [{ task: 42 }, 'taskには文字列を指定してください。'],
    [{ task: '   ' }, '依頼内容を入力してください。'],
    [{ task: 'あ'.repeat(MAX_TASK_LENGTH + 1) }, `依頼内容は${MAX_TASK_LENGTH}文字以内で入力してください。`],
  ])('rejects invalid input', async (body, message) => {
    const url = await startApi(vi.fn());
    const response = await post(url, body);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
  });

  it('maps timeouts to a safe Japanese error', async () => {
    const url = await startApi(async () => { throw new ManagerError('OLLAMA_TIMEOUT', 'レンからの返答がタイムアウトしました。'); });
    const response = await post(url, { task: '進捗を確認してください' });
    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({ error: 'レンからの返答がタイムアウトしました。' });
  });

  it('does not expose unexpected internal error details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const url = await startApi(async () => { throw new Error('secret stack detail'); });
    const response = await post(url, { task: '確認してください' });
    const body = await response.text();
    expect(response.status).toBe(500);
    expect(body).not.toContain('secret stack detail');
    expect(body).not.toContain('stack');
    consoleError.mockRestore();
  });
});

describe('POST /api/work', () => {
  async function startWorkApi(workReply: (task: string, signal?: AbortSignal) => Promise<WorkResponse>) {
    server = createApp({ workReply }).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server?.once('listening', resolve));
    const address = server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}/api/work`;
  }

  it('normalizes the task and returns structured employee results', async () => {
    const result: WorkResponse = { coordinator: 'レン', category: 'general', task: '品質を確認する', results: [{ employeeId: 'aki', name: 'アキ', role: 'テスト、品質、アクセシビリティ', status: 'completed', title: '確認表', content: '確認項目' }] };
    const workReply = vi.fn().mockResolvedValue(result);
    const url = await startWorkApi(workReply);
    const response = await post(url, { task: '  品質を確認する  ', assignments: [{ name: 'レン', role: '広告担当' }] });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(workReply).toHaveBeenCalledWith('品質を確認する', expect.any(AbortSignal), 'general');
  });

  it.each([
    [{}, 'taskには文字列を指定してください。'],
    [{ task: 7 }, 'taskには文字列を指定してください。'],
    [{ task: '  ' }, '依頼内容を入力してください。'],
    [{ task: 'あ'.repeat(MAX_TASK_LENGTH + 1) }, `依頼内容は${MAX_TASK_LENGTH}文字以内で入力してください。`],
  ])('rejects invalid work input', async (body, message) => {
    const url = await startWorkApi(vi.fn());
    const response = await post(url, body);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
  });

  it('does not expose internal work errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const url = await startWorkApi(async () => { throw new Error('secret work stack'); });
    const response = await post(url, { task: 'APIを実装する' });
    const body = await response.text();
    expect(response.status).toBe(500);
    expect(body).not.toContain('secret work stack');
    expect(body).not.toContain('stack');
    consoleError.mockRestore();
  });
});

describe('project analysis API', () => {
  async function startAnalysisApi(projectFiles: () => Promise<ProjectFileInfo[]>, analysisReply: (input: AnalyzeRequest, signal?: AbortSignal) => Promise<AnalysisResponse>) {
    server = createApp({ projectFiles, analysisReply }).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server?.once('listening', resolve));
    const address = server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}/api`;
  }

  it('returns only the injected relative file metadata and passes typed analysis input', async () => {
    const files: ProjectFileInfo[] = [{ path: 'src/App.tsx', category: 'frontend', size: 100 }];
    const result: AnalysisResponse = { specialist: 'sou', specialistName: 'ソウ', objective: '確認', analyzedFiles: ['src/App.tsx'], redacted: false, summary: '要約', findings: [{ title: '提案', severity: 'low', evidence: [{ path: 'src/App.tsx', line: 1, description: '根拠' }], recommendation: '改善', completionCriteria: ['完了'], verification: ['確認'] }] };
    const analysisReply = vi.fn().mockResolvedValue(result);
    const base = await startAnalysisApi(async () => files, analysisReply);
    await expect((await fetch(`${base}/project-files`)).json()).resolves.toEqual({ files });
    const response = await post(`${base}/analyze`, { objective: '確認', specialist: 'sou', files: ['src/App.tsx'], absolutePath: 'C:/secret' });
    await expect(response.json()).resolves.toEqual(result);
    expect(analysisReply).toHaveBeenCalledWith({ objective: '確認', specialist: 'sou', files: ['src/App.tsx'] }, expect.any(AbortSignal));
  });

  it('returns public validation errors and never exposes internal details or absolute paths', async () => {
    const base = await startAnalysisApi(async () => [], async () => { throw new ProjectAnalysisError(400, '選択ファイルを確認してください。'); });
    const response = await post(`${base}/analyze`, { objective: '', specialist: 'sou', files: [] });
    const body = await response.text();
    expect(response.status).toBe(400); expect(body).toContain('選択ファイルを確認してください'); expect(body).not.toMatch(/[A-Z]:\\|stack/i);
  });

  it('hides unexpected file-list and analysis errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const base = await startAnalysisApi(async () => { throw new Error('C:\\private\\secret'); }, async () => { throw new Error('internal stack'); });
    const listBody = await (await fetch(`${base}/project-files`)).text();
    const analysisBody = await (await post(`${base}/analyze`, { objective: 'x', specialist: 'aki', files: ['src/a.ts'] })).text();
    expect(listBody).not.toContain('private'); expect(analysisBody).not.toContain('internal'); expect(analysisBody).not.toContain('stack');
    consoleError.mockRestore();
  });
});

describe('POST /api/obsidian/save', () => {
  async function startObsidianApi(obsidianSave: NonNullable<AppDependencies['obsidianSave']>) {
    server = createApp({ obsidianSave, obsidianConfig: { vaultDir: 'server-only', exportSubdir: 'AI OFFICE' } }).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server?.once('listening', resolve));
    const address = server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}/api/obsidian/save`;
  }

  it('passes only filename and Markdown and returns relative save information', async () => {
    const obsidianSave = vi.fn().mockResolvedValue({ saved: true as const, filename: 'note.md', relativePath: 'AI OFFICE/note.md' });
    const url = await startObsidianApi(obsidianSave);
    const response = await post(url, { filename: 'note.md', markdown: '# note', vaultPath: 'C:\\private' });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ saved: true, filename: 'note.md', relativePath: 'AI OFFICE/note.md' });
    expect(obsidianSave).toHaveBeenCalledWith({ filename: 'note.md', markdown: '# note' }, { vaultDir: 'server-only', exportSubdir: 'AI OFFICE' });
  });

  it('returns safe public errors without absolute paths or stacks', async () => {
    const url = await startObsidianApi(async () => { throw new ObsidianSaveError(503, 'Obsidian Vaultの保存先が設定されていません。'); });
    const response = await post(url, { filename: 'note.md', markdown: '# note' });
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).toContain('保存先が設定されていません');
    expect(body).not.toMatch(/[A-Z]:\\|stack/i);
  });
});
