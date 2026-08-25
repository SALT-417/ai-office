import type { AnalysisEvidence, AnalysisFinding, AnalysisResponse, AnalysisSeverity, AnalysisSpecialist } from './project-analysis';
import { ANALYSIS_LIMITS } from '../src/types/analysisContract';

export type AnalysisValidationReason = 'not-array' | 'empty' | 'max-exceeded' | 'not-object' | 'missing' | 'too-long' | 'invalid-value' | 'invalid-type' | 'unselected-path' | 'line-out-of-range' | 'duplicate' | 'not-japanese' | 'json-parse' | 'non-string';
export interface AnalysisValidationIssue {
  findingIndex?: number;
  field: string;
  reason: AnalysisValidationReason;
  actualType: string;
  lengthOrCount?: number;
}
export interface ParseAnalysisResult {
  value: Pick<AnalysisResponse, 'summary' | 'findings'> | null;
  issue?: AnalysisValidationIssue;
  diagnostics: AnalysisValidationIssue[];
  extracted: 'complete' | 'code-fence' | 'none';
}

export const ANALYSIS_JSON_SCHEMA = {
  type: 'object', required: ['summary', 'findings'],
  properties: {
    summary: { type: 'string' },
    findings: { type: 'array', minItems: 1, maxItems: ANALYSIS_LIMITS.findings, items: {
      type: 'object', required: ['title', 'severity', 'evidence', 'recommendation', 'completionCriteria', 'verification'],
      properties: {
        title: { type: 'string' }, severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        evidence: { type: 'array', minItems: 1, maxItems: ANALYSIS_LIMITS.evidence, items: { type: 'object', required: ['path', 'description'], properties: { path: { type: 'string' }, line: { type: 'integer' }, description: { type: 'string' } } } },
        recommendation: { type: 'string' },
        completionCriteria: { type: 'array', minItems: 1, maxItems: ANALYSIS_LIMITS.listItems, items: { type: 'string' } },
        verification: { type: 'array', minItems: 1, maxItems: ANALYSIS_LIMITS.listItems, items: { type: 'string' } },
      },
    } },
  },
} as const;

export function analysisJsonSchema(selectedPaths: string[]) {
  return {
    ...ANALYSIS_JSON_SCHEMA,
    properties: {
      ...ANALYSIS_JSON_SCHEMA.properties,
      findings: {
        ...ANALYSIS_JSON_SCHEMA.properties.findings,
        items: {
          ...ANALYSIS_JSON_SCHEMA.properties.findings.items,
          properties: {
            ...ANALYSIS_JSON_SCHEMA.properties.findings.items.properties,
            evidence: {
              ...ANALYSIS_JSON_SCHEMA.properties.findings.items.properties.evidence,
              items: {
                ...ANALYSIS_JSON_SCHEMA.properties.findings.items.properties.evidence.items,
                properties: {
                  ...ANALYSIS_JSON_SCHEMA.properties.findings.items.properties.evidence.items.properties,
                  path: { type: 'string', enum: selectedPaths },
                },
              },
            },
          },
        },
      },
    },
  } as const;
}

const actualType = (value: unknown): string => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
const issue = (field: string, reason: AnalysisValidationReason, value: unknown, findingIndex?: number): AnalysisValidationIssue => ({
  ...(findingIndex === undefined ? {} : { findingIndex }), field, reason, actualType: actualType(value),
  ...((typeof value === 'string' || Array.isArray(value)) ? { lengthOrCount: value.length } : {}),
});
const normalizedText = (value: unknown, maximum: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maximum ? trimmed : null;
};
const isJapanese = (value: string): boolean => /[ぁ-んァ-ヶ]/.test(value) || (value.length <= 8 && !/[这们发应设试证结构组项]/.test(value));
const uniqueStrings = (items: string[]): string[] => [...new Set(items)];

export function extractAnalysisJson(raw: string): { json: string | null; extracted: ParseAnalysisResult['extracted'] } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return { json: trimmed, extracted: 'complete' };
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    const candidate = fenced[1].trim();
    if (candidate.startsWith('{') && candidate.endsWith('}')) return { json: candidate, extracted: 'code-fence' };
  }
  return { json: null, extracted: 'none' };
}

export function parseAnalysis(raw: unknown, files: Map<string, number>): ParseAnalysisResult {
  if (typeof raw !== 'string') return { value: null, issue: issue('response', 'non-string', raw), diagnostics: [], extracted: 'none' };
  const extraction = extractAnalysisJson(raw);
  if (!extraction.json) return { value: null, issue: issue('response', 'json-parse', raw), diagnostics: [], extracted: extraction.extracted };
  try {
    const parsed = JSON.parse(extraction.json) as { summary?: unknown; findings?: unknown };
    const diagnostics: AnalysisValidationIssue[] = [];
    const summary = normalizedText(parsed.summary, ANALYSIS_LIMITS.summary);
    if (!summary) return { value: null, issue: issue('summary', typeof parsed.summary === 'string' && parsed.summary.trim() ? 'too-long' : 'missing', parsed.summary), diagnostics, extracted: extraction.extracted };
    if (!isJapanese(summary)) return { value: null, issue: issue('summary', 'not-japanese', parsed.summary), diagnostics, extracted: extraction.extracted };
    if (!Array.isArray(parsed.findings)) return { value: null, issue: issue('findings', 'not-array', parsed.findings), diagnostics, extracted: extraction.extracted };
    if (parsed.findings.length === 0) return { value: null, issue: issue('findings', 'empty', parsed.findings), diagnostics, extracted: extraction.extracted };
    if (parsed.findings.length > ANALYSIS_LIMITS.findings) diagnostics.push(issue('findings', 'max-exceeded', parsed.findings));
    const findings: AnalysisFinding[] = [];
    for (const [findingIndex, item] of parsed.findings.slice(0, ANALYSIS_LIMITS.findings).entries()) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return { value: null, issue: issue('finding', 'not-object', item, findingIndex), diagnostics, extracted: extraction.extracted };
      const finding = item as Record<string, unknown>;
      const title = normalizedText(finding.title, ANALYSIS_LIMITS.title);
      if (!title) return { value: null, issue: issue('title', typeof finding.title === 'string' && finding.title.trim() ? 'too-long' : 'missing', finding.title, findingIndex), diagnostics, extracted: extraction.extracted };
      const recommendation = normalizedText(finding.recommendation, ANALYSIS_LIMITS.recommendation);
      if (!recommendation) return { value: null, issue: issue('recommendation', typeof finding.recommendation === 'string' && finding.recommendation.trim() ? 'too-long' : 'missing', finding.recommendation, findingIndex), diagnostics, extracted: extraction.extracted };
      const severityMap: Record<string, AnalysisSeverity> = { high: 'high', medium: 'medium', low: 'low', 高: 'high', 中: 'medium', 低: 'low' };
      const severityValue = typeof finding.severity === 'string' ? finding.severity.trim() : '';
      const severity = severityMap[severityValue];
      if (!severity) return { value: null, issue: issue('severity', 'invalid-value', finding.severity, findingIndex), diagnostics, extracted: extraction.extracted };
      if (severityValue !== severity) diagnostics.push(issue('severity', 'invalid-value', finding.severity, findingIndex));

      const normalizeList = (field: 'completionCriteria' | 'verification'): string[] | AnalysisValidationIssue => {
        const value = finding[field];
        if (!Array.isArray(value)) return issue(field, 'not-array', value, findingIndex);
        if (!value.length) return issue(field, 'empty', value, findingIndex);
        if (value.length > ANALYSIS_LIMITS.listItems) diagnostics.push(issue(field, 'max-exceeded', value, findingIndex));
        const limited = value.slice(0, ANALYSIS_LIMITS.listItems);
        for (const entry of limited) {
          if (typeof entry !== 'string') return issue(field, 'invalid-type', entry, findingIndex);
          if (!entry.trim()) return issue(field, 'missing', entry, findingIndex);
          if (entry.trim().length > ANALYSIS_LIMITS.listItem) return issue(field, 'too-long', entry, findingIndex);
          if (!isJapanese(entry.trim())) return issue(field, 'not-japanese', entry, findingIndex);
        }
        const trimmed = limited.map((entry) => String(entry).trim());
        const unique = uniqueStrings(trimmed);
        if (unique.length !== trimmed.length) diagnostics.push(issue(field, 'duplicate', trimmed, findingIndex));
        return unique;
      };
      const completionCriteria = normalizeList('completionCriteria');
      if (!Array.isArray(completionCriteria)) return { value: null, issue: completionCriteria, diagnostics, extracted: extraction.extracted };
      const verification = normalizeList('verification');
      if (!Array.isArray(verification)) return { value: null, issue: verification, diagnostics, extracted: extraction.extracted };

      if (!Array.isArray(finding.evidence)) return { value: null, issue: issue('evidence', 'not-array', finding.evidence, findingIndex), diagnostics, extracted: extraction.extracted };
      if (!finding.evidence.length) return { value: null, issue: issue('evidence', 'empty', finding.evidence, findingIndex), diagnostics, extracted: extraction.extracted };
      if (finding.evidence.length > ANALYSIS_LIMITS.evidence) diagnostics.push(issue('evidence', 'max-exceeded', finding.evidence, findingIndex));
      const evidence: AnalysisEvidence[] = [];
      const evidenceKeys = new Set<string>();
      for (const entry of finding.evidence.slice(0, ANALYSIS_LIMITS.evidence)) {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return { value: null, issue: issue('evidence', 'not-object', entry, findingIndex), diagnostics, extracted: extraction.extracted };
        const value = entry as Record<string, unknown>;
        const evidencePath = normalizedText(value.path, ANALYSIS_LIMITS.path);
        if (!evidencePath) return { value: null, issue: issue('evidence.path', typeof value.path === 'string' && value.path.trim() ? 'too-long' : 'missing', value.path, findingIndex), diagnostics, extracted: extraction.extracted };
        if (!files.has(evidencePath)) { diagnostics.push(issue('evidence.path', 'unselected-path', value.path, findingIndex)); continue; }
        const description = normalizedText(value.description, ANALYSIS_LIMITS.description);
        if (!description) return { value: null, issue: issue('evidence.description', typeof value.description === 'string' && value.description.trim() ? 'too-long' : 'missing', value.description, findingIndex), diagnostics, extracted: extraction.extracted };
        if (!isJapanese(description)) return { value: null, issue: issue('evidence.description', 'not-japanese', value.description, findingIndex), diagnostics, extracted: extraction.extracted };
        let line: number | undefined;
        if (value.line !== undefined) {
          const numericLine = typeof value.line === 'string' && /^\d+$/.test(value.line.trim()) ? Number(value.line.trim()) : value.line;
          if (typeof numericLine !== 'number' || !Number.isInteger(numericLine)) diagnostics.push(issue('evidence.line', 'invalid-type', value.line, findingIndex));
          else if (numericLine < 1 || numericLine > (files.get(evidencePath) ?? 0)) diagnostics.push(issue('evidence.line', 'line-out-of-range', value.line, findingIndex));
          else line = numericLine;
        }
        const key = `${evidencePath}\u0000${line ?? ''}\u0000${description}`;
        if (evidenceKeys.has(key)) { diagnostics.push(issue('evidence', 'duplicate', finding.evidence, findingIndex)); continue; }
        evidenceKeys.add(key); evidence.push({ path: evidencePath, ...(line ? { line } : {}), description });
      }
      if (!evidence.length) return { value: null, issue: issue('evidence', 'empty', finding.evidence, findingIndex), diagnostics, extracted: extraction.extracted };
      for (const [field, value] of [['title', title], ['recommendation', recommendation]] as const) {
        if (!isJapanese(value)) return { value: null, issue: issue(field, 'not-japanese', value, findingIndex), diagnostics, extracted: extraction.extracted };
      }
      findings.push({ title, severity, evidence, recommendation, completionCriteria, verification });
    }
    return { value: { summary, findings }, diagnostics, extracted: extraction.extracted };
  } catch { return { value: null, issue: issue('response', 'json-parse', raw), diagnostics: [], extracted: extraction.extracted }; }
}

function fallbackFinding(relativePath: string, specialist: AnalysisSpecialist): AnalysisFinding {
  if (relativePath === 'server/project-analysis.ts') return { title: '分析APIの安全境界を確認する', severity: 'high', evidence: [{ path: relativePath, description: '入力検証、ファイル読取、Ollama通信、安全な応答整形を確認する対象ファイルです。' }], recommendation: '入力の型・文字数・1〜8件・単体と合計サイズ、pathとsymlink、timeoutとabort、エラー秘匿、秘密値伏字を確認対象として、人が実装と期待値の対応を確認してください。未確認の項目は確認候補として扱います。', completionCriteria: ['各入力上限と拒否時の日本語応答が定義されている', 'path実体確認、timeout、abort、エラー秘匿、伏字の責務が整理されている'], verification: ['許可・拒否境界を実装とテストで対応付ける', '中断時に追加通信を開始しないことを確認する'] };
  if (relativePath === 'server/project-analysis.test.ts') return { title: '分析APIの境界テスト候補を確認する', severity: 'high', evidence: [{ path: relativePath, description: '分析APIの安全境界と異常系を検証するテストファイルです。' }], recommendation: '型・文字数・件数・サイズ・危険path・symlink・拒否ケースに加え、中断、timeout、選択外evidence、行番号範囲、構造修正回数のテスト有無を人が確認してください。', completionCriteria: ['安全境界ごとの期待結果がテスト名から判別できる', '中断とtimeout、選択外path、範囲外lineが個別に検証されている'], verification: ['該当テストの有無とアサーション内容を確認する', 'Vitestを実行し既存テストを含めて成功することを確認する'] };
  if (relativePath === 'src/components/ProjectAnalysisSection.tsx') return { title: '分析画面の操作境界を確認する', severity: 'medium', evidence: [{ path: relativePath, description: 'ファイル選択、事前確認、分析状態、結果表示を扱う画面コンポーネントです。' }], recommendation: '未選択・上限超過・確認前送信防止・二重送信・キャンセル・日本語エラー通知・キーボード操作を確認対象として、人が画面状態と期待結果を照合してください。', completionCriteria: ['確認段階を通らない分析開始が無効である', '処理中、キャンセル、失敗が色以外の文字でも通知される'], verification: ['React Testing Libraryで各操作状態を確認する', 'キーボード操作と390px表示を手動確認する'] };
  const testFile = /\.(test|spec)\.[^.]+$/.test(relativePath);
  return { title: testFile ? `${relativePath}のテスト観点を確認する` : `${relativePath}の責務を確認する`, severity: 'medium', evidence: [{ path: relativePath, description: '利用者が明示的に選択した実在ファイルです。行単位の断定には人による確認が必要です。' }], recommendation: testFile ? '分析目的に対応する正常系、境界値、失敗・中断のテスト有無を人が確認してください。' : specialist === 'sou' ? '分析目的に関係する型、状態、エラー処理の責務を人が確認し、必要な場合だけ改善候補を具体化してください。' : '分析目的に関係する品質、安全性、アクセシビリティの確認項目を人が整理してください。', completionCriteria: ['選択ファイルと確認項目の対応が明確である', '実施状況を断定せず確認候補として表現している'], verification: ['ファイル内容を人が確認する', '関連する既存テストと品質確認コマンドを実行する'] };
}

export function fallbackAnalysis(specialist: AnalysisSpecialist, objective: string, files: Map<string, number>): Pick<AnalysisResponse, 'summary' | 'findings'> {
  return { summary: `「${objective}」について、モデル応答を安全に採用できなかったため、選択ファイルの役割ごとに人が確認すべき候補を整理しました。実施状況の断定は避けています。`, findings: [...files.keys()].slice(0, 5).map((relativePath) => fallbackFinding(relativePath, specialist)) };
}

export function ensureSelectedFileCoverage(
  result: Pick<AnalysisResponse, 'summary' | 'findings'>,
  specialist: AnalysisSpecialist,
  objective: string,
  files: Map<string, number>,
): Pick<AnalysisResponse, 'summary' | 'findings'> {
  const referenced = new Set(result.findings.flatMap((finding) => finding.evidence.map((item) => item.path)));
  const missing = fallbackAnalysis(specialist, objective, files).findings.filter((finding) => !referenced.has(finding.evidence[0].path));
  if (!missing.length) return result;
  return { summary: result.summary, findings: [...result.findings.slice(0, Math.max(0, 5 - missing.length)), ...missing] };
}
