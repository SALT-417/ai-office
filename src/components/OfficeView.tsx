import { useState } from 'react';
import type { EmployeeId, OfficeMode } from '../types/office';
import type { ManagerRequestStatus } from '../types/manager';
import type { WorkRequestStatus, WorkResponse } from '../types/work';
import { MiniatureOfficeScene } from './MiniatureOfficeScene';
import { OfficeScene } from './OfficeScene';

type OfficeViewMode = 'real' | 'miniature';
interface Props { mode: OfficeMode; selectedId: EmployeeId; progress: number; onSelect: (id: EmployeeId) => void; managerStatus: ManagerRequestStatus; assignedEmployeeIds: EmployeeId[]; workStatus: WorkRequestStatus; workResponse: WorkResponse | null; workTargetEmployeeIds: EmployeeId[] }

export function OfficeView(props: Props) {
  const [view, setView] = useState<OfficeViewMode>('real');
  return <div className="office-view">
    <div className="office-view-switch" role="group" aria-label="オフィス表示">
      <span>表示</span>
      <button type="button" aria-pressed={view === 'real'} onClick={() => setView('real')}>リアル</button>
      <button type="button" aria-pressed={view === 'miniature'} onClick={() => setView('miniature')}>ミニチュア</button>
    </div>
    {view === 'real' ? <OfficeScene {...props} /> : <MiniatureOfficeScene {...props} />}
  </div>;
}
