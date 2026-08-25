import { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { EmployeePanel } from './components/EmployeePanel';
import { EmployeeRoster } from './components/EmployeeRoster';
import { ModeSwitcher } from './components/ModeSwitcher';
import { OfficeScene } from './components/OfficeScene';
import { TaskRequestSection } from './components/TaskRequestSection';
import { WorkHistorySection } from './components/WorkHistorySection';
import { ProjectAnalysisSection } from './components/ProjectAnalysisSection';
import { employeeById, employees } from './data/employees';
import { useManagerRequest } from './hooks/useManagerRequest';
import { usePersistentOfficeState } from './hooks/usePersistentOfficeState';
import { useWorkRequest } from './hooks/useWorkRequest';
import { useWorkHistory } from './hooks/useWorkHistory';
import { calculateOverallProgress } from './utils/progress';

export function App() {
  const { state, selectMode, selectEmployee, updateProgress } = usePersistentOfficeState();
  const managerRequest = useManagerRequest();
  const workRequest = useWorkRequest();
  const history = useWorkHistory();
  const addHistoryExecution = history.addExecution;
  const [taskToRestore, setTaskToRestore] = useState<{ value: string; token: number } | null>(null);
  const selectedEmployee = employeeById[state.selectedEmployeeId];
  const overallProgress = calculateOverallProgress(state.employeeProgress);
  const assignedEmployeeIds = managerRequest.response
    ? employees.filter((employee) => managerRequest.response?.plan.assignments.some((assignment) => assignment.name === employee.name)).map((employee) => employee.id)
    : [];
  useEffect(() => {
    if (workRequest.completionId && workRequest.response && managerRequest.response) {
      addHistoryExecution(workRequest.completionId, workRequest.response.task, managerRequest.response.plan, workRequest.response.results);
    }
  }, [addHistoryExecution, managerRequest.response, workRequest.completionId, workRequest.response]);
  return <div className="app-shell">
    <AppHeader progress={overallProgress} />
    <main>
      <ModeSwitcher activeMode={state.mode} onChange={selectMode} />
      <div className="workspace"><OfficeScene mode={state.mode} selectedId={state.selectedEmployeeId} progress={overallProgress} onSelect={selectEmployee} managerStatus={managerRequest.status} assignedEmployeeIds={assignedEmployeeIds} workStatus={workRequest.status} workResponse={workRequest.response} workTargetEmployeeIds={workRequest.targetEmployeeIds} /><EmployeePanel employee={selectedEmployee} mode={state.mode} progress={state.employeeProgress[state.selectedEmployeeId]} onProgressChange={(value) => updateProgress(state.selectedEmployeeId, value)} /></div>
      <EmployeeRoster selectedId={state.selectedEmployeeId} progress={state.employeeProgress} onSelect={selectEmployee} />
      <TaskRequestSection status={managerRequest.status} response={managerRequest.response} error={managerRequest.error} onSubmit={(task) => { workRequest.reset(); return managerRequest.submit(task); }} onSelectEmployee={selectEmployee} workStatus={workRequest.status} workResponse={workRequest.response} workError={workRequest.error} onExecute={workRequest.execute} onCancelWork={workRequest.cancel} taskToRestore={taskToRestore} />
      <ProjectAnalysisSection />
      <WorkHistorySection entries={history.entries} selectedEntry={history.selectedEntry} storageError={history.storageError} onSelect={history.selectEntry} onReview={history.updateReview} onDeleteOne={history.removeOne} onDeleteAll={history.removeAll} onRestoreTask={(task) => setTaskToRestore((current) => ({ value: task, token: (current?.token ?? 0) + 1 }))} onSelectEmployee={selectEmployee} />
    </main>
    <footer><span>AI OFFICE</span><p>Planning · Design · Development · Quality</p><small>Local-first portfolio experience</small></footer>
  </div>;
}
