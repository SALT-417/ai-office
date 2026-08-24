import backgroundImage from '../../assets/office-background.webp';
import { employees } from '../data/employees';
import { modeById } from '../data/modes';
import type { EmployeeId, OfficeMode } from '../types/office';
import { EmployeeSprite } from './EmployeeSprite';
import { ProgressBar } from './ProgressBar';

interface Props { mode: OfficeMode; selectedId: EmployeeId; progress: number; onSelect: (id: EmployeeId) => void }

export function OfficeScene({ mode, selectedId, progress, onSelect }: Props) {
  const activeMode = modeById[mode];
  return <section className="scene-shell" aria-labelledby="scene-status">
    <div className="scene-status"><span className="live-dot" /><strong>{activeMode.time}</strong><span id="scene-status">{activeMode.status}</span></div>
    <div className="office-scene" data-mode={mode}>
      <img className="office-background" src={backgroundImage} alt="AI OFFICEのモダンな室内" />
      <div className="night-overlay" aria-hidden="true" />
      {employees.map((employee) => <EmployeeSprite key={employee.id} employee={employee} position={activeMode.positions[employee.id]} selected={employee.id === selectedId} mode={mode} onSelect={() => onSelect(employee.id)} />)}
      <div className="scene-progress-card"><span>AI学習支援アプリ</span><ProgressBar value={progress} label={`プロジェクト進捗 ${progress}%`} /><strong>{progress}%</strong></div>
    </div>
  </section>;
}
