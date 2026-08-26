export const AUTOMATED_TEST_COUNT = 248;

export const architectureTechGroups = [
  { label: 'Frontend', items: ['React 19', 'TypeScript', 'Vite 7'] },
  { label: 'Local API', items: ['Node.js', 'Express', 'TypeScript'] },
  { label: 'Local AI', items: ['Ollama', 'qwen2.5:3b', 'Structured Output'] },
  { label: 'Quality', items: ['Vitest', 'React Testing Library', 'ESLint', 'Typecheck'] },
  { label: 'Integration', items: ['localStorage', 'Obsidian Markdown', 'GitHub Pages'] },
] as const;

export const architectureSafetyItems = [
  '公開デモではAPI・Ollama・Vaultへの通信を遮断',
  'ローカルAPIで入力・出力・タイムアウトを検証',
  '許可ファイルだけを読み取るコード分析と秘密値の伏字',
  'AI出力は提案として保存し、人が確認・承認',
  'ファイル変更・コマンド・Git・外部送信を自動実行しない',
] as const;
