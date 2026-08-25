// @vitest-environment node

import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach } from 'vitest';
import { createApp } from './app';
import { ManagerError, MAX_TASK_LENGTH, type ManagerReply } from './manager';
import type { WorkResponse } from './work';

let server: Server | undefined;

afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
  server = undefined;
});

async function startApi(managerReply: (task: string) => Promise<ManagerReply>) {
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
    const managerReply = vi.fn().mockResolvedValue({ reply: '整形済みの返答', plan });
    const url = await startApi(managerReply);
    const response = await post(url, { task: '  品質を確認してください  ' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ manager: 'レン', reply: '整形済みの返答', plan });
    expect(managerReply).toHaveBeenCalledWith('品質を確認してください');
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
    const result: WorkResponse = { coordinator: 'レン', task: '品質を確認する', results: [{ employeeId: 'aki', name: 'アキ', role: 'テスト、品質、アクセシビリティ', status: 'completed', title: '確認表', content: '確認項目' }] };
    const workReply = vi.fn().mockResolvedValue(result);
    const url = await startWorkApi(workReply);
    const response = await post(url, { task: '  品質を確認する  ', assignments: [{ name: 'レン', role: '広告担当' }] });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(workReply).toHaveBeenCalledWith('品質を確認する', expect.any(AbortSignal));
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
