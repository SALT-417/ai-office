import backgroundImage from '../../assets/office-background.webp';
import { employees } from '../data/employees';
import { modeById } from '../data/modes';
import type { EmployeeId, OfficeMode } from '../types/office';
import type { ManagerRequestStatus } from '../types/manager';
import type { WorkRequestStatus, WorkResponse } from '../types/work';
import { EmployeeSprite } from './EmployeeSprite';
import { ProgressBar } from './ProgressBar';

interface Props { mode: OfficeMode; selectedId: EmployeeId; progress: number; onSelect: (id: EmployeeId) => void; managerStatus: ManagerRequestStatus; assignedEmployeeIds: EmployeeId[]; workStatus: WorkRequestStatus; workResponse: WorkResponse | null; workTargetEmployeeIds: EmployeeId[] }

export function OfficeScene({ mode, selectedId, progress, onSelect, managerStatus, assignedEmployeeIds, workStatus, workResponse, workTargetEmployeeIds }: Props) {
  const activeMode = modeById[mode];
  return <section className="scene-shell" aria-labelledby="scene-status">
    <div className="scene-status"><span className="live-dot" /><strong>{activeMode.time}</strong><span id="scene-status">{activeMode.status}</span></div>
    <div className="office-scene" data-mode={mode}>
      <img className="office-background" src={backgroundImage} alt="AI OFFICEのモダンな室内" />
      <div className="night-overlay" aria-hidden="true" />
      {employees.map((employee) => {
        const result = workResponse?.results.find((item) => item.employeeId === employee.id);
        const activity = workStatus === 'loading' && workTargetEmployeeIds.includes(employee.id) ? 'working'
          : result?.status === 'completed' ? 'completed'
          : result?.status === 'failed' ? 'failed'
          : managerStatus === 'loading' && employee.id === 'ren' ? 'processing'
          : managerStatus === 'success' && assignedEmployeeIds.includes(employee.id) ? 'assigned' : undefined;
        return <EmployeeSprite key={employee.id} employee={employee} position={activeMode.positions[employee.id]} selected={employee.id === selectedId} mode={mode} activity={activity} onSelect={() => onSelect(employee.id)} />;
      })}
      <div className="scene-progress-card"><span>AI学習支援アプリ</span><ProgressBar value={progress} label={`プロジェクト進捗 ${progress}%`} /><strong>{progress}%</strong></div>
    </div>
  </section>;
}
