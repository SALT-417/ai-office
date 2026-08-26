import { useState } from 'react';
import type { AppRuntimeMode } from '../utils/runtimeMode';

export function InAppGuide({ runtimeMode }: { runtimeMode: AppRuntimeMode }) {
  const [open, setOpen] = useState(false);
  const isPublic = runtimeMode === 'public-demo';
  return <section className="in-app-guide" aria-labelledby="in-app-guide-title">
    <div className="in-app-guide-heading">
      <div><p className="eyebrow">QUICK START</p><h2 id="in-app-guide-title">使い方ガイド</h2><p>{isPublic ? 'カテゴリと固定サンプルを操作し、実働版の設計を確認できます。' : 'カテゴリを選び、Ollamaで5名のAI社員へ依頼できます。'}</p></div>
      <button type="button" aria-expanded={open} aria-controls="in-app-guide-content" onClick={() => setOpen((current) => !current)}>{open ? 'ガイドを閉じる' : 'ガイドを開く'}<span aria-hidden="true">{open ? '−' : '＋'}</span></button>
    </div>
    {open && <div id="in-app-guide-content" className="in-app-guide-content">
      {isPublic ? <>
        <article><h3>公開版でできること</h3><p>5カテゴリの切替、固定サンプルと固定テンプレートの確認、自分用テンプレートのブラウザ内保存を試せます。</p></article>
        <article><h3>安全な公開デモ</h3><p>Ollamaへの実依頼、Obsidian Vault保存、Daily追記は行いません。API通信なしで作品の流れを確認できます。</p></article>
        <article><h3>基本の見方</h3><p>カテゴリを選び、テンプレートを依頼欄へ反映します。「サンプル計画」「サンプル成果物」「サンプル分析」で実働版の設計を確認してください。</p></article>
      </> : <>
        <article><h3>ローカル版でできること</h3><p>Express経由でローカルOllamaへ依頼し、レンの計画と専門社員のテキスト成果物を生成できます。</p></article>
        <article><h3>基本の使い方</h3><ol><li>カテゴリを選ぶ</li><li>テンプレートまたは依頼文を入力</li><li>レンに依頼</li><li>担当社員に実行</li><li>履歴を承認し、MarkdownまたはObsidianへ保存</li></ol></article>
        <article><h3>Obsidian連携</h3><p><code>OBSIDIAN_VAULT_DIR</code>を設定するとVault保存を利用できます。Daily追記は<code>OBSIDIAN_DAILY_NOTES_ENABLED=true</code>の場合だけ有効です。保存前に内容を確認してください。</p></article>
      </>}
    </div>}
  </section>;
}
