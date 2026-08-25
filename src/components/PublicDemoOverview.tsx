export function PublicDemoOverview() {
  return <section className="public-demo-overview" aria-labelledby="public-demo-overview-title">
    <p className="eyebrow">PORTFOLIO ARCHITECTURE</p><h2 id="public-demo-overview-title">この作品で示していること</h2>
    <p>公開版は固定サンプルで操作の流れを伝え、ローカル版ではOllamaとExpressを使って実際に計画・成果物・読み取り専用分析を生成します。</p>
    <ul><li><strong>役割分担型AI：</strong>React・TypeScriptの画面とExpress・Ollamaをつなぎ、社員ごとの役割をサーバーで固定します。</li><li><strong>安全に失敗：</strong>構造化出力を検証し、失敗分離・タイムアウト・キャンセルで画面と処理を停止させません。</li><li><strong>読み取り専用分析：</strong>パス、秘密情報、プロンプトインジェクションを検査し、選択ファイルだけを根拠にします。</li><li><strong>人が最終判断：</strong>結果は提案として履歴化し、承認してもファイル変更や外部送信を行いません。自動テストで主要な境界を確認します。</li></ul>
  </section>;
}
