import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InAppGuide } from './InAppGuide';

describe('InAppGuide', () => {
  it('explains the safe public demo and its available operations', async () => {
    const user = userEvent.setup();
    render(<InAppGuide runtimeMode="public-demo" />);
    expect(screen.getByText(/カテゴリと固定サンプルを操作/)).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /ガイドを開く/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/5カテゴリの切替、固定サンプルと固定テンプレート/)).toBeInTheDocument();
    expect(screen.getByText(/Ollamaへの実依頼、Obsidian Vault保存、Daily追記は行いません/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ガイドを閉じる/ }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the local workflow and Obsidian environment settings', async () => {
    const user = userEvent.setup();
    render(<InAppGuide runtimeMode="local-ai" />);
    expect(screen.getByText(/Ollamaで5名のAI社員へ依頼/)).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /ガイドを開く/ });
    toggle.focus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('カテゴリを選ぶ')).toBeInTheDocument();
    expect(screen.getByText('レンに依頼')).toBeInTheDocument();
    expect(screen.getByText('担当社員に実行')).toBeInTheDocument();
    expect(screen.getByText(/OBSIDIAN_VAULT_DIR/)).toBeInTheDocument();
    expect(screen.getByText(/OBSIDIAN_DAILY_NOTES_ENABLED=true/)).toBeInTheDocument();
  });
});
