import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import type { ManagerApiResponse } from '../types/manager';
import { TaskRequestSection } from './TaskRequestSection';

const task = 'AIエンジニアへの転職に向けて、次の作業を整理してください';
const apiResponse: ManagerApiResponse = {
  manager: 'レン',
  reply: '整形済みの計画',
  plan: {
    summary: 'AI OFFICEを転職用ポートフォリオとして改善する依頼です。',
    assignments: [
      { name: 'レン', task: '全体計画、優先順位、進捗管理' },
      { name: 'ミオ', task: 'キャリア設計、求人・企業分析、応募資料' },
    ],
    firstActions: ['現在の課題を整理する。', '求人要件と成果を対応付ける。'],
  },
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('TaskRequestSection', () => {
  it('does not submit an empty task and shows the character limit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskRequestSection status="idle" response={null} error={null} onSubmit={onSubmit} onSelectEmployee={vi.fn()} isStaticDemo={false} />);
    const button = screen.getByRole('button', { name: 'レンに依頼する' });
    expect(button).toBeDisabled();
    expect(screen.getByText('残り 2000 文字')).toBeInTheDocument();
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('posts the normalized task and shows the structured plan', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(apiResponse), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await user.type(screen.getByLabelText('レンへの依頼内容'), `  ${task}  `);
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/manager');
    expect(JSON.parse(String(options?.body))).toEqual({ task });
    expect(await screen.findByText(apiResponse.plan.summary)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '担当者と担当内容' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '最初に着手する具体的な作業' })).toBeInTheDocument();
    expect(screen.getByText('求人要件と成果を対応付ける。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ミオ、キャリア担当。詳細を表示。新しい計画の担当者/ })).toBeInTheDocument();
  });

  it('shows loading state and prevents duplicate submissions', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), task);
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    expect(screen.getByRole('button', { name: /レンが整理中/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('レンが依頼を確認し');
    expect(screen.getByRole('button', { name: /レン、マネージャー。詳細を表示。依頼を処理中/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('selects the existing employee panel from an assignment card', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(apiResponse), { status: 200 })));
    render(<App />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), task);
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    await user.click(await screen.findByRole('button', { name: 'ミオの社員詳細を表示' }));
    expect(screen.getByRole('heading', { name: 'ミオ' })).toBeInTheDocument();
  });

  it('announces a safe Japanese API error', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: 'ローカルAIに接続できません。Ollamaが起動しているか確認してください。' }), { status: 503 })));
    render(<App />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), task);
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ollamaが起動しているか確認してください');
  });

  it('explains that the published build is a static demo', () => {
    render(<TaskRequestSection status="idle" response={null} error={null} onSubmit={vi.fn()} onSelectEmployee={vi.fn()} isStaticDemo />);
    expect(screen.getByRole('note')).toHaveTextContent('公開版はデモ表示です');
    expect(screen.getByRole('button', { name: 'レンに依頼する' })).toBeDisabled();
  });
});

describe('useManagerRequest in StrictMode', () => {
  function renderStrictApp() {
    return render(<StrictMode><App /></StrictMode>);
  }

  function submitTask() {
    fireEvent.change(screen.getByLabelText('レンへの依頼内容'), { target: { value: task } });
    fireEvent.click(screen.getByRole('button', { name: 'レンに依頼する' }));
  }

  it('leaves loading and displays the plan after a successful request', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(apiResponse), { status: 200 })));
    renderStrictApp();
    submitTask();

    expect(await screen.findByText(apiResponse.plan.summary)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'レンに依頼する' })).toBeEnabled();
    expect(screen.queryByText('レンが依頼を確認し、担当者と最初の作業を整理しています。')).not.toBeInTheDocument();
  });

  it('leaves loading and displays a Japanese API error', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: 'ローカルAIを利用できません。しばらくしてから再度お試しください。' }), { status: 503 })));
    renderStrictApp();
    submitTask();

    expect(await screen.findByRole('alert')).toHaveTextContent('ローカルAIを利用できません');
    expect(screen.getByRole('button', { name: 'レンに依頼する' })).toBeEnabled();
  });

  it('leaves loading and displays a Japanese timeout error after 35 seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    renderStrictApp();
    submitTask();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });

    expect(screen.getByRole('alert')).toHaveTextContent('レンからの返答がタイムアウトしました');
    expect(screen.getByRole('button', { name: 'レンに依頼する' })).toBeEnabled();
  });

  it('aborts the active request when StrictMode unmounts', async () => {
    let requestSignal: AbortSignal | null | undefined;
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((_url, options) => {
      requestSignal = options?.signal;
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }));
    const view = renderStrictApp();
    submitTask();
    expect(requestSignal?.aborted).toBe(false);

    view.unmount();

    expect(requestSignal?.aborted).toBe(true);
  });
});
