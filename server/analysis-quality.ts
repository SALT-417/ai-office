import type { AnalysisFinding, AnalysisResponse, AnalysisSpecialist } from './project-analysis';
import { ANALYSIS_QUALITY_LIMITS } from '../src/types/analysisContract';

export type AnalysisQualityReason =
  | 'quality-summary-generic' | 'quality-title-generic' | 'quality-evidence-generic'
  | 'quality-recommendation-generic' | 'quality-criteria-generic' | 'quality-verification-generic'
  | 'quality-objective-unrelated' | 'quality-duplicate-finding' | 'quality-file-role-missing';

export interface AnalysisQualityIssue {
  findingIndex?: number;
  field: string;
  reason: AnalysisQualityReason;
  metric: 'characters' | 'relatedThemes' | 'similarity' | 'matchedTerms';
  value: number;
}

const themeGroups: Record<string, string[]> = {
  input: ['入力', '検証', '境界', '文字数', '件数', 'サイズ', '型'],
  cancellation: ['キャンセル', '中断', 'abort', 'AbortController'],
  timeout: ['タイムアウト', 'timeout', '制限時間'],
  error: ['エラー', '失敗', '例外', '通知', 'エラー処理'],
  test: ['テスト', '期待結果', 'Vitest', 'Testing Library'],
  path: ['path', 'パス', 'symlink', 'シンボリックリンク', '選択外', '行番号'],
  accessibility: ['アクセシビリティ', 'キーボード', 'ARIA', 'フォーカス'],
  ui: ['UI', '画面', '表示', '送信', 'ボタン', '未選択', '上限超過', '二重送信'],
  implementation: ['実装', 'API', 'コード', '型', '状態管理', '保守性'],
};
const specialistThemes: Record<AnalysisSpecialist, string[]> = {
  sou: ['input', 'cancellation', 'timeout', 'error', 'path', 'implementation'],
  aki: ['input', 'cancellation', 'timeout', 'error', 'test', 'path', 'accessibility', 'ui'],
};
const genericExact = new Set(['分析結果です', '選択範囲の確認結果', '確認', '画面確認', '改善', '確認します', '対象です', '人が確認します', '改善します', '確認できること', '手順を確認します']);
const stopWords = new Set(['について', 'ください', 'します', 'されて', 'いるか', 'ないか', '改善点', '根拠付き', '確認して']);

const normalized = (value: string): string => value.normalize('NFKC').replace(/[\s。、，,.・:：;；「」『』（）()[\]{}]/g, '').toLowerCase();
const includesAny = (text: string, words: string[]): boolean => words.some((word) => text.toLowerCase().includes(word.toLowerCase()));
const findingText = (finding: AnalysisFinding): string => [finding.title, ...finding.evidence.map((item) => item.description), finding.recommendation, ...finding.completionCriteria, ...finding.verification].join(' ');

export function extractObjectiveThemes(objective: string, specialist: AnalysisSpecialist): string[] {
  const direct = Object.entries(themeGroups).filter(([, words]) => includesAny(objective, words)).map(([theme]) => theme);
  if (direct.length) return direct;
  const extracted = objective.match(/[一-龠ぁ-んァ-ヶA-Za-z]{2,}/g)?.filter((word) => !stopWords.has(word)) ?? [];
  return extracted.length ? extracted.slice(0, 8) : specialistThemes[specialist].slice(0, 2);
}

function roleTerms(path: string): string[] {
  if (path.includes('.test.') || path.includes('.spec.')) return ['テスト', '境界', '拒否', '中断', 'タイムアウト', '期待結果', '行番号', '再試行', 'Vitest'];
  if (path.includes('/components/') || path.endsWith('.tsx')) return ['UI', '画面', '操作', '表示', '入力', '送信', 'キャンセル', '通知', 'キーボード', 'ボタン'];
  if (path.startsWith('server/')) return ['API', '入力', '検証', 'エラー', '通信', '中断', 'タイムアウト', 'path', 'symlink', '秘密'];
  return ['型', '状態', '設定', '処理', 'テスト', '表示', 'API'];
}

function lowQualityText(value: string, minimum: number): boolean {
  const text = normalized(value);
  return text.length < minimum || genericExact.has(text) || /^(?:人が)?(?:画面|内容|手順|対象)?(?:を)?(?:確認|改善)(?:できること|します|する)?$/.test(text);
}

function textIssue(field: string, reason: AnalysisQualityReason, value: string, minimum: number, findingIndex?: number): AnalysisQualityIssue | null {
  return lowQualityText(value, minimum) ? { ...(findingIndex === undefined ? {} : { findingIndex }), field, reason, metric: 'characters', value: normalized(value).length } : null;
}

function bigrams(value: string): Set<string> {
  const text = normalized(value);
  return new Set(Array.from({ length: Math.max(0, text.length - 1) }, (_, index) => text.slice(index, index + 2)));
}
function similarity(left: string, right: string): number {
  const a = bigrams(left); const b = bigrams(right);
  if (!a.size && !b.size) return 1;
  const intersection = [...a].filter((item) => b.has(item)).length;
  return intersection / Math.max(1, new Set([...a, ...b]).size);
}

export function validateAnalysisQuality(
  value: Pick<AnalysisResponse, 'summary' | 'findings'>,
  objective: string,
  specialist: AnalysisSpecialist,
): AnalysisQualityIssue | null {
  const summaryIssue = textIssue('summary', 'quality-summary-generic', value.summary, ANALYSIS_QUALITY_LIMITS.summaryMinimum);
  if (summaryIssue) return summaryIssue;

  for (const [findingIndex, finding] of value.findings.entries()) {
    const titleIssue = textIssue('title', 'quality-title-generic', finding.title, ANALYSIS_QUALITY_LIMITS.titleMinimum, findingIndex);
    if (titleIssue) return titleIssue;
    for (const evidence of finding.evidence) {
      const evidenceIssue = textIssue('evidence.description', 'quality-evidence-generic', evidence.description, ANALYSIS_QUALITY_LIMITS.descriptionMinimum, findingIndex);
      if (evidenceIssue) return evidenceIssue;
      const roles = roleTerms(evidence.path);
      const combined = findingText(finding);
      const matchedTerms = roles.filter((term) => includesAny(combined, [term])).length;
      if (!matchedTerms) return { findingIndex, field: 'finding', reason: 'quality-file-role-missing', metric: 'matchedTerms', value: 0 };
    }
    const recommendationIssue = textIssue('recommendation', 'quality-recommendation-generic', finding.recommendation, ANALYSIS_QUALITY_LIMITS.recommendationMinimum, findingIndex);
    if (recommendationIssue) return recommendationIssue;
    if (!includesAny(finding.recommendation, ['確認', '検証', '比較', '照合', '追加', '分離', '拒否', '通知', '整理', '実装', 'テスト']) || !includesAny(finding.recommendation, Object.values(themeGroups).flat())) {
      return { findingIndex, field: 'recommendation', reason: 'quality-recommendation-generic', metric: 'matchedTerms', value: 0 };
    }
    for (const criterion of finding.completionCriteria) {
      const criterionIssue = textIssue('completionCriteria', 'quality-criteria-generic', criterion, ANALYSIS_QUALITY_LIMITS.criteriaMinimum, findingIndex);
      if (criterionIssue) return criterionIssue;
      if (!includesAny(criterion, ['期待', '成功', '拒否', '表示', '通知', '解除', '維持', '以内', '件', '文字', '返', '含', 'ないこと', '定義'])) return { findingIndex, field: 'completionCriteria', reason: 'quality-criteria-generic', metric: 'matchedTerms', value: 0 };
    }
    for (const verification of finding.verification) {
      const verificationIssue = textIssue('verification', 'quality-verification-generic', verification, ANALYSIS_QUALITY_LIMITS.verificationMinimum, findingIndex);
      if (verificationIssue) return verificationIssue;
      if (!includesAny(verification, ['テスト', '入力', '操作', '実行', '送信', 'クリック', 'Vitest', 'Testing Library', '期待結果', 'レスポンス', '表示', '確認方法'])) return { findingIndex, field: 'verification', reason: 'quality-verification-generic', metric: 'matchedTerms', value: 0 };
    }
  }

  const objectiveThemes = extractObjectiveThemes(objective, specialist);
  const wholeText = [value.summary, ...value.findings.map(findingText)].join(' ');
  const relatedThemes = objectiveThemes.filter((theme) => themeGroups[theme] ? includesAny(wholeText, themeGroups[theme]) : includesAny(wholeText, [theme])).length;
  const requiredThemes = Math.min(ANALYSIS_QUALITY_LIMITS.relatedThemeMinimum, objectiveThemes.length);
  if (relatedThemes < requiredThemes) return { field: 'findings', reason: 'quality-objective-unrelated', metric: 'relatedThemes', value: relatedThemes };

  for (let left = 0; left < value.findings.length; left += 1) for (let right = left + 1; right < value.findings.length; right += 1) {
    const ratio = similarity(findingText(value.findings[left]), findingText(value.findings[right]));
    if (ratio > ANALYSIS_QUALITY_LIMITS.duplicateSimilarityMaximum) return { findingIndex: right, field: 'finding', reason: 'quality-duplicate-finding', metric: 'similarity', value: Number(ratio.toFixed(3)) };
  }
  return null;
}
