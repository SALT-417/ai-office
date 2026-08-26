import { render, screen } from '@testing-library/react';
import { ObsidianStatusPanel } from './ObsidianStatusPanel';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('ObsidianStatusPanel', () => {
  it('loads and displays the local status', async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ObsidianStatusPanel runtimeMode="local-ai" />);
    expect(screen.getByText('Obsidian連携状態を確認しています…')).toBeInTheDocument();
    resolveRequest(new Response(JSON.stringify({ available: true, vaultSaveEnabled: true, exportSubdir: 'AI OFFICE', dailyNotesEnabled: true, dailyNotesSubdir: 'Daily', message: 'Vault保存とDaily追記を利用できます。' }), { status: 200 }));
    expect(await screen.findAllByText('✓ 有効')).toHaveLength(2);
    expect(screen.getByText('AI OFFICE')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/obsidian/status', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('uses a fixed public message without any API request', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ObsidianStatusPanel runtimeMode="public-demo" />);
    expect(screen.getByText('公開版ではVault保存とDaily追記は無効です。')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a safe Japanese error and rejects absolute-path-shaped data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true, vaultSaveEnabled: true, exportSubdir: 'C:\\Users\\secret', dailyNotesEnabled: true, dailyNotesSubdir: 'Daily', message: 'C:\\Users\\secret' }), { status: 200 })));
    render(<ObsidianStatusPanel runtimeMode="local-ai" />);
    expect(await screen.findByText('Obsidian連携状態を確認できませんでした。')).toBeInTheDocument();
    expect(screen.queryByText(/C:\\Users/)).not.toBeInTheDocument();
  });
});
