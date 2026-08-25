import { useEffect, useRef, useState, type FormEvent } from 'react';
import { employeeById, employees } from '../data/employees';
import type { EmployeeId } from '../types/office';
import type { ManagerApiResponse, ManagerEmployeeName, ManagerRequestStatus } from '../types/manager';
import type { WorkRequestStatus, WorkResponse } from '../types/work';
import { WorkResults } from './WorkResults';

const MAX_TASK_LENGTH = 2_000;
const employeeIdByName = Object.fromEntries(employees.map((employee) => [employee.name, employee.id])) as Record<ManagerEmployeeName, EmployeeId>;

interface Props {
  status: ManagerRequestStatus;
  response: ManagerApiResponse | null;
  error: string | null;
  onSubmit: (task: string) => Promise<void>;
  onSelectEmployee: (id: EmployeeId) => void;
  workStatus?: WorkRequestStatus;
  workResponse?: WorkResponse | null;
  workError?: string | null;
  onExecute?: (task: string, employeeIds: EmployeeId[]) => void;
  onCancelWork?: () => void;
  taskToRestore?: { value: string; token: number } | null;
  isStaticDemo?: boolean;
}

export function TaskRequestSection({ status, response, error, onSubmit, onSelectEmployee, workStatus = 'idle', workResponse = null, workError = null, onExecute = () => undefined, onCancelWork = () => undefined, taskToRestore = null, isStaticDemo = import.meta.env.PROD }: Props) {
  const [task, setTask] = useState('');
  const [plannedTask, setPlannedTask] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const normalizedTask = task.trim();
  const isLoading = status === 'loading';
  const isDisabled = normalizedTask.length === 0 || isLoading || isStaticDemo;

  useEffect(() => {
    if (!taskToRestore) return;
    setTask(taskToRestore.value);
    textareaRef.current?.focus();
  }, [taskToRestore]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isDisabled) {
      setPlannedTask(normalizedTask);
      void onSubmit(normalizedTask);
    }
  };

  return <section className="work-request" aria-labelledby="work-request-title">
    <div className="request-heading">
      <div><p className="eyebrow">LOCAL AI WORKFLOW</p><h2 id="work-request-title">AIへ仕事を依頼</h2><p>マネージャーのレンが依頼を整理し、5人の担当計画を作ります。</p></div>
      <span className={isStaticDemo ? 'environment-badge demo' : 'environment-badge local'}><span aria-hidden="true">{isStaticDemo ? '◌' : '●'}</span>{isStaticDemo ? '静的デモ' : 'ローカルAI'}</span>
    </div>

    {isStaticDemo && <p className="demo-notice" role="note"><strong>公開版はデモ表示です。</strong> GitHub PagesからローカルOllamaへは接続できません。依頼機能はPC上でOllamaと開発サーバーを起動した場合に利用できます。</p>}

    <div className={response ? 'request-layout has-plan' : 'request-layout'}>
      <form className="request-form" onSubmit={handleSubmit}>
        <label htmlFor="manager-task">レンへの依頼内容</label>
        <textarea ref={textareaRef} id="manager-task" value={task} onChange={(event) => setTask(event.target.value)} maxLength={MAX_TASK_LENGTH} rows={6} disabled={isLoading || isStaticDemo} placeholder="例：AIエンジニアへの転職に向けて、次の改善作業を整理してください" aria-describedby="task-hint task-count" />
        <div className="request-meta"><small id="task-hint">具体的な目的や条件を含めると、担当計画が明確になります。</small><span id="task-count">残り {MAX_TASK_LENGTH - task.length} 文字</span></div>
        <button className="request-submit" type="submit" disabled={isDisabled}>{isLoading ? <><span className="spinner" aria-hidden="true" />レンが整理中...</> : 'レンに依頼する'}</button>
        {status === 'loading' && <p className="request-status" role="status" aria-live="polite">レンが依頼を確認し、担当者と最初の作業を整理しています。</p>}
        {status === 'success' && <p className="request-status success" role="status" aria-live="polite">計画ができました。担当者を選ぶと社員詳細を確認できます。</p>}
        {status === 'error' && error && <p className="request-error" role="alert">{error}</p>}
      </form>

      {response && <div className="manager-plan" aria-labelledby="manager-plan-title">
        <div className="plan-title"><span aria-hidden="true">✓</span><div><p className="eyebrow">REN'S PLAN</p><h3 id="manager-plan-title">レンからの作業計画</h3></div></div>
        <div className="plan-block"><h4>依頼の理解</h4><p>{response.plan.summary}</p></div>
        <div className="plan-block"><h4>担当者と担当内容</h4><div className="assignment-list">{response.plan.assignments.map((assignment) => {
          const id = employeeIdByName[assignment.name];
          const employee = employeeById[id];
          return <button type="button" className="assignment-card" key={assignment.name} onClick={() => onSelectEmployee(id)} aria-label={`${employee.name}の社員詳細を表示`}><img src={employee.image} alt="" /><span><strong>{employee.name}<small>{employee.role}</small></strong><p>{assignment.task}</p></span><b aria-hidden="true">→</b></button>;
        })}</div></div>
        <div className="plan-block"><h4>最初に着手する具体的な作業</h4><ol>{response.plan.firstActions.map((action) => <li key={action}>{action}</li>)}</ol></div>
        <WorkResults status={workStatus} response={workResponse} error={workError} onExecute={() => onExecute(plannedTask, response.plan.assignments.filter((assignment) => assignment.name !== 'レン').map((assignment) => employeeIdByName[assignment.name]))} onCancel={onCancelWork} onSelectEmployee={onSelectEmployee} isStaticDemo={isStaticDemo} />
      </div>}
    </div>
  </section>;
}
