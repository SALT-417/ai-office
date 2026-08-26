export function PublicDemoOverview() {
  return <section className="public-demo-overview" aria-labelledby="public-demo-overview-title">
    <div className="public-demo-summary"><div><p className="eyebrow">PORTFOLIO ARCHITECTURE</p><h2 id="public-demo-overview-title">この作品で示していること</h2></div><p>5名のAI社員が、依頼から成果物・確認までを役割分担するローカルAIワークフローです。</p></div>
    <ul><li><strong>UI</strong><span>Reactで業務体験を可視化</span></li><li><strong>AI活用</strong><span>役割分担と構造化出力</span></li><li><strong>安全設計</strong><span>検証・中断・失敗分離</span></li><li><strong>人の確認</strong><span>履歴・承認・再利用</span></li></ul>
    <div className="runtime-comparison" aria-label="公開版とローカル版の違い"><span><strong>Public Demo</strong>Safe Simulation</span><span><strong>Local AI</strong>Ollama Enabled</span><small>公開版は固定例で安全に操作でき、ローカル環境ではOllamaによる実AI処理を利用できます。</small></div>
  </section>;
}
