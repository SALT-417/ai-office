import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import type { ManagerApiResponse } from '../types/manager';
import type { CustomRequestTemplate } from '../types/requestTemplate';
import { CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY, makeAutomaticTemplateTitle } from '../utils/customRequestTemplateStorage';

const prompt = '毎日のタスクを優先順位と期限で整理してください。';
const now = new Date('2026-08-26T00:00:00.000Z').toISOString();

function seed(entries: CustomRequestTemplate[]) {
  localStorage.setItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY, JSON.stringify({ version: 1, entries }));
}

function custom(index: number, category: CustomRequestTemplate['category'] = 'general'): CustomRequestTemplate {
  return { id: `saved-${index}`, category, title: `保存済み${index}`, prompt: `${category}の保存済み依頼${index}`, createdAt: now, updatedAt: now };
}

describe('custom request templates UI', () => {
  it('saves the current prompt in the selected category and applies it without submitting', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<App runtimeMode="local-ai" />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), prompt);
    await user.type(screen.getByLabelText('保存用タイトル（任意）'), '毎日の整理');
    await user.click(screen.getByRole('button', { name: '自分用テンプレートとして保存' }));
    expect(await screen.findByRole('status')).toHaveTextContent('保存しました');
    const stored = JSON.parse(localStorage.getItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY) ?? '{}').entries[0];
    expect(stored).toMatchObject({ category: 'general', title: '毎日の整理', prompt });
    await user.clear(screen.getByLabelText('レンへの依頼内容'));
    await user.click(screen.getByRole('button', { name: '毎日の整理を依頼欄へ反映' }));
    expect(screen.getByLabelText('レンへの依頼内容')).toHaveValue(prompt);
    expect(screen.getByLabelText('レンへの依頼内容')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates an automatic title when the title is omitted', async () => {
    const user = userEvent.setup();
    render(<App runtimeMode="local-ai" />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), prompt);
    await user.click(screen.getByRole('button', { name: '自分用テンプレートとして保存' }));
    expect(screen.getByRole('button', { name: `${makeAutomaticTemplateTitle(prompt)}を依頼欄へ反映` })).toBeInTheDocument();
  });

  it('switches saved templates by category without deleting them', async () => {
    const user = userEvent.setup();
    seed([custom(1, 'general'), custom(2, 'learning')]);
    render(<App runtimeMode="local-ai" />);
    expect(screen.getByRole('button', { name: '保存済み1を依頼欄へ反映' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存済み2を依頼欄へ反映' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'AI学習' }));
    expect(screen.getByRole('button', { name: '保存済み2を依頼欄へ反映' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存済み1を依頼欄へ反映' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CUSTOM_REQUEST_TEMPLATES_STORAGE_KEY) ?? '{}').entries).toHaveLength(2);
  });

  it('renames a template and supports cancel or confirm deletion', async () => {
    const user = userEvent.setup();
    seed([custom(1)]);
    render(<App runtimeMode="local-ai" />);
    await user.click(screen.getByRole('button', { name: '名前変更' }));
    await user.clear(screen.getByLabelText('新しいテンプレート名'));
    await user.type(screen.getByLabelText('新しいテンプレート名'), '新しい名前');
    await user.click(screen.getByRole('button', { name: '名前を保存' }));
    expect(screen.getByRole('button', { name: '新しい名前を依頼欄へ反映' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('新しい名前');
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.getByRole('button', { name: '新しい名前を依頼欄へ反映' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '削除' }));
    await user.click(screen.getByRole('button', { name: '削除する' }));
    expect(screen.queryByRole('button', { name: '新しい名前を依頼欄へ反映' })).not.toBeInTheDocument();
  });

  it('reports the per-category limit in Japanese', async () => {
    const user = userEvent.setup();
    seed(Array.from({ length: 10 }, (_, index) => custom(index)));
    render(<App runtimeMode="local-ai" />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), prompt);
    await user.click(screen.getByRole('button', { name: '自分用テンプレートとして保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('1カテゴリ10件まで');
  });

  it('works in public-demo without API calls', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<App runtimeMode="public-demo" />);
    await user.type(screen.getByLabelText('レンへの依頼内容'), prompt);
    await user.click(screen.getByRole('button', { name: '自分用テンプレートとして保存' }));
    await user.clear(screen.getByLabelText('レンへの依頼内容'));
    await user.click(screen.getByRole('button', { name: `${makeAutomaticTemplateTitle(prompt)}を依頼欄へ反映` }));
    expect(screen.getByLabelText('レンへの依頼内容')).toHaveValue(prompt);
    expect(screen.getByRole('button', { name: 'レンに依頼する' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a saved template task and category in local-ai mode', async () => {
    const user = userEvent.setup();
    const saved = custom(1, 'development');
    seed([saved]);
    const response: ManagerApiResponse = { manager: 'レン', category: 'development', reply: '返答', plan: { summary: '計画', assignments: [], firstActions: ['確認', '実装'] } };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App runtimeMode="local-ai" />);
    await user.click(screen.getByRole('radio', { name: 'ソフトウェア開発' }));
    await user.click(screen.getByRole('button', { name: '保存済み1を依頼欄へ反映' }));
    await user.click(screen.getByRole('button', { name: 'レンに依頼する' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ category: 'development', task: saved.prompt });
  });
});
