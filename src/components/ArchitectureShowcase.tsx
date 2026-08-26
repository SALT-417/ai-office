import { architectureSafetyItems, architectureTechGroups, AUTOMATED_TEST_COUNT } from '../data/architecture';
import { employees } from '../data/employees';

export function ArchitectureShowcase() {
  return <section className="architecture-showcase" aria-labelledby="architecture-title">
    <header className="architecture-heading">
      <div><p className="eyebrow">SYSTEM ARCHITECTURE</p><h2 id="architecture-title">AI OFFICEの仕組み</h2></div>
      <p>共通のReact UIから、安全な公開デモとローカルAI処理を明確に分離。結果は検証後に履歴と人の確認へつなぎます。</p>
    </header>
    <div className="architecture-flow" aria-label="AI OFFICEの処理フロー">
      <article className="architecture-node architecture-entry"><span>01 · INPUT</span><h3>User Request</h3><p>React 19 / TypeScript UI</p></article>
      <span className="architecture-arrow" aria-hidden="true">→</span>
      <div className="architecture-routes">
        <article className="architecture-route architecture-route-public"><span>PUBLIC DEMO ROUTE</span><h3>Controlled Demo Data</h3><ol><li>Browser UI</li><li>固定・管理済みデモデータ</li></ol><p>API・Ollama・Vaultへ通信しません。</p></article>
        <article className="architecture-route architecture-route-local"><span>LOCAL AI ROUTE</span><h3>Express → Ollama</h3><ol><li>Express APIと役割判定</li><li>Ollama qwen2.5:3b</li><li>構造化結果の再検証</li></ol><p>ローカルPC内で処理します。</p></article>
      </div>
      <span className="architecture-arrow" aria-hidden="true">→</span>
      <article className="architecture-node architecture-result"><span>03 · OUTPUT</span><h3>Result / Status</h3><p>localStorage履歴・人による確認</p><small>明示操作でMarkdown / Obsidianへ保存</small></article>
    </div>
    <div className="architecture-details">
      <article className="architecture-card architecture-team"><p className="eyebrow">ROLE ROUTING</p><h3>5名の専門AI社員</h3><ul>{employees.map((employee) => <li key={employee.id}><strong>{employee.name}</strong><span>{employee.role}</span><small>{employee.responsibility}</small></li>)}</ul></article>
      <article className="architecture-card architecture-stack"><p className="eyebrow">TECH STACK</p><h3>実装技術</h3><dl>{architectureTechGroups.map((group) => <div key={group.label}><dt>{group.label}</dt><dd>{group.items.join(' · ')}</dd></div>)}</dl></article>
      <article className="architecture-card architecture-safety"><p className="eyebrow">SAFETY DESIGN</p><h3>境界で守る設計</h3><ul>{architectureSafetyItems.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article className="architecture-card architecture-quality"><p className="eyebrow">TEST / QUALITY</p><h3>変更を検証できる構成</h3><div className="architecture-metrics"><strong>{AUTOMATED_TEST_COUNT}<span>Automated Tests</span></strong><span>TypeScript<br /><small>Typecheck</small></span><span>ESLint<br /><small>Static Analysis</small></span><span>Vite<br /><small>Production Build</small></span></div></article>
    </div>
  </section>;
}
