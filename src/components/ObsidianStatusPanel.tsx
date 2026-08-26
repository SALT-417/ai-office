import { useObsidianStatus } from '../hooks/useObsidianStatus';
import type { AppRuntimeMode } from '../utils/runtimeMode';

export function ObsidianStatusPanel({ runtimeMode }: { runtimeMode: AppRuntimeMode }) {
  const state = useObsidianStatus(runtimeMode);
  if (runtimeMode === 'public-demo') return <section className="obsidian-status-panel" aria-labelledby="obsidian-status-title"><div><p>LOCAL INTEGRATION</p><h2 id="obsidian-status-title">Obsidian連携</h2></div><p className="obsidian-status-message">公開版ではVault保存とDaily追記は無効です。</p></section>;
  return <section className="obsidian-status-panel" aria-labelledby="obsidian-status-title" aria-live="polite"><div><p>LOCAL INTEGRATION</p><h2 id="obsidian-status-title">Obsidian連携</h2></div>{state.status === 'loading' && <p className="obsidian-status-message">Obsidian連携状態を確認しています…</p>}{state.status === 'error' && <p className="obsidian-status-message error">{state.error}</p>}{state.data && <><dl className="obsidian-status-grid"><div><dt>Vault保存</dt><dd>{state.data.vaultSaveEnabled ? '✓ 有効' : '— 無効'}</dd></div><div><dt>保存先</dt><dd>{state.data.exportSubdir}</dd></div><div><dt>Daily追記</dt><dd>{state.data.dailyNotesEnabled ? '✓ 有効' : '— 無効'}</dd></div><div><dt>Daily保存先</dt><dd>{state.data.dailyNotesSubdir}</dd></div></dl><p className="obsidian-status-message">{state.data.message}</p></>}</section>;
}
