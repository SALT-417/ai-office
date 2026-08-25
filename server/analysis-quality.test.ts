import { describe, expect, it } from 'vitest';
import type { AnalysisFinding } from './project-analysis';
import { extractObjectiveThemes, validateAnalysisQuality } from './analysis-quality';

const objective = '分析APIの入力検証、キャンセル、エラー処理を根拠付きで確認してください';
const goodFinding = (overrides: Partial<AnalysisFinding> = {}): AnalysisFinding => ({
  title: '入力上限とキャンセル処理の境界を照合する', severity: 'high',
  evidence: [{ path: 'server/project-analysis.ts', description: '入力文字数の検証とAbortControllerによる中断処理が確認対象です。' }],
  recommendation: '文字数上限の直前・一致・超過を入力し、キャンセル時のエラー応答を期待値と照合してください。',
  completionCriteria: ['上限超過が安全な日本語エラーとして拒否されること'],
  verification: ['境界値を送信するテストを実行し、ステータスとエラー表示を確認する'],
  ...overrides,
});
const qualityValue = (finding = goodFinding(), summary = '分析APIの入力検証、キャンセル、エラー処理について実装とテストの対応を確認する提案です。') => ({ summary, findings: [finding] });

describe('analysis content quality gate', () => {
  it.each([
    ['summary', 'quality-summary-generic', qualityValue(goodFinding(), '分析結果です。')],
    ['title', 'quality-title-generic', qualityValue(goodFinding({ title: '画面確認' }))],
    ['evidence.description', 'quality-evidence-generic', qualityValue(goodFinding({ evidence: [{ path: 'server/project-analysis.ts', description: '対象です。' }] }))],
    ['recommendation', 'quality-recommendation-generic', qualityValue(goodFinding({ recommendation: '人が確認します。' }))],
    ['completionCriteria', 'quality-criteria-generic', qualityValue(goodFinding({ completionCriteria: ['確認できること'] }))],
    ['verification', 'quality-verification-generic', qualityValue(goodFinding({ verification: ['手順を確認します'] }))],
  ])('rejects generic %s with %s', (field, reason, value) => {
    expect(validateAnalysisQuality(value, objective, 'aki')).toMatchObject({ field, reason });
  });

  it('rejects findings unrelated to the objective', () => {
    const finding = goodFinding({
      title: '画面レイアウトと配色の表現を比較する',
      evidence: [{ path: 'src/components/ProjectAnalysisSection.tsx', description: '画面表示とボタン配置を扱うUIコンポーネントが確認対象です。' }],
      recommendation: '画面幅ごとのボタン配置を比較し、表示上の差を整理してください。',
      completionCriteria: ['各画面幅でボタン表示が維持されること'],
      verification: ['画面をキーボードで操作し、ボタン表示を確認する'],
    });
    expect(validateAnalysisQuality({ summary: '画面レイアウトとボタン配置について具体的な確認候補を整理した提案です。', findings: [finding] }, 'キャンセルとタイムアウトの失敗処理を確認してください', 'aki')).toMatchObject({ reason: 'quality-objective-unrelated', field: 'findings' });
  });

  it('rejects path-only duplicate findings', () => {
    const first = goodFinding();
    const second = { ...first, evidence: first.evidence.map((item) => ({ ...item, path: 'server/project-analysis.test.ts' })) };
    expect(validateAnalysisQuality({ ...qualityValue(), findings: [first, second] }, objective, 'aki')).toMatchObject({ reason: 'quality-duplicate-finding', findingIndex: 1 });
  });

  it('rejects content that does not describe the selected file role', () => {
    const finding = goodFinding({
      title: '画面表示の文章と配色を比較する候補',
      evidence: [{ path: 'server/project-analysis.ts', description: '画面表示と文章表現を比較するための対象です。' }],
      recommendation: '画面表示の文章を比較し、UI上の表現を整理してください。',
      completionCriteria: ['画面の文章表示が維持されること'], verification: ['画面を操作するテストで表示を確認する'],
    });
    expect(validateAnalysisQuality(qualityValue(finding), objective, 'aki')).toMatchObject({ reason: 'quality-file-role-missing' });
  });

  it('accepts a concrete finding related to multiple objective themes', () => {
    expect(validateAnalysisQuality(qualityValue(), objective, 'aki')).toBeNull();
    expect(extractObjectiveThemes(objective, 'aki')).toEqual(expect.arrayContaining(['input', 'cancellation', 'error']));
  });
});
