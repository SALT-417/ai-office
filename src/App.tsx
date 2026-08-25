import { AppHeader } from './components/AppHeader';
import { EmployeePanel } from './components/EmployeePanel';
import { EmployeeRoster } from './components/EmployeeRoster';
import { ModeSwitcher } from './components/ModeSwitcher';
import { OfficeScene } from './components/OfficeScene';
import { TaskRequestSection } from './components/TaskRequestSection';
import { employeeById, employees } from './data/employees';
import { useManagerRequest } from './hooks/useManagerRequest';
import { usePersistentOfficeState } from './hooks/usePersistentOfficeState';
import { calculateOverallProgress } from './utils/progress';

export function App() {
  const { state, selectMode, selectEmployee, updateProgress } = usePersistentOfficeState();
  const managerRequest = useManagerRequest();
  const selectedEmployee = employeeById[state.selectedEmployeeId];
  const overallProgress = calculateOverallProgress(state.employeeProgress);
  const assignedEmployeeIds = managerRequest.response
    ? employees.filter((employee) => managerRequest.response?.plan.assignments.some((assignment) => assignment.name === employee.name)).map((employee) => employee.id)
    : [];
  return <div className="app-shell">
    <AppHeader progress={overallProgress} />
    <main>
      <ModeSwitcher activeMode={state.mode} onChange={selectMode} />
      <div className="workspace"><OfficeScene mode={state.mode} selectedId={state.selectedEmployeeId} progress={overallProgress} onSelect={selectEmployee} managerStatus={managerRequest.status} assignedEmployeeIds={assignedEmployeeIds} /><EmployeePanel employee={selectedEmployee} mode={state.mode} progress={state.employeeProgress[state.selectedEmployeeId]} onProgressChange={(value) => updateProgress(state.selectedEmployeeId, value)} /></div>
      <EmployeeRoster selectedId={state.selectedEmployeeId} progress={state.employeeProgress} onSelect={selectEmployee} />
      <TaskRequestSection status={managerRequest.status} response={managerRequest.response} error={managerRequest.error} onSubmit={managerRequest.submit} onSelectEmployee={selectEmployee} />
    </main>
    <footer><span>AI OFFICE</span><p>Planning · Design · Development · Quality</p><small>Local-first portfolio experience</small></footer>
  </div>;
}
