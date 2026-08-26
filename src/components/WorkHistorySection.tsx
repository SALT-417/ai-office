import { useEffect, useState } from 'react';
import { employeeById } from '../data/employees';
import type { WorkHistoryEntry, ReviewStatus } from '../types/history';
import type { EmployeeId } from '../types/office';
import { MAX_REVIEW_NOTE_LENGTH } from '../utils/workHistoryStorage';
import { SafeWorkContent } from './WorkResults';
import type { AppRuntimeMode } from '../utils/runtimeMode';
import { OBSIDIAN_CATEGORY_FOLDER_BY_ID, workCategoryById, type WorkCategory } from '../../shared/workCategories';
import { createMarkdownFilename, downloadMarkdown, workHistoryToMarkdown } from '../utils/markdownExport';
import { ObsidianSaveControl } from './ObsidianSaveControl';

interface Props {
  entries: WorkHistoryEntry[];
  selectedEntry: WorkHistoryEntry | null;
  storageError: string | null;
  onSelect: (id: string) => void;
  onReview: (id: string, status: ReviewStatus, note: string) => void;
  onDeleteOne: (id: string) => void;
  onDeleteAll: () => void;
  onRestoreTask: (task: string, category: WorkCategory) => void;
  onSelectEmployee: (id: EmployeeId) => void;
  runtimeMode?: AppRuntimeMode;
}

const reviewLabels: Record<ReviewStatus, string> = { pending: '○ 未確認', approved: '✓ 承認', rejected: '↩ 差し戻し' };

function formatJapanDate(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function WorkHistorySection({ entries, selectedEntry, storageError, onSelect, onReview, onDeleteOne, onDeleteAll, onRestoreTask, onSelectEmployee, runtimeMode }: Props) {
  const [reviewNote, setReviewNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<'all' | string | null>(null);
  const [copyMessage, setCopyMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => setReviewNote(selectedEntry?.reviewNote ?? ''), [selectedEntry]);

  const copy = async (content: string, successText = '成果物をクリップボードへコピーしました。') => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(content);
      setCopyMessage({ kind: 'success', text: successText });
    } catch {
      setCopyMessage({ kind: 'error', text: 'クリップボードへコピーできませんでした。ブラウザの権限を確認してください。' });
    }
  };

  const exportMarkdown = () => {
    if (!selectedEntry) return;
    downloadMarkdown(workHistoryToMarkdown(selectedEntry), createMarkdownFilename(selectedEntry));
    setCopyMessage({ kind: 'success', text: 'Markdownファイルをダウンロードしました。' });
  };

  const confirmDelete = () => {
    if (deleteTarget === 'all') onDeleteAll();
    else if (deleteTarget) onDeleteOne(deleteTarget);
    setDeleteTarget(null);
  };

  const deleteEntry = deleteTarget && deleteTarget !== 'all' ? entries.find((entry) => entry.id === deleteTarget) : null;

  return <section className="history-section" aria-labelledby="history-title">
    <div className="history-heading"><div><p className="eyebrow">HUMAN REVIEW</p><h2 id="history-title">作業履歴</h2><p>成果物と人による確認状態を、このブラウザ内だけに保存します。</p></div><button type="button" className="history-delete-all" onClick={() => setDeleteTarget('all')} disabled={entries.length === 0}>全履歴を削除</button></div>
    <p className="history-safety" role="note"><strong>保存と安全：</strong>履歴は使用中ブラウザのlocalStorageだけに保存され、GitHubや外部サーバーへ送信されません。秘密情報や個人情報は入力しないでください。AI成果物は提案であり、承認してもファイル変更・コマンド実行・Git操作・外部送信は行われません。</p>
    {runtimeMode === 'public-demo' && <p className="demo-notice"><strong>固定サンプルとは別の一覧です。</strong> ここにはこのブラウザに保存された実作業履歴だけを表示し、サンプルの表示や操作は保存しません。</p>}
    {storageError && <p className="request-error" role="alert">{storageError}</p>}
    {copyMessage && <p className={copyMessage.kind === 'error' ? 'request-error' : 'history-copy-status'} role={copyMessage.kind === 'error' ? 'alert' : 'status'}>{copyMessage.text}</p>}

    {entries.length === 0 ? <div className="history-empty"><span aria-hidden="true">▤</span><h3>作業履歴はまだありません</h3><p>専門社員の成果物が完成すると、依頼・計画・成果物がここへ保存されます。</p></div> : <div className="history-layout">
      <div className="history-list" aria-label="保存された作業履歴">{entries.map((entry) => <button type="button" className={`history-list-item${selectedEntry?.id === entry.id ? ' active' : ''}`} key={entry.id} onClick={() => onSelect(entry.id)} aria-pressed={selectedEntry?.id === entry.id}>
        <span className={`review-badge ${entry.reviewStatus}`}>{reviewLabels[entry.reviewStatus]}</span><strong>{entry.task}</strong><small>{workCategoryById[entry.category].label} · {formatJapanDate(entry.createdAt)} · {entry.results.map((result) => employeeById[result.employeeId].name).join('・')}</small>
      </button>)}</div>

      {selectedEntry && <article className="history-detail" aria-labelledby="history-detail-title">
        <div className="history-detail-heading"><div><p className="eyebrow">SAVED RESULT</p><h3 id="history-detail-title">履歴の詳細</h3></div><button type="button" className="history-delete-one" onClick={() => setDeleteTarget(selectedEntry.id)}>この履歴を削除</button></div>
        <dl className="history-meta"><div><dt>カテゴリ</dt><dd>{workCategoryById[selectedEntry.category].label}</dd></div><div><dt>依頼</dt><dd>{selectedEntry.task}</dd></div><div><dt>作成日時</dt><dd>{formatJapanDate(selectedEntry.createdAt)}</dd></div><div><dt>更新日時</dt><dd>{formatJapanDate(selectedEntry.updatedAt)}</dd></div></dl>
        <button type="button" className="restore-task" onClick={() => onRestoreTask(selectedEntry.task, selectedEntry.category)}>同じ依頼を入力欄へ戻す</button><p className="restore-note">カテゴリと依頼文を戻すだけで、自動送信はしません。</p>
        <div className="markdown-export"><div><button type="button" className="copy-button" onClick={() => void copy(workHistoryToMarkdown(selectedEntry), 'Markdownをクリップボードへコピーしました。')}>Markdownをコピー</button><button type="button" className="copy-button" onClick={exportMarkdown}>.mdをダウンロード</button></div><p>Obsidianへ自動保存はしません。秘密情報や個人情報がないか、出力内容を確認してから利用してください。</p><ObsidianSaveControl runtimeMode={runtimeMode ?? 'public-demo'} filename={createMarkdownFilename(selectedEntry)} markdown={workHistoryToMarkdown(selectedEntry)} targetLabel={`作業履歴「${selectedEntry.task}」`} approved={selectedEntry.reviewStatus === 'approved'} entryType="work" category={selectedEntry.category} destinationLabel={`AI OFFICE / ${OBSIDIAN_CATEGORY_FOLDER_BY_ID[selectedEntry.category]}`} dailyTitle={selectedEntry.task} dailySummary="承認済みのAI OFFICE作業成果物をObsidianへ保存しました。" employees={[...new Set(selectedEntry.results.map((result) => result.name))]} /></div>

        <section className="history-plan" aria-labelledby="saved-plan-title"><h4 id="saved-plan-title">保存された計画</h4><p>{selectedEntry.plan.summary}</p><ol>{selectedEntry.plan.firstActions.map((action) => <li key={action}>{action}</li>)}</ol></section>
        <section className="history-products" aria-labelledby="saved-products-title"><h4 id="saved-products-title">保存された成果物</h4>{selectedEntry.results.map((result) => {
          const employee = employeeById[result.employeeId];
          return <article className={`history-product ${result.status}`} key={result.employeeId}><div className="history-product-heading"><button type="button" onClick={() => onSelectEmployee(result.employeeId)} aria-label={`${employee.name}の社員詳細を表示`}><img src={employee.image} alt="" /><span><strong>{employee.name}</strong><small>{employee.role}</small></span></button><button type="button" className="copy-button" onClick={() => void copy(result.content)} disabled={!result.content}>本文をコピー</button></div><h5>{result.title}</h5>{result.status === 'completed' ? <SafeWorkContent content={result.content} /> : <p className="work-error">{result.error}</p>}</article>;
        })}</section>

        <section className="history-review" aria-labelledby="review-title"><div className="review-heading"><h4 id="review-title">人による確認</h4><span className={`review-badge ${selectedEntry.reviewStatus}`}>{reviewLabels[selectedEntry.reviewStatus]}</span></div><label htmlFor="review-note">確認メモ（任意）</label><textarea id="review-note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={MAX_REVIEW_NOTE_LENGTH} rows={4} /><small>残り {MAX_REVIEW_NOTE_LENGTH - reviewNote.length} 文字</small><div className="review-actions"><button type="button" className="approve-button" onClick={() => onReview(selectedEntry.id, 'approved', reviewNote)}>承認する</button><button type="button" className="reject-button" onClick={() => onReview(selectedEntry.id, 'rejected', reviewNote)}>差し戻す</button></div><p>承認は状態の記録だけです。自動実行や外部送信は行いません。</p></section>
      </article>}
    </div>}

    {deleteTarget && <div className="dialog-backdrop" onKeyDown={(event) => { if (event.key === 'Escape') setDeleteTarget(null); }}><div className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description"><h3 id="delete-dialog-title">{deleteTarget === 'all' ? '全履歴を削除しますか？' : 'この履歴を削除しますか？'}</h3><p id="delete-dialog-description">{deleteTarget === 'all' ? `${entries.length}件すべての作業履歴` : `「${deleteEntry?.task ?? '選択した履歴'}」`}を、このブラウザから削除します。オフィスのモードや進捗など、ほかの保存データは削除しません。</p><div><button type="button" className="dialog-cancel" onClick={() => setDeleteTarget(null)} autoFocus>キャンセル</button><button type="button" className="dialog-delete" onClick={confirmDelete}>削除する</button></div></div></div>}
  </section>;
}
