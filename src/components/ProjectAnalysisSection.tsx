import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAnalysisHistory } from '../hooks/useAnalysisHistory';
import { useProjectAnalysis } from '../hooks/useProjectAnalysis';
import type { AnalysisFinding, AnalysisHistoryEntry, AnalysisResponse, AnalysisSpecialist, ProjectFileCategory } from '../types/analysis';
import type { ReviewStatus } from '../types/history';
import { PUBLIC_DEMO_NOTICE, publicDemoAnalysis } from '../data/publicDemo';
import type { AppRuntimeMode } from '../utils/runtimeMode';
import { analysisHistoryToMarkdown, createMarkdownFilename, downloadMarkdown } from '../utils/markdownExport';
import { ObsidianSaveControl } from './ObsidianSaveControl';

const categories: Array<[ProjectFileCategory, string]> = [['frontend', 'フロントエンド'], ['server', 'サーバー'], ['test', 'テスト'], ['config', '設定'], ['documentation', 'ドキュメント']];
const severityLabels = { low: '低', medium: '中', high: '高' } as const;
const reviewLabels = { pending: '○ 未確認', approved: '✓ 承認', rejected: '↩ 差し戻し' } as const;
const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
const formatDate = (iso: string) => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

function FindingCard({ finding, allowedFiles }: { finding: AnalysisFinding; allowedFiles: string[] }) {
  return <article className="finding-card"><header><h4>{finding.title}</h4><span className={`severity ${finding.severity}`}>重要度：{severityLabels[finding.severity]}</span></header>
    <h5>根拠</h5><ul>{finding.evidence.filter((item) => allowedFiles.includes(item.path)).map((item, index) => <li key={`${item.path}-${index}`}><code>{item.path}{item.line ? `:${item.line}` : ''}</code> — {item.description}</li>)}</ul>
    <h5>改善案</h5><p>{finding.recommendation}</p><h5>完了条件</h5><ul>{finding.completionCriteria.map((item) => <li key={item}>{item}</li>)}</ul><h5>確認方法</h5><ul>{finding.verification.map((item) => <li key={item}>{item}</li>)}</ul>
  </article>;
}

function Findings({ response, isSample = false }: { response: AnalysisResponse; isSample?: boolean }) {
  return <div className="analysis-result">{isSample && <p className="sample-disclaimer" role="status"><strong>固定サンプル</strong> — {PUBLIC_DEMO_NOTICE}</p>}<h3>{response.specialistName}の分析結果</h3><p>{response.summary}</p>
    {response.redacted && <p className="redaction-note" role="note">一部の秘密らしい値を伏せて分析しました。</p>}
    {response.findings.map((finding, index) => <FindingCard key={`${finding.title}-${index}`} finding={finding} allowedFiles={response.analyzedFiles} />)}
  </div>;
}

function AnalysisHistory({ history, runtimeMode }: { history: ReturnType<typeof useAnalysisHistory>; runtimeMode: AppRuntimeMode }) {
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AnalysisHistoryEntry | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const selected = history.selectedEntry;
  useEffect(() => setNote(selected?.reviewNote ?? ''), [selected]);
  const review = (status: ReviewStatus) => selected && history.review(selected.id, status, note);
  const copy = async () => {
    if (!selected) return;
    const content = [selected.summary, ...selected.findings.map((item) => `${item.title}\n${item.recommendation}`)].join('\n\n');
    try { await navigator.clipboard.writeText(content); setCopyStatus('分析結果をコピーしました。'); }
    catch { setCopyStatus('コピーできませんでした。ブラウザの権限を確認してください。'); }
  };
  const copyMarkdown = async () => {
    if (!selected) return;
    try { await navigator.clipboard.writeText(analysisHistoryToMarkdown(selected)); setCopyStatus('Markdownをコピーしました。'); }
    catch { setCopyStatus('Markdownをコピーできませんでした。ブラウザの権限を確認してください。'); }
  };
  const exportMarkdown = () => {
    if (!selected) return;
    downloadMarkdown(analysisHistoryToMarkdown(selected), createMarkdownFilename(selected));
    setCopyStatus('Markdownファイルをダウンロードしました。');
  };
  return <div className="analysis-history"><div className="analysis-subheading"><h3>分析履歴</h3><p>このブラウザ内だけに保存され、既存の作業履歴とは別に管理されます。</p></div>
    {history.storageError && <p role="alert" className="request-error">{history.storageError}</p>}{copyStatus && <p role="status" className="history-copy-status">{copyStatus}</p>}
    {history.entries.length === 0 ? <div className="history-empty"><span aria-hidden="true">⌕</span><h4>分析履歴はまだありません</h4><p>読み取り専用分析が完了すると自動保存されます。</p></div> : <div className="analysis-history-layout">
      <div className="history-list" aria-label="分析履歴一覧">{history.entries.map((entry) => <button type="button" className={`history-list-item ${history.selectedId === entry.id ? 'active' : ''}`} key={entry.id} onClick={() => history.select(entry.id)}><strong>{entry.objective}</strong><small>{formatDate(entry.createdAt)} · {entry.specialistName}</small><span className={`review-badge ${entry.reviewStatus}`}>{reviewLabels[entry.reviewStatus]}</span></button>)}</div>
      {selected && <div className="history-detail"><div className="history-detail-heading"><div><p className="eyebrow">READ-ONLY ANALYSIS</p><h3>{selected.objective}</h3></div><button type="button" className="history-delete-one" onClick={() => setDeleteTarget(selected)}>この分析を削除</button></div>
        <dl className="history-meta"><div><dt>対象</dt><dd>{selected.analyzedFiles.join('、')}</dd></div><div><dt>更新</dt><dd>{formatDate(selected.updatedAt)}</dd></div></dl><button type="button" className="copy-button" onClick={() => void copy()}>分析結果をコピー</button><div className="markdown-export"><div><button type="button" className="copy-button" onClick={() => void copyMarkdown()}>Markdownをコピー</button><button type="button" className="copy-button" onClick={exportMarkdown}>.mdをダウンロード</button></div><p>Obsidianへ自動保存はしません。秘密情報や個人情報がないか、出力内容を確認してから利用してください。</p><ObsidianSaveControl runtimeMode={runtimeMode} filename={createMarkdownFilename(selected)} markdown={analysisHistoryToMarkdown(selected)} targetLabel={`分析履歴「${selected.objective}」`} approved={selected.reviewStatus === 'approved'} entryType="analysis" destinationLabel="AI OFFICE / 分析" /></div><Findings response={selected} />
        <div className="history-review"><div className="review-heading"><h4>人による確認</h4><span className={`review-badge ${selected.reviewStatus}`}>{reviewLabels[selected.reviewStatus]}</span></div><label htmlFor="analysis-review-note">確認メモ（任意）</label><textarea id="analysis-review-note" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} rows={3} /><div className="review-actions"><button className="approve-button" type="button" onClick={() => review('approved')}>✓ 承認する</button><button className="reject-button" type="button" onClick={() => review('rejected')}>↩ 差し戻す</button></div><p>承認は状態の記録だけで、ファイル変更やコマンド実行は行いません。</p></div>
      </div>}
    </div>}
    {deleteTarget && <div className="dialog-backdrop" role="presentation"><div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="analysis-delete-title"><h3 id="analysis-delete-title">分析履歴を削除しますか？</h3><p>「{deleteTarget.objective}」をこのブラウザから削除します。他の保存データは削除しません。</p><div><button className="dialog-cancel" type="button" autoFocus onClick={() => setDeleteTarget(null)}>キャンセル</button><button className="dialog-delete" type="button" onClick={() => { history.remove(deleteTarget.id); setDeleteTarget(null); }}>削除する</button></div></div></div>}
  </div>;
}

export function ProjectAnalysisSection({ isStaticDemo: staticOverride, runtimeMode }: { isStaticDemo?: boolean; runtimeMode?: AppRuntimeMode }) {
  const isStaticDemo = staticOverride ?? runtimeMode === 'public-demo';
  const analysis = useProjectAnalysis(isStaticDemo);
  const history = useAnalysisHistory();
  const addAnalysisHistory = history.add;
  const [objective, setObjective] = useState('');
  const [specialist, setSpecialist] = useState<AnalysisSpecialist>('sou');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [sampleVisible, setSampleVisible] = useState(false);
  useEffect(() => { if (analysis.completionId && analysis.response) addAnalysisHistory(analysis.completionId, analysis.response); }, [addAnalysisHistory, analysis.completionId, analysis.response]);
  const size = useMemo(() => analysis.files.filter((file) => selected.includes(file.path)).reduce((sum, file) => sum + file.size, 0), [analysis.files, selected]);
  const oversizedFile = analysis.files.find((file) => selected.includes(file.path) && file.size > 20 * 1024);
  const limitError = selected.length > 8 ? '選択できるファイルは8件までです。' : oversizedFile ? `「${oversizedFile.path}」は1ファイルの上限20KBを超えています。` : size > 60 * 1024 ? '合計サイズが60KBを超えています。' : null;
  const canConfirm = objective.trim().length > 0 && selected.length >= 1 && !limitError && !isStaticDemo && analysis.status !== 'loading';
  const changeSelection = (file: string) => { setConfirmed(false); setSelected((current) => current.includes(file) ? current.filter((item) => item !== file) : [...current, file]); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (confirmed && canConfirm) void analysis.analyze(objective.trim(), specialist, selected); };
  return <section className="project-analysis" aria-labelledby="project-analysis-title"><div className="request-heading"><div><p className="eyebrow">READ-ONLY LOCAL ANALYSIS</p><h2 id="project-analysis-title">プロジェクトを分析</h2><p>選択したソースだけをソウまたはアキが読み取り、根拠付きの改善提案を作ります。</p></div><span className={isStaticDemo ? 'environment-badge demo' : 'environment-badge local'}>{isStaticDemo ? '◌ 公開版では利用不可' : '● ローカル限定'}</span></div>
    <p className="safety-note"><strong>読み取り専用です。</strong> ファイル作成・変更・削除、コマンド実行、Git操作、外部送信は行いません。秘密検出は完全ではないため、選択ファイルを必ず確認してください。</p>
    {isStaticDemo && <div className="public-analysis-sample"><p className="demo-notice"><strong>公開版は固定サンプルです。</strong> APIへファイル一覧を要求しません。ローカル版では許可ファイルを明示選択し、ExpressとOllamaで実コードを分析できます。</p><h3>サンプル対象</h3><ul>{publicDemoAnalysis.analyzedFiles.map((path) => <li key={path}><code>{path}</code></li>)}</ul><div className="sample-controls"><button type="button" className="request-submit" onClick={() => setSampleVisible(true)}>サンプル分析を見る</button>{sampleVisible && <button type="button" className="cancel-button" onClick={() => setSampleVisible(false)}>サンプルを閉じる</button>}</div></div>}
    {!isStaticDemo && <form className="analysis-form" onSubmit={submit}><label htmlFor="analysis-objective">分析目的</label><textarea id="analysis-objective" maxLength={1000} value={objective} disabled={analysis.status === 'loading'} onChange={(event) => { setObjective(event.target.value); setConfirmed(false); }} placeholder="例：API通信の失敗処理とテスト不足を確認してください" rows={4} /><small>{objective.length}/1000文字</small>
      <fieldset disabled={isStaticDemo || analysis.status === 'loading'}><legend>担当社員</legend><label><input type="radio" name="specialist" checked={specialist === 'sou'} onChange={() => { setSpecialist('sou'); setConfirmed(false); }} /> ソウ（技術分析）</label><label><input type="radio" name="specialist" checked={specialist === 'aki'} onChange={() => { setSpecialist('aki'); setConfirmed(false); }} /> アキ（品質分析）</label></fieldset>
      <div className="file-selection"><h3>分析対象ファイルを明示的に選択</h3>{analysis.files.length === 0 && !isStaticDemo && <button type="button" className="restore-task" onClick={() => void analysis.loadFiles()}>安全なファイル一覧を取得</button>}{analysis.filesError && <p role="alert" className="request-error">{analysis.filesError}</p>}{categories.map(([category, label]) => { const files = analysis.files.filter((file) => file.category === category); return files.length ? <fieldset key={category} disabled={isStaticDemo || analysis.status === 'loading'}><legend>{label}</legend>{files.map((file) => <label key={file.path}><input type="checkbox" checked={selected.includes(file.path)} onChange={() => changeSelection(file.path)} /><code>{file.path}</code><span>{formatBytes(file.size)}</span></label>)}</fieldset> : null; })}</div>
      <p className="selection-summary" aria-live="polite">選択：{selected.length}/8件 · 合計 {formatBytes(size)} / 60 KB</p>{limitError && <p role="alert" className="request-error">{limitError}</p>}
      {!confirmed ? <button type="button" className="request-submit" disabled={!canConfirm} onClick={() => setConfirmed(true)}>選択ファイルを確認</button> : <div className="analysis-confirm" role="group" aria-label="分析対象の最終確認"><h3>分析対象を確認してください</h3><p>担当：{specialist === 'sou' ? 'ソウ' : 'アキ'} ／ {selected.length}件</p><ul>{selected.map((item) => <li key={item}><code>{item}</code></li>)}</ul><button type="submit" className="request-submit" disabled={!canConfirm || analysis.status === 'loading'}>{analysis.status === 'loading' ? '分析中…' : '分析を開始'}</button></div>}
      {analysis.status === 'loading' && <div className="analysis-running" role="status"><span className="spinner" aria-hidden="true" />選択ファイルを読み取り、ローカルAIが分析しています。<button type="button" className="cancel-button" onClick={analysis.cancel}>キャンセル</button></div>}{analysis.error && <p role="alert" className="request-error">{analysis.error}</p>}
    </form>}{isStaticDemo && sampleVisible && <Findings response={publicDemoAnalysis} isSample />}{!isStaticDemo && analysis.response && <Findings response={analysis.response} />}<p className="safety-note">AIの分析は提案です。利用前に人が根拠と内容を確認してください。承認しても自動実行されません。</p>{isStaticDemo && <p className="demo-notice"><strong>履歴は固定サンプルと分離されています。</strong> 下の一覧はこのブラウザに保存された実分析履歴だけです。サンプルの表示や承認操作は保存しません。</p>}<AnalysisHistory history={history} runtimeMode={runtimeMode ?? (isStaticDemo ? 'public-demo' : 'local-ai')} />
  </section>;
}
