import { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { EmployeePanel } from './components/EmployeePanel';
import { EmployeeRoster } from './components/EmployeeRoster';
import { ModeSwitcher } from './components/ModeSwitcher';
import { OfficeView } from './components/OfficeView';
import { TaskRequestSection } from './components/TaskRequestSection';
import { WorkHistorySection } from './components/WorkHistorySection';
import { ProjectAnalysisSection } from './components/ProjectAnalysisSection';
import { PublicDemoOverview } from './components/PublicDemoOverview';
import { ObsidianStatusPanel } from './components/ObsidianStatusPanel';
import { InAppGuide } from './components/InAppGuide';
import { ArchitectureShowcase } from './components/ArchitectureShowcase';
import { employeeById, employees } from './data/employees';
import { useManagerRequest } from './hooks/useManagerRequest';
import { usePersistentOfficeState } from './hooks/usePersistentOfficeState';
import { useWorkRequest } from './hooks/useWorkRequest';
import { useWorkHistory } from './hooks/useWorkHistory';
import { useWorkCategory } from './hooks/useWorkCategory';
import type { WorkCategory } from '../shared/workCategories';
import { calculateOverallProgress } from './utils/progress';
import { appRuntimeMode, type AppRuntimeMode } from './utils/runtimeMode';

export function App({ runtimeMode = appRuntimeMode, showObsidianStatus = false }: { runtimeMode?: AppRuntimeMode; showObsidianStatus?: boolean }) {
  const { state, selectMode, selectEmployee, updateProgress } = usePersistentOfficeState();
  const managerRequest = useManagerRequest(runtimeMode);
  const workRequest = useWorkRequest(runtimeMode);
  const history = useWorkHistory();
  const workCategory = useWorkCategory();
  const addHistoryExecution = history.addExecution;
  const [taskToRestore, setTaskToRestore] = useState<{ value: string; category: WorkCategory; token: number } | null>(null);
  const selectedEmployee = employeeById[state.selectedEmployeeId];
  const overallProgress = calculateOverallProgress(state.employeeProgress);
  const assignedEmployeeIds = managerRequest.response
    ? employees.filter((employee) => managerRequest.response?.plan.assignments.some((assignment) => assignment.name === employee.name)).map((employee) => employee.id)
    : [];
  useEffect(() => {
    if (workRequest.completionId && workRequest.response && managerRequest.response) {
      addHistoryExecution(workRequest.completionId, workRequest.response.category, workRequest.response.task, managerRequest.response.plan, workRequest.response.results);
    }
  }, [addHistoryExecution, managerRequest.response, workRequest.completionId, workRequest.response]);
  return <div className="app-shell">
    <AppHeader progress={overallProgress} runtimeMode={runtimeMode} />
    <main>
      {runtimeMode === 'public-demo' && <PublicDemoOverview />}
      <InAppGuide runtimeMode={runtimeMode} />
      <ModeSwitcher activeMode={state.mode} onChange={selectMode} />
      <div className="workspace"><OfficeView mode={state.mode} selectedId={state.selectedEmployeeId} progress={overallProgress} onSelect={selectEmployee} managerStatus={managerRequest.status} assignedEmployeeIds={assignedEmployeeIds} workStatus={workRequest.status} workResponse={workRequest.response} workTargetEmployeeIds={workRequest.targetEmployeeIds} /><EmployeePanel employee={selectedEmployee} mode={state.mode} progress={state.employeeProgress[state.selectedEmployeeId]} onProgressChange={(value) => updateProgress(state.selectedEmployeeId, value)} /></div>
      <EmployeeRoster selectedId={state.selectedEmployeeId} progress={state.employeeProgress} onSelect={selectEmployee} />
      <ArchitectureShowcase />
      <TaskRequestSection runtimeMode={runtimeMode} category={workCategory.category} categoryStorageError={workCategory.storageError} onCategoryChange={(category) => { managerRequest.reset(); workRequest.reset(); workCategory.setCategory(category); }} status={managerRequest.status} response={managerRequest.response} error={managerRequest.error} onSubmit={(task, category) => { workRequest.reset(); return managerRequest.submit(task, category); }} onSelectEmployee={selectEmployee} workStatus={workRequest.status} workResponse={workRequest.response} workError={workRequest.error} onExecute={workRequest.execute} onCancelWork={workRequest.cancel} taskToRestore={taskToRestore} />
      <ProjectAnalysisSection runtimeMode={runtimeMode} />
      {showObsidianStatus && <ObsidianStatusPanel runtimeMode={runtimeMode} />}
      <WorkHistorySection runtimeMode={runtimeMode} entries={history.entries} selectedEntry={history.selectedEntry} storageError={history.storageError} onSelect={history.selectEntry} onReview={history.updateReview} onDeleteOne={history.removeOne} onDeleteAll={history.removeAll} onRestoreTask={(task, category) => { workCategory.setCategory(category); managerRequest.reset(); workRequest.reset(); setTaskToRestore((current) => ({ value: task, category, token: (current?.token ?? 0) + 1 })); }} onSelectEmployee={selectEmployee} />
    </main>
    <footer><span>AI OFFICE</span><p>Planning · Design · Development · Quality</p><small>Local-first portfolio experience</small></footer>
  </div>;
}
