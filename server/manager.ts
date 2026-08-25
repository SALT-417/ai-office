import type { ServerConfig } from './config';
import { CATEGORY_EMPLOYEE_ROLES, normalizeWorkCategory, workCategoryById, type WorkCategory } from '../shared/workCategories';

export const MAX_TASK_LENGTH = 2_000;

export const MANAGER_SYSTEM_PROMPT = `あなたは「レン」。AI OFFICEのマネージャーです。次の指示を必ず守ってください。

【固定情報】
- AI OFFICEというアプリ自体はAIエンジニア転職用のポートフォリオ作品。入力される仕事は選択カテゴリに従う。
- 転職以外の依頼を求人、応募、ポートフォリオ改善へ置き換えない。
- 選択カテゴリ以外の業界、用途、外部サービスを勝手に追加しない。

【回答ルール】
- コード側で指定された担当者と役割だけを使う。担当者の追加や役割変更をしない。
- 依頼の目的と条件を保ち、別の内容へ置き換えない。
- 自分をQwen、Ollama、AIモデル、言語モデル、アシスタントと名乗らない。
- 自然で簡潔な日本語を使い、難しい漢字、不自然な造語、誤字を避ける。
- JSON以外を出力しない。
- JSON形式は{"summary":"依頼の理解","assignments":[{"name":"担当者名","task":"担当内容"}],"firstActions":["具体的作業1","具体的作業2"]}。
- firstActionsは、すぐ始められる具体的な作業を2〜4件にする。`;

export const EMPLOYEE_ROLES = {
  レン: '全体計画、優先順位、進捗管理',
  ミオ: 'キャリア設計、求人・企業分析、応募資料',
  ソウ: 'AI・Web開発、技術実装',
  ユナ: 'UI/UX、文章、ポートフォリオ表現',
  アキ: 'テスト、品質、アクセシビリティ',
} as const;

export const EMPLOYEE_IDS = {
  レン: 'ren',
  ミオ: 'mio',
  ソウ: 'sou',
  ユナ: 'yuna',
  アキ: 'aki',
} as const;

export type EmployeeName = keyof typeof EMPLOYEE_ROLES;

export interface ManagerPlan {
  summary: string;
  assignments: Array<{ name: EmployeeName; task: string }>;
  firstActions: string[];
}

export interface ManagerReply {
  category: WorkCategory;
  reply: string;
  plan: ManagerPlan;
}

const employeeOrder = Object.keys(EMPLOYEE_ROLES) as EmployeeName[];
const keywordRules: Array<{ name: EmployeeName; keywords: string[] }> = [
  { name: 'ミオ', keywords: ['キャリア', '転職', '求人', '応募', '企業分析'] },
  { name: 'ソウ', keywords: ['開発', '実装', 'api', 'ai', 'web', 'コード'] },
  { name: 'ユナ', keywords: ['ui', 'ux', 'デザイン', '文章', '見せ方', 'ポートフォリオ'] },
  { name: 'アキ', keywords: ['テスト', '品質', '不具合', '確認', 'アクセシビリティ'] },
  { name: 'レン', keywords: ['計画', '整理', '優先順位', '進捗'] },
];

const unsafePhrases = ['求人掲載', '求人情報サービス', '広告担当', '広告を掲載', '求人を収集', '求人情報を集め', 'スクレイピング'];

const categoryDefaults: Record<WorkCategory, EmployeeName> = { general: 'レン', learning: 'ソウ', development: 'ソウ', career: 'ミオ', content: 'ユナ' };

export function selectAssignees(task: string, category: WorkCategory = 'general'): EmployeeName[] {
  const normalized = task.toLowerCase();
  const selected = new Set<EmployeeName>();
  for (const rule of keywordRules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) selected.add(rule.name);
  }
  const categoryKeywords: Record<WorkCategory, Array<{ name: EmployeeName; keywords: string[] }>> = {
    general: [{ name: 'ミオ', keywords: ['情報', '調査', '利用者'] }, { name: 'ソウ', keywords: ['自動化', '手順', '技術'] }, { name: 'ユナ', keywords: ['資料', '伝え', '文章'] }, { name: 'アキ', keywords: ['リスク', '確認', '品質'] }],
    learning: [{ name: 'ミオ', keywords: ['目標', 'テーマ', 'キャリア'] }, { name: 'ソウ', keywords: ['学ぶ', '学習', 'react', '演習', '実装'] }, { name: 'ユナ', keywords: ['教材', '要約', 'ノート'] }, { name: 'アキ', keywords: ['理解', '復習', '問題', '達成'] }],
    development: [{ name: 'ミオ', keywords: ['利用者', '要件', '価値'] }, { name: 'ソウ', keywords: ['開発', '設計', '実装', 'api', 'コード'] }, { name: 'ユナ', keywords: ['ui', 'ux', '画面', '文言'] }, { name: 'アキ', keywords: ['テスト', '安全', '品質', 'アクセシビリティ'] }],
    career: [{ name: 'ミオ', keywords: ['転職', '求人', '企業', '応募', '面接'] }, { name: 'ソウ', keywords: ['技術', 'ポートフォリオ', '実装'] }, { name: 'ユナ', keywords: ['自己pr', '作品', '見せ方'] }, { name: 'アキ', keywords: ['誤記', '整合', '確認'] }],
    content: [{ name: 'ミオ', keywords: ['視聴者', 'テーマ', '調査'] }, { name: 'ソウ', keywords: ['制作', '効率', '手順'] }, { name: 'ユナ', keywords: ['企画', '構成', '投稿', '表現', 'sns'] }, { name: 'アキ', keywords: ['事実', '安全', '投稿前', '確認'] }],
  };
  for (const rule of categoryKeywords[category]) if (rule.keywords.some((keyword) => normalized.includes(keyword))) selected.add(rule.name);
  if (normalized.includes('ai office') && normalized.includes('改善')) {
    selected.add('ユナ');
    selected.add('アキ');
    selected.add('レン');
  }
  const specialistCount = [...selected].filter((name) => name !== 'レン').length;
  if (selected.size === 0) selected.add(categoryDefaults[category]);
  if (specialistCount >= 2 || /計画|整理|優先順位|進捗|複数/.test(normalized)) selected.add('レン');
  return employeeOrder.filter((name) => selected.has(name));
}

function buildAssignments(names: EmployeeName[], category: WorkCategory): ManagerPlan['assignments'] {
  return names.map((name) => ({ name, task: CATEGORY_EMPLOYEE_ROLES[category][name] }));
}

function buildSummary(task: string, category: WorkCategory): string {
  const shortenedTask = task.length > 180 ? `${task.slice(0, 180)}…` : task;
  return `「${shortenedTask}」という依頼を、${workCategoryById[category].label}の仕事として目的を変えずに整理します。`;
}

function buildFallbackActions(names: EmployeeName[], category: WorkCategory): string[] {
  const actionsByEmployee = Object.fromEntries(employeeOrder.map((name) => [name, `${CATEGORY_EMPLOYEE_ROLES[category][name]}について、依頼文から確認対象と最初の行動を1つ決める。`])) as Record<EmployeeName, string>;
  if (names.length === employeeOrder.length) {
    return [
      actionsByEmployee.レン,
      actionsByEmployee.ミオ,
      `${actionsByEmployee.ソウ}あわせて、${actionsByEmployee.ユナ}`,
      actionsByEmployee.アキ,
    ];
  }
  const actions = names.map((name) => actionsByEmployee[name]).slice(0, 4);
  if (actions.length < 2) actions.push('最初の作業結果を確認し、次に進む条件を決める。');
  return actions;
}

function containsUnsafeContent(value: string): boolean {
  return unsafePhrases.some((phrase) => value.includes(phrase));
}

function parseModelPlan(content: string, selectedNames: EmployeeName[]): Pick<ManagerPlan, 'firstActions'> | null {
  try {
    const parsed = JSON.parse(content) as Partial<ManagerPlan>;
    if (typeof parsed.summary !== 'string' || parsed.summary.trim() === '' || containsUnsafeContent(parsed.summary)) return null;
    if (!Array.isArray(parsed.assignments) || parsed.assignments.length !== selectedNames.length) return null;
    const receivedNames = parsed.assignments.map((assignment) => assignment?.name);
    if (!selectedNames.every((name) => receivedNames.includes(name))) return null;
    if (parsed.assignments.some((assignment) => typeof assignment?.task !== 'string' || assignment.task.trim() === '' || containsUnsafeContent(assignment.task))) return null;
    if (!Array.isArray(parsed.firstActions) || parsed.firstActions.length < 2 || parsed.firstActions.length > 4) return null;
    if (parsed.firstActions.some((action) => typeof action !== 'string' || action.trim() === '' || action.length > 220 || containsUnsafeContent(action))) return null;
    if (parsed.firstActions.some((action) => employeeOrder.some((name) => !selectedNames.includes(name) && action.includes(name)))) return null;
    return { firstActions: parsed.firstActions.map((action) => action.trim()) };
  } catch {
    return null;
  }
}

function formatReply(plan: ManagerPlan): string {
  const assignments = plan.assignments.map(({ name, task }) => `- ${name}：${task}`).join('\n');
  const actions = plan.firstActions.map((action, index) => `${index + 1}. ${action}`).join('\n');
  return `依頼の理解\n${plan.summary}\n\n担当者と担当内容\n${assignments}\n\n最初に着手する具体的な作業\n${actions}`;
}

export type ManagerErrorCode = 'OLLAMA_UNAVAILABLE' | 'OLLAMA_TIMEOUT' | 'OLLAMA_INVALID_RESPONSE';

export class ManagerError extends Error {
  constructor(public readonly code: ManagerErrorCode, public readonly publicMessage: string) {
    super(publicMessage);
    this.name = 'ManagerError';
  }
}

interface OllamaResponse {
  message?: { content?: unknown };
}

export async function requestManagerReply(task: string, config: ServerConfig, fetchImplementation: typeof fetch = fetch, requestedCategory: WorkCategory = 'general'): Promise<ManagerReply> {
  const category = normalizeWorkCategory(requestedCategory);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const selectedNames = selectAssignees(task, category);

  try {
    const response = await fetchImplementation(config.ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.2,
          top_p: 0.9,
          num_predict: 400,
        },
        messages: [
          { role: 'system', content: `${MANAGER_SYSTEM_PROMPT}\n選択カテゴリ：${workCategoryById[category].label}\nカテゴリ別担当：${JSON.stringify(CATEGORY_EMPLOYEE_ROLES[category])}` },
          { role: 'user', content: JSON.stringify({
            task,
            category,
            allowedAssignments: buildAssignments(selectedNames, category),
          }) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ManagerError(
        'OLLAMA_UNAVAILABLE',
        response.status === 404
          ? `ローカルAIモデル「${config.ollamaModel}」が見つかりません。Ollamaでモデルを取得してください。`
          : 'ローカルAIから正常な応答を受け取れませんでした。Ollamaの状態を確認してください。',
      );
    }

    const data = await response.json() as OllamaResponse;
    const content = data.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new ManagerError('OLLAMA_INVALID_RESPONSE', 'ローカルAIの応答形式が正しくありません。時間をおいて再度お試しください。');
    }
    const modelPlan = parseModelPlan(content.trim(), selectedNames);
    const plan: ManagerPlan = {
      summary: buildSummary(task, category),
      assignments: buildAssignments(selectedNames, category),
      firstActions: modelPlan?.firstActions ?? buildFallbackActions(selectedNames, category),
    };
    return { category, plan, reply: formatReply(plan) };
  } catch (error) {
    if (error instanceof ManagerError) throw error;
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new ManagerError('OLLAMA_TIMEOUT', 'レンからの返答がタイムアウトしました。Ollamaの処理状況を確認して再度お試しください。');
    }
    throw new ManagerError('OLLAMA_UNAVAILABLE', 'ローカルAIに接続できません。Ollamaが起動しているか確認してください。');
  } finally {
    clearTimeout(timeout);
  }
}
