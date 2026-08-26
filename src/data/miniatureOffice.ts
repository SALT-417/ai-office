import type { EmployeeId, OfficeMode } from '../types/office';

export interface MiniaturePoint { x: number; y: number; zone: string }
export type MiniaturePointId = 'desk-ren' | 'desk-mio' | 'desk-sou' | 'desk-yuna' | 'desk-aki' | 'aisle-left' | 'aisle-center' | 'aisle-right' | 'aisle-front' | 'aisle-back' | 'meeting-ren' | 'meeting-mio' | 'meeting-sou' | 'meeting-yuna' | 'meeting-aki' | 'lounge-ren' | 'lounge-mio' | 'lounge-sou' | 'lounge-yuna' | 'lounge-aki' | 'shelf' | 'center' | 'standby-left' | 'standby-right';

export const miniaturePoints: Record<MiniaturePointId, MiniaturePoint> = {
  'desk-ren': { x: 66, y: 28, zone: '自席' }, 'desk-mio': { x: 81, y: 34, zone: '自席' }, 'desk-sou': { x: 70, y: 48, zone: '自席' }, 'desk-yuna': { x: 84, y: 55, zone: '自席' }, 'desk-aki': { x: 74, y: 67, zone: '自席' },
  'aisle-left': { x: 27, y: 48, zone: '通路' }, 'aisle-center': { x: 49, y: 51, zone: '通路' }, 'aisle-right': { x: 67, y: 57, zone: '通路' }, 'aisle-front': { x: 48, y: 72, zone: '通路' }, 'aisle-back': { x: 44, y: 33, zone: '通路' },
  'meeting-ren': { x: 39, y: 45, zone: '会議席' }, 'meeting-mio': { x: 48, y: 38, zone: '会議席' }, 'meeting-sou': { x: 57, y: 45, zone: '会議席' }, 'meeting-yuna': { x: 50, y: 57, zone: '会議席' }, 'meeting-aki': { x: 40, y: 56, zone: '会議席' },
  'lounge-ren': { x: 27, y: 70, zone: 'ラウンジ' }, 'lounge-mio': { x: 37, y: 67, zone: 'ラウンジ' }, 'lounge-sou': { x: 20, y: 77, zone: 'ラウンジ' }, 'lounge-yuna': { x: 32, y: 80, zone: 'ラウンジ' }, 'lounge-aki': { x: 44, y: 76, zone: 'ラウンジ' },
  shelf: { x: 16, y: 39, zone: '資料棚' }, center: { x: 50, y: 50, zone: '中央確認ポイント' }, 'standby-left': { x: 35, y: 72, zone: '待機席' }, 'standby-right': { x: 58, y: 73, zone: '待機席' },
};

export const employeeDeskPoints: Record<EmployeeId, MiniaturePointId> = { ren: 'desk-ren', mio: 'desk-mio', sou: 'desk-sou', yuna: 'desk-yuna', aki: 'desk-aki' };

export const modeDestinations: Record<OfficeMode, Record<EmployeeId, MiniaturePointId>> = {
  work: employeeDeskPoints,
  walk: { ren: 'aisle-left', mio: 'aisle-back', sou: 'aisle-right', yuna: 'aisle-front', aki: 'aisle-center' },
  break: { ren: 'lounge-ren', mio: 'lounge-mio', sou: 'lounge-sou', yuna: 'lounge-yuna', aki: 'lounge-aki' },
  meeting: { ren: 'meeting-ren', mio: 'meeting-mio', sou: 'meeting-sou', yuna: 'meeting-yuna', aki: 'meeting-aki' },
  night: { ren: 'desk-ren', mio: 'standby-left', sou: 'desk-sou', yuna: 'standby-right', aki: 'desk-aki' },
};

export const autonomousRoutes: Record<'work' | 'walk', Record<EmployeeId, MiniaturePointId[]>> = {
  work: {
    ren: ['desk-ren', 'center', 'desk-ren'], mio: ['desk-mio', 'aisle-back', 'desk-mio'], sou: ['desk-sou', 'shelf', 'desk-sou'], yuna: ['desk-yuna', 'aisle-front', 'desk-yuna'], aki: ['desk-aki', 'shelf', 'desk-aki'],
  },
  walk: {
    ren: ['aisle-left', 'aisle-back', 'aisle-center'], mio: ['aisle-back', 'aisle-right', 'aisle-front'], sou: ['aisle-right', 'aisle-center', 'aisle-left'], yuna: ['aisle-front', 'aisle-right', 'aisle-center'], aki: ['aisle-center', 'aisle-left', 'aisle-front'],
  },
};
