export type OfficeMode = 'work' | 'walk' | 'break' | 'meeting' | 'night';
export type EmployeeId = 'ren' | 'mio' | 'sou' | 'yuna' | 'aki';

export interface Position { x: number; y: number; scale?: number; layer?: number }

export interface Employee {
  id: EmployeeId;
  name: string;
  role: string;
  shortRole: string;
  image: string;
  responsibility: string;
  task: string;
  initialProgress: number;
  dialogueByMode: Record<OfficeMode, string>;
}

export interface ModeDefinition {
  id: OfficeMode;
  label: string;
  icon: string;
  time: string;
  status: string;
  positions: Record<EmployeeId, Position>;
}

export interface OfficeState {
  mode: OfficeMode;
  selectedEmployeeId: EmployeeId;
  employeeProgress: Record<EmployeeId, number>;
}
