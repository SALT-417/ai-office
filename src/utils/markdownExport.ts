import { workCategoryById } from '../../shared/workCategories';
import type { AnalysisHistoryEntry, AnalysisSeverity } from '../types/analysis';
import type { ReviewStatus, WorkHistoryEntry } from '../types/history';

const reviewLabels: Record<ReviewStatus, string> = {
  pending: '未確認',
  approved: '承認',
  rejected: '差し戻し',
};

const severityLabels: Record<AnalysisSeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

function yamlValue(value: string): string {
  return JSON.stringify(value.replace(/\r\n?/g, '\n'));
}

function yamlArray(values: string[]): string {
  return `[${values.map(yamlValue).join(', ')}]`;
}

function visibleMarkdown(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineText(value: string): string {
  return visibleMarkdown(value.replace(/\s+/g, ' ').trim());
}

function frontmatter(fields: Array<[string, string | string[]]>): string {
  return ['---', ...fields.map(([key, value]) => `${key}: ${Array.isArray(value) ? yamlArray(value) : yamlValue(value)}`), '---'].join('\n');
}

function bulletLines(values: string[]): string {
  return values.map((value) => `- ${visibleMarkdown(value)}`).join('\n');
}

export function workHistoryToMarkdown(entry: WorkHistoryEntry): string {
  const employees = [...new Set(entry.results.map((result) => result.name))];
  const assignments = entry.plan.assignments.length
    ? entry.plan.assignments.map((assignment) => `- **${inlineText(assignment.name)}**：${visibleMarkdown(assignment.task)}`).join('\n')
    : '- 担当者なし';
  const results = entry.results.length
    ? entry.results.map((result) => [
      `### ${inlineText(result.name)}：${inlineText(result.title)}`,
      '',
      `- 役割：${inlineText(result.role)}`,
      `- 状態：${result.status === 'completed' ? '完了' : '失敗'}`,
      '',
      visibleMarkdown(result.status === 'completed' ? result.content : (result.error ?? result.content)),
    ].join('\n')).join('\n\n')
    : '成果物はありません。';

  return `${frontmatter([
    ['source', 'AI OFFICE'],
    ['type', 'work-history'],
    ['title', entry.task],
    ['category', entry.category],
    ['review_status', entry.reviewStatus],
    ['created_at', entry.createdAt],
    ['updated_at', entry.updatedAt],
    ['employees', employees],
    ['tags', ['ai-office', 'work-history']],
  ])}

# AI OFFICE 作業履歴 — ${inlineText(entry.task)}

## 基本情報

- 種別：AI OFFICE 作業履歴
- 作成日時：${entry.createdAt}
- 更新日時：${entry.updatedAt}
- カテゴリ：${workCategoryById[entry.category].label}（${entry.category}）
- 確認状態：${reviewLabels[entry.reviewStatus]}
- 確認メモ：${entry.reviewNote ? visibleMarkdown(entry.reviewNote) : 'なし'}

## 依頼内容

${visibleMarkdown(entry.task)}

## レンの計画

### 依頼の理解

${visibleMarkdown(entry.plan.summary)}

### 担当者と担当内容

${assignments}

### 最初に着手する具体的な作業

${entry.plan.firstActions.length ? bulletLines(entry.plan.firstActions) : '- なし'}

## 専門社員の成果物

${results}
`;
}

export function analysisHistoryToMarkdown(entry: AnalysisHistoryEntry): string {
  const findings = entry.findings.length
    ? entry.findings.map((finding) => {
      const evidence = finding.evidence.map((item) => `- \`${inlineText(item.path)}${item.line ? `:${item.line}` : ''}\` — ${visibleMarkdown(item.description)}`).join('\n');
      return `### ${inlineText(finding.title)}

- 重要度：${severityLabels[finding.severity]}（${finding.severity}）

#### 根拠

${evidence}

#### 改善案

${visibleMarkdown(finding.recommendation)}

#### 完了条件

${bulletLines(finding.completionCriteria)}

#### 確認方法

${bulletLines(finding.verification)}`;
    }).join('\n\n')
    : '指摘はありません。';

  return `${frontmatter([
    ['source', 'AI OFFICE'],
    ['type', 'analysis-history'],
    ['title', entry.objective],
    ['review_status', entry.reviewStatus],
    ['created_at', entry.createdAt],
    ['updated_at', entry.updatedAt],
    ['employees', [entry.specialistName]],
    ['tags', ['ai-office', 'analysis-history']],
  ])}

# AI OFFICE 分析履歴 — ${inlineText(entry.objective)}

## 基本情報

- 種別：AI OFFICE 分析履歴
- 作成日時：${entry.createdAt}
- 更新日時：${entry.updatedAt}
- 担当社員：${entry.specialistName}
- 確認状態：${reviewLabels[entry.reviewStatus]}
- 確認メモ：${entry.reviewNote ? visibleMarkdown(entry.reviewNote) : 'なし'}
- 伏字：${entry.redacted ? 'あり' : 'なし'}

## 分析目的

${visibleMarkdown(entry.objective)}

## 分析対象ファイル

${entry.analyzedFiles.map((path) => `- \`${inlineText(path)}\``).join('\n')}

## 要約

${visibleMarkdown(entry.summary)}

## 指摘

${findings}
`;
}

export function createMarkdownFilename(entry: WorkHistoryEntry | AnalysisHistoryEntry): string {
  const date = new Date(entry.createdAt);
  const stamp = Number.isNaN(date.getTime())
    ? 'unknown_date'
    : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  const suffix = 'task' in entry ? `work_${entry.category}` : `analysis_${entry.specialist}`;
  return `${stamp}_AI_OFFICE_${suffix}.md`
    .replace(/[<>:"/\\|?*]/g, '_')
    .split('')
    .map((character) => character.charCodeAt(0) < 32 ? '_' : character)
    .join('');
}

export function downloadMarkdown(markdown: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
