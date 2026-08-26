import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfficeView } from './OfficeView';
import type { OfficeMode } from '../types/office';
import type { WorkResponse } from '../types/work';

const baseProps = {
  mode: 'work' as OfficeMode,
  selectedId: 'ren' as const,
  progress: 35,
  onSelect: vi.fn(),
  managerStatus: 'idle' as const,
  assignedEmployeeIds: [],
  workStatus: 'idle' as const,
  workResponse: null,
  workTargetEmployeeIds: [],
};

describe('OfficeView', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('初期表示はリアルで、切り替えるとミニチュアに5名を表示する', () => {
    render(<OfficeView {...baseProps} />);
    expect(screen.getByRole('button', { name: 'リアル' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByAltText('AI OFFICEのモダンな室内')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(screen.getByRole('button', { name: 'ミニチュア' })).toHaveAttribute('aria-pressed', 'true');
    const scene = screen.getByLabelText(/ミニチュア表示・各デスクで業務中/).closest('section');
    expect(scene).not.toBeNull();
    expect((scene as HTMLElement).querySelectorAll('.miniature-employee')).toHaveLength(5);
    expect(screen.getByRole('switch', { name: '自律移動 ON' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ミニチュアの社員選択を既存の詳細選択へ渡す', () => {
    const onSelect = vi.fn();
    render(<OfficeView {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    fireEvent.click(screen.getByRole('button', { name: /ミオ、キャリア担当/ }));
    expect(onSelect).toHaveBeenCalledWith('mio');
  });

  it('モード変更を状態テキストと配置属性へ反映する', () => {
    const { rerender } = render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    rerender(<OfficeView {...baseProps} mode="meeting" />);
    expect(screen.getByText('ミニチュア表示・全員で企画会議中')).toBeInTheDocument();
    expect(document.querySelector('.miniature-office')).toHaveAttribute('data-mode', 'meeting');
    expect(screen.getByRole('button', { name: /レン、マネージャー、会議席/ })).toHaveAttribute('data-destination', 'meeting-ren');
    rerender(<OfficeView {...baseProps} mode="break" />);
    expect(screen.getByRole('button', { name: /レン、マネージャー、ラウンジ/ })).toHaveAttribute('data-destination', 'lounge-ren');
  });

  it('対象社員の作業中と完了を文字バッジで表示する', () => {
    const { rerender } = render(<OfficeView {...baseProps} workStatus="loading" workTargetEmployeeIds={['sou']} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    const sou = screen.getByRole('button', { name: /ソウ、AI開発担当、作業中/ });
    expect(sou.querySelector('.miniature-speech')).toHaveTextContent('作業中');
    expect(within(sou).getAllByText('作業中').length).toBeGreaterThanOrEqual(2);
    expect(sou).toHaveAttribute('data-destination', 'desk-sou');

    const response: WorkResponse = { coordinator: 'レン', category: 'development', task: '実装確認', results: [{ employeeId: 'sou', name: 'ソウ', role: 'AI開発担当', status: 'completed', title: '成果', content: '内容' }] };
    rerender(<OfficeView {...baseProps} workStatus="success" workResponse={response} />);
    const completedSou = screen.getByRole('button', { name: /ソウ、AI開発担当、完了/ });
    expect(completedSou.querySelector('.miniature-speech')).toHaveTextContent('完了しました');
    expect(within(completedSou).getAllByText('完了').length).toBeGreaterThanOrEqual(2);
  });

  it('通常時は一部社員だけが決定的に短い吹き出しを表示する', () => {
    vi.useFakeTimers();
    render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(document.querySelectorAll('.miniature-speech')).toHaveLength(2);
    expect(screen.getByText('整理します')).toBeInTheDocument();
    expect(screen.getByText('実装確認')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(document.querySelectorAll('.miniature-speech')).toHaveLength(2);
    expect(screen.getByText('情報整理')).toBeInTheDocument();
  });

  it('依頼・担当・失敗状態を優先した吹き出しへ切り替える', () => {
    const { rerender } = render(<OfficeView {...baseProps} managerStatus="loading" />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(screen.getByRole('button', { name: /レン、マネージャー、整理中/ }).querySelector('.miniature-speech')).toHaveTextContent('整理中...');

    rerender(<OfficeView {...baseProps} managerStatus="success" assignedEmployeeIds={['mio']} />);
    expect(screen.getByRole('button', { name: /ミオ、キャリア担当、担当予定/ }).querySelector('.miniature-speech')).toHaveTextContent('担当します');

    const failedResponse: WorkResponse = { coordinator: 'レン', category: 'development', task: '確認', results: [{ employeeId: 'aki', name: 'アキ', role: '品質管理担当', status: 'failed', title: '確認', content: '', error: '処理できませんでした。' }] };
    rerender(<OfficeView {...baseProps} workStatus="success" workResponse={failedResponse} />);
    expect(screen.getByRole('button', { name: /アキ、品質管理担当、失敗/ }).querySelector('.miniature-speech')).toHaveTextContent('確認が必要');
  });

  it.each([
    ['meeting', '共有します'],
    ['break', '少し休憩'],
    ['night', '静かに確認'],
  ] as const)('%sモードで専用の吹き出しを表示する', (mode, speech) => {
    render(<OfficeView {...baseProps} mode={mode} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(screen.getAllByText(speech).length).toBeGreaterThan(0);
  });

  it('業務中は決定的な巡回で一部社員だけを移動させる', () => {
    vi.useFakeTimers();
    render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    act(() => vi.advanceTimersByTime(1500));
    expect(document.querySelectorAll('.miniature-employee[data-state="moving"]')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(3500));
    const moving = document.querySelectorAll('.miniature-employee[data-state="moving"]');
    expect(moving).toHaveLength(2);
    expect([...moving].every((employee) => employee.hasAttribute('data-destination'))).toBe(true);
  });

  it('移動モードでは歩行状態を示し、レン依頼中は中央へ移動する', () => {
    const { rerender } = render(<OfficeView {...baseProps} mode="walk" />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(document.querySelector('.miniature-employee.moving')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ミオ、キャリア担当、通路/ })).toHaveAttribute('data-destination', 'aisle-back');
    rerender(<OfficeView {...baseProps} managerStatus="loading" />);
    expect(screen.getByRole('button', { name: /レン、マネージャー、整理中/ })).toHaveAttribute('data-destination', 'center');
  });

  it('Reduced Motionでは初期状態をOFFにして自律intervalを開始しない', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
    const intervalSpy = vi.spyOn(window, 'setInterval');
    render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(screen.getByText('OS設定で移動停止中')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '自律移動 OFF' })).toHaveAttribute('aria-checked', 'false');
    expect(intervalSpy.mock.calls.some(([, delay]) => delay === 5000)).toBe(false);
    expect(document.querySelectorAll('.miniature-employee[data-state="moving"]')).toHaveLength(0);
    expect(document.querySelectorAll('.miniature-speech')).toHaveLength(2);
  });

  it('移動をアプリ内でOFFにして保存し、再表示時に復元する', () => {
    const { unmount } = render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    fireEvent.click(screen.getByRole('switch', { name: '自律移動 ON' }));
    expect(screen.getByText('アプリ設定で移動停止中')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ai-office-miniature-motion-v1') ?? '{}')).toEqual({ version: 1, enabled: false });
    unmount();
    render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(screen.getByRole('switch', { name: '自律移動 OFF' })).toHaveAttribute('aria-checked', 'false');
  });

  it('Reduced Motion環境でも手動ONを優先して注意を表示する', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
    render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    fireEvent.click(screen.getByRole('switch', { name: '自律移動 OFF' }));
    expect(screen.getByRole('switch', { name: '自律移動 ON' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('OSの動き軽減設定中ですが、手動で移動ONにしています。')).toBeInTheDocument();
    expect(document.querySelector('.miniature-office')).toHaveClass('motion-forced');
  });

  it('顔・体・腕・足のある5名と主要オフィスエリアを表示する', () => {
    render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(document.querySelectorAll('.mini-person-face')).toHaveLength(5);
    expect(document.querySelectorAll('.mini-person-body')).toHaveLength(5);
    expect(document.querySelectorAll('.mini-person-arm')).toHaveLength(10);
    expect(document.querySelectorAll('.mini-person-leg')).toHaveLength(10);
    expect(screen.getByText('作業席')).toBeInTheDocument();
    expect(screen.getByText('会議エリア')).toBeInTheDocument();
    expect(screen.getByText('ラウンジ')).toBeInTheDocument();
    expect(screen.getByText('資料棚')).toBeInTheDocument();
    expect(screen.getAllByText('AI OFFICE').length).toBeGreaterThan(0);
  });

  it('アンマウント時に自律移動タイマーを解除する', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = render(<OfficeView {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
