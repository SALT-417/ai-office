export type WorkCategory = 'general' | 'learning' | 'development' | 'career' | 'content';

export const WORK_CATEGORIES = [
  { id: 'general', label: '一般業務', description: '目的を整理し、日常の仕事を役割分担します。', example: '複数のタスクを整理し、今日の優先順位を決めてください' },
  { id: 'learning', label: 'AI学習', description: '学習目標から演習と達成条件まで組み立てます。', example: '7日間でReactの基礎を学ぶ計画を作ってください' },
  { id: 'development', label: 'ソフトウェア開発', description: '要件、実装、UI、テストを分担します。', example: 'APIの入力検証とエラー処理を改善してください' },
  { id: 'career', label: '転職・キャリア', description: '応募準備、企業分析、作品説明を支援します。', example: 'AIエンジニア応募に向けた準備を整理してください' },
  { id: 'content', label: 'コンテンツ・SNS', description: '企画、対象視聴者、制作、投稿前確認を分担します。', example: 'AIイラスト投稿の1週間企画を作ってください' },
] as const satisfies ReadonlyArray<{ id: WorkCategory; label: string; description: string; example: string }>;

export const WORK_CATEGORY_IDS = WORK_CATEGORIES.map((category) => category.id);
export const workCategoryById = Object.fromEntries(WORK_CATEGORIES.map((category) => [category.id, category])) as Record<WorkCategory, (typeof WORK_CATEGORIES)[number]>;

export const OBSIDIAN_CATEGORY_FOLDER_BY_ID: Record<WorkCategory, string> = {
  general: '一般業務',
  learning: 'AI学習',
  development: '開発',
  career: '転職・キャリア',
  content: 'コンテンツ',
};

export function isWorkCategory(value: unknown): value is WorkCategory {
  return typeof value === 'string' && WORK_CATEGORY_IDS.includes(value as WorkCategory);
}

export function normalizeWorkCategory(value: unknown): WorkCategory {
  return isWorkCategory(value) ? value : 'general';
}

export const CATEGORY_EMPLOYEE_ROLES = {
  general: { レン: '目的整理、優先順位、進行計画', ミオ: '利用者視点、情報整理、調査観点', ソウ: '技術、自動化、手順', ユナ: '文章、資料、伝え方', アキ: '確認項目、リスク、品質' },
  learning: { レン: '学習目標、期間、優先順位', ミオ: 'キャリア目標との接続、学習テーマ整理', ソウ: '技術解説、演習案、実装課題', ユナ: '分かりやすい教材化、要約、学習ノート', アキ: '理解度確認、復習問題、達成条件' },
  development: { レン: '要件、優先順位、マイルストーン', ミオ: '利用者、業務要件、価値の整理', ソウ: '設計、実装、API、コード', ユナ: 'UI/UX、画面文言、情報設計', アキ: 'テスト、安全性、アクセシビリティ' },
  career: { レン: '活動計画、優先順位、進捗', ミオ: '求人、企業分析、応募資料、面接', ソウ: '技術経験、ポートフォリオ実装', ユナ: '自己PR、作品説明、見せ方', アキ: '内容整合、誤記、品質確認' },
  content: { レン: '企画方針、投稿計画、優先順位', ミオ: '対象視聴者、テーマ調査、目的整理', ソウ: '制作支援、技術手順、効率化', ユナ: '企画、構成、投稿文、表現', アキ: '投稿前確認、事実関係、品質、安全性' },
} as const;

