import { employeeById } from '../data/employees';
import type { EmployeeId } from '../types/office';
import type { WorkRequestStatus, WorkResponse } from '../types/work';

interface Props {
  status: WorkRequestStatus;
  response: WorkResponse | null;
  error: string | null;
  onExecute: () => void;
  onCancel: () => void;
  onSelectEmployee: (id: EmployeeId) => void;
  isStaticDemo: boolean;
}

export function SafeWorkContent({ content }: { content: string }) {
  return <div className="work-content">{content.split('\n').map((line, index) => {
    const trimmed = line.trim();
    const isHeading = /^#{1,3}\s/.test(trimmed);
    const isList = /^[-*・]\s?/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
    const text = trimmed.replace(/^#{1,3}\s*/, '').replace(/^[-*・]\s?/, '');
    return <p className={isHeading ? 'work-line heading' : isList ? 'work-line list' : 'work-line'} key={`${index}-${line}`}>{text || '\u00a0'}</p>;
  })}</div>;
}

export function WorkResults({ status, response, error, onExecute, onCancel, onSelectEmployee, isStaticDemo }: Props) {
  const loading = status === 'loading';
  return <section className="work-execution" aria-labelledby="work-execution-title">
    <div className="execution-heading"><div><p className="eyebrow">SPECIALIST OUTPUT</p><h3 id="work-execution-title">専門社員の成果物</h3></div>
      {!loading && <button type="button" className="execute-button" onClick={onExecute} disabled={isStaticDemo}>{response ? 'もう一度実行する' : '担当社員に実行してもらう'}</button>}
      {loading && <button type="button" className="cancel-button" onClick={onCancel}>作業をキャンセル</button>}
    </div>
    {isStaticDemo && <p className="execution-note" role="note">公開版は静的デモです。成果物の生成にはローカルOllamaが必要です。</p>}
    {!isStaticDemo && <p className="execution-note">処理は社員ごとに順番に行うため、担当人数やPCの性能によって時間がかかる場合があります。</p>}
    <p className="safety-note"><strong>安全上の注意：</strong>AIの出力は提案です。利用前に人が確認してください。現段階ではファイル変更・コマンド実行・Git操作・外部送信を行いません。</p>
    {loading && <p className="execution-status" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" />担当社員がテキスト成果物を作成しています。画面を開いたままお待ちください。</p>}
    {status === 'cancelled' && <p className="execution-status" role="status">作業をキャンセルしました。</p>}
    {status === 'error' && error && <p className="request-error" role="alert">{error}</p>}
    {response && <div className="work-results">{response.results.map((result) => {
      const employee = employeeById[result.employeeId];
      return <article className={`work-result-card ${result.status}`} key={result.employeeId}>
        <button type="button" className="work-result-employee" onClick={() => onSelectEmployee(result.employeeId)} aria-label={`${employee.name}の社員詳細を表示`}><img src={employee.image} alt="" /><span><strong>{employee.name}</strong><small>{employee.role}</small></span><b className={`result-status ${result.status}`}>{result.status === 'completed' ? '✓ 完了' : '! 失敗'}</b></button>
        <h4>{result.title}</h4>
        {result.status === 'completed' ? <SafeWorkContent content={result.content} /> : <p className="work-error" role="status">{result.error || 'この担当の成果物を作成できませんでした。'}</p>}
      </article>;
    })}</div>}
  </section>;
}
