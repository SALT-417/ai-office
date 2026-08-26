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
const MOTION_STORAGE_KEY = 'ai-office-miniature-motion-v1';

function loadMotionPreference(): boolean | null {
  try {
    const value = JSON.parse(localStorage.getItem(MOTION_STORAGE_KEY) ?? 'null') as unknown;
    return typeof value === 'object' && value !== null && 'version' in value && 'enabled' in value && value.version === 1 && typeof value.enabled === 'boolean' ? value.enabled : null;
  } catch { return null; }
}

function saveMotionPreference(enabled: boolean) {
  try { localStorage.setItem(MOTION_STORAGE_KEY, JSON.stringify({ version: 1, enabled })); } catch { /* 表示機能は保存失敗時も継続する */ }
}

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
  const [motionPreference, setMotionPreference] = useState<boolean | null>(loadMotionPreference);
  const motionEnabled = motionPreference ?? !reducedMotion;
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
    setMovingIds(motionEnabled ? employees.filter(({ id }) => activityById[id] !== 'failed').map(({ id }) => id) : []);
    if (!motionEnabled) return;
    const arrival = window.setTimeout(() => setMovingIds([]), 1400);
    return () => window.clearTimeout(arrival);
  }, [activityById, mode, motionEnabled]);

  useEffect(() => {
    if (!motionEnabled || (mode !== 'work' && mode !== 'walk')) return;
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
  }, [activityById, mode, motionEnabled, selectedId]);

  const motionStatus = motionEnabled ? '自律移動中' : motionPreference === false ? 'アプリ設定で移動停止中' : 'OS設定で移動停止中';
  const toggleMotion = () => {
    const enabled = !motionEnabled;
    setMotionPreference(enabled);
    saveMotionPreference(enabled);
  };

  return <section className="scene-shell miniature-scene-shell" aria-labelledby="miniature-scene-status">
    <div className="scene-status miniature-status"><span className="live-dot" /><strong>{activeMode.time}</strong><span id="miniature-scene-status">ミニチュア表示・{activeMode.status}</span><span className="miniature-motion-control"><small className="miniature-motion-note">{motionStatus}</small><button type="button" role="switch" aria-checked={motionEnabled} onClick={toggleMotion}>自律移動 {motionEnabled ? 'ON' : 'OFF'}</button></span></div>
    {reducedMotion && motionEnabled && <p className="motion-override-note">OSの動き軽減設定中ですが、手動で移動ONにしています。</p>}
    <div className={`miniature-office${reducedMotion && motionEnabled ? ' motion-forced' : ''}`} data-mode={mode} data-motion={motionEnabled ? 'on' : 'off'}>
      <div className="miniature-wall miniature-wall-left" aria-hidden="true" />
      <div className="miniature-wall miniature-wall-back" aria-hidden="true"><span>AI OFFICE</span><i className="miniature-window" /></div>
      <div className="miniature-floor" aria-hidden="true"><i className="mini-floor-inlay" /></div>
      <div className="miniature-furniture" aria-hidden="true">
        <span className="mini-zone-label zone-library">資料棚</span><span className="mini-zone-label zone-meeting">会議エリア</span><span className="mini-zone-label zone-work">作業席</span><span className="mini-zone-label zone-lounge">ラウンジ</span>
        <i className="mini-desk desk-one" /><i className="mini-desk desk-two" /><i className="mini-desk desk-three" /><i className="mini-desk desk-four" /><i className="mini-desk desk-five" />
        <i className="mini-chair chair-one" /><i className="mini-chair chair-two" /><i className="mini-chair chair-three" /><i className="mini-chair chair-four" /><i className="mini-chair chair-five" />
        <i className="mini-meeting-table" /><i className="mini-sofa sofa-two" /><i className="mini-sofa sofa-one" /><i className="mini-shelf" /><i className="mini-agent-console" /><i className="mini-plant plant-one" /><i className="mini-plant plant-two" /><i className="mini-plant plant-three" />
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
          <span className="miniature-avatar" aria-hidden="true">
            <i className="mini-person-leg leg-left" /><i className="mini-person-leg leg-right" />
            <i className="mini-person-body" /><i className="mini-person-arm arm-left" /><i className="mini-person-arm arm-right" />
            <i className="mini-person-head"><i className="mini-person-face"><i className="mini-person-eye eye-left" /><i className="mini-person-eye eye-right" /></i><i className="mini-person-hair" /></i>
            <i className="mini-person-prop" /><i className="miniature-keyboard" />
          </span>
          <span className="miniature-name"><strong>{employee.name}</strong><small>{stateLabel}</small></span>
        </button>;
      })}
      <div className="miniature-progress"><span>全体進捗</span><ProgressBar value={progress} label={`プロジェクト進捗 ${progress}%`} /><strong>{progress}%</strong></div>
    </div>
  </section>;
}
