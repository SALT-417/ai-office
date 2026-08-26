import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import type { WorkHistoryEntry } from '../types/history';
import type { ManagerApiResponse } from '../types/manager';
import type { WorkResponse } from '../types/work';
import { STORAGE_KEY as OFFICE_STORAGE_KEY } from '../hooks/usePersistentOfficeState';
import { WORK_HISTORY_STORAGE_KEY } from '../utils/workHistoryStorage';

const task = 'AI OFFICEのAPI改善を整理してください';
const managerResponse: ManagerApiResponse = { manager: 'レン', category: 'development', reply: '計画', plan: { summary: 'API改善の計画です。', assignments: [{ name: 'ソウ', task: 'AI・Web開発、技術実装' }], firstActions: ['既存APIを整理する', 'テスト条件を決める'] } };
const workResponse: WorkResponse = { coordinator: 'レン', category: 'development', task, results: [{ employeeId: 'sou', name: 'ソウ', role: 'AI開発担当', status: 'completed', title: '実装計画', content: '# 現在の構成\n<img src=x onerror=alert(1)>\n- Vitestで確認する' }] };

function historyEntry(id = 'saved-1', overrides: Partial<WorkHistoryEntry> = {}): WorkHistoryEntry {
  return { id, createdAt: '2026-08-25T10:00:00.000Z', updatedAt: '2026-08-25T10:00:00.000Z', category: 'development', task, plan: managerResponse.plan, results: workResponse.results, reviewStatus: 'pending', reviewNote: '', ...overrides };
}

function seed(entries: WorkHistoryEntry[]) {
  localStorage.setItem(WORK_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, entries }));
}

function mockAi() {
  return vi.fn<typeof fetch>().mockImplementation((url) => Promise.resolve(new Response(JSON.stringify(url === '/api/manager' ? managerResponse : workResponse), { status: 200 })));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('work history integration', () => {
  it('saves one history entry after completion even in StrictMode', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockAi());
    render(<StrictMode><App /></StrictMode>);
    await user.type(screen.getByLabelText('レンへの依頼内容'), task);
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    await user.click(await screen.findByRole('button', { name: '担当社員に実行してもらう' }));
    expect(await screen.findByText('実装計画')).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(WORK_HISTORY_STORAGE_KEY) ?? '{}').entries).toHaveLength(1));
    expect(screen.getByText(task, { selector: '.history-list-item strong' })).toBeInTheDocument();
  });

  it('does not re-add the current execution after deleting all history', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockAi());
    render(<App />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), task);
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    await user.click(await screen.findByRole('button', { name: '担当社員に実行してもらう' }));
    await waitFor(() => expect(screen.getByText(task, { selector: '.history-list-item strong' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '全履歴を削除' }));
    await user.click(screen.getByRole('button', { name: '削除する' }));
    expect(screen.getByRole('heading', { name: '作業履歴はまだありません' })).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(WORK_HISTORY_STORAGE_KEY) ?? '{}').entries).toEqual([]));
  });

  it('restores history, updates approval/rejection and review notes', async () => {
    const user = userEvent.setup();
    seed([historyEntry()]);
    render(<App />);
    expect(screen.getAllByText('2026/08/25 19:00')).toHaveLength(2);
    const note = screen.getByLabelText('確認メモ（任意）');
    await user.type(note, '人が内容を確認しました');
    await user.click(screen.getByRole('button', { name: '承認する' }));
    expect(screen.getAllByText('✓ 承認').length).toBeGreaterThan(0);
    let stored = JSON.parse(localStorage.getItem(WORK_HISTORY_STORAGE_KEY) ?? '{}').entries[0];
    expect(stored).toMatchObject({ reviewStatus: 'approved', reviewNote: '人が内容を確認しました' });
    await user.clear(note);
    await user.type(note, '修正点を追記してください');
    await user.click(screen.getByRole('button', { name: '差し戻す' }));
    expect(screen.getAllByText('↩ 差し戻し').length).toBeGreaterThan(0);
    stored = JSON.parse(localStorage.getItem(WORK_HISTORY_STORAGE_KEY) ?? '{}').entries[0];
    expect(stored).toMatchObject({ reviewStatus: 'rejected', reviewNote: '修正点を追記してください' });
  });

  it('cancels deletion, deletes one entry, and preserves other localStorage keys', async () => {
    const user = userEvent.setup();
    seed([historyEntry()]);
    localStorage.setItem(OFFICE_STORAGE_KEY, 'office-data');
    localStorage.setItem('unrelated-key', 'keep');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'この履歴を削除' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(task);
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.getByText(task, { selector: '.history-list-item strong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'この履歴を削除' }));
    await user.click(screen.getByRole('button', { name: '削除する' }));
    expect(screen.getByRole('heading', { name: '作業履歴はまだありません' })).toBeInTheDocument();
    expect(localStorage.getItem('unrelated-key')).toBe('keep');
    expect(localStorage.getItem(OFFICE_STORAGE_KEY)).not.toBeNull();
  });

  it('deletes all history only after accessible confirmation', async () => {
    const user = userEvent.setup();
    seed([historyEntry('one'), historyEntry('two', { task: '別の依頼' })]);
    render(<App />);
    await user.click(screen.getByRole('button', { name: '全履歴を削除' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('2件すべて');
    await user.click(screen.getByRole('button', { name: '削除する' }));
    expect(screen.getByRole('heading', { name: '作業履歴はまだありません' })).toBeInTheDocument();
  });

  it('returns a saved task to the input without submitting it', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    seed([historyEntry()]);
    render(<App />);
    await user.click(screen.getByRole('button', { name: '同じ依頼を入力欄へ戻す' }));
    expect(screen.getByLabelText('レンへの依頼内容')).toHaveValue(task);
    expect(screen.getByLabelText('レンへの依頼内容')).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'ソフトウェア開発' })).toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('copies safely, reports clipboard failures, and renders HTML as text', async () => {
    const user = userEvent.setup();
    seed([historyEntry()]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<App />);
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('.history-product .work-content img')).toBeNull();
    await user.click(screen.getByRole('button', { name: '本文をコピー' }));
    expect(writeText).toHaveBeenCalledWith(workResponse.results[0].content);
    expect(await screen.findByRole('status')).toHaveTextContent('コピーしました');
    writeText.mockRejectedValueOnce(new Error('denied'));
    await user.click(screen.getByRole('button', { name: '本文をコピー' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('コピーできませんでした');
  });

  it('copies and downloads the selected work history as Markdown', async () => {
    const user = userEvent.setup();
    seed([historyEntry('approved-export', { reviewStatus: 'approved' })]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const createObjectURL = vi.fn(() => 'blob:work-markdown');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ saved: true, filename: 'work.md', relativePath: 'AI OFFICE/work.md' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Markdownをコピー' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('type: "work-history"'));
    await user.click(screen.getByRole('button', { name: '.mdをダウンロード' }));
    expect(click).toHaveBeenCalledOnce();
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:work-markdown'));
    expect(await screen.findByRole('status')).toHaveTextContent('ダウンロードしました');
    await user.click(screen.getByRole('button', { name: 'Obsidianへ保存' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('AI OFFICE / 開発');
    await user.click(screen.getByRole('button', { name: '保存する' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toMatchObject({ markdown: expect.stringContaining('type: "work-history"'), entryType: 'work', category: 'development' });
  });

  it('keeps the current result visible and reports storage quota errors', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockAi());
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === WORK_HISTORY_STORAGE_KEY) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    });
    render(<App />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), task);
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    await user.click(await screen.findByRole('button', { name: '担当社員に実行してもらう' }));
    expect(await screen.findByText('実装計画')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('保存容量');
    expect(screen.getByRole('heading', { name: '作業履歴はまだありません' })).toBeInTheDocument();
  });

  it('supports keyboard selection and shows the public safety explanation', async () => {
    seed([historyEntry()]);
    render(<App />);
    const item = screen.getByRole('button', { name: new RegExp(task) });
    item.focus();
    fireEvent.keyDown(item, { key: 'Enter' });
    fireEvent.click(item);
    expect(item).toHaveAttribute('aria-pressed', 'true');
    const historySection = screen.getByRole('region', { name: '作業履歴' });
    expect(within(historySection).getByRole('note')).toHaveTextContent('GitHubや外部サーバーへ送信されません');
    expect(within(historySection).getByRole('note')).toHaveTextContent(
      '承認してもファイル変更・コマンド実行・Git操作・外部送信は行われません',
    );
  });
});
