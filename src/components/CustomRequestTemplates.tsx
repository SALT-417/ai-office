import { useState, type FormEvent } from 'react';
import type { WorkCategory } from '../../shared/workCategories';
import type { CustomRequestTemplate } from '../types/requestTemplate';
import { useCustomRequestTemplates } from '../hooks/useCustomRequestTemplates';

interface Props {
  category: WorkCategory;
  prompt: string;
  disabled: boolean;
  onSelect: (prompt: string) => void;
}

export function CustomRequestTemplates({ category, prompt, disabled, onSelect }: Props) {
  const templates = useCustomRequestTemplates();
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CustomRequestTemplate | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const categoryTemplates = templates.entries.filter((entry) => entry.category === category);

  const announce = (result: { ok: boolean; message: string }) => setNotice({ type: result.ok ? 'success' : 'error', text: result.message });
  const save = (event: FormEvent) => {
    event.preventDefault();
    const result = templates.add(category, title, prompt);
    announce(result);
    if (result.ok) setTitle('');
  };
  const rename = (event: FormEvent, id: string) => {
    event.preventDefault();
    const result = templates.rename(id, editingTitle);
    announce(result);
    if (result.ok) { setEditingId(null); setEditingTitle(''); }
  };
  const remove = () => {
    if (!deleteTarget) return;
    announce(templates.remove(deleteTarget.id));
    setDeleteTarget(null);
  };

  return <section className="custom-request-templates" aria-labelledby="custom-templates-title">
    <div className="custom-templates-heading"><div><h3 id="custom-templates-title">自分用テンプレート</h3><p>現在のカテゴリへ、入力中の依頼文を保存します。</p></div><span>{categoryTemplates.length}/10件</span></div>
    <p className="custom-template-safety" role="note">このブラウザのlocalStorageだけに保存され、外部へは送信されません。秘密情報や個人情報は保存しないでください。</p>
    <form className="custom-template-save" onSubmit={save}>
      <label htmlFor="custom-template-title">保存用タイトル（任意）</label>
      <div><input id="custom-template-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={40} placeholder="未入力なら依頼文から自動作成" disabled={disabled} /><button type="submit" disabled={disabled || prompt.trim().length === 0}>自分用テンプレートとして保存</button></div>
    </form>
    {categoryTemplates.length === 0 ? <p className="custom-template-empty">このカテゴリの自分用テンプレートはまだありません。</p> : <div className="custom-template-list">{categoryTemplates.map((template) => <article key={template.id}>
      <button type="button" className="custom-template-apply" onClick={() => onSelect(template.prompt)} disabled={disabled} aria-label={`${template.title}を依頼欄へ反映`}><strong>{template.title}</strong><span>{template.prompt}</span></button>
      {editingId === template.id ? <form className="custom-template-rename" onSubmit={(event) => rename(event, template.id)}><label htmlFor={`rename-${template.id}`}>新しいテンプレート名</label><input id={`rename-${template.id}`} value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} maxLength={40} autoFocus /><div><button type="button" onClick={() => setEditingId(null)}>キャンセル</button><button type="submit">名前を保存</button></div></form> : <div className="custom-template-actions"><button type="button" onClick={() => { setEditingId(template.id); setEditingTitle(template.title); }}>名前変更</button><button type="button" onClick={() => setDeleteTarget(template)}>削除</button></div>}
    </article>)}</div>}
    <div className="custom-template-notice" aria-live="polite">{notice && <p className={notice.type === 'error' ? 'error' : 'success'} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>}</div>
    {deleteTarget && <div className="dialog-backdrop" onKeyDown={(event) => { if (event.key === 'Escape') setDeleteTarget(null); }}><div className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="custom-delete-title" aria-describedby="custom-delete-description"><h3 id="custom-delete-title">自分用テンプレートを削除しますか？</h3><p id="custom-delete-description">「{deleteTarget.title}」を、このブラウザから削除します。ほかの保存データは削除しません。</p><div><button type="button" className="dialog-cancel" onClick={() => setDeleteTarget(null)} autoFocus>キャンセル</button><button type="button" className="dialog-delete" onClick={remove}>削除する</button></div></div></div>}
  </section>;
}
