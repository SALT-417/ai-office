import { useEffect, useRef, useState, type FormEvent } from 'react';
import { employeeById, employees } from '../data/employees';
import type { EmployeeId } from '../types/office';
import type { ManagerApiResponse, ManagerEmployeeName, ManagerRequestStatus } from '../types/manager';
import type { WorkRequestStatus, WorkResponse } from '../types/work';
import { WorkResults } from './WorkResults';
import { PUBLIC_DEMO_NOTICE, publicDemoSamples } from '../data/publicDemo';
import type { AppRuntimeMode } from '../utils/runtimeMode';
import { WORK_CATEGORIES, workCategoryById, type WorkCategory } from '../../shared/workCategories';

const MAX_TASK_LENGTH = 2_000;
const employeeIdByName = Object.fromEntries(employees.map((employee) => [employee.name, employee.id])) as Record<ManagerEmployeeName, EmployeeId>;

interface Props {
  status: ManagerRequestStatus;
  response: ManagerApiResponse | null;
  error: string | null;
  onSubmit: (task: string, category: WorkCategory) => Promise<void>;
  onSelectEmployee: (id: EmployeeId) => void;
  workStatus?: WorkRequestStatus;
  workResponse?: WorkResponse | null;
  workError?: string | null;
  onExecute?: (task: string, employeeIds: EmployeeId[], category: WorkCategory) => void;
  onCancelWork?: () => void;
  taskToRestore?: { value: string; category: WorkCategory; token: number } | null;
  isStaticDemo?: boolean;
  runtimeMode?: AppRuntimeMode;
  category?: WorkCategory;
  categoryStorageError?: string | null;
  onCategoryChange?: (category: WorkCategory) => void;
}

export function TaskRequestSection({ status, response, error, onSubmit, onSelectEmployee, workStatus = 'idle', workResponse = null, workError = null, onExecute = () => undefined, onCancelWork = () => undefined, taskToRestore = null, isStaticDemo: staticOverride, runtimeMode, category = 'general', categoryStorageError = null, onCategoryChange = () => undefined }: Props) {
  const isStaticDemo = staticOverride ?? runtimeMode === 'public-demo';
  const [task, setTask] = useState('');
  const [plannedTask, setPlannedTask] = useState('');
  const [samplePlanVisible, setSamplePlanVisible] = useState(false);
  const [sampleWorkVisible, setSampleWorkVisible] = useState(false);
  const [categoryChanged, setCategoryChanged] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const normalizedTask = task.trim();
  const isLoading = status === 'loading';
  const isDisabled = normalizedTask.length === 0 || isLoading || isStaticDemo;
  const sample = publicDemoSamples[category];
  const displayedResponse = isStaticDemo && samplePlanVisible ? sample.plan : response;
  const categoryLocked = isLoading || workStatus === 'loading';

  useEffect(() => {
    if (!taskToRestore) return;
    setTask(taskToRestore.value);
    setCategoryChanged(false);
    textareaRef.current?.focus();
  }, [taskToRestore]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isDisabled) {
      setPlannedTask(normalizedTask);
      setCategoryChanged(false);
      void onSubmit(normalizedTask, category);
    }
  };

  return <section className="work-request" aria-labelledby="work-request-title">
    <div className="request-heading">
      <div><p className="eyebrow">LOCAL AI WORKFLOW</p><h2 id="work-request-title">AIへ仕事を依頼</h2><p>マネージャーのレンが依頼を整理し、5人の担当計画を作ります。</p></div>
      <span className={isStaticDemo ? 'environment-badge demo' : 'environment-badge local'}><span aria-hidden="true">{isStaticDemo ? '◌' : '●'}</span>{isStaticDemo ? '公開サンプル・AI通信なし' : 'ローカルAI稼働'}</span>
    </div>

    {isStaticDemo && <><p className="demo-notice" role="note"><strong>公開版は固定サンプルです。</strong> APIやOllamaへ通信しません。ローカル版ではPC上のOllamaとExpressを使って実際の計画を生成できます。</p><div className="sample-controls"><button type="button" className="request-submit" onClick={() => { setSamplePlanVisible(true); setSampleWorkVisible(false); }}>{samplePlanVisible ? 'サンプル計画を最初から見る' : 'サンプル計画を見る'}</button>{samplePlanVisible && <button type="button" className="cancel-button" onClick={() => { setSamplePlanVisible(false); setSampleWorkVisible(false); }}>サンプルを閉じる</button>}</div></>}

    <fieldset className="work-category-selector" disabled={categoryLocked}><legend>業務カテゴリ</legend><div role="radiogroup" aria-label="業務カテゴリ">{WORK_CATEGORIES.map((item) => <label className={category === item.id ? 'active' : ''} key={item.id}><input type="radio" name="work-category" value={item.id} checked={category === item.id} onChange={() => { setPlannedTask(''); setSamplePlanVisible(false); setSampleWorkVisible(false); setCategoryChanged(true); onCategoryChange(item.id); }} /><span>{item.label}</span></label>)}</div><p><strong>{workCategoryById[category].label}：</strong>{workCategoryById[category].description}</p><small>依頼例：{workCategoryById[category].example}</small>{categoryChanged && normalizedTask && <em aria-live="polite">依頼文は残しています。カテゴリ変更後は内容を確認してから送信してください。</em>}</fieldset>
    {categoryStorageError && <p className="request-error" role="alert">{categoryStorageError}</p>}

    <div className={displayedResponse ? 'request-layout has-plan' : 'request-layout'}>
      <form className="request-form" onSubmit={handleSubmit}>
        <label htmlFor="manager-task">レンへの依頼内容</label>
        <textarea ref={textareaRef} id="manager-task" value={task} onChange={(event) => setTask(event.target.value)} maxLength={MAX_TASK_LENGTH} rows={6} disabled={isLoading || isStaticDemo} placeholder="例：AIエンジニアへの転職に向けて、次の改善作業を整理してください" aria-describedby="task-hint task-count" />
        <div className="request-meta"><small id="task-hint">具体的な目的や条件を含めると、担当計画が明確になります。</small><span id="task-count">残り {MAX_TASK_LENGTH - task.length} 文字</span></div>
        <button className="request-submit" type="submit" disabled={isDisabled}>{isLoading ? <><span className="spinner" aria-hidden="true" />レンが整理中...</> : 'レンに依頼する'}</button>
        {status === 'loading' && <p className="request-status" role="status" aria-live="polite">レンが依頼を確認し、担当者と最初の作業を整理しています。</p>}
        {status === 'success' && <p className="request-status success" role="status" aria-live="polite">計画ができました。担当者を選ぶと社員詳細を確認できます。</p>}
        {status === 'error' && error && <p className="request-error" role="alert">{error}</p>}
      </form>

      {displayedResponse && <div className="manager-plan" aria-labelledby="manager-plan-title">
        {isStaticDemo && <p className="sample-disclaimer" role="status"><strong>固定サンプル</strong> — {PUBLIC_DEMO_NOTICE}</p>}
        <div className="plan-title"><span aria-hidden="true">✓</span><div><p className="eyebrow">REN'S PLAN</p><h3 id="manager-plan-title">レンからの作業計画</h3></div></div>
        <div className="plan-block"><h4>依頼の理解</h4><p>{displayedResponse.plan.summary}</p></div>
        <div className="plan-block"><h4>担当者と担当内容</h4><div className="assignment-list">{displayedResponse.plan.assignments.map((assignment) => {
          const id = employeeIdByName[assignment.name];
          const employee = employeeById[id];
          return <button type="button" className="assignment-card" key={assignment.name} onClick={() => onSelectEmployee(id)} aria-label={`${employee.name}の社員詳細を表示`}><img src={employee.image} alt="" /><span><strong>{employee.name}<small>{employee.role}</small></strong><p>{assignment.task}</p></span><b aria-hidden="true">→</b></button>;
        })}</div></div>
        <div className="plan-block"><h4>最初に着手する具体的な作業</h4><ol>{displayedResponse.plan.firstActions.map((action) => <li key={action}>{action}</li>)}</ol></div>
        <WorkResults status={isStaticDemo ? 'idle' : workStatus} response={isStaticDemo && sampleWorkVisible ? sample.work : workResponse} error={isStaticDemo ? null : workError} onExecute={() => isStaticDemo ? setSampleWorkVisible(true) : onExecute(plannedTask, displayedResponse.plan.assignments.filter((assignment) => assignment.name !== 'レン').map((assignment) => employeeIdByName[assignment.name]), category)} onCancel={onCancelWork} onSelectEmployee={onSelectEmployee} isStaticDemo={isStaticDemo} onCloseSample={() => setSampleWorkVisible(false)} sampleTask={sample.task} />
      </div>}
    </div>
  </section>;
}
