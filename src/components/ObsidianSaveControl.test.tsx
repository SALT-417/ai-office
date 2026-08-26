import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObsidianSaveControl } from './ObsidianSaveControl';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const props = { filename: '20260826_AI_OFFICE_work.md', markdown: '---\nsource: AI OFFICE\n---', targetLabel: '作業履歴「確認」', approved: true };

describe('ObsidianSaveControl', () => {
  it('is completely hidden in public-demo and never calls the API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ObsidianSaveControl {...props} runtimeMode="public-demo" />);
    expect(screen.queryByRole('button', { name: 'Obsidianへ保存' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires approval and supports confirmation cancellation', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = render(<ObsidianSaveControl {...props} approved={false} runtimeMode="local-ai" />);
    expect(screen.getByRole('button', { name: 'Obsidianへ保存' })).toBeDisabled();
    rerender(<ObsidianSaveControl {...props} runtimeMode="local-ai" />);
    await user.click(screen.getByRole('button', { name: 'Obsidianへ保存' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(props.targetLabel);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(props.filename);
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves once in StrictMode, prevents duplicate submission and reports success', async () => {
    const user = userEvent.setup();
    let resolveRequest: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    render(<StrictMode><ObsidianSaveControl {...props} runtimeMode="local-ai" /></StrictMode>);
    await user.click(screen.getByRole('button', { name: 'Obsidianへ保存' }));
    const confirm = screen.getByRole('button', { name: '保存する' });
    await user.dblClick(confirm);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/obsidian/save', expect.objectContaining({ body: JSON.stringify({ filename: props.filename, markdown: props.markdown }) }));
    expect(screen.getByRole('button', { name: 'Obsidianへ保存中…' })).toBeDisabled();
    resolveRequest(new Response(JSON.stringify({ saved: true, filename: props.filename, relativePath: `AI OFFICE/${props.filename}` }), { status: 200 }));
    expect(await screen.findByRole('status')).toHaveTextContent(`AI OFFICE/${props.filename}`);
  });

  it('shows a safe Japanese API error', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Obsidian Vaultの保存先が設定されていません。' }), { status: 503 })));
    render(<ObsidianSaveControl {...props} runtimeMode="local-ai" />);
    await user.click(screen.getByRole('button', { name: 'Obsidianへ保存' }));
    await user.click(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存先が設定されていません');
  });
});
