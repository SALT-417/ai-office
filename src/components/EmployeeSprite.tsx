import type { CSSProperties } from 'react';
import type { Employee, Position } from '../types/office';

interface Props { employee: Employee; position: Position; selected: boolean; mode: string; activity?: 'processing' | 'assigned'; onSelect: () => void }

export function EmployeeSprite({ employee, position, selected, mode, activity, onSelect }: Props) {
  const style = { '--employee-x': `${position.x}%`, '--employee-y': `${position.y}%`, '--employee-scale': position.scale ?? 1, '--employee-layer': position.layer ?? 3 } as CSSProperties;
  return <button type="button" className={`employee-sprite employee-${employee.id}${selected ? ' selected' : ''}${activity ? ` ${activity}` : ''}`} style={style} onClick={onSelect} aria-label={`${employee.name}、${employee.role}。詳細を表示${activity === 'processing' ? '。依頼を処理中' : activity === 'assigned' ? '。新しい計画の担当者' : ''}`} aria-pressed={selected} data-motion={mode}>
    <span className="employee-figure"><img src={employee.image} alt="" draggable="false" /></span>
    <span className="employee-label"><strong>{employee.name}</strong><small>{employee.shortRole}</small></span>
    {activity && <span className="employee-activity"><span aria-hidden="true">{activity === 'processing' ? '…' : '✓'}</span>{activity === 'processing' ? '処理中' : '担当中'}</span>}
  </button>;
}
