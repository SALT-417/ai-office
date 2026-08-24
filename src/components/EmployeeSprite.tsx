import type { CSSProperties } from 'react';
import type { Employee, Position } from '../types/office';

interface Props { employee: Employee; position: Position; selected: boolean; mode: string; onSelect: () => void }

export function EmployeeSprite({ employee, position, selected, mode, onSelect }: Props) {
  const style = { '--employee-x': `${position.x}%`, '--employee-y': `${position.y}%`, '--employee-scale': position.scale ?? 1, '--employee-layer': position.layer ?? 3 } as CSSProperties;
  return <button type="button" className={`employee-sprite employee-${employee.id}${selected ? ' selected' : ''}`} style={style} onClick={onSelect} aria-label={`${employee.name}、${employee.role}。詳細を表示`} aria-pressed={selected} data-motion={mode}>
    <span className="employee-figure"><img src={employee.image} alt="" draggable="false" /></span>
    <span className="employee-label"><strong>{employee.name}</strong><small>{employee.shortRole}</small></span>
  </button>;
}
