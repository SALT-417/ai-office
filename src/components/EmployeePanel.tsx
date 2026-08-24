import type { Employee } from '../types/office';
import type { OfficeMode } from '../types/office';
import { ProgressBar } from './ProgressBar';

interface Props { employee: Employee; mode: OfficeMode; progress: number; onProgressChange: (value: number) => void }

export function EmployeePanel({ employee, mode, progress, onProgressChange }: Props) {
  return <aside className="employee-panel" aria-labelledby="employee-panel-title">
    <div className="panel-heading"><p className="eyebrow">ACTIVE EMPLOYEE</p><span className="status-pill"><i />稼働中</span></div>
    <div className="employee-profile"><div className="portrait"><img src={employee.image} alt={`${employee.name}の立ち絵`} /></div><div><h2 id="employee-panel-title">{employee.name}</h2><p>{employee.role}</p><span>{employee.shortRole}</span></div></div>
    <div className="detail-card"><p className="detail-label">CURRENT TASK</p><h3>{employee.task}</h3><p>{employee.responsibility}</p><div className="task-progress"><div><span>進捗</span><strong>{progress}%</strong></div><ProgressBar value={progress} label={`${employee.name}の進捗 ${progress}%`} /></div><div className="progress-controls" aria-label={`${employee.name}の進捗変更`}><button type="button" onClick={() => onProgressChange(progress - 5)} disabled={progress === 0}>−5</button><button type="button" onClick={() => onProgressChange(progress + 5)} disabled={progress === 100}>＋5</button></div></div>
    <div className="dialogue" aria-live="polite"><span aria-hidden="true">“</span><p>{employee.dialogueByMode[mode]}</p></div>
    <p className="save-note"><span aria-hidden="true">✓</span> 変更内容はこの端末に自動保存されます</p>
  </aside>;
}
