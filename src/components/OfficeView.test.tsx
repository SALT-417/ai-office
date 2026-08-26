import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('初期表示はリアルで、切り替えるとミニチュアに5名を表示する', () => {
    render(<OfficeView {...baseProps} />);
    expect(screen.getByRole('button', { name: 'リアル' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByAltText('AI OFFICEのモダンな室内')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    expect(screen.getByRole('button', { name: 'ミニチュア' })).toHaveAttribute('aria-pressed', 'true');
    const scene = screen.getByLabelText(/ミニチュア表示・各デスクで業務中/).closest('section');
    expect(scene).not.toBeNull();
    expect(within(scene as HTMLElement).getAllByRole('button')).toHaveLength(5);
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
    expect(screen.getByRole('button', { name: /レン、マネージャー、会議席/ })).toBeInTheDocument();
  });

  it('対象社員の作業中と完了を文字バッジで表示する', () => {
    const { rerender } = render(<OfficeView {...baseProps} workStatus="loading" workTargetEmployeeIds={['sou']} />);
    fireEvent.click(screen.getByRole('button', { name: 'ミニチュア' }));
    const sou = screen.getByRole('button', { name: /ソウ、AI開発担当、作業中/ });
    expect(within(sou).getAllByText('作業中')).toHaveLength(2);

    const response: WorkResponse = { coordinator: 'レン', category: 'development', task: '実装確認', results: [{ employeeId: 'sou', name: 'ソウ', role: 'AI開発担当', status: 'completed', title: '成果', content: '内容' }] };
    rerender(<OfficeView {...baseProps} workStatus="success" workResponse={response} />);
    expect(within(screen.getByRole('button', { name: /ソウ、AI開発担当、完了/ })).getAllByText('完了')).toHaveLength(2);
  });
});
