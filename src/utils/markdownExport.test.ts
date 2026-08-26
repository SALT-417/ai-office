import type { AnalysisHistoryEntry } from '../types/analysis';
import type { WorkHistoryEntry } from '../types/history';
import { analysisHistoryToMarkdown, createMarkdownFilename, downloadMarkdown, workHistoryToMarkdown } from './markdownExport';

const workEntry: WorkHistoryEntry = {
  id: 'work', createdAt: '2026-08-26T04:30:00.000Z', updatedAt: '2026-08-26T05:00:00.000Z', category: 'development',
  task: 'APIの"安全性\nを確認', reviewStatus: 'approved', reviewNote: '内容確認済み',
  plan: { summary: '入力検証を整理する', assignments: [{ name: 'ソウ', task: '実装を整理' }], firstActions: ['境界値を確認'] },
  results: [{ employeeId: 'sou', name: 'ソウ', role: 'AI開発担当', status: 'completed', title: '実装案', content: '<script>alert(1)</script>\nVitestを追加' }],
};

const analysisEntry: AnalysisHistoryEntry = {
  id: 'analysis', createdAt: '2026-08-26T04:30:00.000Z', updatedAt: '2026-08-26T05:00:00.000Z', specialist: 'aki', specialistName: 'アキ',
  objective: '入力検証を分析', analyzedFiles: ['server/app.ts'], redacted: true, summary: '安全性の要約', reviewStatus: 'rejected', reviewNote: '再確認',
  findings: [{ title: '境界値', severity: 'high', evidence: [{ path: 'server/app.ts', line: 12, description: '入力検証の分岐' }], recommendation: '拒否ケースを追加する', completionCriteria: ['400応答になる'], verification: ['Vitestで期待結果を確認'] }],
};

describe('Markdown export', () => {
  it('exports work history with safe frontmatter, plan and results', () => {
    const markdown = workHistoryToMarkdown(workEntry);
    expect(markdown).toContain('type: "work-history"');
    expect(markdown).toContain('category: "development"');
    expect(markdown).toContain('review_status: "approved"');
    expect(markdown).toContain('title: "APIの\\"安全性\\nを確認"');
    expect(markdown).toContain('**ソウ**：実装を整理');
    expect(markdown).toContain('Vitestを追加');
    expect(markdown).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(markdown).not.toContain('<script>');
  });

  it('exports analysis history with objective, files, evidence and recommendation', () => {
    const markdown = analysisHistoryToMarkdown(analysisEntry);
    expect(markdown).toContain('type: "analysis-history"');
    expect(markdown).toContain('入力検証を分析');
    expect(markdown).toContain('`server/app.ts:12`');
    expect(markdown).toContain('入力検証の分岐');
    expect(markdown).toContain('拒否ケースを追加する');
    expect(markdown).toContain('伏字：あり');
  });

  it('creates Windows-safe filenames with date, time and type', () => {
    expect(createMarkdownFilename(workEntry)).toMatch(/^20260826_\d{6}_AI_OFFICE_work_development\.md$/);
    expect(createMarkdownFilename(analysisEntry)).toMatch(/^20260826_\d{6}_AI_OFFICE_analysis_aki\.md$/);
    expect(createMarkdownFilename(workEntry)).not.toMatch(/[<>:"/\\|?*]/);
  });

  it('downloads through a Blob URL and revokes it after the click', () => {
    vi.useFakeTimers();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => 'blob:markdown');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    downloadMarkdown('# note', 'safe.md');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:markdown');
    vi.useRealTimers();
  });
});
