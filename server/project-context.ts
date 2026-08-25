export const AI_OFFICE_PROJECT_CONTEXT = {
  frontend: 'React 19、TypeScript、Vite 7',
  localApi: 'Node.js、Express、TypeScript',
  localAi: 'Ollama、qwen2.5:3b',
  apiEndpoints: 'POST /api/manager、POST /api/work',
  tests: 'Vitest、React Testing Library',
  qualityChecks: 'TypeScript型チェック、ESLint、Vitest、本番ビルド',
  stateStorage: 'localStorage',
  publishedVersion: 'GitHub Pagesの静的デモ',
  localVersion: 'ViteからExpressへ/apiをプロキシ',
  database: '使用していない',
  externalAiApi: '使用していない',
  backendScope: 'ローカル専用',
  employeeSafety: 'ファイル変更、コマンド実行、Git操作、外部送信を行わない',
} as const;

export const AI_OFFICE_PROJECT_CONTEXT_TEXT = `【AI OFFICEの確定済みプロジェクトコンテキスト】
- フロントエンド：${AI_OFFICE_PROJECT_CONTEXT.frontend}
- ローカルAPI：${AI_OFFICE_PROJECT_CONTEXT.localApi}
- ローカルAI：${AI_OFFICE_PROJECT_CONTEXT.localAi}
- API：${AI_OFFICE_PROJECT_CONTEXT.apiEndpoints}
- テスト：${AI_OFFICE_PROJECT_CONTEXT.tests}
- 品質確認：${AI_OFFICE_PROJECT_CONTEXT.qualityChecks}
- 状態保存：${AI_OFFICE_PROJECT_CONTEXT.stateStorage}
- 公開版：${AI_OFFICE_PROJECT_CONTEXT.publishedVersion}
- ローカル版：${AI_OFFICE_PROJECT_CONTEXT.localVersion}
- データベース：${AI_OFFICE_PROJECT_CONTEXT.database}
- 外部AI API：${AI_OFFICE_PROJECT_CONTEXT.externalAiApi}
- バックエンド：${AI_OFFICE_PROJECT_CONTEXT.backendScope}
- AI社員：${AI_OFFICE_PROJECT_CONTEXT.employeeSafety}`;
