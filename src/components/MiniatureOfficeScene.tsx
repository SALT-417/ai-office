import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { employees } from '../data/employees';
import { autonomousRoutes, employeeDeskPoints, miniaturePoints, modeDestinations, type MiniaturePointId } from '../data/miniatureOffice';
import { modeById } from '../data/modes';
import type { EmployeeId, OfficeMode } from '../types/office';
import type { ManagerRequestStatus } from '../types/manager';
import type { WorkRequestStatus, WorkResponse } from '../types/work';
import { ProgressBar } from './ProgressBar';

interface Props { mode: OfficeMode; selectedId: EmployeeId; progress: number; onSelect: (id: EmployeeId) => void; managerStatus: ManagerRequestStatus; assignedEmployeeIds: EmployeeId[]; workStatus: WorkRequestStatus; workResponse: WorkResponse | null; workTargetEmployeeIds: EmployeeId[] }
type MiniActivity = 'working' | 'completed' | 'failed' | 'processing' | 'assigned';

const activityLabels: Record<MiniActivity, string> = { working: '作業中', completed: '完了', failed: '失敗', processing: '整理中', assigned: '担当予定' };

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export function MiniatureOfficeScene({ mode, selectedId, progress, onSelect, managerStatus, assignedEmployeeIds, workStatus, workResponse, workTargetEmployeeIds }: Props) {
  const activeMode = modeById[mode];
  const reducedMotion = useReducedMotion();
  const [destinations, setDestinations] = useState<Record<EmployeeId, MiniaturePointId>>(() => ({ ...modeDestinations[mode] }));
  const [movingIds, setMovingIds] = useState<EmployeeId[]>([]);
  const routeStep = useRef(0);
  const activityById = useMemo(() => Object.fromEntries(employees.map((employee) => {
    const result = workResponse?.results.find((item) => item.employeeId === employee.id);
    const activity: MiniActivity | undefined = workStatus === 'loading' && workTargetEmployeeIds.includes(employee.id) ? 'working'
      : result?.status === 'completed' ? 'completed' : result?.status === 'failed' ? 'failed'
      : managerStatus === 'loading' && employee.id === 'ren' ? 'processing'
      : managerStatus === 'success' && assignedEmployeeIds.includes(employee.id) ? 'assigned' : undefined;
    return [employee.id, activity];
  })) as Record<EmployeeId, MiniActivity | undefined>, [assignedEmployeeIds, managerStatus, workResponse, workStatus, workTargetEmployeeIds]);

  useEffect(() => {
    const next = { ...modeDestinations[mode] };
    employees.forEach(({ id }) => {
      const activity = activityById[id];
      if (activity === 'processing') next[id] = 'center';
      if (activity === 'working' || activity === 'completed') next[id] = employeeDeskPoints[id];
      if (activity === 'assigned') next[id] = id === 'ren' ? 'center' : employeeDeskPoints[id];
    });
    setDestinations(next);
    setMovingIds(reducedMotion ? [] : employees.filter(({ id }) => activityById[id] !== 'failed').map(({ id }) => id));
    if (reducedMotion) return;
    const arrival = window.setTimeout(() => setMovingIds([]), 1400);
    return () => window.clearTimeout(arrival);
  }, [activityById, mode, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || (mode !== 'work' && mode !== 'walk')) return;
    let arrival: number | undefined;
    const interval = window.setInterval(() => {
      const eligible = employees.filter(({ id }) => !activityById[id] && id !== selectedId);
      if (!eligible.length) return;
      const first = eligible[routeStep.current % eligible.length];
      const second = eligible[(routeStep.current + 2) % eligible.length];
      const movers = [...new Set([first.id, second.id])];
      routeStep.current += 1;
      setDestinations((current) => {
        const next = { ...current };
        movers.forEach((id) => {
          const route = autonomousRoutes[mode][id];
          next[id] = route[routeStep.current % route.length];
        });
        return next;
      });
      setMovingIds(movers);
      if (arrival) window.clearTimeout(arrival);
      arrival = window.setTimeout(() => setMovingIds((current) => current.filter((id) => !movers.includes(id))), 1400);
    }, 5000);
    return () => {
      window.clearInterval(interval);
      if (arrival) window.clearTimeout(arrival);
    };
  }, [activityById, mode, reducedMotion, selectedId]);

  return <section className="scene-shell miniature-scene-shell" aria-labelledby="miniature-scene-status">
    <div className="scene-status"><span className="live-dot" /><strong>{activeMode.time}</strong><span id="miniature-scene-status">ミニチュア表示・{activeMode.status}</span><small className="miniature-motion-note">{reducedMotion ? '移動アニメーション停止中' : '自律移動中'}</small></div>
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
        const activity = activityById[employee.id];
        const destination = destinations[employee.id];
        const position = miniaturePoints[destination];
        const moving = movingIds.includes(employee.id) && activity !== 'failed';
        const stateLabel = activity ? activityLabels[activity] : position.zone;
        const style = { '--mini-x': `${position.x}%`, '--mini-y': `${position.y}%`, '--mini-layer': Math.round(position.y) + 8 } as CSSProperties;
        return <button key={employee.id} type="button" className={`miniature-employee miniature-${employee.id}${employee.id === selectedId ? ' selected' : ''}${activity ? ` ${activity}` : ''}${moving ? ' moving' : ''}`} style={style} data-destination={destination} data-state={activity ?? (moving ? 'moving' : 'idle')} onClick={() => onSelect(employee.id)} aria-label={`${employee.name}、${employee.role}、${stateLabel}。詳細を表示`}>
          {activity && <span className="miniature-activity">{activityLabels[activity]}</span>}
          <span className="miniature-avatar" aria-hidden="true"><i className="miniature-hair" /><i className="miniature-face" /><i className="miniature-body" /><i className="miniature-keyboard" /></span>
          <span className="miniature-name"><strong>{employee.name}</strong><small>{stateLabel}</small></span>
        </button>;
      })}
      <div className="miniature-progress"><span>全体進捗</span><ProgressBar value={progress} label={`プロジェクト進捗 ${progress}%`} /><strong>{progress}%</strong></div>
    </div>
  </section>;
}
