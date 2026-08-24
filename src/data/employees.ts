import type { Employee, EmployeeId } from '../types/office';
import renImage from '../../assets/ren.webp';
import mioImage from '../../assets/mio.webp';
import souImage from '../../assets/sou.webp';
import yunaImage from '../../assets/yuna.webp';
import akiImage from '../../assets/aki.webp';

export const employees: Employee[] = [
  { id: 'ren', name: 'レン', role: 'マネージャー', shortRole: 'Manager', image: renImage, responsibility: '全体計画・進捗管理', task: '成果物の優先順位とマイルストーンを整理', initialProgress: 45, dialogueByMode: { work: '今日の優先順位を整理し、全体の進み方を確認しています。', walk: '各担当の状況を聞きに、フロアを回っています。', break: '少し視点を変えて、次の一手を考えましょう。', meeting: '5名の成果をひとつのストーリーにまとめます。', night: '明日の判断が速くなるよう、進捗を整理しておきます。' } },
  { id: 'mio', name: 'ミオ', role: 'キャリア担当', shortRole: 'Career', image: mioImage, responsibility: '求人分析・面接対策', task: '採用担当者に伝わる成果物の条件を分析', initialProgress: 40, dialogueByMode: { work: '求人票から、評価される経験と伝え方を分析しています。', walk: '制作内容と採用ニーズが合っているか確認に向かいます。', break: '面接で自然に話せる言葉へ整えておきますね。', meeting: '採用担当者の視点から、見せ方を提案します。', night: '応募先ごとのアピールポイントを静かに見直しています。' } },
  { id: 'sou', name: 'ソウ', role: 'AI開発担当', shortRole: 'AI Dev', image: souImage, responsibility: 'TypeScript・AI機能開発', task: '状態管理とインタラクションを実装', initialProgress: 30, dialogueByMode: { work: '型安全なデータ構造と画面の動きを実装しています。', walk: '動作確認のため、別の端末へ移動中です。', break: '一度コードから離れると、良い設計が見えることがあります。', meeting: '実装上の判断とトレードオフを共有します。', night: '集中できる時間に、細かな挙動を仕上げています。' } },
  { id: 'yuna', name: 'ユナ', role: '制作担当', shortRole: 'Creative', image: yunaImage, responsibility: 'UI・ポートフォリオ制作', task: '画面構成と視覚表現をブラッシュアップ', initialProgress: 35, dialogueByMode: { work: '情報が一目で伝わる画面へ整えています。', walk: '実際の見え方を確かめながら、配置を調整します。', break: 'ラウンジで新しい配色のアイデアをスケッチ中です。', meeting: 'デザインの意図を、実装と採用の視点につなげます。', night: '夜の雰囲気でも読みやすいコントラストを確認します。' } },
  { id: 'aki', name: 'アキ', role: '品質管理担当', shortRole: 'Quality', image: akiImage, responsibility: '動作・内容確認', task: 'テスト観点とアクセシビリティを確認', initialProgress: 25, dialogueByMode: { work: '操作、表示、文章の品質を順番に確認しています。', walk: 'モバイル表示の確認端末を取りに行きます。', break: '休憩も品質維持の一部。戻ったら境界値を確認します。', meeting: '見落としやすいリスクと完成条件を共有します。', night: '照明が変わっても文字が読めるか確認しています。' } },
];

export const employeeById = Object.fromEntries(employees.map((employee) => [employee.id, employee])) as Record<EmployeeId, Employee>;
export const initialEmployeeProgress = Object.fromEntries(employees.map((employee) => [employee.id, employee.initialProgress])) as Record<EmployeeId, number>;
