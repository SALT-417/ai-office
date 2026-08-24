import { AppHeader } from './components/AppHeader';
import { EmployeePanel } from './components/EmployeePanel';
import { EmployeeRoster } from './components/EmployeeRoster';
import { ModeSwitcher } from './components/ModeSwitcher';
import { OfficeScene } from './components/OfficeScene';
import { employeeById } from './data/employees';
import { usePersistentOfficeState } from './hooks/usePersistentOfficeState';
import { calculateOverallProgress } from './utils/progress';

export function App() {
  const { state, selectMode, selectEmployee, updateProgress } = usePersistentOfficeState();
  const selectedEmployee = employeeById[state.selectedEmployeeId];
  const overallProgress = calculateOverallProgress(state.employeeProgress);
  return <div className="app-shell">
    <AppHeader progress={overallProgress} />
    <main>
      <ModeSwitcher activeMode={state.mode} onChange={selectMode} />
      <div className="workspace"><OfficeScene mode={state.mode} selectedId={state.selectedEmployeeId} progress={overallProgress} onSelect={selectEmployee} /><EmployeePanel employee={selectedEmployee} mode={state.mode} progress={state.employeeProgress[state.selectedEmployeeId]} onProgressChange={(value) => updateProgress(state.selectedEmployeeId, value)} /></div>
      <EmployeeRoster selectedId={state.selectedEmployeeId} progress={state.employeeProgress} onSelect={selectEmployee} />
    </main>
    <footer><span>AI OFFICE</span><p>Planning · Design · Development · Quality</p><small>Local-first portfolio experience</small></footer>
  </div>;
}
