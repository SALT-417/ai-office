export function PublicDemoOverview() {
  return <section className="public-demo-overview" aria-labelledby="public-demo-overview-title">
    <p className="eyebrow">PORTFOLIO ARCHITECTURE</p><h2 id="public-demo-overview-title">この作品で示していること</h2>
    <p>一般業務・AI学習・開発・転職・コンテンツの5カテゴリを切り替え、同じ5名が基本役割を保ちながら仕事を分担します。公開版は固定サンプル、ローカル版はOllamaによる実働です。</p>
    <ul><li><strong>カテゴリ切替型AI：</strong>選択カテゴリと依頼文をサーバーで検証し、別用途へ勝手に置き換えない役割分担を行います。</li><li><strong>安全に失敗：</strong>構造化出力を検証し、失敗分離・タイムアウト・キャンセルで画面と処理を停止させません。</li><li><strong>読み取り専用分析：</strong>パス、秘密情報、プロンプトインジェクションを検査し、選択ファイルだけを根拠にします。</li><li><strong>人が最終判断：</strong>結果は提案として履歴化し、承認してもファイル変更や外部送信を行いません。自動テストで主要な境界を確認します。</li></ul>
  </section>;
}
