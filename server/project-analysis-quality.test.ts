import { describe, expect, it, vi } from 'vitest';
import { getServerConfig } from './config';
import { requestProjectAnalysis } from './project-analysis';

const request = {
  objective: '分析APIの入力検証、キャンセル、エラー処理に不足がないか、改善点を根拠付きで確認してください',
  specialist: 'aki' as const,
  files: ['server/project-analysis.ts', 'server/project-analysis.test.ts', 'src/components/ProjectAnalysisSection.tsx'],
};
const lowQuality = {
  summary: '分析結果です。', findings: [{ title: '画面確認', severity: 'medium',
    evidence: [{ path: 'server/project-analysis.ts', description: '画面を確認する対象です' }],
    recommendation: '人が確認します', completionCriteria: ['確認できること'], verification: ['手順を確認します'] }],
};
const concrete = {
  summary: '分析APIの入力検証、キャンセル、タイムアウト、エラー通知について実装とテストの対応を確認する提案です。',
  findings: [{ title: '入力上限と中断時のエラー応答を照合する', severity: 'high',
    evidence: [{ path: 'server/project-analysis.ts', description: '入力文字数の検証、AbortControllerによる中断、タイムアウト時のエラー応答を扱う処理が確認対象です。' }],
    recommendation: '入力上限の直前・一致・超過とキャンセルを分けて実行し、各エラー応答を期待値と照合してください。',
    completionCriteria: ['上限超過と中断がそれぞれ安全な日本語エラーとして返されること'],
    verification: ['境界値の入力とキャンセルを行うテストを実行し、ステータスと通知内容を確認する'] }],
};
const ollamaResponse = (value: unknown) => ({ ok: true, json: async () => ({ message: { content: JSON.stringify(value) }, done_reason: 'stop' }) });

describe('project analysis quality integration', () => {
  it('retries low-quality structured output once without replaying its body, then accepts concrete output', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ollamaResponse(lowQuality)).mockResolvedValueOnce(ollamaResponse(concrete));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await requestProjectAnalysis(request, getServerConfig({}), fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.summary).toBe(concrete.summary);
    expect(new Set(result.findings.flatMap((finding) => finding.evidence.map((evidence) => evidence.path)))).toEqual(new Set(request.files));
    const secondRequest = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body)) as { messages: Array<{ content: string }> };
    expect(secondRequest.messages.at(-1)?.content).toContain('field=summary reason=quality-summary-generic');
    expect(secondRequest.messages.some((message) => message.content.includes(lowQuality.summary))).toBe(false);
    warning.mockRestore();
  });

  it('uses the concrete three-file fallback after two low-quality responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse(lowQuality));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await requestProjectAnalysis(request, getServerConfig({}), fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.summary).toContain('モデル応答を安全に採用できなかった');
    const text = JSON.stringify(result);
    expect(text).toContain('1〜8件'); expect(text).toContain('symlink'); expect(text).toContain('選択外evidence'); expect(text).toContain('二重送信');
    warning.mockRestore();
  });

  it('logs only numeric quality metadata without model text, paths, or secrets', async () => {
    const secret = 'SECRET_QUALITY_BODY_MUST_NOT_BE_LOGGED';
    const response = { ...lowQuality, summary: `${lowQuality.summary}${secret}` };
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse(response));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await requestProjectAnalysis(request, getServerConfig({}), fetchMock);
    const qualityCalls = warning.mock.calls.filter((call) => String(call[0]).includes('quality'));
    const logs = JSON.stringify(qualityCalls); warning.mockRestore();
    expect(logs).not.toContain(secret); expect(logs).not.toContain('server/project-analysis.ts'); expect(logs).not.toContain(process.cwd());
    expect(Object.keys((qualityCalls[0]?.[1] as Record<string, unknown>) ?? {}).sort()).toEqual(['attempt', 'doneReason', 'field', 'findingIndex', 'metric', 'reason', 'value']);
    expect(logs).toContain('quality-');
  });
});
