import type { EmployeeId, OfficeMode } from '../types/office';

export interface MiniaturePoint { x: number; y: number; zone: string }
export type MiniaturePointId = 'desk-ren' | 'desk-mio' | 'desk-sou' | 'desk-yuna' | 'desk-aki' | 'aisle-left' | 'aisle-center' | 'aisle-right' | 'meeting-ren' | 'meeting-mio' | 'meeting-sou' | 'meeting-yuna' | 'meeting-aki' | 'lounge-ren' | 'lounge-mio' | 'lounge-sou' | 'lounge-yuna' | 'lounge-aki' | 'shelf' | 'center' | 'standby-left' | 'standby-right';

export const miniaturePoints: Record<MiniaturePointId, MiniaturePoint> = {
  'desk-ren': { x: 30, y: 30, zone: '自席' }, 'desk-mio': { x: 55, y: 27, zone: '自席' }, 'desk-sou': { x: 75, y: 42, zone: '自席' }, 'desk-yuna': { x: 38, y: 62, zone: '自席' }, 'desk-aki': { x: 68, y: 68, zone: '自席' },
  'aisle-left': { x: 29, y: 48, zone: '通路' }, 'aisle-center': { x: 49, y: 52, zone: '通路' }, 'aisle-right': { x: 70, y: 49, zone: '通路' },
  'meeting-ren': { x: 42, y: 47, zone: '会議席' }, 'meeting-mio': { x: 51, y: 39, zone: '会議席' }, 'meeting-sou': { x: 61, y: 47, zone: '会議席' }, 'meeting-yuna': { x: 53, y: 58, zone: '会議席' }, 'meeting-aki': { x: 43, y: 58, zone: '会議席' },
  'lounge-ren': { x: 68, y: 68, zone: 'ラウンジ' }, 'lounge-mio': { x: 78, y: 63, zone: 'ラウンジ' }, 'lounge-sou': { x: 59, y: 73, zone: 'ラウンジ' }, 'lounge-yuna': { x: 74, y: 78, zone: 'ラウンジ' }, 'lounge-aki': { x: 84, y: 73, zone: 'ラウンジ' },
  shelf: { x: 18, y: 43, zone: '資料棚' }, center: { x: 50, y: 49, zone: '中央確認ポイント' }, 'standby-left': { x: 43, y: 70, zone: '待機席' }, 'standby-right': { x: 77, y: 69, zone: '待機席' },
};

export const employeeDeskPoints: Record<EmployeeId, MiniaturePointId> = { ren: 'desk-ren', mio: 'desk-mio', sou: 'desk-sou', yuna: 'desk-yuna', aki: 'desk-aki' };

export const modeDestinations: Record<OfficeMode, Record<EmployeeId, MiniaturePointId>> = {
  work: employeeDeskPoints,
  walk: { ren: 'aisle-left', mio: 'aisle-center', sou: 'aisle-right', yuna: 'aisle-left', aki: 'aisle-center' },
  break: { ren: 'lounge-ren', mio: 'lounge-mio', sou: 'lounge-sou', yuna: 'lounge-yuna', aki: 'lounge-aki' },
  meeting: { ren: 'meeting-ren', mio: 'meeting-mio', sou: 'meeting-sou', yuna: 'meeting-yuna', aki: 'meeting-aki' },
  night: { ren: 'desk-ren', mio: 'standby-left', sou: 'desk-sou', yuna: 'standby-right', aki: 'desk-aki' },
};

export const autonomousRoutes: Record<'work' | 'walk', Record<EmployeeId, MiniaturePointId[]>> = {
  work: {
    ren: ['desk-ren', 'center', 'desk-ren'], mio: ['desk-mio', 'aisle-center', 'desk-mio'], sou: ['desk-sou', 'shelf', 'desk-sou'], yuna: ['desk-yuna', 'aisle-left', 'desk-yuna'], aki: ['desk-aki', 'shelf', 'desk-aki'],
  },
  walk: {
    ren: ['aisle-left', 'aisle-center', 'aisle-right'], mio: ['aisle-center', 'aisle-right', 'aisle-left'], sou: ['aisle-right', 'aisle-left', 'aisle-center'], yuna: ['aisle-left', 'aisle-right', 'aisle-center'], aki: ['aisle-center', 'aisle-left', 'aisle-right'],
  },
};
