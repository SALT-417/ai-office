import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObsidianSaveControl } from './ObsidianSaveControl';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const props = { filename: '20260826_AI_OFFICE_work.md', markdown: '---\nsource: AI OFFICE\n---', targetLabel: '作業履歴「確認」', approved: true, entryType: 'work' as const, category: 'development' as const, destinationLabel: 'AI OFFICE / 開発', dailyTitle: 'API改善', dailySummary: '承認済み成果物を保存しました。', employees: ['ソウ'] };

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
    expect(screen.getByRole('alertdialog')).toHaveTextContent('AI OFFICE / 開発');
    expect(screen.getByRole('checkbox', { name: /Dailyノートにも追記する/ })).not.toBeChecked();
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
    expect(fetchMock).toHaveBeenCalledWith('/api/obsidian/save', expect.objectContaining({ body: JSON.stringify({ filename: props.filename, markdown: props.markdown, entryType: 'work', category: 'development', dailyNote: { enabled: false, title: props.dailyTitle, summary: props.dailySummary, employees: props.employees } }) }));
    expect(screen.getByRole('button', { name: 'Obsidianへ保存中…' })).toBeDisabled();
    resolveRequest(new Response(JSON.stringify({ saved: true, filename: props.filename, relativePath: `AI OFFICE/${props.filename}`, dailyNote: { appended: false, reason: 'not-requested' } }), { status: 200 }));
    expect(await screen.findByRole('status')).toHaveTextContent(`AI OFFICE/${props.filename}`);
  });

  it('sends an explicitly selected Daily note and reports the appended path', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ saved: true, filename: props.filename, relativePath: `AI OFFICE/開発/${props.filename}`, dailyNote: { appended: true, relativePath: 'Daily/2026-08-26.md' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ObsidianSaveControl {...props} runtimeMode="local-ai" />);
    await user.click(screen.getByRole('button', { name: 'Obsidianへ保存' }));
    await user.click(screen.getByRole('checkbox', { name: /Dailyノートにも追記する/ }));
    await user.click(screen.getByRole('button', { name: '保存する' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/obsidian/save', expect.objectContaining({ body: expect.stringContaining('"enabled":true') }));
    expect(fetchMock).toHaveBeenCalledWith('/api/obsidian/save', expect.objectContaining({ body: expect.stringContaining('"employees":["ソウ"]') }));
    expect(await screen.findByRole('status')).toHaveTextContent('Dailyにも追記しました: Daily/2026-08-26.md');
  });

  it('reports when Daily notes are disabled without treating the individual save as an error', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ saved: true, filename: props.filename, relativePath: `AI OFFICE/開発/${props.filename}`, dailyNote: { appended: false, reason: 'disabled' } }), { status: 200 })));
    render(<ObsidianSaveControl {...props} runtimeMode="local-ai" />);
    await user.click(screen.getByRole('button', { name: 'Obsidianへ保存' }));
    await user.click(screen.getByRole('checkbox', { name: /Dailyノートにも追記する/ }));
    await user.click(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Daily追記は設定で無効です');
  });

  it('reports a partial Daily failure while preserving the individual-save success', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ saved: true, filename: props.filename, relativePath: `AI OFFICE/開発/${props.filename}`, dailyNote: { appended: false, reason: 'failed' } }), { status: 200 })));
    render(<ObsidianSaveControl {...props} runtimeMode="local-ai" />);
    await user.click(screen.getByRole('button', { name: 'Obsidianへ保存' }));
    await user.click(screen.getByRole('checkbox', { name: /Dailyノートにも追記する/ }));
    await user.click(screen.getByRole('button', { name: '保存する' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Markdownは保存しましたが、Daily追記は失敗しました');
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
