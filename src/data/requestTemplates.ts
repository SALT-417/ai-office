import type { WorkCategory } from '../../shared/workCategories';
import type { RequestTemplate } from '../types/requestTemplate';

export const requestTemplates = [
  { id: 'general-priority', category: 'general', title: '今日の優先順位', description: '複数の仕事を整理し、着手順と確認点を決めます。', prompt: '今日対応したい複数のタスクを、重要度と期限で整理してください。担当者ごとの最初の作業と、完了を確認する基準も示してください。' },
  { id: 'general-meeting', category: 'general', title: '会議の準備', description: '目的、論点、資料、確認事項を分担します。', prompt: '次回の会議に向けて、目的、話し合う論点、必要な資料、事前の確認事項を整理してください。各担当者が準備する内容も示してください。' },
  { id: 'general-process', category: 'general', title: '作業手順の改善', description: '日常業務の手順とリスクを見直します。', prompt: '繰り返し行う作業を効率化するため、現在の手順を整理し、自動化候補、分かりやすい説明、確認すべきリスクを含む改善案を作ってください。' },

  { id: 'learning-seven-days', category: 'learning', title: '7日間の学習計画', description: '目標、演習、復習、達成条件を組み立てます。', prompt: '7日間でReactの基礎を学ぶ計画を作ってください。毎日の学習テーマ、短い演習、復習方法、最終日の達成条件を含めてください。' },
  { id: 'learning-generative-ai', category: 'learning', title: '生成AIの基礎学習', description: '安全な使い方まで含む学習内容を整理します。', prompt: '生成AIの基本的な仕組みと安全な使い方を学ぶ計画を作ってください。技術解説、実践課題、学習ノートのまとめ方、理解度の確認方法を含めてください。' },
  { id: 'learning-review', category: 'learning', title: '理解度チェック', description: '学んだ内容の弱点と次の演習を見つけます。', prompt: 'これまで学んだTypeScriptの理解度を確認するため、重要テーマ、復習問題、実装演習、期待する回答、次に学ぶ内容を整理してください。' },

  { id: 'development-api', category: 'development', title: 'APIの安全性改善', description: '入力検証、失敗処理、テストを具体化します。', prompt: 'AI OFFICEのAPI入力検証とエラー処理を改善する次の作業を整理してください。対象機能、実装方針、UIへの通知、テスト方法、完了条件を含めてください。' },
  { id: 'development-ui', category: 'development', title: '画面機能の追加', description: '要件からUIとテストまで役割分担します。', prompt: 'ReactとTypeScriptの既存画面へ新しい操作機能を追加する計画を作ってください。利用者の目的、状態管理、UI/UX、アクセシビリティ、テストを担当別に整理してください。' },
  { id: 'development-quality', category: 'development', title: '不具合の調査計画', description: '再現、原因調査、修正、回帰確認を整理します。', prompt: '画面の処理中状態が解除されない不具合を調査する計画を作ってください。再現条件、確認するコード、修正方針、失敗時の表示、回帰テストを含めてください。' },

  { id: 'career-application', category: 'career', title: '応募準備の整理', description: '企業分析から応募資料まで計画します。', prompt: 'AIエンジニアへの応募に向けて、企業分析、必要スキルの確認、応募資料、ポートフォリオ説明、提出前の品質確認を整理してください。' },
  { id: 'career-portfolio', category: 'career', title: '作品説明の改善', description: '技術経験と設計判断を伝わる形にします。', prompt: '採用担当者へAI OFFICEの価値が伝わるように、技術構成、工夫した点、安全設計、担当した作業、確認すべき表現を整理してください。' },
  { id: 'career-interview', category: 'career', title: '面接準備', description: '想定質問、回答要点、確認項目を作ります。', prompt: 'AIエンジニア面接の準備として、想定質問、経験を説明する回答要点、技術デモの見せ方、逆質問、誤解を防ぐ確認項目を整理してください。' },

  { id: 'content-weekly-plan', category: 'content', title: '1週間の投稿企画', description: '対象視聴者から投稿前確認まで設計します。', prompt: 'AIイラストを紹介する1週間のSNS投稿企画を作ってください。対象視聴者、各日のテーマ、制作手順、投稿文の方向性、投稿前の確認項目を含めてください。' },
  { id: 'content-article', category: 'content', title: '解説記事の構成', description: '読者に合わせた構成と文案を作ります。', prompt: '生成AIを初めて使う人向けの解説記事を企画してください。読者像、見出し構成、具体例、分かりやすい導入文、事実確認と安全上の注意を含めてください。' },
  { id: 'content-review', category: 'content', title: '投稿前レビュー', description: '表現、事実、安全性を役割別に確認します。', prompt: '公開予定のSNS投稿を見直すため、伝えたい目的、文章と見せ方、制作手順、事実関係、誤解や安全上のリスクを確認するチェックリストを作ってください。' },
] as const satisfies readonly RequestTemplate[];

export const requestTemplatesByCategory: Record<WorkCategory, readonly RequestTemplate[]> = {
  general: requestTemplates.filter((template) => template.category === 'general'),
  learning: requestTemplates.filter((template) => template.category === 'learning'),
  development: requestTemplates.filter((template) => template.category === 'development'),
  career: requestTemplates.filter((template) => template.category === 'career'),
  content: requestTemplates.filter((template) => template.category === 'content'),
};
