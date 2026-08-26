import { useState } from 'react';
import { useObsidianSave } from '../hooks/useObsidianSave';
import type { AppRuntimeMode } from '../utils/runtimeMode';

interface Props {
  runtimeMode: AppRuntimeMode;
  filename: string;
  markdown: string;
  targetLabel: string;
  approved: boolean;
}

export function ObsidianSaveControl({ runtimeMode, filename, markdown, targetLabel, approved }: Props) {
  const [confirming, setConfirming] = useState(false);
  const save = useObsidianSave(runtimeMode);
  if (runtimeMode !== 'local-ai') return null;

  const confirm = async () => {
    setConfirming(false);
    await save.save(filename, markdown);
  };

  return <div className="obsidian-save-control">
    <button type="button" className="obsidian-save-button" disabled={!approved || save.status === 'loading'} onClick={() => setConfirming(true)}>{save.status === 'loading' ? 'Obsidianへ保存中…' : 'Obsidianへ保存'}</button>
    {!approved && <p>人が承認した履歴だけをVaultへ保存できます。</p>}
    {save.message && <p className={save.status === 'error' ? 'request-error' : 'history-copy-status'} role={save.status === 'error' ? 'alert' : 'status'}>{save.message}</p>}
    {confirming && <div className="dialog-backdrop" onKeyDown={(event) => { if (event.key === 'Escape') setConfirming(false); }}><div className="delete-dialog obsidian-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="obsidian-confirm-title" aria-describedby="obsidian-confirm-description"><h3 id="obsidian-confirm-title">Obsidian Vaultへ保存しますか？</h3><div id="obsidian-confirm-description"><p><strong>保存対象：</strong>{targetLabel}</p><p><strong>ファイル名：</strong><code>{filename}</code></p><p>VaultへMarkdownファイルを作成します。秘密情報や個人情報がないか、内容を確認してください。既存ファイルは上書きしません。</p></div><div><button type="button" className="dialog-cancel" onClick={() => setConfirming(false)} autoFocus>キャンセル</button><button type="button" className="obsidian-confirm-button" onClick={() => void confirm()}>保存する</button></div></div></div>}
  </div>;
}
