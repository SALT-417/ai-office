import { employees } from '../data/employees';
import type { EmployeeId } from '../types/office';

interface Props { selectedId: EmployeeId; progress: Record<EmployeeId, number>; onSelect: (id: EmployeeId) => void }

export function EmployeeRoster({ selectedId, progress, onSelect }: Props) {
  return <section className="roster" aria-labelledby="team-title"><div><p className="eyebrow">OUR TEAM</p><h2 id="team-title">5人の専門チーム</h2></div><div className="roster-list">{employees.map((employee) => <button type="button" key={employee.id} className={selectedId === employee.id ? 'roster-item active' : 'roster-item'} onClick={() => onSelect(employee.id)} aria-pressed={selectedId === employee.id}><img src={employee.image} alt="" /><span><strong>{employee.name}</strong><small>{employee.role}</small></span><b>{progress[employee.id]}%</b></button>)}</div></section>;
}
