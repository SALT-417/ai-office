import type { ModeDefinition, OfficeMode } from '../types/office';

export const modes: ModeDefinition[] = [
  { id: 'work', label: '業務', icon: '▦', time: '09:30', status: '各デスクで業務中', positions: { ren: { x: 42, y: 49 }, mio: { x: 14, y: 43 }, sou: { x: 66, y: 40 }, yuna: { x: 27, y: 56 }, aki: { x: 79, y: 53 } } },
  { id: 'walk', label: '移動', icon: '→', time: '10:45', status: '社員がオフィス内を移動中', positions: { ren: { x: 18, y: 46 }, mio: { x: 34, y: 54 }, sou: { x: 50, y: 42 }, yuna: { x: 66, y: 55 }, aki: { x: 82, y: 45 } } },
  { id: 'break', label: '休憩', icon: '◇', time: '12:15', status: 'ラウンジでリフレッシュ中', positions: { ren: { x: 61, y: 15, scale: .55 }, mio: { x: 72, y: 15, scale: .55 }, sou: { x: 83, y: 15, scale: .55 }, yuna: { x: 66, y: 42, scale: .52 }, aki: { x: 79, y: 42, scale: .52 } } },
  { id: 'meeting', label: '会議', icon: '◎', time: '15:00', status: '全員で企画会議中', positions: { ren: { x: 26, y: 24, scale: .6 }, mio: { x: 38, y: 25, scale: .6 }, sou: { x: 50, y: 23, scale: .6 }, yuna: { x: 62, y: 26, scale: .6 }, aki: { x: 74, y: 24, scale: .6 } } },
  { id: 'night', label: '夜間', icon: '☾', time: '20:30', status: '夜間担当が仕上げ作業中', positions: { ren: { x: 41, y: 49 }, mio: { x: 14, y: 43 }, sou: { x: 66, y: 40 }, yuna: { x: 27, y: 56 }, aki: { x: 79, y: 53 } } },
];

export const modeById = Object.fromEntries(modes.map((mode) => [mode.id, mode])) as Record<OfficeMode, ModeDefinition>;
