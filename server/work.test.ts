// @vitest-environment node

import { getServerConfig } from './config';
import { EMPLOYEE_ROLES } from './manager';
import { AI_OFFICE_PROJECT_CONTEXT } from './project-context';
import { requestWork, selectWorkAssignees } from './work';

const config = getServerConfig({});
const validProduct = (title: string) => new Response(JSON.stringify({ message: { content: JSON.stringify({ title, content: '- 確認項目\n- 次の行動' }) } }), { status: 200 });

describe('work execution', () => {
  it('selects only fixed-role specialists and safely falls back to Sou', () => {
    expect(selectWorkAssignees('転職向けにAI OFFICEのUIと品質を改善する')).toEqual(['ミオ', 'ソウ', 'ユナ', 'アキ']);
    expect(selectWorkAssignees('優先順位を整理してください')).toEqual(['ソウ']);
    expect(selectWorkAssignees('転職 AI UI テスト 求人 Web デザイン 品質')).toHaveLength(4);
  });

  it('uses fixed employee prompts, non-streaming JSON, and sequential execution', async () => {
    let active = 0;
    let maxActive = 0;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      return validProduct('実用的な成果物');
    });
    const result = await requestWork('転職 AI UI テスト', config, fetchMock);

    expect(result.coordinator).toBe('レン');
    expect(result.results).toHaveLength(4);
    expect(maxActive).toBe(1);
    for (const [index, call] of fetchMock.mock.calls.entries()) {
      const body = JSON.parse(String(call[1]?.body));
      const employee = result.results[index];
      expect(body).toMatchObject({ model: 'qwen2.5:3b', stream: false, format: 'json' });
      expect(body.messages[0].content).toContain(`名前：${employee.name}`);
      expect(body.messages[0].content).toContain(`固定役割：${EMPLOYEE_ROLES[employee.name]}`);
      expect(body.messages[0].content).toContain('ファイル変更、コマンド実行、Git操作、外部送信を行わず');
    }
  });

  it('keeps other employee results when one employee fails', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(validProduct('ミオの成果'))
      .mockRejectedValueOnce(new Error('private failure'))
      .mockResolvedValueOnce(validProduct('ユナの成果'))
      .mockResolvedValueOnce(validProduct('アキの成果'));
    const result = await requestWork('転職 AI UI テスト', config, fetchMock);

    expect(result.results.filter((item) => item.status === 'completed')).toHaveLength(3);
    expect(result.results.find((item) => item.name === 'ソウ')).toMatchObject({ status: 'failed', error: expect.stringContaining('完了できません') });
    expect(JSON.stringify(result)).not.toContain('private failure');
  });

  it('replaces an invalid Ollama response with a current-project fallback', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: { content: '<html>not json</html>' } }), { status: 200 }));
    const result = await requestWork('APIを実装する', config, fetchMock);
    expect(result.results).toEqual([expect.objectContaining({ name: 'ソウ', status: 'completed', title: '既存構成に沿った技術実装計画' })]);
    expect(result.results[0].content).toContain('React 19、TypeScript、Vite 7');
    expect(result.results[0].content).toContain('Node.js、Express、TypeScript');
    expect(result.results[0].content).toContain('Ollama、qwen2.5:3b');
    expect(result.results[0].content).toContain('Vitest、React Testing Library');
  });

  it('rejects invented current technologies and uses Sou fixed-structure fallback', async () => {
    const invented = JSON.stringify({
      title: '技術一覧',
      content: '## 現在の構成\nReact、TypeScript、Vite、MongoDB、Jest、Enzyme\nViteのbuilt-in serverをデータ同期基盤として使用\n## 次に実装する作業\nAPIを作る\n## 対象となる既存ファイルまたは機能\n確認済みのDB設定\n## 完了条件\n実装完了\n## テスト方法\nJestで確認',
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: { content: invented } }), { status: 200 }));
    const [result] = (await requestWork('APIを実装する', config, fetchMock)).results;

    expect(result.title).toBe('既存構成に沿った技術実装計画');
    expect(result.content).not.toContain('MongoDB');
    expect(result.content).not.toContain('Jest');
    expect(result.content).not.toContain('Enzyme');
    expect(result.content).not.toContain('確認済み');
    expect(result.content).toContain('次に実装する作業');
    expect(result.content).toContain('完了条件');
    expect(result.content).toContain('テスト方法');
  });

  it('rejects a plan that treats already implemented APIs as future work', async () => {
    const outdated = JSON.stringify({
      title: 'API実装作業',
      content: '現在の構成:\nReact 19、TypeScript、Vite 7、Express、Ollama、Vitest\n次に実装する作業:\nPOST /api/managerとPOST /api/workを実装する\n対象となる既存ファイルまたは機能:\n確認が必要\n完了条件:\nAPIが動く\nテスト方法:\nVitestを使う',
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: { content: outdated } }), { status: 200 }));
    const [result] = (await requestWork('API実装の次の作業を整理する', config, fetchMock)).results;
    expect(result.title).toBe('既存構成に沿った技術実装計画');
    expect(result.content).toContain('POST /api/manager、POST /api/work');
    expect(result.content).not.toContain('POST /api/managerとPOST /api/workを実装する');
  });

  it('passes the confirmed project context to every specialist prompt', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(validProduct('成果物'));
    await requestWork('転職 AI UI テスト', config, fetchMock);
    for (const call of fetchMock.mock.calls) {
      const body = JSON.parse(String(call[1]?.body));
      const prompt = body.messages[0].content as string;
      expect(prompt).toContain(AI_OFFICE_PROJECT_CONTEXT.frontend);
      expect(prompt).toContain(AI_OFFICE_PROJECT_CONTEXT.localApi);
      expect(prompt).toContain(AI_OFFICE_PROJECT_CONTEXT.localAi);
      expect(prompt).toContain(AI_OFFICE_PROJECT_CONTEXT.apiEndpoints);
      expect(prompt).toContain(AI_OFFICE_PROJECT_CONTEXT.tests);
      expect(prompt).toContain('データベース：使用していない');
      expect(prompt).toContain('未採用技術を現在使用中のように書かない');
    }
  });

  it('allows an unsupported technology only when it is clearly separated as a future proposal', async () => {
    const proposed = JSON.stringify({ title: '実装計画', content: '## 現在の構成\nReact 19、TypeScript、Vite 7、Express、Ollama、POST /api/manager、POST /api/work、Vitest\n## 次に実装する作業\n既存APIを改善する\n## 対象となる既存ファイルまたは機能\nPOST /api/work\n## 完了条件\n既存構成を維持する\n## テスト方法\nVitestを実行する\n## 提案\n将来の候補としてMongoDBを検討する' });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: { content: proposed } }), { status: 200 }));
    const [result] = (await requestWork('APIを実装する', config, fetchMock)).results;
    expect(result.title).toBe('実装計画');
    expect(result.content).toContain('将来の候補としてMongoDBを検討する');
  });

  it('limits the whole request and returns safe failures for remaining employees', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const result = await requestWork('転職 AI UI テスト', { ...config, timeoutMs: 1_000, workTimeoutMs: 5 }, fetchMock);
    expect(result.results).toHaveLength(4);
    expect(result.results.every((item) => item.status === 'failed')).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
