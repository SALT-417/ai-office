import { requestTemplatesByCategory } from '../data/requestTemplates';
import type { WorkCategory } from '../../shared/workCategories';

interface Props {
  category: WorkCategory;
  disabled: boolean;
  onSelect: (prompt: string) => void;
}

export function RequestTemplateList({ category, disabled, onSelect }: Props) {
  return <section className="request-templates" aria-labelledby="request-templates-title">
    <div className="request-templates-heading"><h3 id="request-templates-title">依頼テンプレート</h3><p>選ぶと依頼欄へ反映します。送信前に自由に編集できます。</p></div>
    <div className="request-template-grid">
      {requestTemplatesByCategory[category].map((template) => <button type="button" key={template.id} disabled={disabled} onClick={() => onSelect(template.prompt)} aria-label={`${template.title}を依頼欄へ反映`}>
        <strong>{template.title}</strong><span>{template.description}</span><small>このテンプレートを使う</small>
      </button>)}
    </div>
  </section>;
}
