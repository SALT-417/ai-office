import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AUTOMATED_TEST_COUNT } from '../data/architecture';
import { ArchitectureShowcase } from './ArchitectureShowcase';

describe('ArchitectureShowcase', () => {
  it('実装済みの公開・ローカル経路、技術、安全設計、品質を表示する', () => {
    render(<ArchitectureShowcase />);
    const section = screen.getByRole('region', { name: 'AI OFFICEの仕組み' });
    expect(within(section).getByText('PUBLIC DEMO ROUTE')).toBeInTheDocument();
    expect(within(section).getByText('API・Ollama・Vaultへ通信しません。')).toBeInTheDocument();
    expect(within(section).getByText('LOCAL AI ROUTE')).toBeInTheDocument();
    expect(within(section).getByText('Express APIと役割判定')).toBeInTheDocument();
    expect(within(section).getByText('Ollama qwen2.5:3b')).toBeInTheDocument();
    expect(within(section).getByText(/React 19 · TypeScript · Vite 7/)).toBeInTheDocument();
    expect(within(section).getByText(/Vitest · React Testing Library · ESLint · Typecheck/)).toBeInTheDocument();
    expect(within(section).getByText('公開デモではAPI・Ollama・Vaultへの通信を遮断')).toBeInTheDocument();
    expect(within(section).getByText(String(AUTOMATED_TEST_COUNT))).toBeInTheDocument();
    for (const name of ['レン', 'ミオ', 'ソウ', 'ユナ', 'アキ']) expect(within(section).getByText(name)).toBeInTheDocument();
  });
});
