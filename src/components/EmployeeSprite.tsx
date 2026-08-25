import type { CSSProperties } from 'react';
import type { Employee, Position } from '../types/office';

type Activity = 'processing' | 'assigned' | 'working' | 'completed' | 'failed';
interface Props { employee: Employee; position: Position; selected: boolean; mode: string; activity?: Activity; onSelect: () => void }

const activityLabels: Record<Activity, string> = { processing: '依頼を処理中', assigned: '新しい計画の担当者', working: '成果物を作業中', completed: '成果物を完了', failed: '成果物の作成に失敗' };
const activityBadges: Record<Activity, string> = { processing: '… 処理中', assigned: '✓ 担当中', working: '… 作業中', completed: '✓ 完了', failed: '! 失敗' };

export function EmployeeSprite({ employee, position, selected, mode, activity, onSelect }: Props) {
  const style = { '--employee-x': `${position.x}%`, '--employee-y': `${position.y}%`, '--employee-scale': position.scale ?? 1, '--employee-layer': position.layer ?? 3 } as CSSProperties;
  return <button type="button" className={`employee-sprite employee-${employee.id}${selected ? ' selected' : ''}${activity ? ` ${activity}` : ''}`} style={style} onClick={onSelect} aria-label={`${employee.name}、${employee.role}。詳細を表示${activity ? `。${activityLabels[activity]}` : ''}`} aria-pressed={selected} data-motion={mode}>
    <span className="employee-figure"><img src={employee.image} alt="" draggable="false" /></span>
    <span className="employee-label"><strong>{employee.name}</strong><small>{employee.shortRole}</small></span>
    {activity && <span className="employee-activity">{activityBadges[activity]}</span>}
  </button>;
}
