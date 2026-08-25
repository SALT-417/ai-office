import type { ServerConfig } from './config';
import { EMPLOYEE_IDS, EMPLOYEE_ROLES, selectAssignees, type EmployeeName } from './manager';
import { AI_OFFICE_PROJECT_CONTEXT_TEXT } from './project-context';

export type SpecialistName = Exclude<EmployeeName, 'レン'>;
export type WorkStatus = 'completed' | 'failed';

export interface WorkResult {
  employeeId: (typeof EMPLOYEE_IDS)[SpecialistName];
  name: SpecialistName;
  role: string;
  status: WorkStatus;
  title: string;
  content: string;
  error?: string;
}

export interface WorkResponse {
  coordinator: 'レン';
  task: string;
  results: WorkResult[];
}

const prompts: Record<SpecialistName, string> = {
  ミオ: '転職・キャリア・求人分析・応募資料について、比較表や確認項目など実用的な成果物を作る。',
  ソウ: 'AI・Web開発について、一般的な技術一覧ではなく依頼に直結する成果物を作る。本文には「現在の構成」「次に実装する作業」「対象となる既存ファイルまたは機能」「完了条件」「テスト方法」の見出しを必ず入れる。対象を断定できなければ「確認が必要」と書く。',
  ユナ: 'UI/UX・文章・ポートフォリオ表現について、改善案と具体的な文案を作る。',
  アキ: 'テスト・品質・アクセシビリティについて、確認項目、期待結果、リスクを作る。',
};

const commonPrompt = `あなたはAI OFFICEの専門社員です。次を必ず守ってください。
- 指定された名前と固定役割を変えない。
- 自分をQwen、Ollama、言語モデルと名乗らない。
- AI OFFICEは求人掲載サービスではなく、React・TypeScript・Vite製の転職用ポートフォリオアプリ。
- 下記の確定情報を現在の事実として扱い、依頼されていない技術を追加しない。
- 未採用技術を現在使用中のように書かない。
- 変更提案をする場合は「現在の構成」と「提案」を明確に分ける。
- 一般的な技術一覧ではなく、依頼に対する具体的な成果物を作る。
- 依頼されていない事実や実行結果を作らない。
- 未確認のファイルや画面を「確認済み」と書かない。
- ファイル変更、コマンド実行、Git操作、外部送信を行わず、「実行した」と書かない。
- 日本語で簡潔に、次の行動に使える具体的なテキスト成果物を返す。
- JSON以外を出力しない。形式は {"title":"成果物名","content":"本文"}。

${AI_OFFICE_PROJECT_CONTEXT_TEXT}`;

export function selectWorkAssignees(task: string): SpecialistName[] {
  const selected = selectAssignees(task).filter((name): name is SpecialistName => name !== 'レン');
  return (selected.length > 0 ? selected : (['ソウ'] satisfies SpecialistName[])).slice(0, 4);
}

function failedResult(name: SpecialistName, error: string): WorkResult {
  return { employeeId: EMPLOYEE_IDS[name], name, role: EMPLOYEE_ROLES[name], status: 'failed', title: `${name}の成果物`, content: '', error };
}

const unsupportedTechnologies = ['mongodb', 'jest', 'enzyme', 'firebase', 'supabase', '外部ai api'];
const futureMarkers = ['将来', '提案', '候補', '検討', '導入する場合', '未採用'];
const negativeMarkers = ['使用していない', '利用していない', '採用していない', '使っていない', '未使用'];
const souRequiredSections = ['現在の構成', '次に実装する作業', '対象となる既存ファイルまたは機能', '完了条件', 'テスト方法'];
const souCurrentContextTerms = ['react 19', 'typescript', 'vite 7', 'express', 'ollama', '/api/manager', '/api/work', 'vitest'];

function getSection(content: string, heading: string): string {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => line.trim().replace(/^#{1,3}\s*/, '').toLowerCase().startsWith(heading.toLowerCase()));
  if (start < 0) return '';
  const end = lines.findIndex((line, index) => index > start && souRequiredSections.some((section) => section !== heading && line.trim().replace(/^#{1,3}\s*/, '').startsWith(section)));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').toLowerCase();
}

function containsUnsupportedCurrentClaim(content: string): boolean {
  let inCurrentSection = false;
  for (const originalLine of content.split('\n')) {
    const line = originalLine.trim().toLowerCase();
    if (/^#{0,3}\s*現在の構成/.test(line)) inCurrentSection = true;
    else if (souRequiredSections.slice(1).some((section) => line.replace(/^#{1,3}\s*/, '').startsWith(section)) || /^#{1,3}\s*提案/.test(line)) inCurrentSection = false;
    const hasUnsupportedTechnology = unsupportedTechnologies.some((technology) => line.includes(technology));
    const isNegative = negativeMarkers.some((marker) => line.includes(marker));
    const isClearlyFuture = futureMarkers.some((marker) => line.includes(marker));
    if (hasUnsupportedTechnology && !isNegative && (inCurrentSection || !isClearlyFuture)) return true;
    const treatsViteAsDataStore = line.includes('vite') && /(データ同期|データベース).*(基盤|サーバー)|(基盤|サーバー).*(データ同期|データベース)/.test(line);
    if (treatsViteAsDataStore && !isClearlyFuture) return true;
  }
  return false;
}

function buildFallbackProduct(name: SpecialistName): { title: string; content: string } {
  const products: Record<SpecialistName, { title: string; content: string }> = {
    ミオ: { title: '転職向け成果整理シート', content: '## 現在の前提\nAI OFFICEはReact 19、TypeScript、Vite 7とローカルOllamaを使う転職用ポートフォリオです。\n## 次の作業\n- 応募先で求められる経験を整理する\n- 既存機能のどれを根拠として説明するか対応付ける\n- 未確認の求人条件は確認が必要として分ける' },
    ソウ: { title: '既存構成に沿った技術実装計画', content: `## 現在の構成
- フロントエンド：React 19、TypeScript、Vite 7
- ローカルAPI：Node.js、Express、TypeScript
- ローカルAI：Ollama、qwen2.5:3b
- API：POST /api/manager、POST /api/work
- テスト：Vitest、React Testing Library
- 状態保存：localStorage
- データベースと外部AI APIは使用していない

## 次に実装する作業
- 依頼に必要な変更範囲を既存APIと画面状態から整理する
- 入力、成功、一部失敗、タイムアウトの完了条件を先に決める
- 最小の変更単位で実装案とテスト観点を対応付ける

## 対象となる既存ファイルまたは機能
- POST /api/managerとPOST /api/work
- server/work.tsの成果物生成と検証
- src/hooks/useWorkRequest.tsの通信状態
- src/components/WorkResults.tsxの安全な表示

## 完了条件
- 現在の構成にない技術を使用中として表示しない
- 成功、一部失敗、キャンセル、StrictModeで状態が完了する
- 内部エラーやHTMLを安全でない形で表示しない

## テスト方法
- TypeScript型チェック、ESLint、Vitest、本番ビルドを実行する
- VitestとReact Testing LibraryでAPI応答と画面状態を確認する` },
    ユナ: { title: 'ポートフォリオ表現の改善案', content: '## 改善案\n- ローカルAIで計画から成果物まで進む流れを短く説明する\n- GitHub Pages版は静的デモ、ローカル版はOllama連携と明記する\n## 具体的な文案\n「5名のAI社員が役割分担し、ローカル環境で計画とテキスト成果物を生成します。」' },
    アキ: { title: '品質確認チェックリスト', content: '## 確認項目\n- VitestとReact Testing Libraryの既存テストが通る\n- TypeScript型チェック、ESLint、本番ビルドが通る\n- 未実施の確認を確認済みと表示しない\n## 期待結果\n現在の構成と生成結果が矛盾しない。\n## リスク\n小型モデルの応答揺れはサーバー検証とフォールバックで抑える。' },
  };
  return products[name];
}

function parseProduct(value: unknown, name: SpecialistName): { title: string; content: string } | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as { title?: unknown; content?: unknown };
    if (typeof parsed.title !== 'string' || typeof parsed.content !== 'string') return null;
    const title = parsed.title.trim();
    const content = parsed.content.trim();
    if (!title || !content || title.length > 120 || content.length > 8_000) return null;
    if (/確認済み|動作確認しました|テスト済み/.test(content)) return null;
    if (containsUnsupportedCurrentClaim(content)) return null;
    if (name === 'ソウ') {
      if (!souRequiredSections.every((section) => content.includes(section))) return null;
      const currentSection = getSection(content, '現在の構成');
      if (!souCurrentContextTerms.every((term) => currentSection.includes(term))) return null;
    }
    return { title, content };
  } catch {
    return null;
  }
}

async function runSpecialist(name: SpecialistName, task: string, config: ServerConfig, signal: AbortSignal, fetchImplementation: typeof fetch): Promise<WorkResult> {
  const employeeController = new AbortController();
  const employeeTimeout = setTimeout(() => employeeController.abort(), config.timeoutMs);
  const combinedSignal = AbortSignal.any([signal, employeeController.signal]);
  try {
    const response = await fetchImplementation(config.ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: false,
        format: 'json',
        options: { temperature: 0.25, top_p: 0.9, num_predict: 900 },
        messages: [
          { role: 'system', content: `${commonPrompt}\n名前：${name}\n固定役割：${EMPLOYEE_ROLES[name]}\n専門指示：${prompts[name]}` },
          { role: 'user', content: JSON.stringify({ task, output: 'テキスト成果物のみ。操作は実行しない。' }) },
        ],
      }),
      signal: combinedSignal,
    });
    if (!response.ok) return failedResult(name, 'ローカルAIから成果物を受け取れませんでした。');
    const body = await response.json() as { message?: { content?: unknown } };
    const product = parseProduct(body.message?.content, name) ?? buildFallbackProduct(name);
    return { employeeId: EMPLOYEE_IDS[name], name, role: EMPLOYEE_ROLES[name], status: 'completed', ...product };
  } catch (error) {
    const message = combinedSignal.aborted || (error instanceof Error && error.name === 'AbortError')
      ? '作業時間を超えたため、この担当を中止しました。'
      : 'ローカルAIに接続できず、この担当を完了できませんでした。';
    return failedResult(name, message);
  } finally {
    clearTimeout(employeeTimeout);
  }
}

export async function requestWork(task: string, config: ServerConfig, fetchImplementation: typeof fetch = fetch, externalSignal?: AbortSignal): Promise<WorkResponse> {
  const names = selectWorkAssignees(task);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.workTimeoutMs);
  const signal = externalSignal ? AbortSignal.any([controller.signal, externalSignal]) : controller.signal;
  const results: WorkResult[] = [];
  try {
    // Ollamaを逐次利用し、低スペックPCでも同時推論が重ならないようにする。
    for (const name of names) {
      if (signal.aborted) {
        results.push(failedResult(name, '作業全体の制限時間を超えたため、この担当を開始できませんでした。'));
      } else {
        results.push(await runSpecialist(name, task, config, signal, fetchImplementation));
      }
    }
    return { coordinator: 'レン', task, results };
  } finally {
    clearTimeout(timeout);
  }
}
