import type { CSSProperties } from 'react';
import { employees } from '../data/employees';
import { modeById } from '../data/modes';
import type { EmployeeId, OfficeMode } from '../types/office';
import type { ManagerRequestStatus } from '../types/manager';
import type { WorkRequestStatus, WorkResponse } from '../types/work';
import { ProgressBar } from './ProgressBar';

interface Props { mode: OfficeMode; selectedId: EmployeeId; progress: number; onSelect: (id: EmployeeId) => void; managerStatus: ManagerRequestStatus; assignedEmployeeIds: EmployeeId[]; workStatus: WorkRequestStatus; workResponse: WorkResponse | null; workTargetEmployeeIds: EmployeeId[] }
type MiniPosition = { x: number; y: number; zone: string };
type MiniActivity = 'working' | 'completed' | 'failed' | 'processing' | 'assigned';

const positions: Record<OfficeMode, Record<EmployeeId, MiniPosition>> = {
  work: { ren: { x: 30, y: 30, zone: 'デスク' }, mio: { x: 55, y: 27, zone: 'デスク' }, sou: { x: 75, y: 42, zone: 'デスク' }, yuna: { x: 38, y: 62, zone: 'デスク' }, aki: { x: 68, y: 68, zone: 'デスク' } },
  walk: { ren: { x: 29, y: 48, zone: '通路' }, mio: { x: 44, y: 38, zone: '通路' }, sou: { x: 58, y: 54, zone: '通路' }, yuna: { x: 70, y: 46, zone: '通路' }, aki: { x: 49, y: 69, zone: '通路' } },
  break: { ren: { x: 68, y: 68, zone: 'ラウンジ' }, mio: { x: 78, y: 63, zone: 'ラウンジ' }, sou: { x: 59, y: 73, zone: 'ラウンジ' }, yuna: { x: 74, y: 78, zone: 'ラウンジ' }, aki: { x: 84, y: 73, zone: 'ラウンジ' } },
  meeting: { ren: { x: 42, y: 47, zone: '会議席' }, mio: { x: 51, y: 39, zone: '会議席' }, sou: { x: 61, y: 47, zone: '会議席' }, yuna: { x: 53, y: 58, zone: '会議席' }, aki: { x: 43, y: 58, zone: '会議席' } },
  night: { ren: { x: 31, y: 31, zone: '夜間デスク' }, mio: { x: 55, y: 27, zone: '待機席' }, sou: { x: 75, y: 42, zone: '夜間デスク' }, yuna: { x: 38, y: 62, zone: '待機席' }, aki: { x: 68, y: 68, zone: '夜間デスク' } },
};

const activityLabels: Record<MiniActivity, string> = { working: '作業中', completed: '完了', failed: '失敗', processing: '整理中', assigned: '担当予定' };

export function MiniatureOfficeScene({ mode, selectedId, progress, onSelect, managerStatus, assignedEmployeeIds, workStatus, workResponse, workTargetEmployeeIds }: Props) {
  const activeMode = modeById[mode];
  return <section className="scene-shell miniature-scene-shell" aria-labelledby="miniature-scene-status">
    <div className="scene-status"><span className="live-dot" /><strong>{activeMode.time}</strong><span id="miniature-scene-status">ミニチュア表示・{activeMode.status}</span></div>
    <div className="miniature-office" data-mode={mode}>
      <div className="miniature-wall miniature-wall-left" aria-hidden="true" />
      <div className="miniature-wall miniature-wall-back" aria-hidden="true"><span>AI OFFICE</span><i className="miniature-window" /></div>
      <div className="miniature-floor" aria-hidden="true" />
      <div className="miniature-furniture" aria-hidden="true">
        <i className="mini-desk desk-one" /><i className="mini-desk desk-two" /><i className="mini-desk desk-three" /><i className="mini-desk desk-four" /><i className="mini-desk desk-five" />
        <i className="mini-meeting-table" /><i className="mini-sofa" /><i className="mini-shelf" /><i className="mini-plant plant-one" /><i className="mini-plant plant-two" />
      </div>
      <div className="miniature-night" aria-hidden="true" />
      {employees.map((employee) => {
        const result = workResponse?.results.find((item) => item.employeeId === employee.id);
        const activity: MiniActivity | undefined = workStatus === 'loading' && workTargetEmployeeIds.includes(employee.id) ? 'working'
          : result?.status === 'completed' ? 'completed'
          : result?.status === 'failed' ? 'failed'
          : managerStatus === 'loading' && employee.id === 'ren' ? 'processing'
          : managerStatus === 'success' && assignedEmployeeIds.includes(employee.id) ? 'assigned' : undefined;
        const position = positions[mode][employee.id];
        const stateLabel = activity ? activityLabels[activity] : position.zone;
        const style = { '--mini-x': `${position.x}%`, '--mini-y': `${position.y}%` } as CSSProperties;
        return <button key={employee.id} type="button" className={`miniature-employee miniature-${employee.id}${employee.id === selectedId ? ' selected' : ''}${activity ? ` ${activity}` : ''}`} style={style} onClick={() => onSelect(employee.id)} aria-label={`${employee.name}、${employee.role}、${stateLabel}。詳細を表示`}>
          {activity && <span className="miniature-activity">{activityLabels[activity]}</span>}
          <span className="miniature-avatar" aria-hidden="true"><i className="miniature-hair" /><i className="miniature-face" /><i className="miniature-body" /><i className="miniature-keyboard" /></span>
          <span className="miniature-name"><strong>{employee.name}</strong><small>{stateLabel}</small></span>
        </button>;
      })}
      <div className="miniature-progress"><span>全体進捗</span><ProgressBar value={progress} label={`プロジェクト進捗 ${progress}%`} /><strong>{progress}%</strong></div>
    </div>
  </section>;
}
