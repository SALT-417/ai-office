import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectAnalysisSection } from './ProjectAnalysisSection';

const files = [{ path: 'src/App.tsx', category: 'frontend', size: 120 }, { path: 'server/app.ts', category: 'server', size: 240 }];
const result = { specialist: 'sou', specialistName: 'ソウ', objective: '安全性を確認', analyzedFiles: ['src/App.tsx'], redacted: false, summary: '<img src=x onerror=alert(1)> 要約', findings: [{ title: '失敗処理', severity: 'high', evidence: [{ path: 'src/App.tsx', line: 2, description: 'catch処理' }], recommendation: '安全なエラーを表示する', completionCriteria: ['エラー表示がある'], verification: ['画面を確認する'] }] };
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('ProjectAnalysisSection', () => {
  it('requires explicit selection and confirmation, prevents duplicate submission, displays and saves safe structured results in StrictMode', async () => {
    let resolveAnalysis: (value: Response) => void = () => undefined;
    const fetchMock = vi.fn((url: string) => url === '/api/project-files'
      ? Promise.resolve({ ok: true, json: async () => ({ files }) } as Response)
      : new Promise<Response>((resolve) => { resolveAnalysis = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = render(<StrictMode><ProjectAnalysisSection isStaticDemo={false} /></StrictMode>);
    await user.click(screen.getByRole('button', { name: '安全なファイル一覧を取得' }));
    await screen.findByText('src/App.tsx');
    const confirm = screen.getByRole('button', { name: '選択ファイルを確認' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText('分析目的'), '安全性を確認');
    await user.click(screen.getByLabelText(/src\/App\.tsx/));
    expect(screen.queryByRole('button', { name: '分析を開始' })).not.toBeInTheDocument();
    await user.click(confirm);
    await user.click(screen.getByRole('button', { name: '分析を開始' }));
    expect(screen.getByText(/ローカルAIが分析しています/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '分析中…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '分析中…' }));
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/analyze')).toHaveLength(1);
    resolveAnalysis({ ok: true, json: async () => result } as Response);
    await screen.findByText('重要度：高');
    expect(screen.getAllByText('src/App.tsx:2').length).toBeGreaterThan(0);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('<img src=x onerror=alert(1)> 要約').length).toBeGreaterThan(0);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('ai-office-analysis-history-v1') ?? '{}').entries).toHaveLength(1));
    expect(localStorage.getItem('ai-office-work-history-v1')).toBeNull();
  });

  it('cancels, supports review/delete/copy, and does not clear the existing work-history key', async () => {
    const user = userEvent.setup();
    let rejectAnalysis: (reason: Error) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => url === '/api/project-files' ? Promise.resolve({ ok: true, json: async () => ({ files }) } as Response) : new Promise((_resolve, reject) => { rejectAnalysis = reject; init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))); })));
    localStorage.setItem('ai-office-work-history-v1', 'keep');
    render(<ProjectAnalysisSection isStaticDemo={false} />);
    await user.click(screen.getByRole('button', { name: '安全なファイル一覧を取得' })); await screen.findByText('src/App.tsx'); await user.type(screen.getByLabelText('分析目的'), '確認'); await user.click(screen.getByLabelText(/src\/App\.tsx/)); await user.click(screen.getByRole('button', { name: '選択ファイルを確認' })); await user.click(screen.getByRole('button', { name: '分析を開始' })); await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    rejectAnalysis(new Error('abort'));
    expect(await screen.findByRole('alert')).toHaveTextContent('分析をキャンセルしました');
    expect(localStorage.getItem('ai-office-work-history-v1')).toBe('keep');
  });

  it('explains the static demo and never fetches project files', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<ProjectAnalysisSection isStaticDemo />);
    expect(screen.getByText(/GitHub Pagesは静的デモ/)).toBeInTheDocument();
    expect(screen.getByLabelText('分析目的')).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores analysis history and supports approval, copy, delete confirmation and cancellation', async () => {
    const saved = { ...result, id: 'saved', createdAt: '2026-08-25T00:00:00.000Z', updatedAt: '2026-08-25T00:00:00.000Z', reviewStatus: 'pending', reviewNote: '' };
    localStorage.setItem('ai-office-analysis-history-v1', JSON.stringify({ version: 1, entries: [saved] }));
    localStorage.setItem('ai-office-work-history-v1', 'keep');
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<ProjectAnalysisSection isStaticDemo />);
    expect(screen.getAllByText('○ 未確認')).toHaveLength(2);
    await user.type(screen.getByLabelText('確認メモ（任意）'), '人が確認'); await user.click(screen.getByRole('button', { name: /承認する/ }));
    expect((await screen.findAllByText('✓ 承認')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '分析結果をコピー' })); expect(writeText).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'この分析を削除' })); expect(screen.getByRole('dialog')).toBeInTheDocument(); await user.click(screen.getByRole('button', { name: 'キャンセル' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'この分析を削除' })); await user.click(screen.getByRole('button', { name: '削除する' })); expect(screen.getByText('分析履歴はまだありません')).toBeInTheDocument(); expect(localStorage.getItem('ai-office-work-history-v1')).toBe('keep');
  });
});
