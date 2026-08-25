import type { AnalysisResponse } from '../types/analysis';
import type { ManagerApiResponse } from '../types/manager';
import type { SpecialistEmployeeId, WorkResponse, WorkResult } from '../types/work';
import { employeeById } from './employees';

export const PUBLIC_DEMO_NOTICE = 'この結果は公開デモ用に用意した固定例で、現在AIが生成したものではありません。';

export const publicDemoTask = 'AIエンジニア転職用ポートフォリオとして、AI OFFICEの実働機能を改善してください';

export const publicDemoPlan: ManagerApiResponse = {
  manager: 'レン',
  reply: PUBLIC_DEMO_NOTICE,
  plan: {
    summary: 'AI OFFICEを転職用ポートフォリオとして伝わりやすくし、ローカルAIの実働設計・安全性・品質を役割別に整理する固定サンプル計画です。',
    assignments: [
      { name: 'レン', task: '全体計画と優先順位を整理します。' },
      { name: 'ミオ', task: '採用担当者へ伝える経験・スキルを整理します。' },
      { name: 'ソウ', task: 'React・TypeScript・Express・Ollama構成の技術説明を作ります。' },
      { name: 'ユナ', task: 'UI/UXとポートフォリオ上の見せ方を整えます。' },
      { name: 'アキ', task: 'テスト・品質・アクセシビリティの確認観点を整理します。' },
    ],
    firstActions: [
      'ローカル実働版とGitHub Pagesの固定サンプル版の違いを明示する',
      '構造化出力、失敗分離、読み取り専用分析、人による承認の設計意図を短く説明する',
      'VitestとReact Testing Libraryで主要操作と安全な失敗処理を確認する',
    ],
  },
};

function sampleWorkResult(employeeId: SpecialistEmployeeId, title: string, content: string): WorkResult {
  const employee = employeeById[employeeId];
  return { employeeId, name: employee.name, role: employee.role, status: 'completed', title, content };
}

export const publicDemoWork: WorkResponse = {
  coordinator: 'レン',
  task: publicDemoTask,
  results: [
    sampleWorkResult('mio', '採用担当者へ伝える経験の整理例', '## 伝えるポイント\n・ローカルLLMを役割分担型ワークフローへ組み込んだ設計\n・AIの提案を人が承認するまで自動実行しない安全設計\n・公開版とローカル実働版を明確に分ける判断'),
    sampleWorkResult('sou', '現在の技術構成の説明例', '## 現在の構成\nReact 19・TypeScript・Vite 7の画面から、ローカルExpressの /api/manager と /api/work を利用します。AIはOllama qwen2.5:3bで、外部AI APIとデータベースは使いません。\n## 設計\nGitHub Pagesは静的デモ、ローカル版はViteからExpressへ /api をプロキシします。'),
    sampleWorkResult('yuna', 'ポートフォリオ表現の改善例', '## 見せ方\n実行モードと固定サンプルを常に文字で示し、実際のAI結果との誤認を防ぎます。\n## 文章例\n「安全に失敗できる設計と、人が判断を保持するワークフローを実装しています。」'),
    sampleWorkResult('aki', '品質確認の観点例', '## 確認対象\nVitest・React Testing LibraryでAPIエラー、タイムアウト、キャンセル、StrictMode、キーボード操作を確認します。localStorageの履歴と承認状態も境界値を検証します。\n## 安全性\n読み取り専用分析ではパス、秘密情報、プロンプトインジェクションをサーバーで検証します。'),
  ],
};

export const publicDemoAnalysis: AnalysisResponse = {
  specialist: 'aki', specialistName: 'アキ', objective: '分析APIの入力検証、キャンセル、エラー処理の安全設計を説明する固定サンプル',
  analyzedFiles: ['server/project-analysis.ts', 'server/project-analysis.test.ts', 'src/components/ProjectAnalysisSection.tsx'], redacted: false,
  summary: '実装済みの保護策と、人が追加で確認する観点を3ファイルの役割別に示す固定サンプルです。不具合を確認済みと断定するものではありません。',
  findings: [
    { title: '分析APIの入力・パス・中断処理', severity: 'high', evidence: [{ path: 'server/project-analysis.ts', description: '入力型、1〜8件、20KB/60KB制限、path・symlink、timeout・AbortController、エラー秘匿、秘密値伏字の実装を確認する対象です。' }], recommendation: '各制限が読み取り直前にも再検証され、選択外evidenceと範囲外lineを採用しないことを人が確認します。', completionCriteria: ['不正pathとsymlink脱出が拒否され、キャンセル時に処理が中断される期待結果が定義されている'], verification: ['許可・拒否入力を使ったVitestで、ステータスと安全な日本語エラーを確認する'] },
    { title: '境界値と構造化応答のテスト観点', severity: 'medium', evidence: [{ path: 'server/project-analysis.test.ts', description: '件数・サイズ境界、中断・タイムアウト、選択外evidence、行番号範囲、JSON構造・内容品質ゲートを確認するテスト対象です。' }], recommendation: '再試行が最大1回で止まり、低品質時は具体的な安全フォールバックになるケースを確認候補にします。', completionCriteria: ['境界値、拒否ケース、再試行回数の期待結果を自動テストで判定できる'], verification: ['Vitestで正常・拒否・中断・タイムアウトの各ケースを個別に実行する'] },
    { title: '画面の送信防止・通知・操作性', severity: 'medium', evidence: [{ path: 'src/components/ProjectAnalysisSection.tsx', description: '未選択、上限超過、確認前送信、二重送信、キャンセル、日本語エラー通知、キーボード操作を確認するUI対象です。' }], recommendation: 'ボタン状態とARIA通知を色だけに頼らず表示し、StrictModeでも通信と履歴保存が重複しないことを確認します。', completionCriteria: ['無効条件、キャンセル、エラー、キーボード操作を利用者が判別できる'], verification: ['React Testing Libraryで操作し、API呼び出し回数と表示される日本語通知を確認する'] },
  ],
};
