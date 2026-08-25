import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEY } from './hooks/usePersistentOfficeState';

describe('AI OFFICE', () => {
  it('shows all employees, five modes, and 35% initial overall progress', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'AI OFFICE' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'オフィスモード' })).getAllByRole('button')).toHaveLength(5);
    expect(screen.getByRole('progressbar', { name: 'プロジェクト全体の進捗 35%' })).toBeInTheDocument();
    ['レン', 'ミオ', 'ソウ', 'ユナ', 'アキ'].forEach((name) => expect(screen.getByRole('button', { name: new RegExp(`${name}、`) })).toBeInTheDocument());
  });
  it('switches all modes and updates the dialogue', async () => {
    const user = userEvent.setup();
    render(<App />);
    const modeNavigation = screen.getByRole('navigation', { name: 'オフィスモード' });
    for (const [mode, status] of [['移動', '社員がオフィス内を移動中'], ['休憩', 'ラウンジでリフレッシュ中'], ['会議', '全員で企画会議中'], ['夜間', '夜間担当が仕上げ作業中']] as const) {
      await user.click(within(modeNavigation).getByRole('button', { name: mode }));
      expect(screen.getByText(status)).toBeInTheDocument();
    }
    expect(screen.getByText(/明日の判断が速くなるよう/)).toBeInTheDocument();
  });
  it('selects an employee and derives overall progress from employee changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /ミオ、キャリア担当。詳細を表示/ }));
    expect(screen.getByRole('heading', { name: 'ミオ' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '＋5' }));
    expect(screen.getByRole('progressbar', { name: 'ミオの進捗 45%' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'プロジェクト全体の進捗 36%' })).toBeInTheDocument();
  });
  it('restores valid state and clamps persisted values', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'meeting', selectedEmployeeId: 'sou', employeeProgress: { ren: 200, mio: 40, sou: 30, yuna: 35, aki: -2 } }));
    render(<App />);
    expect(within(screen.getByRole('navigation', { name: 'オフィスモード' })).getByRole('button', { name: '会議' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'ソウ' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
