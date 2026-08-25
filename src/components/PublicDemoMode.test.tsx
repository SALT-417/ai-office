import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { PUBLIC_DEMO_NOTICE } from '../data/publicDemo';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('public sample mode', () => {
  it('shows typed fixed samples, selects employees, closes samples, and never calls any API', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<App runtimeMode="public-demo" />);
    expect(screen.getAllByText('公開サンプル・AI通信なし').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'この作品で示していること' })).toBeInTheDocument();

    localStorage.setItem('ai-office-work-history-v1', 'keep-work');
    localStorage.setItem('ai-office-analysis-history-v1', 'keep-analysis');
    await user.click(screen.getByRole('button', { name: 'サンプル計画を見る' }));
    expect(screen.getByText(/一般業務として整理する固定サンプル/)).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(PUBLIC_DEMO_NOTICE)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'ソウの社員詳細を表示' }));
    expect(screen.getByRole('heading', { name: 'ソウ' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'サンプル成果物を見る' }));
    expect(screen.getByText('一般業務の成果物例')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'サンプル成果物を閉じる' }));
    expect(screen.queryByText('一般業務の成果物例')).not.toBeInTheDocument();

    const analysis = screen.getByRole('region', { name: 'プロジェクトを分析' });
    await user.click(within(analysis).getByRole('button', { name: 'サンプル分析を見る' }));
    expect(screen.getByText('分析APIの入力・パス・中断処理')).toBeInTheDocument();
    expect(screen.getByText('境界値と構造化応答のテスト観点')).toBeInTheDocument();
    expect(screen.getByText('画面の送信防止・通知・操作性')).toBeInTheDocument();
    await user.click(within(analysis).getByRole('button', { name: 'サンプルを閉じる' }));
    expect(screen.queryByText('分析APIの入力・パス・中断処理')).not.toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('ai-office-work-history-v1')).toBe('keep-work');
    expect(localStorage.getItem('ai-office-analysis-history-v1')).toBe('keep-analysis');
  });

  it('keeps the local mode label and existing request UI', () => {
    render(<App runtimeMode="local-ai" />);
    expect(screen.getAllByText('ローカルAI稼働').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'レンに依頼する' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'サンプル計画を見る' })).not.toBeInTheDocument();
  });

  it('switches all five fixed category samples without API calls or history writes', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<App runtimeMode="public-demo" />);
    for (const label of ['一般業務', 'AI学習', 'ソフトウェア開発', '転職・キャリア', 'コンテンツ・SNS']) {
      await user.click(screen.getByRole('radio', { name: label }));
      await user.click(screen.getByRole('button', { name: 'サンプル計画を見る' }));
      expect(screen.getByText(new RegExp(`${label}として整理する固定サンプル`))).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'サンプルを閉じる' }));
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('ai-office-work-history-v1')).toBeNull();
  });
});
