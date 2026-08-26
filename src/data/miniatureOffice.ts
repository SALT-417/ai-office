import type { EmployeeId, OfficeMode } from '../types/office';

export interface MiniaturePoint { x: number; y: number; zone: string }
export type MiniaturePointId = 'desk-ren' | 'desk-mio' | 'desk-sou' | 'desk-yuna' | 'desk-aki' | 'aisle-left' | 'aisle-center' | 'aisle-right' | 'aisle-front' | 'aisle-back' | 'meeting-ren' | 'meeting-mio' | 'meeting-sou' | 'meeting-yuna' | 'meeting-aki' | 'lounge-ren' | 'lounge-mio' | 'lounge-sou' | 'lounge-yuna' | 'lounge-aki' | 'shelf' | 'center' | 'standby-left' | 'standby-right';

export const miniaturePoints: Record<MiniaturePointId, MiniaturePoint> = {
  'desk-ren': { x: 34, y: 31, zone: '自席' }, 'desk-mio': { x: 54, y: 27, zone: '自席' }, 'desk-sou': { x: 74, y: 34, zone: '自席' }, 'desk-yuna': { x: 43, y: 63, zone: '自席' }, 'desk-aki': { x: 66, y: 65, zone: '自席' },
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

export const employeeSpeech: Record<EmployeeId, readonly string[]> = {
  ren: ['整理します', '優先度確認', '進捗見ます'],
  mio: ['応募軸確認', '情報整理', '次の一手'],
  sou: ['実装確認', 'API確認', '型を確認'],
  yuna: ['見せ方調整', '文章整理', 'UI確認'],
  aki: ['品質確認', 'テスト確認', '安全確認'],
};

export const modeSpeech: Record<OfficeMode, readonly string[]> = {
  work: [],
  walk: ['次へ移動', '資料を確認'],
  break: ['少し休憩', 'メモ整理'],
  meeting: ['共有します', '相談中'],
  night: ['静かに確認', '最終チェック'],
};
