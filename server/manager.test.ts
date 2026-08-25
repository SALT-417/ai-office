// @vitest-environment node

import { getServerConfig } from './config';
import { EMPLOYEE_ROLES, MANAGER_SYSTEM_PROMPT, ManagerError, requestManagerReply, selectAssignees } from './manager';

const config = getServerConfig({});

describe('requestManagerReply', () => {
  it('sends a non-streaming Ollama chat request with the fixed Ren prompt', async () => {
    const responseText = JSON.stringify({ summary: 'API実装の依頼です。', assignments: [{ name: 'ソウ', task: 'APIを実装する。' }], firstActions: ['API仕様を整理する。', '小さな実装とテストを追加する。'] });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: { content: responseText } }), { status: 200 }));
    const result = await requestManagerReply('APIを実装してください', config, fetchMock);

    expect(result.reply).toContain('依頼の理解');
    expect(result.reply).toContain('担当者と担当内容');
    expect(result.reply).toContain('最初に着手する具体的な作業');
    expect(result.plan.assignments).toEqual([{ name: 'ソウ', task: EMPLOYEE_ROLES.ソウ }]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({
      model: 'qwen2.5:3b',
      stream: false,
      format: 'json',
      options: { temperature: 0.2, top_p: 0.9, num_predict: 400 },
    });
    expect(body.messages[0]).toEqual({ role: 'system', content: MANAGER_SYSTEM_PROMPT });
    const userMessage = JSON.parse(body.messages[1].content);
    expect(userMessage.task).toBe('APIを実装してください');
    expect(userMessage.fixedContext).toContain('求人掲載サービスではありません');
    expect(userMessage.allowedAssignments).toEqual([{ name: 'ソウ', task: EMPLOYEE_ROLES.ソウ }]);
    expect(MANAGER_SYSTEM_PROMPT).toContain('転職用ポートフォリオアプリ');
    expect(MANAGER_SYSTEM_PROMPT).toContain('求人情報を集めて掲載するサービスではない');
    expect(MANAGER_SYSTEM_PROMPT).toContain('担当者の追加や役割変更をしない');
    expect(MANAGER_SYSTEM_PROMPT).toContain('JSON以外を出力しない');
  });

  it('selects multiple fixed-role employees for the AI OFFICE career regression task', () => {
    const task = 'AIエンジニアへの転職に向けて、このAI OFFICEを改善する次の作業を整理してください';
    expect(selectAssignees(task)).toEqual(['レン', 'ミオ', 'ソウ', 'ユナ', 'アキ']);
  });

  it('replaces role-deviating model output with a safe structured fallback', async () => {
    const task = 'AIエンジニアへの転職に向けて、このAI OFFICEを改善する次の作業を整理してください';
    const badModelPlan = JSON.stringify({
      summary: '求人情報サービスとして求人を集めます。',
      assignments: [{ name: 'アキ', task: '広告担当として求人広告を掲載する。' }],
      firstActions: ['求人情報を収集する。'],
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: { content: badModelPlan } }), { status: 200 }));
    const result = await requestManagerReply(task, config, fetchMock);

    expect(result.reply).toContain('依頼の理解');
    expect(result.reply).toContain('担当者と担当内容');
    expect(result.reply).toContain('最初に着手する具体的な作業');
    expect(result.reply).not.toContain('広告担当');
    expect(result.reply).not.toContain('求人情報サービスとして');
    expect(result.plan.assignments).toEqual(Object.entries(EMPLOYEE_ROLES).map(([name, role]) => ({ name, task: role })));
    expect(result.plan.firstActions.length).toBeGreaterThanOrEqual(2);
    expect(result.plan.firstActions.some((action) => action.includes('アクセシビリティ'))).toBe(true);
  });

  it('uses the safe fallback when Ollama returns invalid JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: { content: 'JSONではない返答です' } }), { status: 200 }));
    const result = await requestManagerReply('品質を確認してください', config, fetchMock);
    expect(result.plan.assignments).toEqual([{ name: 'アキ', task: EMPLOYEE_ROLES.アキ }]);
    expect(result.plan.firstActions).toHaveLength(2);
    expect(result.reply).toContain('最初に着手する具体的な作業');
  });

  it('rejects an invalid Ollama response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: {} }), { status: 200 }));
    await expect(requestManagerReply('確認', config, fetchMock)).rejects.toMatchObject({ code: 'OLLAMA_INVALID_RESPONSE' } satisfies Partial<ManagerError>);
  });

  it('returns a useful error when the configured model is missing', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(requestManagerReply('確認', config, fetchMock)).rejects.toMatchObject({ code: 'OLLAMA_UNAVAILABLE', publicMessage: expect.stringContaining('qwen2.5:3b') });
  });

  it('aborts a slow Ollama request', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    await expect(requestManagerReply('確認', { ...config, timeoutMs: 5 }, fetchMock)).rejects.toMatchObject({ code: 'OLLAMA_TIMEOUT' } satisfies Partial<ManagerError>);
  });
});
