import { describe, expect, it } from 'vitest';
import { ANALYSIS_LIMITS } from '../src/types/analysisContract';
import { parseAnalysis } from './analysis-output';

const selectedFiles = new Map([['src/App.tsx', 10]]);
const validFinding = (overrides: Record<string, unknown> = {}) => ({
  title: '入力検証の確認', severity: 'medium', evidence: [{ path: 'src/App.tsx', line: 1, description: '入力処理を確認する根拠です。' }],
  recommendation: '境界条件を人が確認してください。', completionCriteria: ['期待結果が定義されている'], verification: ['テスト内容を確認する'], ...overrides,
});
const analysisJson = (findings: unknown = [validFinding()], summary: unknown = '選択範囲を確認した結果です。') => JSON.stringify({ summary, findings });

describe('analysis output validation and normalization', () => {
  it.each([
    ['findings', 'not-array', analysisJson('invalid')], ['finding', 'not-object', analysisJson(['invalid'])],
    ['title', 'missing', analysisJson([validFinding({ title: '' })])], ['title', 'too-long', analysisJson([validFinding({ title: 'あ'.repeat(ANALYSIS_LIMITS.title + 1) })])],
    ['severity', 'invalid-value', analysisJson([validFinding({ severity: 'critical' })])], ['evidence', 'not-array', analysisJson([validFinding({ evidence: 'invalid' })])],
    ['evidence', 'empty', analysisJson([validFinding({ evidence: [] })])], ['evidence.path', 'missing', analysisJson([validFinding({ evidence: [{ path: '', description: '根拠です。' }] })])],
    ['evidence.description', 'missing', analysisJson([validFinding({ evidence: [{ path: 'src/App.tsx', description: '' }] })])],
    ['evidence.description', 'too-long', analysisJson([validFinding({ evidence: [{ path: 'src/App.tsx', description: 'あ'.repeat(ANALYSIS_LIMITS.description + 1) }] })])],
    ['recommendation', 'missing', analysisJson([validFinding({ recommendation: '' })])], ['recommendation', 'too-long', analysisJson([validFinding({ recommendation: 'あ'.repeat(ANALYSIS_LIMITS.recommendation + 1) })])],
    ['completionCriteria', 'not-array', analysisJson([validFinding({ completionCriteria: 'invalid' })])],
    ['completionCriteria', 'empty', analysisJson([validFinding({ completionCriteria: [] })])], ['completionCriteria', 'invalid-type', analysisJson([validFinding({ completionCriteria: [1] })])],
    ['verification', 'not-array', analysisJson([validFinding({ verification: 'invalid' })])], ['verification', 'empty', analysisJson([validFinding({ verification: [] })])], ['verification', 'invalid-type', analysisJson([validFinding({ verification: [1] })])],
    ['verification', 'too-long', analysisJson([validFinding({ verification: ['あ'.repeat(ANALYSIS_LIMITS.listItem + 1)] })])],
    ['title', 'not-japanese', analysisJson([validFinding({ title: '这项测试结果', recommendation: '这项建议需要检查' })])],
  ])('reports detailed validation field %s and reason %s', (field, reason, raw) => {
    expect(parseAnalysis(raw, selectedFiles)).toMatchObject({ value: null, issue: { field, reason } });
  });

  it('safely normalizes severity, numeric lines, duplicates, and collection limits', () => {
    const repeatedEvidence = { path: 'src/App.tsx', line: '2', description: '同じ根拠を確認します。' };
    const findings = Array.from({ length: 6 }, () => validFinding({ severity: '高', evidence: [repeatedEvidence, repeatedEvidence], completionCriteria: [...Array.from({ length: 9 }, (_, index) => `完了条件${index}`), '完了条件0'], verification: [...Array.from({ length: 9 }, (_, index) => `確認方法${index}`), '確認方法0'] }));
    const result = parseAnalysis(analysisJson(findings), selectedFiles);
    expect(result.value?.findings).toHaveLength(ANALYSIS_LIMITS.findings);
    expect(result.value?.findings[0]).toMatchObject({ severity: 'high', evidence: [{ path: 'src/App.tsx', line: 2 }] });
    expect(result.value?.findings[0].completionCriteria).toHaveLength(ANALYSIS_LIMITS.listItems);
    expect(result.value?.findings[0].verification).toHaveLength(ANALYSIS_LIMITS.listItems);
    expect(result.diagnostics.map(({ field, reason }) => `${field}:${reason}`)).toEqual(expect.arrayContaining(['findings:max-exceeded', 'severity:invalid-value', 'evidence:duplicate', 'completionCriteria:max-exceeded', 'verification:max-exceeded']));
  });

  it('omits unsafe lines and unselected evidence without inventing replacements', () => {
    const result = parseAnalysis(analysisJson([validFinding({ evidence: [{ path: 'src/App.tsx', line: '999', description: '範囲外の行です。' }, { path: 'src/App.tsx', line: 'abc', description: '型不正の行です。' }, { path: 'server/not-selected.ts', line: 1, description: '選択外の根拠です。' }] })]), selectedFiles);
    expect(result.value?.findings[0].evidence).toEqual([{ path: 'src/App.tsx', description: '範囲外の行です。' }, { path: 'src/App.tsx', description: '型不正の行です。' }]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'evidence.line', reason: 'line-out-of-range' }), expect.objectContaining({ field: 'evidence.line', reason: 'invalid-type' }), expect.objectContaining({ field: 'evidence.path', reason: 'unselected-path' })]));
    const noEvidence = parseAnalysis(analysisJson([validFinding({ evidence: [{ path: 'server/not-selected.ts', description: '選択外です。' }] })]), selectedFiles);
    expect(noEvidence).toMatchObject({ value: null, issue: { field: 'evidence', reason: 'empty' } });
  });

  it('limits evidence in order without creating paths or lines', () => {
    const evidence = Array.from({ length: ANALYSIS_LIMITS.evidence + 1 }, (_, index) => ({ path: 'src/App.tsx', description: `確認根拠${index}です。` }));
    const result = parseAnalysis(analysisJson([validFinding({ evidence })]), selectedFiles);
    expect(result.value?.findings[0].evidence).toEqual(evidence.slice(0, ANALYSIS_LIMITS.evidence));
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ field: 'evidence', reason: 'max-exceeded', lengthOrCount: ANALYSIS_LIMITS.evidence + 1 }));
  });
});
