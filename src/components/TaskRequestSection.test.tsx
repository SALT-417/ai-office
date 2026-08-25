import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import type { ManagerApiResponse } from '../types/manager';
import type { WorkResponse } from '../types/work';
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
const workApiResponse: WorkResponse = {
  coordinator: 'レン',
  task,
  results: [
    { employeeId: 'mio', name: 'ミオ', role: 'キャリア設計、求人・企業分析、応募資料', status: 'completed', title: '応募準備チェックリスト', content: '# 最初の確認\n- 求人要件を整理する\n- 実績と対応付ける' },
  ],
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
    expect(screen.getByRole('note')).toHaveTextContent('公開版は固定サンプルです');
    expect(screen.getByRole('button', { name: 'レンに依頼する' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'サンプル計画を見る' })).toBeEnabled();
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

describe('specialist work UI', () => {
  async function createPlan(user: ReturnType<typeof userEvent.setup>, fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) {
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), task);
    expect(screen.queryByRole('button', { name: '担当社員に実行してもらう' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    return screen.findByRole('button', { name: '担当社員に実行してもらう' });
  }

  it('shows work in progress, prevents duplicate execution, and allows cancellation', async () => {
    const user = userEvent.setup();
    let workSignal: AbortSignal | null | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((url, options) => {
      if (url === '/api/manager') return Promise.resolve(new Response(JSON.stringify(apiResponse), { status: 200 }));
      workSignal = options?.signal;
      return new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    });
    const executeButton = await createPlan(user, fetchMock);
    await user.click(executeButton);

    expect(screen.getByText('担当社員がテキスト成果物を作成しています。画面を開いたままお待ちください。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '担当社員に実行してもらう' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ミオ、キャリア担当。詳細を表示。成果物を作業中/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/work')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '作業をキャンセル' }));
    expect(workSignal?.aborted).toBe(true);
    expect(screen.getByText('作業をキャンセルしました。')).toBeInTheDocument();
  });

  it('renders completed and failed results and keeps HTML strings as text', async () => {
    const user = userEvent.setup();
    const response: WorkResponse = { ...workApiResponse, results: [
      { ...workApiResponse.results[0], content: '<img src=x onerror=alert(1)>\n- 求人要件を整理する' },
      { employeeId: 'aki', name: 'アキ', role: 'テスト、品質、アクセシビリティ', status: 'failed', title: 'アキの成果物', content: '', error: '成果物の形式が正しくありませんでした。' },
    ] };
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((url) => Promise.resolve(new Response(JSON.stringify(url === '/api/manager' ? apiResponse : response), { status: 200 })));
    const executeButton = await createPlan(user, fetchMock);
    await user.click(executeButton);

    expect(await screen.findByText('応募準備チェックリスト')).toBeInTheDocument();
    expect(screen.getAllByText('✓ 完了')).not.toHaveLength(0);
    expect(screen.getAllByText('! 失敗')).not.toHaveLength(0);
    expect(screen.getByText('成果物の形式が正しくありませんでした。')).toBeInTheDocument();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('.work-content img')).toBeNull();
  });

  it('clears previous work results when a new manager request starts', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((url) => Promise.resolve(new Response(JSON.stringify(url === '/api/manager' ? apiResponse : workApiResponse), { status: 200 })));
    const executeButton = await createPlan(user, fetchMock);
    await user.click(executeButton);
    expect(await screen.findByText('応募準備チェックリスト')).toBeInTheDocument();

    const input = screen.getByLabelText('レンへの依頼内容');
    await user.clear(input);
    await user.type(input, '新しい品質確認を整理してください');
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    await waitFor(() => expect(screen.queryByText('応募準備チェックリスト')).not.toBeInTheDocument());
  });

  it('finishes specialist work in StrictMode', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((url) => Promise.resolve(new Response(JSON.stringify(url === '/api/manager' ? apiResponse : workApiResponse), { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);
    render(<StrictMode><App /></StrictMode>);
    fireEvent.change(screen.getByLabelText('レンへの依頼内容'), { target: { value: task } });
    fireEvent.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    fireEvent.click(await screen.findByRole('button', { name: '担当社員に実行してもらう' }));
    expect(await screen.findByText('応募準備チェックリスト')).toBeInTheDocument();
    expect(screen.queryByText('担当社員がテキスト成果物を作成しています。画面を開いたままお待ちください。')).not.toBeInTheDocument();
  });

  it('offers a fixed specialist sample in the published demo', () => {
    render(<TaskRequestSection status="success" response={apiResponse} error={null} onSubmit={vi.fn()} onSelectEmployee={vi.fn()} isStaticDemo />);
    expect(screen.getByRole('button', { name: 'サンプル成果物を見る' })).toBeEnabled();
    expect(screen.getByText(/公開版では固定例を表示します/)).toBeInTheDocument();
  });
});
